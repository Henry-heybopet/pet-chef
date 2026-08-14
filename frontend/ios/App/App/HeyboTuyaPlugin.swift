import Foundation
import Capacitor
import CoreBluetooth
import CoreLocation
import UIKit
import ThingSmartHomeKit
import ThingSmartBLECoreKit
import ThingSmartBLEKit
import ThingSmartDeviceCoreKit
import ThingSmartBaseKit
import ThingSmartActivatorKit

@objc(HeyboTuyaPlugin)
public class HeyboTuyaPlugin: CAPPlugin, CAPBridgedPlugin, CBCentralManagerDelegate, CLLocationManagerDelegate, ThingSmartBLEManagerDelegate, ThingSmartBLEWifiActivatorDelegate, ThingSmartDeviceDelegate, ThingSmartActivatorDelegate {
    public let identifier = "HeyboTuyaPlugin"
    public let jsName = "HeyboTuya"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "init", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ensureNativeSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loginOrRegisterWithHeyboUid", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHomeList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ensureDefaultHome", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDeviceList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActivatorToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWifiPairing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopPairing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "renameDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unbindDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPairingPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPairingPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBleScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBleScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectBleDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "subscribeDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unsubscribeDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDeviceDpState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "publishDps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAuthToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncAuthState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearAuthState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise),
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
    private var pairingBluetoothManager: CBCentralManager?
    private lazy var pairingLocationManager: CLLocationManager = {
        let manager = CLLocationManager()
        manager.delegate = self
        return manager
    }()
    private var activePermissionCall: CAPPluginCall?
    private let authDefaults = UserDefaults.standard
    private let authTokenKey = "heybo_native_auth.token"
    private let authUserIdKey = "heybo_native_auth.user_id"
    private let authNicknameKey = "heybo_native_auth.nickname"
    private let authTuyaUidKey = "heybo_native_auth.tuya_uid"
    private let authTuyaPasswordKey = "heybo_native_auth.tuya_password"
    
    // MARK: - Core Plugin Methods
    
    @objc func status(_ call: CAPPluginCall) {
        let permissions = pairingPermissionPayload()
        call.resolve([
            "platform": "ios",
            "nativeAvailable": true,
            "configured": true,
            "initialized": isInitialized,
            "pid": "ak2kofibhuvdtqip",
            "homeId": currentHomeId != 0 ? Double(currentHomeId) : 0,
            "permBluetoothScan": permissions["bluetoothGranted"] as? Bool ?? false,
            "permBluetoothConnect": permissions["bluetoothGranted"] as? Bool ?? false,
            "permLocation": permissions["locationGranted"] as? Bool ?? false,
            "gpsEnabled": permissions["gpsEnabled"] as? Bool ?? false
        ])
    }

    private func permissionLabel(_ status: CBManagerAuthorization) -> String {
        switch status {
        case .allowedAlways: return "granted"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "not_determined"
        @unknown default: return "unknown"
        }
    }

    private func permissionLabel(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .authorizedAlways, .authorizedWhenInUse: return "granted"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "not_determined"
        @unknown default: return "unknown"
        }
    }

    private func pairingPermissionPayload() -> [String: Any] {
        let bluetoothStatus = CBManager.authorization
        let locationStatus = pairingLocationManager.authorizationStatus
        let bluetoothGranted = bluetoothStatus == .allowedAlways
        let locationGranted = locationStatus == .authorizedAlways || locationStatus == .authorizedWhenInUse
        var missingPermissions: [String] = []
        if !bluetoothGranted {
            missingPermissions.append("BLUETOOTH_SCAN")
            missingPermissions.append("BLUETOOTH_CONNECT")
        }
        if !locationGranted {
            missingPermissions.append("ACCESS_FINE_LOCATION")
        }
        return [
            "platform": "ios",
            "bluetoothGranted": bluetoothGranted,
            "locationGranted": locationGranted,
            "bluetoothRequired": true,
            "locationRequired": true,
            "missingPermissions": missingPermissions,
            "permissions": [
                "BLUETOOTH_SCAN": permissionLabel(bluetoothStatus),
                "BLUETOOTH_CONNECT": permissionLabel(bluetoothStatus),
                "ACCESS_FINE_LOCATION": permissionLabel(locationStatus)
            ],
            "canStartBleScan": bluetoothGranted && locationGranted,
            "shouldOpenSettings": bluetoothStatus == .denied || bluetoothStatus == .restricted || locationStatus == .denied || locationStatus == .restricted,
            "gpsEnabled": CLLocationManager.locationServicesEnabled()
        ]
    }

    @objc func checkPairingPermissions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let payload = self.pairingPermissionPayload()
            print("[HeyboTuya Permission] check \(payload)")
            call.resolve(payload)
        }
    }

    @objc func requestPairingPermissions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.activePermissionCall == nil else {
                call.reject("A pairing permission request is already active")
                return
            }
            self.activePermissionCall = call
            print("[HeyboTuya Permission] request started \(self.pairingPermissionPayload())")
            self.advancePairingPermissionRequest()
        }
    }

    private func advancePairingPermissionRequest() {
        guard activePermissionCall != nil else { return }
        if CBManager.authorization == .notDetermined {
            print("[HeyboTuya Permission] requesting Bluetooth authorization")
            if pairingBluetoothManager == nil {
                pairingBluetoothManager = CBCentralManager(
                    delegate: self,
                    queue: .main,
                    options: [CBCentralManagerOptionShowPowerAlertKey: false]
                )
            }
            return
        }
        if pairingLocationManager.authorizationStatus == .notDetermined {
            print("[HeyboTuya Permission] requesting location authorization")
            pairingLocationManager.requestWhenInUseAuthorization()
            return
        }
        let call = activePermissionCall
        activePermissionCall = nil
        let payload = pairingPermissionPayload()
        print("[HeyboTuya Permission] request finished \(payload)")
        call?.resolve(payload)
    }

    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        print("[HeyboTuya Permission] Bluetooth callback authorization=\(permissionLabel(CBManager.authorization)) state=\(central.state.rawValue)")
        if CBManager.authorization != .notDetermined {
            advancePairingPermissionRequest()
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        print("[HeyboTuya Permission] location callback authorization=\(permissionLabel(manager.authorizationStatus))")
        if manager.authorizationStatus != .notDetermined {
            advancePairingPermissionRequest()
        }
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

    private func startSdkIfNeeded() {
        guard !isInitialized else { return }
        ThingSmartSDK.sharedInstance().start(
            withAppKey: "8kjrnvjwpr9vyxnare5j",
            secretKey: "vtkra5yp7mfcds7ruprjjgnrcqmnyc9a"
        )
        isInitialized = true
    }

    @objc func syncAuthState(_ call: CAPPluginCall) {
        let token = call.getString("token") ?? ""
        let userId = call.getString("userId") ?? ""
        guard !token.isEmpty, !userId.isEmpty else {
            call.reject("AUTH_SYNC_INVALID: token and userId are required.")
            return
        }
        let requestedUid = call.getString("tuyaUid") ?? ""
        let tuyaUid = requestedUid.isEmpty ? "heybo_\(userId)" : requestedUid
        let requestedPassword = call.getString("tuyaPassword") ?? ""
        let tuyaPassword = requestedPassword.isEmpty ? tuyaUid : requestedPassword
        authDefaults.set(token, forKey: authTokenKey)
        authDefaults.set(userId, forKey: authUserIdKey)
        authDefaults.set(call.getString("nickname") ?? "", forKey: authNicknameKey)
        authDefaults.set(tuyaUid, forKey: authTuyaUidKey)
        authDefaults.set(tuyaPassword, forKey: authTuyaPasswordKey)
        call.resolve(["success": true, "userId": userId])
    }

    @objc func getAuthToken(_ call: CAPPluginCall) {
        let token = authDefaults.string(forKey: authTokenKey) ?? ""
        let userId = authDefaults.string(forKey: authUserIdKey) ?? ""
        guard !token.isEmpty, !userId.isEmpty else {
            call.resolve(["success": false, "token": "", "reason": "AUTH_NOT_SYNCED"])
            return
        }
        call.resolve([
            "success": true,
            "token": token,
            "userId": userId,
            "nickname": authDefaults.string(forKey: authNicknameKey) ?? ""
        ])
    }

    @objc func clearAuthState(_ call: CAPPluginCall) {
        [authTokenKey, authUserIdKey, authNicknameKey, authTuyaUidKey, authTuyaPasswordKey]
            .forEach { authDefaults.removeObject(forKey: $0) }
        currentHomeId = 0
        subscribedDevices.removeAll()
        call.resolve(["success": true])
    }

    @objc func ensureNativeSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.startSdkIfNeeded()
            let token = self.authDefaults.string(forKey: self.authTokenKey) ?? ""
            let userId = self.authDefaults.string(forKey: self.authUserIdKey) ?? ""
            guard !token.isEmpty, !userId.isEmpty else {
                call.reject("AUTH_NOT_SYNCED: H5 login state has not been synced to native.")
                return
            }
            let storedUid = self.authDefaults.string(forKey: self.authTuyaUidKey) ?? ""
            let tuyaUid = storedUid.isEmpty ? "heybo_\(userId)" : storedUid
            let storedPassword = self.authDefaults.string(forKey: self.authTuyaPasswordKey) ?? ""
            let password = storedPassword.isEmpty ? tuyaUid : storedPassword
            let user = ThingSmartUser.sharedInstance()

            if user.isLogin, user.uid == tuyaUid {
                self.ensureSessionHome(call, tuyaUid: tuyaUid)
                return
            }

            let login = {
                user.loginOrRegister(withCountryCode: "86", uid: tuyaUid, password: password, createHome: true) { _ in
                    self.ensureSessionHome(call, tuyaUid: tuyaUid)
                } failure: { error in
                    call.reject("Tuya UID login failed: \(error?.localizedDescription ?? "unknown error")")
                }
            }
            if user.isLogin {
                user.loginOut({ login() }, failure: { error in
                    call.reject("Tuya account switch failed: \(error?.localizedDescription ?? "unknown error")")
                })
            } else {
                login()
            }
        }
    }

    private func ensureSessionHome(_ call: CAPPluginCall, tuyaUid: String) {
        let homeManager = ThingSmartHomeManager()
        homeManager.getHomeList(success: { homes in
            if let home = homes?.first {
                self.loadSessionHome(call, homeId: home.homeId, tuyaUid: tuyaUid)
                return
            }
            homeManager.addHome(
                withName: "Heybo Pet",
                geoName: "China",
                rooms: [],
                latitude: 0,
                longitude: 0,
                success: { homeId in self.loadSessionHome(call, homeId: homeId, tuyaUid: tuyaUid) },
                failure: { error in
                    call.reject("Create Tuya default home failed: \(error?.localizedDescription ?? "unknown error")")
                }
            )
        }, failure: { error in
            call.reject("Query Tuya home list failed: \(error?.localizedDescription ?? "unknown error")")
        })
    }

    private func loadSessionHome(_ call: CAPPluginCall, homeId: Int64, tuyaUid: String) {
        guard let home = ThingSmartHome(homeId: homeId) else {
            call.reject("Failed to initialize Tuya home: \(homeId)")
            return
        }
        home.getDataWithSuccess({ _ in
            self.currentHomeId = homeId
            call.resolve([
                "success": true,
                "ready": true,
                "platform": "ios",
                "tuyaUid": tuyaUid,
                "homeId": Double(homeId),
                "deviceCount": (home.deviceList ?? []).count
            ])
        }, failure: { error in
            call.reject("Load Tuya home failed: \(error?.localizedDescription ?? "unknown error")")
        })
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
                        "macAddress": device.mac ?? "",
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
                        "macAddress": device.mac ?? "",
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

    @objc func renameDevice(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId"), !devId.isEmpty else {
            call.reject("devId is required")
            return
        }
        let name = (call.getString("name") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 30 else {
            call.reject("name must contain 1 to 30 characters")
            return
        }

        DispatchQueue.main.async {
            guard let device = ThingSmartDevice(deviceId: devId) else {
                call.reject("Failed to initialize ThingSmartDevice for devId: \(devId)")
                return
            }
            device.updateName(name, success: {
                call.resolve(["success": true, "devId": devId, "name": name])
            }, failure: { error in
                call.reject("Rename device failed: \(error?.localizedDescription ?? "unknown error")")
            })
        }
    }
    
    @objc func startBleScan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let permissions = self.pairingPermissionPayload()
            guard permissions["canStartBleScan"] as? Bool == true else {
                let missing = permissions["missingPermissions"] as? [String] ?? []
                call.reject("PAIRING_PERMISSION_MISSING: \(missing.joined(separator: ","))")
                return
            }
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

    @objc func getDeviceDpState(_ call: CAPPluginCall) {
        guard let devId = call.getString("devId") else {
            call.reject("devId is required")
            return
        }
        guard currentHomeId != 0 else {
            call.reject("No homeId provided or set as default")
            return
        }
        DispatchQueue.main.async {
            let home = ThingSmartHome(homeId: self.currentHomeId)
            home?.getDataWithSuccess({ _ in
                guard let device = home?.deviceList?.first(where: { $0.devId == devId }) else {
                    call.reject("Device not found")
                    return
                }
                call.resolve(["success": true, "devId": devId, "dps": device.dps ?? [:]])
            }, failure: { error in
                call.reject("Get device DP state failed: \(error?.localizedDescription ?? "unknown error")")
            })
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

    @objc func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Cannot open app settings")
                return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve(["success": true])
                } else {
                    call.reject("Cannot open app settings")
                }
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
        
        let parameterDps: [AnyHashable: Any] = [
            "1": true,
            "3": "diy",
            "7": cookTime,
            "9": temperature,
            "102": power,
            "108": speed
        ]
        let startDps: [AnyHashable: Any] = [
            "107": "start"
        ]
        
        DispatchQueue.main.async {
            let device = self.subscribedDevices[devId] ?? ThingSmartDevice(deviceId: devId)
            if let device = device {
                device.publishDps(parameterDps, success: {
                    device.publishDps(startDps, success: {
                        call.resolve([
                            "success": true,
                            "devId": devId,
                            "dps": self.jsonStringOf(parameterDps.merging(startDps) { _, latest in latest })
                        ])
                    }, failure: { (error) in
                        call.reject("Start DIY cooking failed: \(error?.localizedDescription ?? "unknown error")")
                    })
                }, failure: { (error) in
                    call.reject("Set DIY cooking parameters failed: \(error?.localizedDescription ?? "unknown error")")
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
            "107": "pause"
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
            "107": "reset"
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
