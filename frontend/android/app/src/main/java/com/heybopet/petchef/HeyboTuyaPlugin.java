package com.heybopet.petchef;

import android.text.TextUtils;

import com.alibaba.fastjson.JSON;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
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

@CapacitorPlugin(name = "HeyboTuya")
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

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("nativeAvailable", true);
        result.put("configured", hasTuyaCredentials());
        result.put("initialized", initialized);
        result.put("appKey", mask(BuildConfig.TUYA_ANDROID_APP_KEY));
        result.put("pid", PET_CHEF_PID);
        if (currentHomeId != null) result.put("homeId", currentHomeId);
        call.resolve(result);
    }

    @PluginMethod
    public void init(PluginCall call) {
        if (!hasTuyaCredentials()) {
            call.reject("Tuya Android AppKey/AppSecret is missing. Configure frontend/android/tuya.properties locally.");
            return;
        }

        try {
            ThingHomeSdk.init(getActivity().getApplication(), BuildConfig.TUYA_ANDROID_APP_KEY, BuildConfig.TUYA_ANDROID_APP_SECRET);
            ThingHomeSdk.setDebugMode(BuildConfig.DEBUG);
            initialized = true;

            JSObject result = new JSObject();
            result.put("initialized", true);
            result.put("appKey", mask(BuildConfig.TUYA_ANDROID_APP_KEY));
            call.resolve(result);
        } catch (Exception error) {
            initialized = false;
            call.reject("Tuya SDK init failed: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void loginOrRegisterWithHeyboUid(PluginCall call) {
        if (!ensureInitialized(call)) return;

        String heyboUid = call.getString("heyboUid");
        if (TextUtils.isEmpty(heyboUid)) {
            call.reject("heyboUid is required.");
            return;
        }

        String tuyaUid = "heybo_" + heyboUid;
        String password = call.getString("password", tuyaUid);
        ThingHomeSdk.getUserInstance().loginOrRegisterWithUid(
            COUNTRY_CODE_CHINA,
            tuyaUid,
            password,
            new ILoginCallback() {
                @Override
                public void onSuccess(User user) {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("tuyaUid", tuyaUid);
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

        publishDpsMap(devId, jsObjectToMap(dps), call, "Publish DP failed");
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
                            // Capacitor PluginCall can only be resolved once. The MVP keeps
                            // pairing progress inside native logs and resolves on success/error.
                        }
                    });

                currentActivator = ThingHomeSdk.getActivatorInstance().newActivator(builder);
                currentActivator.start();
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

        Map<String, Object> dps = new HashMap<>();
        dps.put(DP_POWER, true);
        dps.put(DP_MODE, "diy");
        dps.put(DP_COOK_TEMPERATURE, temperature);
        dps.put(DP_COOK_TIME, cookTime);
        dps.put(DP_COOK_MODE_POWER, power);
        dps.put(DP_COOK_MODE_SPEED, speed);
        dps.put(DP_COOK_START_PAUSE_RESET, "start");

        publishDpsMap(devId, dps, call, "Start DIY cooking failed");
    }

    @PluginMethod
    public void pauseCooking(PluginCall call) {
        sendCookCommand(call, "pause");
    }

    @PluginMethod
    public void resetCooking(PluginCall call) {
        sendCookCommand(call, "reset");
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

        Map<String, Object> dps = new HashMap<>();
        dps.put(DP_COOK_START_PAUSE_RESET, command);
        publishDpsMap(devId, dps, call, "Send cook command failed");
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
        ArrayList<JSObject> homes = new ArrayList<>();
        if (homeBeans != null) {
            for (HomeBean homeBean : homeBeans) homes.add(homeToJson(homeBean));
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

    private ArrayList<JSObject> deviceListToJson(List<DeviceBean> deviceBeans) {
        ArrayList<JSObject> devices = new ArrayList<>();
        if (deviceBeans == null) return devices;
        for (DeviceBean deviceBean : deviceBeans) devices.add(deviceToJson(deviceBean));
        return devices;
    }

    private JSObject deviceToJson(DeviceBean deviceBean) {
        JSObject item = new JSObject();
        if (deviceBean == null) return item;
        item.put("devId", deviceBean.getDevId());
        item.put("name", deviceBean.getName());
        item.put("productId", deviceBean.getProductId());
        item.put("isOnline", deviceBean.getIsOnline());
        item.put("dps", deviceBean.getDps());
        item.put("isPetChef", PET_CHEF_PID.equals(deviceBean.getProductId()));
        return item;
    }

    private void stopCurrentActivator() {
        if (currentActivator != null) {
            currentActivator.stop();
            currentActivator.onDestroy();
            currentActivator = null;
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

    private String mask(String value) {
        if (TextUtils.isEmpty(value)) return "";
        if (value.length() <= 8) return "****";
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
