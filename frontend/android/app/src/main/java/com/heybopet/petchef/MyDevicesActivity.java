package com.heybopet.petchef;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.heybopet.petchef.device.DeviceStatus;
import com.heybopet.petchef.device.TuyaDeviceAdapter;
import com.heybopet.petchef.device.TuyaDeviceAdapterImpl;

import java.util.List;
import java.util.Map;

public class MyDevicesActivity extends Activity {
    private LinearLayout list;
    private TuyaDeviceAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        adapter = TuyaDeviceAdapterImpl.getInstance(this);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 64, 40, 40);
        root.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView title = new TextView(this);
        title.setText("我的鲜食机");
        title.setTextSize(28);
        root.addView(title);

        Button add = new Button(this);
        add.setText("添加鲜食机");
        add.setOnClickListener(v -> showMessage("添加鲜食机入口已预留：下一步接 Tuya 配网页。"));
        root.addView(add);

        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        root.addView(list);

        setContentView(root);
        loadDevices();
    }

    private void loadDevices() {
        list.removeAllViews();
        Map<String, Object> status = adapter.status();
        Object home = status.get("homeId");
        Long homeId = home instanceof Number ? ((Number) home).longValue() : null;

        if (!adapter.isInitialized() || homeId == null) {
            addDeviceCard("鲜食机", "离线", "待机", null);
            showMessage("Tuya SDK 未初始化或缺少 homeId；请先从现有 H5 调试流程登录并初始化。");
            return;
        }

        adapter.getDeviceList(homeId, result -> runOnUiThread(() -> {
            list.removeAllViews();
            if (!result.success) {
                showMessage(result.error.message);
                return;
            }
            List<DeviceStatus> devices = result.data;
            if (devices == null || devices.isEmpty()) {
                showMessage("暂无已绑定鲜食机。");
                return;
            }
            for (DeviceStatus device : devices) {
                addDeviceCard(device.name, device.online ? "在线" : "离线", labelFor(device.cookingStatus), device);
            }
        }));
    }

    private void addDeviceCard(String name, String online, String cooking, DeviceStatus device) {
        Button card = new Button(this);
        card.setText(name + "\n状态：" + online + " / " + cooking);
        card.setAllCaps(false);
        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, DeviceDetailActivity.class);
            if (device != null) {
                intent.putExtra("devId", device.devId);
                intent.putExtra("name", device.name);
                intent.putExtra("online", device.online);
                intent.putExtra("cookingStatus", labelFor(device.cookingStatus));
            }
            startActivity(intent);
        });
        list.addView(card);
    }

    private void showMessage(String text) {
        TextView message = new TextView(this);
        message.setText(text);
        message.setTextSize(16);
        list.addView(message);
    }

    private String labelFor(String status) {
        if (DeviceStatus.LOW_TEMP_COOKING.equals(status)) return "低温烹饪中";
        if (DeviceStatus.DONE.equals(status)) return "烹饪完成";
        if (DeviceStatus.FAULT.equals(status)) return "故障";
        if (DeviceStatus.OFFLINE.equals(status)) return "离线";
        return "待机";
    }
}
