package com.heybopet.petchef;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HeyboTuyaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
