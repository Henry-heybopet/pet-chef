package com.heybopet.petchef;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HeyboAppUpdate")
public class HeyboAppUpdatePlugin extends Plugin {
    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("platform", "android");
        result.put("applicationId", BuildConfig.APPLICATION_ID);
        result.put("versionCode", BuildConfig.VERSION_CODE);
        result.put("versionName", BuildConfig.VERSION_NAME);
        call.resolve(result);
    }

    @PluginMethod
    public void openUpdate(PluginCall call) {
        String url = call.getString("url", "").trim();
        Uri uri = Uri.parse(url);
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            call.reject("升级地址必须使用 HTTPS");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        if (intent.resolveActivity(getContext().getPackageManager()) == null) {
            call.reject("手机上没有可打开升级地址的应用");
            return;
        }
        getActivity().startActivity(intent);
        call.resolve();
    }
}
