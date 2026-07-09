package com.heybopet.petchef;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.heybopet.petchef.device.TuyaDeviceAdapter;
import com.heybopet.petchef.device.TuyaDeviceAdapterImpl;
import com.heybopet.petchef.device.TuyaDeviceError;
import com.heybopet.petchef.device.DeviceStatus;
import com.heybopet.petchef.device.TuyaSessionManager;

import java.util.HashMap;
import java.util.Map;

public class DeviceDetailActivity extends Activity {
    private String devId;
    private TextView statusText;
    private TextView dpText;
    private TuyaDeviceAdapter adapter;
    private TuyaSessionManager sessionManager;
    private final Map<String, Object> latestDps = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        adapter = TuyaDeviceAdapterImpl.getInstance(this);
        sessionManager = TuyaSessionManager.getInstance(this);
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

        statusText = new TextView(this);
        statusText.setText("在线状态：" + (online ? "在线" : "离线") + "\n当前烹饪状态：" + (cooking == null ? "待机" : cooking));
        statusText.setTextSize(18);
        root.addView(statusText);

        dpText = new TextView(this);
        dpText.setText("基础 DP 状态区域\n设备 ID：" + (devId == null ? "未选择" : devId));
        dpText.setTextSize(16);
        root.addView(dpText);

        Button start = new Button(this);
        start.setText("开始烹饪（后端校验接入前禁用）");
        start.setEnabled(false);
        root.addView(start);

        Button refresh = new Button(this);
        refresh.setText("刷新状态");
        refresh.setOnClickListener(v -> refreshStatus());
        root.addView(refresh);

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
        refreshStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        subscribe();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (devId != null) adapter.unsubscribeDevice(devId);
    }

    @Override
    protected void onDestroy() {
        if (devId != null) adapter.unsubscribeDevice(devId);
        super.onDestroy();
    }

    private boolean hasDevice() {
        if (devId != null && !devId.isEmpty()) return true;
        dpText.setText("请先从我的鲜食机选择设备。");
        return false;
    }

    private void refreshStatus() {
        if (!hasDevice()) return;
        sessionManager.ensureReady(session -> {
            if (!session.success) {
                runOnUiThread(() -> showError(session.error));
                return;
            }
            adapter.getDeviceStatus(devId, statusResult -> {
                if (!statusResult.success) {
                    runOnUiThread(() -> showError(statusResult.error));
                    return;
                }
                adapter.getDeviceDpState(devId, dpResult -> runOnUiThread(() -> {
                    if (!dpResult.success) {
                        showError(dpResult.error);
                        return;
                    }
                    latestDps.clear();
                    latestDps.putAll(dpResult.data);
                    renderStatus(statusResult.data);
                    renderDps();
                }));
            });
        });
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
        new AlertDialog.Builder(this)
            .setTitle("确认解绑")
            .setMessage("解绑后此设备将从当前 Tuya 家庭移除。确认继续？")
            .setNegativeButton("取消", null)
            .setPositiveButton("确认解绑", (dialog, which) ->
                adapter.unbindDevice(devId, result -> runOnUiThread(() -> showResult("解绑", result.success, result.error == null ? null : result.error.message)))
            )
            .show();
    }

    private void showResult(String action, boolean success, String error) {
        dpText.setText("基础 DP 状态区域\n设备 ID：" + devId + "\n" + action + "：" + (success ? "已发送" : error));
        if (success) refreshStatus();
    }

    private void subscribe() {
        if (!hasDevice() || !adapter.isInitialized()) return;
        adapter.subscribeDevice(devId, new TuyaDeviceAdapter.DeviceStateListener() {
            @Override
            public void onDpUpdate(String updatedDevId, Map<String, Object> dps) {
                runOnUiThread(() -> {
                    latestDps.clear();
                    latestDps.putAll(dps);
                    renderDps();
                });
            }

            @Override
            public void onStatusChanged(String updatedDevId, boolean online) {
                runOnUiThread(() -> statusText.setText("在线状态：" + (online ? "在线" : "离线") + "\n当前烹饪状态：" + labelForStatus()));
            }

            @Override
            public void onRemoved(String removedDevId) {
                runOnUiThread(() -> dpText.setText("设备已解绑或移除：" + removedDevId));
            }

            @Override
            public void onError(String updatedDevId, TuyaDeviceError error) {
                runOnUiThread(() -> showError(error));
            }
        }, result -> {
            if (!result.success) runOnUiThread(() -> showError(result.error));
        });
    }

    private void renderStatus(DeviceStatus status) {
        statusText.setText("在线状态：" + (status.online ? "在线" : "离线") + "\n当前烹饪状态：" + label(status.cookingStatus));
    }

    private void renderDps() {
        StringBuilder text = new StringBuilder();
        text.append("基础 DP 状态区域\n");
        text.append("设备 ID：").append(devId).append("\n");
        appendDp(text, "1", "开关");
        appendDp(text, "3", "烹饪模式");
        appendDp(text, "5", "工作状态");
        appendDp(text, "7", "烹饪时间");
        appendDp(text, "8", "剩余时间");
        appendDp(text, "9", "烹饪温度");
        appendDp(text, "10", "实时温度");
        appendDp(text, "12", "故障告警");
        appendDp(text, "102", "功率");
        appendDp(text, "107", "启动 / 暂停 / 复位");
        appendDp(text, "108", "速度");
        dpText.setText(text.toString());
    }

    private void appendDp(StringBuilder text, String id, String label) {
        Object value = latestDps.get(id);
        text.append("DP ").append(id).append(" ").append(label).append("：").append(value == null ? "--" : value).append("\n");
    }

    private void showError(TuyaDeviceError error) {
        dpText.setText("设备状态读取失败：\n" + (error == null ? "未知错误" : error.code + "\n" + error.message));
    }

    private String labelForStatus() {
        Object status = latestDps.get("5");
        if ("cooking".equals(String.valueOf(status))) return "低温烹饪中";
        if ("done".equals(String.valueOf(status)) || "complete".equals(String.valueOf(status))) return "烹饪完成";
        if (latestDps.get("12") != null && !"0".equals(String.valueOf(latestDps.get("12")))) return "故障";
        return "待机";
    }

    private String label(String status) {
        if (DeviceStatus.LOW_TEMP_COOKING.equals(status)) return "低温烹饪中";
        if (DeviceStatus.DONE.equals(status)) return "烹饪完成";
        if (DeviceStatus.FAULT.equals(status)) return "故障";
        if (DeviceStatus.OFFLINE.equals(status)) return "离线";
        return "待机";
    }
}
