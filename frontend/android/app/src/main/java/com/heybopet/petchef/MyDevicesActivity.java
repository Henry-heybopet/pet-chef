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
import com.heybopet.petchef.device.TuyaDeviceError;
import com.heybopet.petchef.device.TuyaSessionManager;

import java.util.List;

public class MyDevicesActivity extends Activity {
    private LinearLayout list;
    private TuyaDeviceAdapter adapter;
    private TuyaSessionManager sessionManager;

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
        sessionManager = TuyaSessionManager.getInstance(this);
        loadDevices();
    }

    private void loadDevices() {
        list.removeAllViews();
        showMessage("正在读取真实设备列表...");
        sessionManager.ensureReady(result -> runOnUiThread(() -> {
            list.removeAllViews();
            if (!result.success) {
                if (TuyaDeviceError.NOT_LOGGED_IN.equals(result.error.code)) {
                    showMessage("未登录或原生暂时拿不到 Heybo 登录态。\n" + result.error.message);
                    showDebugFallback();
                    return;
                }
                showMessage(result.error.message);
                showDebugFallback();
                return;
            }
            List<DeviceStatus> devices = result.data.devices;
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
        if (device != null) {
            card.setText(name + "\nDevId：" + device.devId + "\n状态：" + online + " / " + cooking);
        }
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

    private void showDebugFallback() {
        TextView fallback = new TextView(this);
        fallback.setText("Debug fallback：现有 H5 联调中心仍可用于登录、配网、DP 调试和研发排障；正式页面不依赖任意 DP 下发。");
        fallback.setTextSize(14);
        list.addView(fallback);
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
