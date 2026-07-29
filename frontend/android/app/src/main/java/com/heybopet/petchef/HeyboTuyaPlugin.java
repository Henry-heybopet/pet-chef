package com.heybopet.petchef;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import com.alibaba.fastjson.JSON;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PermissionCallback;
import com.heybopet.petchef.auth.NativeAuthStore;
import com.heybopet.petchef.device.DeviceCommand;
import com.heybopet.petchef.device.TuyaDeviceAdapterImpl;
import com.heybopet.petchef.device.TuyaDeviceResult;
import com.heybopet.petchef.device.TuyaSessionManager;
import com.thingclips.smart.android.user.api.ILoginCallback;
import com.thingclips.smart.android.user.bean.User;
import com.thingclips.smart.home.sdk.ThingHomeSdk;
import com.thingclips.smart.home.sdk.builder.ActivatorBuilder;
import com.thingclips.smart.home.sdk.bean.HomeBean;
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback;
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback;
import com.thingclips.smart.sdk.api.IThingActivator;
import com.thingclips.smart.sdk.api.IThingActivatorGetToken;
import com.thingclips.smart.sdk.api.IThingSmartActivatorListener;
import com.thingclips.smart.sdk.api.IResultCallback;
import com.thingclips.smart.sdk.api.IThingDevice;
import com.thingclips.smart.sdk.bean.DeviceBean;
import com.thingclips.smart.sdk.enums.ActivatorModelEnum;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import android.Manifest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "HeyboTuya",
    permissions = {
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }
        ),
        @Permission(
            alias = "bluetooth",
            strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }
        )
    }
)
public class HeyboTuyaPlugin extends Plugin {
    private static final String COUNTRY_CODE_CHINA = "86";
    private static final String DEFAULT_HOME_NAME = "Heybo Pet";
    private static final String DEFAULT_HOME_GEO = "China";
    private static final String PET_CHEF_PID = "ak2kofibhuvdtqip";

    private static final String DP_POWER = "1";
    private static final String DP_MODE = "3";
    private static final String DP_COOK_TIME = "7";
    private static final String DP_COOK_TEMPERATURE = "9";
    private static final String DP_COOK_MODE_POWER = "102";
    private static final String DP_COOK_START_PAUSE_RESET = "107";
    private static final String DP_COOK_MODE_SPEED = "108";

    private boolean initialized = false;
    private Long currentHomeId = null;
    private IThingActivator currentActivator = null;
    private final Map<String, IThingDevice> activeDevices = new HashMap<>();

    private TuyaDeviceAdapterImpl adapter() {
        return TuyaDeviceAdapterImpl.getInstance(getActivity());
    }

    private NativeAuthStore authStore() {
        return new NativeAuthStore(getContext());
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(mapToJsObject(adapter().status()));
    }

    @PluginMethod
    public void init(PluginCall call) {
        adapter().init(result -> {
            initialized = result.success;
            resolveMapResult(call, result);
        });
    }

    @PluginMethod
    public void loginOrRegisterWithHeyboUid(PluginCall call) {
        if (!ensureInitialized(call)) return;

        String tuyaUid = call.getString("tuyaUid");
        String password = call.getString("password");

        if (TextUtils.isEmpty(tuyaUid)) {
            String heyboUid = call.getString("heyboUid");
            if (TextUtils.isEmpty(heyboUid)) {
                call.reject("tuyaUid or heyboUid is required.");
                return;
            }
            tuyaUid = "heybo_" + heyboUid;
        }

        if (TextUtils.isEmpty(password)) {
            call.reject("password is required.");
            return;
        }

        final String finalTuyaUid = tuyaUid;
        ThingHomeSdk.getUserInstance().loginOrRegisterWithUid(
            COUNTRY_CODE_CHINA,
            tuyaUid,
            password,
            new ILoginCallback() {
                @Override
                public void onSuccess(User user) {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("tuyaUid", finalTuyaUid);
                    call.resolve(result);
                }

                @Override
                public void onError(String code, String error) {
                    call.reject("Tuya UID login failed: " + code + " " + error);
                }
            }
        );
    }

    @PluginMethod
    public void getHomeList(PluginCall call) {
        if (!ensureInitialized(call)) return;

        ThingHomeSdk.getHomeManagerInstance().queryHomeList(new IThingGetHomeListCallback() {
            @Override
            public void onSuccess(List<HomeBean> homeBeans) {
                call.resolve(homeListResult(homeBeans));
            }

            @Override
            public void onError(String code, String error) {
                call.reject("Query Tuya home list failed: " + code + " " + error);
            }
        });
    }

    @PluginMethod
    public void ensureDefaultHome(PluginCall call) {
        if (!ensureInitialized(call)) return;

        ThingHomeSdk.getHomeManagerInstance().queryHomeList(new IThingGetHomeListCallback() {
            @Override
            public void onSuccess(List<HomeBean> homeBeans) {
                if (homeBeans != null && !homeBeans.isEmpty()) {
                    currentHomeId = homeBeans.get(0).getHomeId();
                    adapter().setCurrentHomeId(currentHomeId);
                    call.resolve(homeResult(homeBeans.get(0), false));
                    return;
                }

                ThingHomeSdk.getHomeManagerInstance().createHome(
                    DEFAULT_HOME_NAME,
                    0,
                    0,
                    DEFAULT_HOME_GEO,
                    new ArrayList<String>(),
                    new IThingHomeResultCallback() {
                        @Override
                        public void onSuccess(HomeBean homeBean) {
                            currentHomeId = homeBean.getHomeId();
                            adapter().setCurrentHomeId(currentHomeId);
                            call.resolve(homeResult(homeBean, true));
                        }

                        @Override
                        public void onError(String code, String error) {
                            call.reject("Create Tuya default home failed: " + code + " " + error);
                        }
                    }
                );
            }

            @Override
            public void onError(String code, String error) {
                call.reject("Query Tuya home list failed: " + code + " " + error);
            }
        });
    }

    @PluginMethod
    public void getDeviceList(PluginCall call) {
        if (!ensureInitialized(call)) return;

        Long homeId = getHomeId(call);
        if (homeId == null) return;

        ThingHomeSdk.newHomeInstance(homeId).getHomeDetail(new IThingHomeResultCallback() {
            @Override
            public void onSuccess(HomeBean homeBean) {
                currentHomeId = homeBean.getHomeId();
                adapter().setCurrentHomeId(currentHomeId);
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("homeId", homeBean.getHomeId());
                result.put("devices", deviceListToJson(homeBean.getDeviceList()));
                call.resolve(result);
            }

            @Override
            public void onError(String code, String error) {
                call.reject("Query Tuya devices failed: " + code + " " + error);
            }
        });
    }

    @PluginMethod
    public void ensureNativeSession(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity is not available.");
            return;
        }
        TuyaSessionManager.getInstance(getActivity()).ensureReady(result -> {
            if (!result.success) {
                call.reject(result.error.message);
                return;
            }
            initialized = true;
            currentHomeId = result.data.homeId;
            JSObject payload = new JSObject();
            payload.put("success", true);
            payload.put("ready", true);
            payload.put("homeId", result.data.homeId);
            payload.put("deviceCount", result.data.devices == null ? 0 : result.data.devices.size());
            call.resolve(payload);
        });
    }

    @PluginMethod
    public void publishDps(PluginCall call) {
        if (!ensureInitialized(call)) return;

        String devId = call.getString("devId");
        JSObject dps = call.getObject("dps");
        if (TextUtils.isEmpty(devId)) {
            call.reject("devId is required.");
            return;
        }
        if (dps == null) {
            call.reject("dps is required.");
            return;
        }

        adapter().publishDps(new DeviceCommand(devId, jsObjectToMap(dps)), result -> resolveMapResult(call, result));
    }

    @PluginMethod
    public void getActivatorToken(PluginCall call) {
        if (!ensureInitialized(call)) return;

        Long homeId = getHomeId(call);
        if (homeId == null) return;

        ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, new IThingActivatorGetToken() {
            @Override
            public void onSuccess(String token) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("homeId", homeId);
                result.put("token", token);
                call.resolve(result);
            }

            @Override
            public void onFailure(String code, String error) {
                call.reject("Get activator token failed: " + code + " " + error);
            }
        });
    }

    @PluginMethod
    public void startWifiPairing(PluginCall call) {
        if (!ensureInitialized(call)) return;

        Long homeId = getHomeId(call);
        if (homeId == null) return;

        String ssid = call.getString("ssid");
        String password = call.getString("password", "");
        String mode = call.getString("mode", "EZ");
        int timeout = call.getInt("timeout", 120);

        if (TextUtils.isEmpty(ssid)) {
            call.reject("ssid is required.");
            return;
        }

        ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, new IThingActivatorGetToken() {
            @Override
            public void onSuccess(String token) {
                stopCurrentActivator();

                ActivatorModelEnum activatorModel = "AP".equalsIgnoreCase(mode)
                    ? ActivatorModelEnum.THING_AP
                    : ActivatorModelEnum.THING_EZ;

                ActivatorBuilder builder = new ActivatorBuilder()
                    .setContext(getActivity().getApplicationContext())
                    .setSsid(ssid)
                    .setPassword(password)
                    .setActivatorModel(activatorModel)
                    .setTimeOut(timeout)
                    .setToken(token)
                    .setListener(new IThingSmartActivatorListener() {
                        @Override
                        public void onError(String code, String error) {
                            stopCurrentActivator();
                            call.reject("Wi-Fi pairing failed: " + code + " " + error);
                        }

                        @Override
                        public void onActiveSuccess(DeviceBean deviceBean) {
                            stopCurrentActivator();
                            JSObject result = new JSObject();
                            result.put("success", true);
                            result.put("homeId", homeId);
                            result.put("token", token);
                            result.put("mode", mode);
                            result.put("device", deviceToJson(deviceBean));
                            call.resolve(result);
                        }

                        @Override
                        public void onStep(String step, Object data) {
                            // Progress reporting can be added here
                        }
                    });

                if (getActivity() != null) {
                    getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                currentActivator = ThingHomeSdk.getActivatorInstance().newActivator(builder);
                                currentActivator.start();
                            } catch (Exception e) {
                                call.reject("Start EZ/AP activator failed: " + e.getMessage());
                            }
                        }
                    });
                }
            }

            @Override
            public void onFailure(String code, String error) {
                call.reject("Get activator token failed: " + code + " " + error);
            }
        });
    }

    @PluginMethod
    public void stopPairing(PluginCall call) {
        stopCurrentActivator();
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void startDiyCooking(PluginCall call) {
        if (!ensureInitialized(call)) return;

        String devId = call.getString("devId");
        if (TextUtils.isEmpty(devId)) {
            call.reject("devId is required.");
            return;
        }

        int temperature = call.getInt("temperature", 85);
        int cookTime = call.getInt("cookTime", call.getInt("cook_time", 0));
        int power = call.getInt("power", 8);
        String speed = call.getString("speed", "1");

        if (cookTime <= 0) {
            call.reject("cookTime seconds is required.");
            return;
        }

        adapter().startDiyCooking(devId, temperature, cookTime, power, speed, result -> resolveMapResult(call, result));
    }

    @PluginMethod
    public void pauseCooking(PluginCall call) {
        sendCookCommand(call, "pause");
    }

    @PluginMethod
    public void resetCooking(PluginCall call) {
        sendCookCommand(call, "reset");
    }

    @PluginMethod
    public void unbindDevice(PluginCall call) {
        if (!ensureInitialized(call)) return;

        String devId = call.getString("devId");
        if (TextUtils.isEmpty(devId)) {
            call.reject("devId is required.");
            return;
        }

        adapter().unbindDevice(devId, result -> resolveMapResult(call, result));
    }

    @PluginMethod
    public void startBleScan(PluginCall call) {
        if (!ensureInitialized(call)) return;
        JSObject permission = pairingPermissionResult();
        if (!Boolean.TRUE.equals(permission.getBool("canStartBleScan"))) {
            call.reject("PAIRING_PERMISSION_MISSING: " + permission.optJSONArray("missingPermissions"));
            return;
        }

        try {
            com.thingclips.smart.android.ble.api.LeScanSetting setting = new com.thingclips.smart.android.ble.api.LeScanSetting.Builder()
                .setTimeout(60000) // 60 seconds
                .addScanType(com.thingclips.smart.android.ble.api.ScanType.SINGLE)
                .build();

            ThingHomeSdk.getBleOperator().startLeScan(
                setting,
                new com.thingclips.smart.android.ble.api.BleScanResponse() {
                    @Override
                    public void onResult(com.thingclips.smart.android.ble.api.ScanDeviceBean scanDeviceBean) {
                        if (scanDeviceBean == null) return;
                        
                        JSObject device = new JSObject();
                        device.put("name", scanDeviceBean.getName());
                        device.put("address", scanDeviceBean.getAddress());
                        device.put("uuid", scanDeviceBean.getUuid());
                        device.put("productId", scanDeviceBean.getProductId());
                        putIfPresent(device, "pid", invokeNoArg(scanDeviceBean, "getPid"));
                        putIfPresent(device, "mac", invokeNoArg(scanDeviceBean, "getMac"));
                        putIfPresent(device, "deviceId", invokeNoArg(scanDeviceBean, "getDevId"));
                        putIfPresent(device, "rssi", invokeNoArg(scanDeviceBean, "getRssi"));
                        device.put("deviceType", scanDeviceBean.getDeviceType());
                        device.put("flag", scanDeviceBean.getFlag());
                        device.put("isNearby", true);
                        
                        notifyListeners("bleDeviceFound", device);
                    }
                }
            );
            call.resolve();
        } catch (Exception e) {
            call.reject("Start BLE scan failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void checkPairingPermissions(PluginCall call) {
        call.resolve(pairingPermissionResult());
    }

    @PluginMethod
    public void requestPairingPermissions(PluginCall call) {
        JSObject current = pairingPermissionResult();
        if (Boolean.TRUE.equals(current.getBool("canStartBleScan"))) {
            call.resolve(current);
            return;
        }
        requestPermissionForAliases(missingPairingPermissionAliases(), call, "pairingPermissionsCallback");
    }

    @PermissionCallback
    private void pairingPermissionsCallback(PluginCall call) {
        JSObject result = pairingPermissionResult();
        result.put("requested", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopBleScan(PluginCall call) {
        try {
            ThingHomeSdk.getBleOperator().stopLeScan();
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Stop BLE scan failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void connectBleDevice(PluginCall call) {
        if (!ensureInitialized(call)) return;

        Long homeId = getHomeId(call);
        if (homeId == null) return;

        String uuid = call.getString("uuid");
        String address = call.getString("address");
        String productId = call.getString("productId");
        String ssid = call.getString("ssid");
        String password = call.getString("password", "");
        int deviceType = call.getInt("deviceType", 0);
        int flag = call.getInt("flag", 0);

        if (TextUtils.isEmpty(uuid) || TextUtils.isEmpty(address) || TextUtils.isEmpty(productId)) {
            call.reject("uuid, address, and productId are required.");
            return;
        }

        ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, new IThingActivatorGetToken() {
            @Override
            public void onSuccess(String token) {
                com.thingclips.smart.sdk.bean.MultiModeActivatorBean bean = new com.thingclips.smart.sdk.bean.MultiModeActivatorBean();
                bean.homeId = homeId;
                bean.uuid = uuid;
                bean.address = address;
                bean.mac = address; // Populate mac address!
                bean.productId = productId;
                bean.deviceType = deviceType; // Populate deviceType!
                bean.flag = flag; // Populate flag!
                bean.ssid = ssid;
                bean.pwd = password;
                bean.token = token;
                bean.timeout = 120000; // 120 seconds

                if (getActivity() != null) {
                    getActivity().runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                ThingHomeSdk.getActivator().newMultiModeActivator().startActivator(bean, new com.thingclips.smart.sdk.api.IMultiModeActivatorListener() {
                                    @Override
                                    public void onSuccess(DeviceBean deviceBean) {
                                        JSObject result = new JSObject();
                                        result.put("success", true);
                                        result.put("device", deviceToJson(deviceBean));
                                        call.resolve(result);
                                    }

                                    @Override
                                    public void onFailure(int code, String error, Object handle) {
                                        call.reject("BLE activation failed: " + code + " " + error);
                                    }
                                });
                            } catch (Exception e) {
                                java.io.StringWriter sw = new java.io.StringWriter();
                                java.io.PrintWriter pw = new java.io.PrintWriter(sw);
                                e.printStackTrace(pw);
                                call.reject("Start BLE activator failed: " + sw.toString());
                            }
                        }
                    });
                }
            }

            @Override
            public void onFailure(String code, String error) {
                call.reject("Get activator token failed: " + code + " " + error);
            }
        });
    }

    @PluginMethod
    public void subscribeDevice(PluginCall call) {
        if (!ensureInitialized(call)) return;

        String devId = call.getString("devId");
        if (TextUtils.isEmpty(devId)) {
            call.reject("devId is required.");
            return;
        }

        if (getActivity() != null) {
            getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    synchronized (activeDevices) {
                        if (activeDevices.containsKey(devId)) {
                            IThingDevice oldDev = activeDevices.remove(devId);
                            if (oldDev != null) {
                                oldDev.unRegisterDevListener();
                                oldDev.onDestroy();
                            }
                        }

                        try {
                            IThingDevice device = ThingHomeSdk.newDeviceInstance(devId);
                            device.registerDevListener(new com.thingclips.smart.sdk.api.IDevListener() {
                                @Override
                                public void onDpUpdate(String devId, String dpStr) {
                                    JSObject data = new JSObject();
                                    data.put("devId", devId);
                                    data.put("dps", dpStr);
                                    notifyListeners("dpUpdate", data);
                                }

                                @Override
                                public void onRemoved(String devId) {
                                    JSObject data = new JSObject();
                                    data.put("devId", devId);
                                    notifyListeners("deviceRemoved", data);
                                }

                                @Override
                                public void onStatusChanged(String devId, boolean online) {
                                    JSObject data = new JSObject();
                                    data.put("devId", devId);
                                    data.put("online", online);
                                    notifyListeners("deviceStatusChanged", data);
                                }

                                @Override
                                public void onNetworkStatusChanged(String devId, boolean status) {
                                }

                                @Override
                                public void onDevInfoUpdate(String devId) {
                                }
                            });

                            activeDevices.put(devId, device);
                            JSObject result = new JSObject();
                            result.put("success", true);
                            result.put("devId", devId);
                            call.resolve(result);
                        } catch (Exception e) {
                            call.reject("Subscribe device failed: " + e.getMessage(), e);
                        }
                    }
                }
            });
        }
    }

    @PluginMethod
    public void unsubscribeDevice(PluginCall call) {
        String devId = call.getString("devId");
        if (TextUtils.isEmpty(devId)) {
            call.reject("devId is required.");
            return;
        }

        if (getActivity() != null) {
            getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    synchronized (activeDevices) {
                        if (activeDevices.containsKey(devId)) {
                            IThingDevice device = activeDevices.remove(devId);
                            if (device != null) {
                                device.unRegisterDevListener();
                                device.onDestroy();
                            }
                        }
                    }

                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("devId", devId);
                    call.resolve(result);
                }
            });
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Open Bluetooth settings failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Open app settings failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void openNativeCookingCenter(PluginCall call) {
        getActivity().startActivity(new Intent(getActivity(), CookingCenterActivity.class));
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openNativeMyDevices(PluginCall call) {
        getActivity().startActivity(new Intent(getActivity(), MyDevicesActivity.class));
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openNativeDeviceDetail(PluginCall call) {
        Intent intent = new Intent(getActivity(), DeviceDetailActivity.class);
        String devId = call.getString("devId");
        String name = call.getString("name");
        if (!TextUtils.isEmpty(devId)) intent.putExtra("devId", devId);
        if (!TextUtils.isEmpty(name)) intent.putExtra("name", name);
        getActivity().startActivity(intent);
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openH5Page(PluginCall call) {
        getActivity().startActivity(new Intent(getActivity(), MainActivity.class));
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("appVersion", BuildConfig.VERSION_NAME);
        result.put("buildNumber", BuildConfig.VERSION_CODE);
        result.put("nativeAvailable", true);
        result.put("tuyaConfigured", hasTuyaCredentials());
        call.resolve(result);
    }

    @PluginMethod
    public void getAuthToken(PluginCall call) {
        NativeAuthStore store = authStore();
        if (!store.isLoggedIn()) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("token", "");
            result.put("reason", "AUTH_NOT_SYNCED");
            call.resolve(result);
            return;
        }
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("token", store.getToken());
        result.put("userId", store.getUserId());
        result.put("nickname", store.getNickname());
        call.resolve(result);
    }

    @PluginMethod
    public void syncAuthState(PluginCall call) {
        String token = call.getString("token", "");
        String userId = call.getString("userId", "");
        String nickname = call.getString("nickname", "");
        String tuyaUid = call.getString("tuyaUid", "");
        String tuyaPassword = call.getString("tuyaPassword", "");
        if (TextUtils.isEmpty(token) || TextUtils.isEmpty(userId)) {
            call.reject("AUTH_SYNC_INVALID: token and userId are required.");
            return;
        }
        authStore().saveAuthState(token, userId, nickname, tuyaUid, tuyaPassword);
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("userId", userId);
        call.resolve(result);
    }

    @PluginMethod
    public void clearAuthState(PluginCall call) {
        authStore().clear();
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    private boolean hasTuyaCredentials() {
        return !TextUtils.isEmpty(BuildConfig.TUYA_ANDROID_APP_KEY)
            && !TextUtils.isEmpty(BuildConfig.TUYA_ANDROID_APP_SECRET);
    }

    private boolean ensureInitialized(PluginCall call) {
        if (!initialized) {
            call.reject("Tuya SDK is not initialized. Call init() first.");
            return false;
        }
        return true;
    }

    private JSObject pairingPermissionResult() {
        boolean bluetoothRequired = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        boolean locationRequired = true;
        boolean bluetoothScanGranted = !bluetoothRequired || hasAndroidPermission(Manifest.permission.BLUETOOTH_SCAN);
        boolean bluetoothConnectGranted = !bluetoothRequired || hasAndroidPermission(Manifest.permission.BLUETOOTH_CONNECT);
        boolean locationGranted = !locationRequired || hasAndroidPermission(Manifest.permission.ACCESS_FINE_LOCATION);
        boolean gpsEnabled = isLocationEnabled();
        boolean bluetoothGranted = bluetoothScanGranted && bluetoothConnectGranted;

        com.getcapacitor.JSArray missing = new com.getcapacitor.JSArray();
        if (bluetoothRequired && !bluetoothScanGranted) missing.put(Manifest.permission.BLUETOOTH_SCAN);
        if (bluetoothRequired && !bluetoothConnectGranted) missing.put(Manifest.permission.BLUETOOTH_CONNECT);
        if (locationRequired && !locationGranted) missing.put(Manifest.permission.ACCESS_FINE_LOCATION);

        JSObject permissions = new JSObject();
        permissions.put("BLUETOOTH_SCAN", bluetoothRequired ? permissionLabel(bluetoothScanGranted) : "not_required");
        permissions.put("BLUETOOTH_CONNECT", bluetoothRequired ? permissionLabel(bluetoothConnectGranted) : "not_required");
        permissions.put("ACCESS_FINE_LOCATION", locationRequired ? permissionLabel(locationGranted) : "not_required");

        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("androidVersion", Build.VERSION.SDK_INT);
        result.put("bluetoothGranted", bluetoothGranted);
        result.put("locationGranted", locationGranted);
        result.put("gpsEnabled", gpsEnabled);
        result.put("bluetoothRequired", bluetoothRequired);
        result.put("locationRequired", locationRequired);
        result.put("missingPermissions", missing);
        result.put("permissions", permissions);
        result.put("canStartBleScan", bluetoothGranted && locationGranted);
        result.put("shouldOpenSettings", shouldOpenSettings());
        result.put("bluetoothAliasState", permissionState("bluetooth"));
        result.put("locationAliasState", permissionState("location"));
        return result;
    }

    private boolean hasAndroidPermission(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private String permissionLabel(boolean granted) {
        return granted ? "granted" : "denied";
    }

    private String permissionState(String alias) {
        PermissionState state = getPermissionState(alias);
        return state == null ? "unknown" : state.toString();
    }

    private boolean shouldOpenSettings() {
        if (getActivity() == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!hasAndroidPermission(Manifest.permission.BLUETOOTH_SCAN)
                && !ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.BLUETOOTH_SCAN)) return true;
            if (!hasAndroidPermission(Manifest.permission.BLUETOOTH_CONNECT)
                && !ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.BLUETOOTH_CONNECT)) return true;
        }
        if (!hasAndroidPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            && !ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.ACCESS_FINE_LOCATION)) {
            return true;
        }
        return false;
    }

    private String[] missingPairingPermissionAliases() {
        List<String> aliases = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!hasAndroidPermission(Manifest.permission.BLUETOOTH_SCAN) || !hasAndroidPermission(Manifest.permission.BLUETOOTH_CONNECT)) {
                aliases.add("bluetooth");
            }
        }
        if (!hasAndroidPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            aliases.add("location");
        }
        return aliases.toArray(new String[0]);
    }

    private boolean isLocationEnabled() {
        try {
            LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
            return manager != null && (manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        } catch (Exception e) {
            return false;
        }
    }

    private Long getHomeId(PluginCall call) {
        Long homeId = null;
        Double homeIdDouble = call.getDouble("homeId");
        if (homeIdDouble != null) homeId = homeIdDouble.longValue();
        if (homeId == null) homeId = currentHomeId;
        if (homeId == null) call.reject("homeId is required. Call ensureDefaultHome first.");
        return homeId;
    }

    private void sendCookCommand(PluginCall call, String command) {
        if (!ensureInitialized(call)) return;

        String devId = call.getString("devId");
        if (TextUtils.isEmpty(devId)) {
            call.reject("devId is required.");
            return;
        }

        if ("pause".equals(command)) {
            adapter().pauseCooking(devId, result -> resolveMapResult(call, result));
        } else {
            adapter().resetCooking(devId, result -> resolveMapResult(call, result));
        }
    }

    private Object invokeNoArg(Object target, String methodName) {
        try {
            java.lang.reflect.Method method = target.getClass().getMethod(methodName);
            return method.invoke(target);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void putIfPresent(JSObject target, String key, Object value) {
        if (value != null) target.put(key, value);
    }

    private void publishDpsMap(String devId, Map<String, Object> dps, PluginCall call, String errorPrefix) {
        IThingDevice device = ThingHomeSdk.newDeviceInstance(devId);
        device.publishDps(JSON.toJSONString(dps), new IResultCallback() {
            @Override
            public void onSuccess() {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("devId", devId);
                result.put("dps", JSON.toJSONString(dps));
                call.resolve(result);
                device.onDestroy();
            }

            @Override
            public void onError(String code, String error) {
                call.reject(errorPrefix + ": " + code + " " + error);
                device.onDestroy();
            }
        });
    }

    private JSObject homeListResult(List<HomeBean> homeBeans) {
        JSObject result = new JSObject();
        com.getcapacitor.JSArray homes = new com.getcapacitor.JSArray();
        if (homeBeans != null) {
            for (HomeBean homeBean : homeBeans) homes.put(homeToJson(homeBean));
            if (!homeBeans.isEmpty()) currentHomeId = homeBeans.get(0).getHomeId();
        }
        result.put("success", true);
        result.put("homes", homes);
        if (currentHomeId != null) result.put("homeId", currentHomeId);
        return result;
    }

    private JSObject homeResult(HomeBean homeBean, boolean created) {
        JSObject result = homeToJson(homeBean);
        result.put("success", true);
        result.put("created", created);
        return result;
    }

    private JSObject homeToJson(HomeBean homeBean) {
        JSObject result = new JSObject();
        result.put("homeId", homeBean.getHomeId());
        result.put("name", homeBean.getName());
        result.put("geoName", homeBean.getGeoName());
        result.put("deviceCount", homeBean.getDeviceList() == null ? 0 : homeBean.getDeviceList().size());
        return result;
    }

    private com.getcapacitor.JSArray deviceListToJson(List<DeviceBean> deviceBeans) {
        com.getcapacitor.JSArray devices = new com.getcapacitor.JSArray();
        if (deviceBeans == null) return devices;
        for (DeviceBean deviceBean : deviceBeans) devices.put(deviceToJson(deviceBean));
        return devices;
    }

    private JSObject deviceToJson(DeviceBean deviceBean) {
        JSObject item = new JSObject();
        if (deviceBean == null) return item;
        item.put("devId", deviceBean.getDevId());
        item.put("name", deviceBean.getName());
        item.put("productId", deviceBean.getProductId());
        item.put("macAddress", deviceBean.getMac());
        item.put("isOnline", deviceBean.getIsOnline());
        item.put("dps", deviceBean.getDps());
        item.put("isPetChef", PET_CHEF_PID.equals(deviceBean.getProductId()));
        return item;
    }

    private void stopCurrentActivator() {
        if (getActivity() != null) {
            getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (currentActivator != null) {
                        try {
                            currentActivator.stop();
                            currentActivator.onDestroy();
                        } catch (Exception e) {
                            // ignore
                        }
                        currentActivator = null;
                    }
                }
            });
        }
    }

    private Map<String, Object> jsObjectToMap(JSObject object) {
        Map<String, Object> map = new HashMap<>();
        Iterator<String> keys = object.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            map.put(key, object.opt(key));
        }
        return map;
    }

    private void resolveMapResult(PluginCall call, TuyaDeviceResult<Map<String, Object>> result) {
        if (result.success) {
            call.resolve(mapToJsObject(result.data));
            return;
        }
        String message = result.error == null ? "Tuya operation failed." : result.error.message;
        String code = result.error == null ? null : result.error.code;
        call.reject(code == null ? message : code + ": " + message);
    }

    private JSObject mapToJsObject(Map<String, Object> map) {
        JSObject object = new JSObject();
        if (map == null) return object;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            object.put(entry.getKey(), entry.getValue());
        }
        return object;
    }

    private String mask(String value) {
        if (TextUtils.isEmpty(value)) return "";
        if (value.length() <= 8) return "****";
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
