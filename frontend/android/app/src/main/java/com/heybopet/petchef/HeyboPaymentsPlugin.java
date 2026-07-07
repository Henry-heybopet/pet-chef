package com.heybopet.petchef;

import android.content.pm.PackageManager;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tencent.mm.opensdk.modelbase.BaseResp;
import com.tencent.mm.opensdk.modelpay.PayReq;
import com.tencent.mm.opensdk.openapi.IWXAPI;
import com.tencent.mm.opensdk.openapi.WXAPIFactory;

@CapacitorPlugin(name = "HeyboPayments")
public class HeyboPaymentsPlugin extends Plugin {
    private static final String WECHAT_PACKAGE_NAME = "com.tencent.mm";
    private static PluginCall pendingWechatPayCall = null;
    private IWXAPI wechatApi = null;

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("wechatPay", wechatStatus());
        result.put("alipay", unavailableStatus("alipay", "Alipay native plugin is not implemented yet."));
        call.resolve(result);
    }

    @PluginMethod
    public void wechatPay(PluginCall call) {
        JSObject payload = call.getData();
        String validationError = validateWechatPayPayload(payload);
        if (!TextUtils.isEmpty(validationError)) {
            JSObject result = unavailableResult("wechatPay", "invalid-payload", validationError);
            call.resolve(result);
            return;
        }

        if (!hasWechatAppId()) {
            JSObject result = unavailableResult(
                "wechatPay",
                "wechat-app-id-missing",
                "WeChat Open Platform AppID is not configured for Android."
            );
            call.resolve(result);
            return;
        }

        if (!isWechatInstalled()) {
            JSObject result = unavailableResult(
                "wechatPay",
                "wechat-not-installed",
                "WeChat is not installed on this Android device."
            );
            call.resolve(result);
            return;
        }

        IWXAPI api = getWechatApi();
        if (!api.isWXAppInstalled()) {
            call.resolve(unavailableResult("wechatPay", "wechat-not-installed", "WeChat is not installed on this Android device."));
            return;
        }

        PayReq req = new PayReq();
        req.appId = payload.getString("appId");
        req.partnerId = payload.getString("partnerId");
        req.prepayId = payload.getString("prepayId");
        req.packageValue = payload.getString("packageValue");
        req.nonceStr = payload.getString("nonceStr");
        req.timeStamp = payload.getString("timeStamp");
        req.sign = payload.getString("sign");

        pendingWechatPayCall = call;
        boolean sent = api.sendReq(req);
        if (!sent) {
            pendingWechatPayCall = null;
            JSObject result = unavailableResult("wechatPay", "wechat-send-req-failed", "WeChat OpenSDK failed to launch the payment request.");
            result.put("prepayId", req.prepayId);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void alipayPay(PluginCall call) {
        call.resolve(unavailableResult("alipay", "not-implemented", "Alipay native payment is not implemented yet."));
    }

    private JSObject wechatStatus() {
        boolean configured = hasWechatAppId();
        boolean installed = isWechatInstalled();
        JSObject status = new JSObject();
        status.put("capability", "wechatPay");
        status.put("platform", "android");
        status.put("nativeAvailable", true);
        status.put("configured", configured);
        status.put("wechatInstalled", installed);
        status.put("appId", mask(BuildConfig.WECHAT_OPEN_APP_ID));
        status.put("ready", false);
        if (!configured) {
            status.put("status", "not_configured");
            status.put("reason", "wechat-app-id-missing");
            status.put("message", "Configure WECHAT_OPEN_APP_ID in frontend/android/tuya.properties or environment variables.");
        } else if (!installed) {
            status.put("status", "unavailable");
            status.put("reason", "wechat-not-installed");
            status.put("message", "WeChat is not installed on this Android device.");
        } else {
            status.put("ready", true);
            status.put("status", "ready");
            status.put("reason", "wechat-opensdk-ready");
            status.put("message", "WeChat OpenSDK is configured and WeChat is installed.");
        }
        return status;
    }

    public static void handleWechatPayResponse(BaseResp resp) {
        PluginCall call = pendingWechatPayCall;
        pendingWechatPayCall = null;
        if (call == null) return;

        JSObject result = new JSObject();
        result.put("capability", "wechatPay");
        result.put("action", "wechatPay");
        result.put("platform", "android");
        result.put("nativeAvailable", true);
        result.put("wechatErrCode", resp.errCode);
        result.put("wechatErrStr", resp.errStr == null ? "" : resp.errStr);

        if (resp.errCode == BaseResp.ErrCode.ERR_OK) {
            result.put("success", true);
            result.put("status", "ready");
            result.put("reason", "wechat-client-returned-success");
            result.put("message", "WeChat client returned success. Confirm final payment status from the backend notification/query result.");
        } else if (resp.errCode == BaseResp.ErrCode.ERR_USER_CANCEL) {
            result.put("success", false);
            result.put("status", "cancelled");
            result.put("reason", "wechat-user-cancelled");
            result.put("message", "User cancelled WeChat Pay.");
        } else {
            result.put("success", false);
            result.put("status", "error");
            result.put("reason", "wechat-client-error");
            result.put("message", "WeChat Pay returned an error. Confirm final payment status from the backend.");
        }

        call.resolve(result);
    }

    private JSObject unavailableStatus(String capability, String message) {
        JSObject status = new JSObject();
        status.put("capability", capability);
        status.put("platform", "android");
        status.put("nativeAvailable", true);
        status.put("ready", false);
        status.put("status", "not_implemented");
        status.put("reason", "not-implemented");
        status.put("message", message);
        return status;
    }

    private JSObject unavailableResult(String capability, String reason, String message) {
        JSObject result = new JSObject();
        result.put("success", false);
        result.put("capability", capability);
        result.put("action", capability.equals("wechatPay") ? "wechatPay" : "alipayPay");
        result.put("platform", "android");
        result.put("nativeAvailable", true);
        result.put("status", reason.equals("invalid-payload") ? "error" : "unavailable");
        result.put("reason", reason);
        result.put("message", message);
        return result;
    }

    private String validateWechatPayPayload(JSObject payload) {
        if (payload == null) return "WeChat payment payload is required.";
        String[] required = new String[] {
            "appId",
            "partnerId",
            "prepayId",
            "packageValue",
            "nonceStr",
            "timeStamp",
            "sign"
        };
        for (String key : required) {
            if (TextUtils.isEmpty(payload.getString(key))) return key + " is required.";
        }
        return "";
    }

    private boolean hasWechatAppId() {
        return !TextUtils.isEmpty(BuildConfig.WECHAT_OPEN_APP_ID);
    }

    private IWXAPI getWechatApi() {
        if (wechatApi == null) {
            wechatApi = WXAPIFactory.createWXAPI(getContext(), BuildConfig.WECHAT_OPEN_APP_ID, true);
            wechatApi.registerApp(BuildConfig.WECHAT_OPEN_APP_ID);
        }
        return wechatApi;
    }

    private boolean isWechatInstalled() {
        if (hasWechatAppId()) {
            return getWechatApi().isWXAppInstalled();
        }
        try {
            getContext().getPackageManager().getPackageInfo(WECHAT_PACKAGE_NAME, 0);
            return true;
        } catch (PackageManager.NameNotFoundException error) {
            return false;
        }
    }

    private String mask(String value) {
        if (TextUtils.isEmpty(value)) return "";
        if (value.length() <= 6) return "***";
        return value.substring(0, 4) + "***" + value.substring(value.length() - 2);
    }
}
