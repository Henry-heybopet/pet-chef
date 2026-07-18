package com.heybopet.petchef.device;

import java.util.List;
import java.util.Map;

public interface TuyaDeviceAdapter {
    interface DeviceStateListener {
        void onDpUpdate(String devId, Map<String, Object> dps);

        void onStatusChanged(String devId, boolean online);

        void onRemoved(String devId);

        void onError(String devId, TuyaDeviceError error);
    }

    Map<String, Object> status();

    boolean isInitialized();

    void init(TuyaDeviceResult.Callback<Map<String, Object>> callback);

    Long getCurrentHomeId();

    void getDeviceList(Long homeId, TuyaDeviceResult.Callback<List<DeviceStatus>> callback);

    void getDeviceStatus(String devId, TuyaDeviceResult.Callback<DeviceStatus> callback);

    void getDeviceDpState(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void subscribeDevice(String devId, DeviceStateListener listener, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void unsubscribeDevice(String devId);

    void publishDps(DeviceCommand command, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void startDiyCooking(String devId, int temperature, int cookTime, int power, String speed, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void pauseCooking(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void resetCooking(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void unbindDevice(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);
}
