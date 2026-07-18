import Foundation
import Capacitor
import ThingSmartHomeKit
import ThingSmartBLECoreKit
import ThingSmartBLEKit
import ThingSmartDeviceCoreKit
import ThingSmartBaseKit
import ThingSmartActivatorKit

@objc(HeyboTuyaPlugin)
public class HeyboTuyaPlugin: CAPPlugin, CAPBridgedPlugin, ThingSmartBLEManagerDelegate, ThingSmartBLEWifiActivatorDelegate, ThingSmartDeviceDelegate, ThingSmartActivatorDelegate {
    public let identifier = "HeyboTuyaPlugin"
    public let jsName = "HeyboTuya"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "init", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loginOrRegisterWithHeyboUid", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHomeList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ensureDefaultHome", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDeviceList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActivatorToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWifiPairing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopPairing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unbindDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBleScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBleScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectBleDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "subscribeDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unsubscribeDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "publishDps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openBluetoothSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startDiyCooking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseCooking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resetCooking", returnType: CAPPluginReturnPromise)
    ]
    
    private var isInitialized = false
    private var currentHomeId: Int64 = 0
    private var subscribedDevices: [String: ThingSmartDevice] = [:]
    private var activeActivatorCall: CAPPluginCall?
    private var wifiActivator: ThingSmartActivator?
    private var activeWifiCall: CAPPluginCall?
    private var activeWifiToken = ""
    private var activeWifiMode = "EZ"
    
    // MARK: - Core Plugin Methods
    
    @objc func status(_ call: CAPPluginCall) {
        call.resolve([
            "platform": "ios",
            "nativeAvailable": true,
            "configured": true,
            "initialized": isInitialized,
            "pid": "ak2kofibhuvdtqip",
            "homeId": currentHomeId != 0 ? Double(currentHomeId) : 0
        ])
    }
    
    @objc func `init`(_ call: CAPPluginCall) {
        let appKey = call.getString("appKey") ?? "8kjrnvjwpr9vyxnare5j"
        let appSecret = call.getString("appSecret") ?? "vtkra5yp7mfcds7ruprjjgnrcqmnyc9a"
        
        DispatchQueue.main.async {
            ThingSmartSDK.sharedInstance().start(withAppKey: appKey, secretKey: appSecret)
            self.isInitialized = true
            call.resolve([
                "initialized": true,
                "appKey": appKey
            ])
        }
    }
    
    @objc func loginOrRegisterWithHeyboUid(_ call: CAPPluginCall) {
        guard let heyboUid = call.getString("heyboUid") else {
            call.reject("heyboUid is required")
            return
        }
        let tuyaUid = call.getString("tuyaUid") ?? "heybo_\(heyboUid)"
        guard let password = call.getString("password"), !password.isEmpty else {
            call.reject("password is required")
            return
        }
        
        DispatchQueue.main.async {
            ThingSmartUser.sharedInstance().loginOrRegister(withCountryCode: "86", uid: tuyaUid, password: password, createHome: true) { (uid) in
                call.resolve([
                    "success": true,
                    "tuyaUid": tuyaUid
                ])
            } failure: { (error) in
                call.reject("Login or register failed: \(error?.localizedDescription ?? "unknown error")")
            }
        }
    }
    
    @objc func getHomeList(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let homeManager = ThingSmartHomeManager()
            homeManager.getHomeList(success: { (homes) in
                let mappedHomes = (homes ?? []).map { home in
                    return [
                        "homeId": Double(home.homeId),
                        "name": home.name ?? "",
                        "geoName": home.geoName ?? "",
                        "deviceCount": 0
                    ] as [String : Any]
                }
                call.resolve([
                    "success": true,
                    "homes": mappedHomes
                ])
            }, failure: { (error) in
                call.reject("Failed to get home list: \(error?.localizedDescription ?? "unknown error")")
            })
        }
    }
    
    @objc func ensureDefaultHome(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let homeManager = ThingSmartHomeManager()
            homeManager.getHomeList(success: { [weak self] (homes) in
                guard let self = self else { return }
                if let firstHome = homes?.first {
                    self.currentHomeId = firstHome.homeId
                    call.resolve([
                        "success": true,
                        "homeId": Double(firstHome.homeId),
                        "name": firstHome.name ?? "",
                        "geoName": firstHome.geoName ?? "",
                        "deviceCount": 0
                    ])
                } else {
                    homeManager.addHome(withName: "Heybo Pet Home", geoName: "China", rooms: ["Living Room"], latitude: 0, longitude: 0, success: { (homeId) in
                        self.currentHomeId = homeId
                        call.resolve([
                            "success": true,
                            "homeId": Double(homeId),
                            "name": "Heybo Pet Home",
                            "geoName": "China",
                            "deviceCount": 0
                        ])
                    }, failure: { (error) in
                        call.reject("Failed to create default home: \(error?.localizedDescription ?? "unknown error")")
                    })
                }
            }, failure: { (error) in
                call.reject("Failed to fetch homes: \(error?.localizedDescription ?? "unknown error")")
            })
        }
    }
    
    @objc func getDeviceList(_ call: CAPPluginCall) {
        let homeIdVal = call.getDouble("homeId") ?? 0
        let targetHomeId = homeIdVal != 0 ? Int64(homeIdVal) : self.currentHomeId
        
        if targetHomeId == 0 {
            call.reject("No homeId provided or set as default")
            return
        }
        
        DispatchQueue.main.async {
            let home = ThingSmartHome(homeId: targetHomeId)
            home?.getDataWithSuccess({ (homeModel) in
                let devices = home?.deviceList ?? []
                let mappedDevices = devices.map { device in
                    return [
                        "devId": device.devId ?? "",
                        "name": device.name ?? "",
                        "productId": device.productId ?? "",
                        "isOnline": device.isOnline,
                        "dps": device.dps ?? [:]
                    ] as [String : Any]
                }
                call.resolve([
                    "success": true,
                    "homeId": Double(targetHomeId),
                    "devices": mappedDevices
                ])
            }, failure: { (error) in
                // Fallback to cache on network failure
                let devices = home?.deviceList ?? []
                let mappedDevices = devices.map { device in
                    return [
                        "devId": device.devId ?? "",
                        "name": device.name ?? "",
                        "productId": device.productId ?? "",
                        "isOnline": device.isOnline,
                        "dps": device.dps ?? [:]
                    ] as [String : Any]
                }
                call.resolve([
                    "success": true,
                    "homeId": Double(targetHomeId),
                    "devices": mappedDevices
                ])
            })
        }
    }

    @objc func getActivatorToken(_ call: CAPPluginCall) {
        let homeIdVal = call.getDouble("homeId") ?? 0
        let targetHomeId = homeIdVal != 0 ? Int64(homeIdVal) : currentHomeId
        guard targetHomeId != 0 else {
            call.reject("No homeId provided or set as default")
            return
        }

        DispatchQueue.main.async {
            let activator = ThingSmartActivator()
            activator.getTokenWithHomeId(targetHomeId, success: { token in
                guard let token = token, !token.isEmpty else {
                    call.reject("Get activator token failed: empty token")
                    return
                }
                call.resolve([
                    "success": true,
                    "homeId": Double(targetHomeId),
                    "token": token
                ])
            }, failure: { error in
                call.reject("Get activator token failed: \(error?.localizedDescription ?? "unknown error")")
            })
        }
    }

    @objc func startWifiPairing(_ call: CAPPluginCall) {
        let homeIdVal = call.getDouble("homeId") ?? 0
        let targetHomeId = homeIdVal != 0 ? Int64(homeIdVal) : currentHomeId
        guard targetHomeId != 0 else {
            call.reject("No homeId provided or set as default")
            return
        }
        guard let ssid = call.getString("ssid"), !ssid.isEmpty else {
            call.reject("ssid is required")
            return
        }

        let password = call.getString("password") ?? ""
        let modeName = (call.getString("mode") ?? "EZ").uppercased()
        let timeout = TimeInterval(call.getInt("timeout") ?? 120)

        DispatchQueue.main.async {
            self.stopWifiPairing()
            self.currentHomeId = targetHomeId

            let activator = ThingSmartActivator()
            activator.delegate = self
            activator.getTokenWithHomeId(targetHomeId, success: { token in
                guard let token = token, !token.isEmpty else {
                    call.reject("Get activator token failed: empty token")
                    return
                }
                self.wifiActivator = activator
                self.activeWifiCall = call
                self.activeWifiToken = token
                self.activeWifiMode = modeName

                let mode: ThingActivatorMode = modeName == "AP" ? .AP : .EZ
                activator.startConfigWiFi(
                    mode,
                    ssid: ssid,
                    password: password,
                    token: token,
                    timeout: timeout
                )
            }, failure: { error in
                call.reject("Get activator token failed: \(error?.localizedDescription ?? "unknown error")")
            })
        }
    }

    @objc func stopPairing(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopWifiPairing()
            call.resolve(["success": true])
        }
    }

    @objc func unbindDevice(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId"), !devId.isEmpty else {
            call.reject("devId is required")
            return
        }

        DispatchQueue.main.async {
            guard let device = ThingSmartDevice(deviceId: devId) else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
                return
            }

            device.remove({
                self.subscribedDevices[devId]?.delegate = nil
                self.subscribedDevices.removeValue(forKey: devId)
                call.resolve(["success": true, "devId": devId])
            }, failure: { error in
                call.reject("Unbind device failed: \(error?.localizedDescription ?? "unknown error")")
            })
        }
    }
    
    @objc func startBleScan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            ThingSmartBLEManager.sharedInstance().delegate = self
            ThingSmartBLEManager.sharedInstance().startListening(true)
            call.resolve(["success": true])
        }
    }
    
    @objc func stopBleScan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            ThingSmartBLEManager.sharedInstance().stopListening(true)
            call.resolve(["success": true])
        }
    }
    
    @objc func connectBleDevice(_ call: CAPPluginCall) {
        guard let uuid = call.getString("uuid") else {
            call.reject("uuid is required")
            return
        }
        let productId = call.getString("productId") ?? "ak2kofibhuvdtqip"
        let ssid = call.getString("ssid") ?? ""
        let password = call.getString("password") ?? ""
        let homeIdVal = call.getDouble("homeId") ?? 0
        let targetHomeId = homeIdVal != 0 ? Int64(homeIdVal) : self.currentHomeId
        
        if targetHomeId == 0 {
            call.reject("No homeId provided or set as default")
            return
        }
        
        DispatchQueue.main.async {
            self.activeActivatorCall = call
            ThingSmartBLEWifiActivator.sharedInstance().bleWifiDelegate = self
            ThingSmartBLEWifiActivator.sharedInstance().startConfigBLEWifiDevice(
                withUUID: uuid,
                homeId: targetHomeId,
                productId: productId,
                ssid: ssid,
                password: password,
                timeout: 100.0,
                success: {
                    // Provisioning sequence initiated successfully
                },
                failure: { [weak self] in
                    self?.activeActivatorCall = nil
                    call.reject("Failed to initiate dual-mode config")
                }
            )
        }
    }
    
    @objc func subscribeDevice(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        
        DispatchQueue.main.async {
            if let device = ThingSmartDevice(deviceId: devId) {
                device.delegate = self
                self.subscribedDevices[devId] = device
                call.resolve(["success": true, "devId": devId])
            } else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
            }
        }
    }
    
    @objc func unsubscribeDevice(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        
        DispatchQueue.main.async {
            if let device = self.subscribedDevices[devId] {
                device.delegate = nil
                self.subscribedDevices.removeValue(forKey: devId)
            }
            call.resolve(["success": true, "devId": devId])
        }
    }
    
    @objc func publishDps(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        guard let dps = call.getObject("dps") else {
            call.reject("dps object is required")
            return
        }
        
        DispatchQueue.main.async {
            let device = self.subscribedDevices[devId] ?? ThingSmartDevice(deviceId: devId)
            if let device = device {
                device.publishDps(dps, success: {
                    call.resolve([
                        "success": true,
                        "devId": devId,
                        "dps": self.jsonStringOf(dps)
                    ])
                }, failure: { (error) in
                    call.reject("Publish DPs failed: \(error?.localizedDescription ?? "unknown error")")
                })
            } else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
            }
        }
    }
    
    @objc func openBluetoothSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: "App-Prefs:root=Bluetooth") {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                    call.resolve(["success": true])
                    return
                }
            }
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
                call.resolve(["success": true])
            } else {
                call.reject("Cannot open settings")
            }
        }
    }
    
    // MARK: - Cooking Custom Helper Commands (Native side mirroring for JS parity)
    
    @objc func startDiyCooking(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        let temperature = call.getInt("temperature") ?? 85
        let cookTime = call.getInt("cookTime") ?? 1200
        let power = call.getInt("power") ?? 8
        let speed = call.getString("speed") ?? "1"
        
        let dps: [AnyHashable: Any] = [
            1: true,
            3: "diy",
            7: cookTime,
            9: temperature,
            102: power,
            107: "start",
            108: speed
        ]
        
        DispatchQueue.main.async {
            let device = self.subscribedDevices[devId] ?? ThingSmartDevice(deviceId: devId)
            if let device = device {
                device.publishDps(dps, success: {
                    call.resolve([
                        "success": true,
                        "devId": devId,
                        "dps": self.jsonStringOf(dps)
                    ])
                }, failure: { (error) in
                    call.reject("Start DIY cooking failed: \(error?.localizedDescription ?? "unknown error")")
                })
            } else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
            }
        }
    }
    
    @objc func pauseCooking(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        let dps: [AnyHashable: Any] = [
            107: "pause"
        ]
        
        DispatchQueue.main.async {
            let device = self.subscribedDevices[devId] ?? ThingSmartDevice(deviceId: devId)
            if let device = device {
                device.publishDps(dps, success: {
                    call.resolve([
                        "success": true,
                        "devId": devId,
                        "dps": self.jsonStringOf(dps)
                    ])
                }, failure: { (error) in
                    call.reject("Pause cooking failed: \(error?.localizedDescription ?? "unknown error")")
                })
            } else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
            }
        }
    }
    
    @objc func resetCooking(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        let dps: [AnyHashable: Any] = [
            107: "reset"
        ]
        
        DispatchQueue.main.async {
            let device = self.subscribedDevices[devId] ?? ThingSmartDevice(deviceId: devId)
            if let device = device {
                device.publishDps(dps, success: {
                    call.resolve([
                        "success": true,
                        "devId": devId,
                        "dps": self.jsonStringOf(dps)
                    ])
                }, failure: { (error) in
                    call.reject("Reset cooking failed: \(error?.localizedDescription ?? "unknown error")")
                })
            } else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
            }
        }
    }
    
    // MARK: - ThingSmartBLEManagerDelegate
    
    @objc public func didDiscoveryDevice(withDeviceInfo deviceInfo: ThingBLEAdvModel) {
        let name = deviceInfo.peripheral?.cbPeripheral.name ?? "Tuya BLE Device"
        self.notifyListeners("bleDeviceFound", data: [
            "name": name,
            "address": deviceInfo.mac ?? "",
            "uuid": deviceInfo.uuid ?? "",
            "productId": deviceInfo.productId ?? "",
            "isNearby": true
        ])
    }
    
    // MARK: - ThingSmartBLEWifiActivatorDelegate
    
    @objc public func bleWifiActivator(_ activator: ThingSmartBLEWifiActivator, didReceiveBLEWifiConfigDevice deviceModel: ThingSmartDeviceModel?, error: Error?) {
        guard let call = activeActivatorCall else { return }
        activeActivatorCall = nil
        
        if let error = error {
            call.reject("Provisioning failed: \(error.localizedDescription)")
            return
        }
        
        guard let device = deviceModel else {
            call.reject("Provisioning failed: device model is nil")
            return
        }
        
        let deviceData: [String: Any] = [
            "devId": device.devId ?? "",
            "name": device.name ?? "",
            "productId": device.productId ?? "",
            "isOnline": device.isOnline,
            "dps": device.dps ?? [:]
        ]
        
        call.resolve([
            "success": true,
            "device": deviceData
        ])
    }

    // MARK: - ThingSmartActivatorDelegate

    @objc public func activator(_ activator: ThingSmartActivator, didReceiveDevice deviceModel: ThingSmartDeviceModel?, error: Error?) {
        guard let call = activeWifiCall else { return }

        if let error = error {
            stopWifiPairing()
            call.reject("Wi-Fi pairing failed: \(error.localizedDescription)")
            return
        }

        guard let device = deviceModel else { return }
        let deviceData: [String: Any] = [
            "devId": device.devId ?? "",
            "name": device.name ?? "",
            "productId": device.productId ?? "",
            "isOnline": device.isOnline,
            "dps": device.dps ?? [:]
        ]
        let token = activeWifiToken
        let mode = activeWifiMode
        stopWifiPairing()
        call.resolve([
            "success": true,
            "homeId": Double(currentHomeId),
            "token": token,
            "mode": mode,
            "device": deviceData
        ])
    }
    
    // MARK: - ThingSmartDeviceDelegate
    
    @objc public func device(_ device: ThingSmartDevice, dpsUpdate dps: [AnyHashable: Any]) {
        var stringKeyedDps: [String: Any] = [:]
        for (key, value) in dps {
            if let strKey = key as? String {
                stringKeyedDps[strKey] = value
            } else if let numKey = key as? NSNumber {
                stringKeyedDps[numKey.stringValue] = value
            }
        }
        
        self.notifyListeners("dpUpdate", data: [
            "devId": device.deviceModel.devId ?? "",
            "dps": self.jsonStringOf(stringKeyedDps)
        ])
    }
    
    // MARK: - Private Helpers
    
    private func jsonStringOf(_ dict: [AnyHashable: Any]) -> String {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: dict, options: []) else {
            return "{}"
        }
        return String(data: jsonData, encoding: .utf8) ?? "{}"
    }

    private func stopWifiPairing() {
        wifiActivator?.stopConfigWiFi()
        wifiActivator?.delegate = nil
        wifiActivator = nil
        activeWifiCall = nil
        activeWifiToken = ""
        activeWifiMode = "EZ"
    }
}
