package com.heybopet.petchef;

import android.app.Activity;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.heybopet.petchef.device.TuyaDeviceAdapter;
import com.heybopet.petchef.device.TuyaDeviceAdapterImpl;

public class DeviceDetailActivity extends Activity {
    private String devId;
    private TextView output;
    private TuyaDeviceAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        adapter = TuyaDeviceAdapterImpl.getInstance(this);
        devId = getIntent().getStringExtra("devId");
        String name = getIntent().getStringExtra("name");
        boolean online = getIntent().getBooleanExtra("online", false);
        String cooking = getIntent().getStringExtra("cookingStatus");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 64, 40, 40);
        root.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView title = new TextView(this);
        title.setText(name == null ? "鲜食机详情" : name);
        title.setTextSize(28);
        root.addView(title);

        TextView status = new TextView(this);
        status.setText("在线状态：" + (online ? "在线" : "离线") + "\n当前烹饪状态：" + (cooking == null ? "待机" : cooking));
        status.setTextSize(18);
        root.addView(status);

        output = new TextView(this);
        output.setText("基础 DP 状态区域\n设备 ID：" + (devId == null ? "未选择" : devId));
        output.setTextSize(16);
        root.addView(output);

        Button start = new Button(this);
        start.setText("开始烹饪");
        start.setOnClickListener(v -> startCooking());
        root.addView(start);

        Button pause = new Button(this);
        pause.setText("暂停");
        pause.setOnClickListener(v -> sendPause());
        root.addView(pause);

        Button cancel = new Button(this);
        cancel.setText("取消");
        cancel.setOnClickListener(v -> sendReset());
        root.addView(cancel);

        Button unbind = new Button(this);
        unbind.setText("解绑");
        unbind.setOnClickListener(v -> unbind());
        root.addView(unbind);

        setContentView(root);
    }

    private boolean hasDevice() {
        if (devId != null && !devId.isEmpty()) return true;
        output.setText("请先从我的鲜食机选择设备。");
        return false;
    }

    private void startCooking() {
        if (!hasDevice()) return;
        adapter.startDiyCooking(devId, 62, 1020, 6, "1", result -> runOnUiThread(() -> showResult("开始烹饪", result.success, result.error == null ? null : result.error.message)));
    }

    private void sendPause() {
        if (!hasDevice()) return;
        adapter.pauseCooking(devId, result -> runOnUiThread(() -> showResult("暂停", result.success, result.error == null ? null : result.error.message)));
    }

    private void sendReset() {
        if (!hasDevice()) return;
        adapter.resetCooking(devId, result -> runOnUiThread(() -> showResult("取消", result.success, result.error == null ? null : result.error.message)));
    }

    private void unbind() {
        if (!hasDevice()) return;
        adapter.unbindDevice(devId, result -> runOnUiThread(() -> showResult("解绑", result.success, result.error == null ? null : result.error.message)));
    }

    private void showResult(String action, boolean success, String error) {
        output.setText("基础 DP 状态区域\n设备 ID：" + devId + "\n" + action + "：" + (success ? "已发送" : error));
    }
}
