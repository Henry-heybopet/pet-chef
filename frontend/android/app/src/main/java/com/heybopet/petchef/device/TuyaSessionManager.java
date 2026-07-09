package com.heybopet.petchef.device;

import android.app.Activity;
import android.text.TextUtils;

import com.thingclips.smart.home.sdk.ThingHomeSdk;
import com.thingclips.smart.home.sdk.bean.HomeBean;
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback;
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback;
import com.thingclips.smart.android.user.bean.User;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

public class TuyaSessionManager {
    public static class SessionState {
        public final boolean ready;
        public final String code;
        public final String message;
        public final String tuyaUid;
        public final Long homeId;
        public final List<DeviceStatus> devices;

        private SessionState(boolean ready, String code, String message, String tuyaUid, Long homeId, List<DeviceStatus> devices) {
            this.ready = ready;
            this.code = code;
            this.message = message;
            this.tuyaUid = tuyaUid;
            this.homeId = homeId;
            this.devices = devices == null ? new ArrayList<>() : devices;
        }

        public static SessionState ready(String tuyaUid, Long homeId, List<DeviceStatus> devices) {
            return new SessionState(true, "READY", "Tuya session ready.", tuyaUid, homeId, devices);
        }

        public static SessionState error(String code, String message) {
            return new SessionState(false, code, message, null, null, new ArrayList<>());
        }
    }

    private static final String DEFAULT_HOME_NAME = "Heybo Pet";
    private static final String DEFAULT_HOME_GEO = "China";
    private static TuyaSessionManager instance;

    private final TuyaDeviceAdapterImpl adapter;
    private WeakReference<Activity> activityRef;
    private SessionState lastState;

    private TuyaSessionManager(Activity activity) {
        this.activityRef = new WeakReference<>(activity);
        this.adapter = TuyaDeviceAdapterImpl.getInstance(activity);
    }

    public static synchronized TuyaSessionManager getInstance(Activity activity) {
        if (instance == null) {
            instance = new TuyaSessionManager(activity);
        } else {
            instance.activityRef = new WeakReference<>(activity);
            TuyaDeviceAdapterImpl.getInstance(activity);
        }
        return instance;
    }

    public SessionState getLastState() {
        return lastState;
    }

    public void ensureReady(TuyaDeviceResult.Callback<SessionState> callback) {
        if (!adapter.isInitialized()) {
            adapter.init(result -> {
                if (!result.success) {
                    finish(callback, SessionState.error(result.error.code, result.error.message));
                    return;
                }
                ensureLoggedIn(callback);
            });
            return;
        }
        ensureLoggedIn(callback);
    }

    private void ensureLoggedIn(TuyaDeviceResult.Callback<SessionState> callback) {
        try {
            if (!ThingHomeSdk.getUserInstance().isLogin()) {
                finish(callback, SessionState.error(
                    TuyaDeviceError.NOT_LOGGED_IN,
                    "Tuya user is not logged in. TODO: wire native Heybo auth token so the app can reuse the existing Heybo UID -> Tuya UID silent login flow without the H5 debug center."
                ));
                return;
            }
        } catch (Exception error) {
            finish(callback, SessionState.error(TuyaDeviceError.NOT_LOGGED_IN, "Tuya login state unavailable: " + error.getMessage()));
            return;
        }
        ensureHome(callback);
    }

    private void ensureHome(TuyaDeviceResult.Callback<SessionState> callback) {
        ThingHomeSdk.getHomeManagerInstance().queryHomeList(new IThingGetHomeListCallback() {
            @Override
            public void onSuccess(List<HomeBean> homes) {
                if (homes != null && !homes.isEmpty()) {
                    Long homeId = homes.get(0).getHomeId();
                    adapter.setCurrentHomeId(homeId);
                    loadDevices(homeId, callback);
                    return;
                }
                createDefaultHome(callback);
            }

            @Override
            public void onError(String code, String error) {
                finish(callback, SessionState.error(TuyaDeviceError.HOME_MISSING, "Query Tuya home list failed: " + code + " " + error));
            }
        });
    }

    private void createDefaultHome(TuyaDeviceResult.Callback<SessionState> callback) {
        ThingHomeSdk.getHomeManagerInstance().createHome(
            DEFAULT_HOME_NAME,
            0,
            0,
            DEFAULT_HOME_GEO,
            new ArrayList<>(),
            new IThingHomeResultCallback() {
                @Override
                public void onSuccess(HomeBean homeBean) {
                    Long homeId = homeBean.getHomeId();
                    adapter.setCurrentHomeId(homeId);
                    loadDevices(homeId, callback);
                }

                @Override
                public void onError(String code, String error) {
                    finish(callback, SessionState.error(TuyaDeviceError.HOME_MISSING, "Create Tuya default home failed: " + code + " " + error));
                }
            }
        );
    }

    private void loadDevices(Long homeId, TuyaDeviceResult.Callback<SessionState> callback) {
        adapter.getDeviceList(homeId, result -> {
            if (!result.success) {
                finish(callback, SessionState.error(result.error.code, result.error.message));
                return;
            }
            User user = ThingHomeSdk.getUserInstance().getUser();
            String tuyaUid = user == null ? "" : user.getUid();
            finish(callback, SessionState.ready(tuyaUid, homeId, result.data));
        });
    }

    private void finish(TuyaDeviceResult.Callback<SessionState> callback, SessionState state) {
        lastState = state;
        if (state.ready) {
            callback.onResult(TuyaDeviceResult.ok(state));
        } else {
            callback.onResult(TuyaDeviceResult.fail(state.code, state.message));
        }
    }
}
