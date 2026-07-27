package com.heybopet.petchef;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HeyboTuyaPlugin.class);
        registerPlugin(HeyboAppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        if (BuildConfig.DEBUG && getBridge() != null && getBridge().getWebView() != null) {
            // Debug only: http://8.130.211.76 avatar uploads are blocked by the https Capacitor WebView.
            // Production must serve uploads over HTTPS instead of enabling mixed content.
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
