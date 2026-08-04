package com.heybopet.petchef;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private OnBackPressedCallback webBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HeyboTuyaPlugin.class);
        registerPlugin(HeyboAppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        webBackCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null) {
                    runDefaultBack();
                    return;
                }
                getBridge().eval(
                    "window.__petChefHandleBack ? window.__petChefHandleBack() : false",
                    handled -> {
                        if (!"true".equals(handled)) {
                            runDefaultBack();
                        }
                    }
                );
            }
        };
        getOnBackPressedDispatcher().addCallback(this, webBackCallback);
        if (BuildConfig.DEBUG && getBridge() != null && getBridge().getWebView() != null) {
            // Debug only: http://8.130.211.76 avatar uploads are blocked by the https Capacitor WebView.
            // Production must serve uploads over HTTPS instead of enabling mixed content.
            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }

    private void runDefaultBack() {
        webBackCallback.setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
        webBackCallback.setEnabled(true);
    }
}
