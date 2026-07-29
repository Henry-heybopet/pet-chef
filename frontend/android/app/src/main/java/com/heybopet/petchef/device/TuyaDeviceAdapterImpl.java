package com.heybopet.petchef.device;

import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.text.TextUtils;

import androidx.core.content.ContextCompat;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.heybopet.petchef.BuildConfig;
import com.thingclips.smart.home.sdk.ThingHomeSdk;
import com.thingclips.smart.home.sdk.bean.HomeBean;
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback;
import com.thingclips.smart.sdk.api.IResultCallback;
import com.thingclips.smart.sdk.api.IThingDevice;
import com.thingclips.smart.sdk.bean.DeviceBean;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class TuyaDeviceAdapterImpl implements TuyaDeviceAdapter {
    public static final String PET_CHEF_PID = "ak2kofibhuvdtqip";

    private static TuyaDeviceAdapterImpl instance;

    private final Context appContext;
    private WeakReference<Activity> activityRef;
    private boolean initialized = false;
    private Long currentHomeId = null;
    private final Map<String, IThingDevice> subscribedDevices = new ConcurrentHashMap<>();
    private final Map<String, DeviceStatus> deviceCache = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> dpsCache = new ConcurrentHashMap<>();

    private TuyaDeviceAdapterImpl(Activity activity) {
        this.appContext = activity.getApplicationContext();
        this.activityRef = new WeakReference<>(activity);
    }

    public static synchronized TuyaDeviceAdapterImpl getInstance(Activity activity) {
        if (instance == null) {
            instance = new TuyaDeviceAdapterImpl(activity);
        } else {
            instance.activityRef = new WeakReference<>(activity);
        }
        return instance;
    }

    public void setCurrentHomeId(Long homeId) {
        currentHomeId = homeId;
    }

    @Override
    public Long getCurrentHomeId() {
        return currentHomeId;
    }

    @Override
    public Map<String, Object> status() {
        Map<String, Object> result = new HashMap<>();
        result.put("platform", "android");
        result.put("nativeAvailable", true);
        result.put("configured", hasTuyaCredentials());
        result.put("initialized", initialized);
        result.put("appKey", mask(BuildConfig.TUYA_ANDROID_APP_KEY));
        result.put("pid", PET_CHEF_PID);
        if (currentHomeId != null) result.put("homeId", currentHomeId);
        result.put("bluetoothEnabled", isBluetoothEnabled());
        result.put("gpsEnabled", isLocationEnabled());
        result.put("wifiSsid", wifiSsid());
        result.put("wifiFreq", wifiFreq());
        result.put("permBluetoothScan", hasBluetoothScanPermission());
        result.put("permBluetoothConnect", hasBluetoothConnectPermission());
        result.put("permLocation", ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED);
        return result;
    }

    @Override
    public boolean isInitialized() {
        return initialized;
    }

    @Override
    public void init(TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        if (!hasTuyaCredentials()) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.MISSING_CREDENTIALS, "Tuya Android AppKey/AppSecret is missing. Configure frontend/android/tuya.properties locally."));
            return;
        }

        try {
            Activity activity = activityRef.get();
            if (activity == null) {
                callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.UNKNOWN, "Activity is not available."));
                return;
            }
            ThingHomeSdk.init(activity.getApplication(), BuildConfig.TUYA_ANDROID_APP_KEY, BuildConfig.TUYA_ANDROID_APP_SECRET);
            ThingHomeSdk.setDebugMode(BuildConfig.DEBUG);
            initialized = true;
            Map<String, Object> result = new HashMap<>();
            result.put("initialized", true);
            result.put("appKey", mask(BuildConfig.TUYA_ANDROID_APP_KEY));
            callback.onResult(TuyaDeviceResult.ok(result));
        } catch (Exception error) {
            initialized = false;
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.UNKNOWN, "Tuya SDK init failed: " + error.getMessage()));
        }
    }

    @Override
    public void getDeviceList(Long homeId, TuyaDeviceResult.Callback<List<DeviceStatus>> callback) {
        if (!ensureInitialized(callback)) return;
        Long targetHomeId = homeId != null ? homeId : currentHomeId;
        if (targetHomeId == null) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "homeId is required."));
            return;
        }

        ThingHomeSdk.newHomeInstance(targetHomeId).getHomeDetail(new IThingHomeResultCallback() {
            @Override
            public void onSuccess(HomeBean homeBean) {
                currentHomeId = homeBean.getHomeId();
                List<DeviceStatus> devices = new ArrayList<>();
                List<DeviceBean> rawDevices = homeBean.getDeviceList();
                if (rawDevices != null) {
                    for (DeviceBean item : rawDevices) {
                        DeviceStatus status = toDeviceStatus(item);
                        remember(status);
                        devices.add(status);
                    }
                }
                callback.onResult(TuyaDeviceResult.ok(devices));
            }

            @Override
            public void onError(String code, String error) {
                callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.TUYA_ERROR, "Query Tuya devices failed: " + error, code));
            }
        });
    }

    @Override
    public void getDeviceStatus(String devId, TuyaDeviceResult.Callback<DeviceStatus> callback) {
        if (TextUtils.isEmpty(devId)) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "devId is required."));
            return;
        }
        getDeviceList(currentHomeId, result -> {
            if (!result.success) {
                callback.onResult(TuyaDeviceResult.fail(result.error.code, result.error.message, result.error.tuyaCode));
                return;
            }
            for (DeviceStatus device : result.data) {
                if (devId.equals(device.devId)) {
                    callback.onResult(TuyaDeviceResult.ok(device));
                    return;
                }
            }
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.DEVICE_NOT_FOUND, "Device not found: " + devId));
        });
    }

    @Override
    public void getDeviceDpState(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        if (TextUtils.isEmpty(devId)) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "devId is required."));
            return;
        }
        Map<String, Object> cached = dpsCache.get(devId);
        if (cached != null) {
            callback.onResult(TuyaDeviceResult.ok(new HashMap<>(cached)));
            return;
        }
        getDeviceStatus(devId, result -> {
            if (!result.success) {
                callback.onResult(TuyaDeviceResult.fail(result.error.code, result.error.message, result.error.tuyaCode));
                return;
            }
            callback.onResult(TuyaDeviceResult.ok(new HashMap<>(result.data.dps)));
        });
    }

    @Override
    public void subscribeDevice(String devId, DeviceStateListener listener, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        if (!ensureInitialized(callback)) return;
        if (TextUtils.isEmpty(devId)) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "devId is required."));
            return;
        }
        unsubscribeDevice(devId);
        try {
            IThingDevice device = ThingHomeSdk.newDeviceInstance(devId);
            device.registerDevListener(new com.thingclips.smart.sdk.api.IDevListener() {
                @Override
                public void onDpUpdate(String updatedDevId, String dpStr) {
                    Map<String, Object> dps = parseDps(dpStr);
                    Map<String, Object> merged = new HashMap<>(dpsCache.getOrDefault(updatedDevId, new HashMap<>()));
                    merged.putAll(dps);
                    dpsCache.put(updatedDevId, merged);
                    if (listener != null) listener.onDpUpdate(updatedDevId, new HashMap<>(merged));
                }

                @Override
                public void onRemoved(String removedDevId) {
                    subscribedDevices.remove(removedDevId);
                    deviceCache.remove(removedDevId);
                    dpsCache.remove(removedDevId);
                    if (listener != null) listener.onRemoved(removedDevId);
                }

                @Override
                public void onStatusChanged(String updatedDevId, boolean online) {
                    DeviceStatus old = deviceCache.get(updatedDevId);
                    DeviceStatus next = new DeviceStatus(
                        updatedDevId,
                        old == null ? "鲜食机" : old.name,
                        old == null ? PET_CHEF_PID : old.productId,
                        old == null ? "" : old.macAddress,
                        online,
                        dpsCache.getOrDefault(updatedDevId, old == null ? new HashMap<>() : old.dps)
                    );
                    remember(next);
                    if (listener != null) listener.onStatusChanged(updatedDevId, online);
                }

                @Override
                public void onNetworkStatusChanged(String updatedDevId, boolean status) {
                }

                @Override
                public void onDevInfoUpdate(String updatedDevId) {
                }
            });
            subscribedDevices.put(devId, device);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("devId", devId);
            callback.onResult(TuyaDeviceResult.ok(result));
        } catch (Exception error) {
            if (listener != null) listener.onError(devId, new TuyaDeviceError(TuyaDeviceError.UNKNOWN, error.getMessage()));
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.UNKNOWN, "Subscribe device failed: " + error.getMessage()));
        }
    }

    @Override
    public void unsubscribeDevice(String devId) {
        IThingDevice device = subscribedDevices.remove(devId);
        if (device != null) {
            device.unRegisterDevListener();
            device.onDestroy();
        }
    }

    @Override
    public void publishDps(DeviceCommand command, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        if (!ensureInitialized(callback)) return;
        if (command == null || TextUtils.isEmpty(command.devId) || command.dps == null) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "devId and dps are required."));
            return;
        }

        IThingDevice device = ThingHomeSdk.newDeviceInstance(command.devId);
        device.publishDps(JSON.toJSONString(command.dps), new IResultCallback() {
            @Override
            public void onSuccess() {
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("devId", command.devId);
                result.put("dps", JSON.toJSONString(command.dps));
                callback.onResult(TuyaDeviceResult.ok(result));
                device.onDestroy();
            }

            @Override
            public void onError(String code, String error) {
                callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.TUYA_ERROR, "Publish DP failed: " + error, code));
                device.onDestroy();
            }
        });
    }

    @Override
    public void startDiyCooking(String devId, int temperature, int cookTime, int power, String speed, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        if (cookTime <= 0) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "cookTime seconds is required."));
            return;
        }
        publishDps(DeviceCommand.diyCooking(devId, temperature, cookTime, power, speed), parameterResult -> {
            if (!parameterResult.success) {
                callback.onResult(parameterResult);
                return;
            }
            publishDps(DeviceCommand.cookingAction(devId, "start"), callback);
        });
    }

    @Override
    public void pauseCooking(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        publishDps(DeviceCommand.cookingAction(devId, "pause"), callback);
    }

    @Override
    public void resetCooking(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        publishDps(DeviceCommand.cookingAction(devId, "reset"), callback);
    }

    @Override
    public void unbindDevice(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback) {
        if (!ensureInitialized(callback)) return;
        if (TextUtils.isEmpty(devId)) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.INVALID_ARGUMENT, "devId is required."));
            return;
        }

        IThingDevice device = ThingHomeSdk.newDeviceInstance(devId);
        device.removeDevice(new IResultCallback() {
            @Override
            public void onSuccess() {
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("devId", devId);
                callback.onResult(TuyaDeviceResult.ok(result));
                device.onDestroy();
            }

            @Override
            public void onError(String code, String error) {
                callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.TUYA_ERROR, "Unbind device failed: " + error, code));
                device.onDestroy();
            }
        });
    }

    private DeviceStatus toDeviceStatus(DeviceBean item) {
        Map<String, Object> dps = item.getDps() == null ? new HashMap<>() : item.getDps();
        return new DeviceStatus(item.getDevId(), item.getName(), item.getProductId(), item.getMac(), item.getIsOnline(), dps);
    }

    private void remember(DeviceStatus status) {
        if (status == null || TextUtils.isEmpty(status.devId)) return;
        deviceCache.put(status.devId, status);
        dpsCache.put(status.devId, status.dps == null ? new HashMap<>() : new HashMap<>(status.dps));
    }

    private Map<String, Object> parseDps(String dpStr) {
        Map<String, Object> result = new HashMap<>();
        if (TextUtils.isEmpty(dpStr)) return result;
        try {
            JSONObject object = JSON.parseObject(dpStr);
            for (String key : object.keySet()) result.put(key, object.get(key));
        } catch (Exception ignored) {
        }
        return result;
    }

    private <T> boolean ensureInitialized(TuyaDeviceResult.Callback<T> callback) {
        if (!initialized) {
            callback.onResult(TuyaDeviceResult.fail(TuyaDeviceError.SDK_NOT_INITIALIZED, "Tuya SDK is not initialized. Call init() first."));
            return false;
        }
        return true;
    }

    private boolean hasTuyaCredentials() {
        return !TextUtils.isEmpty(BuildConfig.TUYA_ANDROID_APP_KEY)
            && !TextUtils.isEmpty(BuildConfig.TUYA_ANDROID_APP_SECRET);
    }

    private boolean isBluetoothEnabled() {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            return adapter != null && adapter.isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isLocationEnabled() {
        try {
            LocationManager manager = (LocationManager) appContext.getSystemService(Context.LOCATION_SERVICE);
            return manager != null && (manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        } catch (Exception e) {
            return false;
        }
    }

    private String wifiSsid() {
        WifiInfo info = wifiInfo();
        if (info == null) return "";
        String ssid = info.getSSID();
        if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
            ssid = ssid.substring(1, ssid.length() - 1);
        }
        if (ssid == null || ssid.trim().isEmpty() || "<unknown ssid>".equalsIgnoreCase(ssid.trim())) return "";
        return ssid;
    }

    private String wifiFreq() {
        WifiInfo info = wifiInfo();
        if (info == null) return "Unknown";
        int freq = info.getFrequency();
        if (freq >= 2400 && freq <= 2500) return "2.4G";
        if (freq >= 4900 && freq <= 5900) return "5G";
        return freq + " MHz";
    }

    private WifiInfo wifiInfo() {
        try {
            WifiManager manager = (WifiManager) appContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            return manager == null ? null : manager.getConnectionInfo();
        } catch (Exception e) {
            return null;
        }
    }

    private boolean hasBluetoothScanPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasBluetoothConnectPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private String mask(String value) {
        if (TextUtils.isEmpty(value)) return "";
        if (value.length() <= 8) return "****";
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
