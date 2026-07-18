package com.heybopet.petchef;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class CookingCenterActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 64, 40, 40);
        root.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView title = new TextView(this);
        title.setText("烹饪中心");
        title.setTextSize(28);
        root.addView(title);

        Button devices = new Button(this);
        devices.setText("我的鲜食机");
        devices.setOnClickListener(v -> startActivity(new Intent(this, MyDevicesActivity.class)));
        root.addView(devices);

        Button addDevice = new Button(this);
        addDevice.setText("添加鲜食机");
        addDevice.setOnClickListener(v -> startActivity(new Intent(this, MyDevicesActivity.class).putExtra("openAdd", true)));
        root.addView(addDevice);

        Button h5Home = new Button(this);
        h5Home.setText("返回 H5 首页");
        h5Home.setOnClickListener(v -> finish());
        root.addView(h5Home);

        setContentView(root);
    }
}
