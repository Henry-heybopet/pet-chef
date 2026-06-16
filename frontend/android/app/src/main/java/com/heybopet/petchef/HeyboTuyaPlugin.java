package com.heybopet.petchef;

import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.thingclips.smart.home.sdk.ThingHomeSdk;

@CapacitorPlugin(name = "HeyboTuya")
public class HeyboTuyaPlugin extends Plugin {
    private boolean initialized = false;

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("nativeAvailable", true);
        result.put("configured", hasTuyaCredentials());
        result.put("initialized", initialized);
        result.put("appKey", mask(BuildConfig.TUYA_ANDROID_APP_KEY));
        call.resolve(result);
    }

    @PluginMethod
    public void init(PluginCall call) {
        if (!hasTuyaCredentials()) {
            call.reject("Tuya Android AppKey/AppSecret is missing. Configure frontend/android/tuya.properties locally.");
            return;
        }

        try {
            ThingHomeSdk.init(getActivity().getApplication(), BuildConfig.TUYA_ANDROID_APP_KEY, BuildConfig.TUYA_ANDROID_APP_SECRET);
            ThingHomeSdk.setDebugMode(BuildConfig.DEBUG);
            initialized = true;

            JSObject result = new JSObject();
            result.put("initialized", true);
            result.put("appKey", mask(BuildConfig.TUYA_ANDROID_APP_KEY));
            call.resolve(result);
        } catch (Exception error) {
            initialized = false;
            call.reject("Tuya SDK init failed: " + error.getMessage(), error);
        }
    }

    private boolean hasTuyaCredentials() {
        return !TextUtils.isEmpty(BuildConfig.TUYA_ANDROID_APP_KEY)
            && !TextUtils.isEmpty(BuildConfig.TUYA_ANDROID_APP_SECRET);
    }

    private String mask(String value) {
        if (TextUtils.isEmpty(value)) return "";
        if (value.length() <= 8) return "****";
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
