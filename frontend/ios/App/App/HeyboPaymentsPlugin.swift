import Foundation
import UIKit
import Capacitor
#if canImport(WechatOpenSDK)
import WechatOpenSDK
#endif

@objc(HeyboPaymentsPlugin)
public class HeyboPaymentsPlugin: CAPPlugin, CAPBridgedPlugin {
    static weak var shared: HeyboPaymentsPlugin?
    private var pendingWechatPayCall: CAPPluginCall?

    public let identifier = "HeyboPaymentsPlugin"
    public let jsName = "HeyboPayments"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "wechatPay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alipayPay", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        HeyboPaymentsPlugin.shared = self
        #if canImport(WechatOpenSDK)
        if hasWechatAppId() {
            WXApi.registerApp(wechatAppId(), universalLink: wechatUniversalLink())
        }
        #endif
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve([
            "wechatPay": wechatStatus(),
            "alipay": unavailableStatus(
                capability: "alipay",
                message: "Alipay native plugin is not implemented yet."
            )
        ])
    }

    @objc func wechatPay(_ call: CAPPluginCall) {
        if let error = validateWechatPayPayload(call) {
            call.resolve(unavailableResult(
                capability: "wechatPay",
                reason: "invalid-payload",
                message: error,
                status: "error"
            ))
            return
        }

        if !hasWechatAppId() {
            call.resolve(unavailableResult(
                capability: "wechatPay",
                reason: "wechat-app-id-missing",
                message: "WeChat Open Platform AppID is not configured for iOS."
            ))
            return
        }

        if !isWechatOpenSdkAvailable() {
            call.resolve(unavailableResult(
                capability: "wechatPay",
                reason: "wechat-opensdk-missing",
                message: "WechatOpenSDK is not linked in the iOS target."
            ))
            return
        }

        if !isWechatInstalled() {
            call.resolve(unavailableResult(
                capability: "wechatPay",
                reason: "wechat-not-installed",
                message: "WeChat is not installed on this iOS device."
            ))
            return
        }

        #if canImport(WechatOpenSDK)
        let request = PayReq()
        request.partnerId = call.getString("partnerId") ?? ""
        request.prepayId = call.getString("prepayId") ?? ""
        request.package = call.getString("packageValue") ?? ""
        request.nonceStr = call.getString("nonceStr") ?? ""
        request.timeStamp = UInt32(call.getString("timeStamp") ?? "0") ?? 0
        request.sign = call.getString("sign") ?? ""

        pendingWechatPayCall = call
        WXApi.send(request) { [weak self] success in
            if !success {
                self?.pendingWechatPayCall = nil
                call.resolve(self?.unavailableResult(
                    capability: "wechatPay",
                    reason: "wechat-send-req-failed",
                    message: "WeChat OpenSDK failed to launch the payment request.",
                    extra: [
                        "prepayId": request.prepayId ?? "",
                        "appId": call.getString("appId") ?? ""
                    ]
                ) ?? [:])
            }
        }
        #else
        call.resolve(unavailableResult(
            capability: "wechatPay",
            reason: "wechat-opensdk-missing",
            message: "WechatOpenSDK is not linked in the iOS target."
        ))
        #endif
    }

    @objc func alipayPay(_ call: CAPPluginCall) {
        call.resolve(unavailableResult(
            capability: "alipay",
            reason: "not-implemented",
            message: "Alipay native payment is not implemented yet."
        ))
    }

    private func wechatStatus() -> [String: Any] {
        let configured = hasWechatAppId()
        let installed = isWechatInstalled()
        var status: [String: Any] = [
            "capability": "wechatPay",
            "platform": "ios",
            "nativeAvailable": true,
            "configured": configured,
            "wechatInstalled": installed,
            "appId": mask(wechatAppId()),
            "ready": false
        ]

        if !configured {
            status["status"] = "not_configured"
            status["reason"] = "wechat-app-id-missing"
            status["message"] = "Configure WECHAT_OPEN_APP_ID in iOS build settings / Info.plist before enabling WeChat Pay."
        } else if !isWechatOpenSdkAvailable() {
            status["status"] = "not_configured"
            status["reason"] = "wechat-opensdk-missing"
            status["message"] = "WechatOpenSDK is not linked in the iOS target."
        } else if !installed {
            status["status"] = "unavailable"
            status["reason"] = "wechat-not-installed"
            status["message"] = "WeChat is not installed on this iOS device."
        } else {
            status["ready"] = true
            status["status"] = "ready"
            status["reason"] = "wechat-opensdk-ready"
            status["message"] = "WeChat OpenSDK is configured and WeChat is installed."
        }

        return status
    }

    private func unavailableStatus(capability: String, message: String) -> [String: Any] {
        return [
            "capability": capability,
            "platform": "ios",
            "nativeAvailable": true,
            "ready": false,
            "status": "not_implemented",
            "reason": "not-implemented",
            "message": message
        ]
    }

    private func unavailableResult(
        capability: String,
        reason: String,
        message: String,
        status: String = "unavailable",
        extra: [String: Any] = [:]
    ) -> [String: Any] {
        var result: [String: Any] = [
            "success": false,
            "capability": capability,
            "action": capability == "wechatPay" ? "wechatPay" : "alipayPay",
            "platform": "ios",
            "nativeAvailable": true,
            "status": status,
            "reason": reason,
            "message": message
        ]
        extra.forEach { result[$0.key] = $0.value }
        return result
    }

    private func validateWechatPayPayload(_ call: CAPPluginCall) -> String? {
        let required = [
            "appId",
            "partnerId",
            "prepayId",
            "packageValue",
            "nonceStr",
            "timeStamp",
            "sign"
        ]
        for key in required {
            if (call.getString(key) ?? "").isEmpty {
                return "\(key) is required."
            }
        }
        return nil
    }

    private func wechatAppId() -> String {
        let value = Bundle.main.object(forInfoDictionaryKey: "WECHAT_OPEN_APP_ID") as? String ?? ""
        if value.hasPrefix("$(") { return "" }
        return value
    }

    private func wechatUniversalLink() -> String {
        let value = Bundle.main.object(forInfoDictionaryKey: "WECHAT_UNIVERSAL_LINK") as? String ?? ""
        if value.hasPrefix("$(") { return "" }
        return value
    }

    private func hasWechatAppId() -> Bool {
        return !wechatAppId().isEmpty
    }

    private func isWechatOpenSdkAvailable() -> Bool {
        #if canImport(WechatOpenSDK)
        return true
        #else
        return false
        #endif
    }

    private func isWechatInstalled() -> Bool {
        #if canImport(WechatOpenSDK)
        return WXApi.isWXAppInstalled()
        #else
        guard let url = URL(string: "weixin://") else { return false }
        return UIApplication.shared.canOpenURL(url)
        #endif
    }

    private func mask(_ value: String) -> String {
        if value.isEmpty { return "" }
        if value.count <= 6 { return "***" }
        return "\(value.prefix(4))***\(value.suffix(2))"
    }
}

#if canImport(WechatOpenSDK)
extension HeyboPaymentsPlugin: WXApiDelegate {
    public func onReq(_ req: BaseReq) {}

    public func onResp(_ resp: BaseResp) {
        guard let call = pendingWechatPayCall else { return }
        pendingWechatPayCall = nil

        var result: [String: Any] = [
            "capability": "wechatPay",
            "action": "wechatPay",
            "platform": "ios",
            "nativeAvailable": true,
            "wechatErrCode": resp.errCode,
            "wechatErrStr": resp.errStr ?? ""
        ]

        if resp.errCode == WXSuccess.rawValue {
            result["success"] = true
            result["status"] = "ready"
            result["reason"] = "wechat-client-returned-success"
            result["message"] = "WeChat client returned success. Confirm final payment status from the backend notification/query result."
        } else if resp.errCode == WXErrCodeUserCancel.rawValue {
            result["success"] = false
            result["status"] = "cancelled"
            result["reason"] = "wechat-user-cancelled"
            result["message"] = "User cancelled WeChat Pay."
        } else {
            result["success"] = false
            result["status"] = "error"
            result["reason"] = "wechat-client-error"
            result["message"] = "WeChat Pay returned an error. Confirm final payment status from the backend."
        }

        call.resolve(result)
    }
}
#endif
