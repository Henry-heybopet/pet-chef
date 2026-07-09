package com.heybopet.petchef.device;

import java.util.List;
import java.util.Map;

public interface TuyaDeviceAdapter {
    Map<String, Object> status();

    boolean isInitialized();

    void init(TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void getDeviceList(Long homeId, TuyaDeviceResult.Callback<List<DeviceStatus>> callback);

    void publishDps(DeviceCommand command, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void startDiyCooking(String devId, int temperature, int cookTime, int power, String speed, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void pauseCooking(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void resetCooking(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);

    void unbindDevice(String devId, TuyaDeviceResult.Callback<Map<String, Object>> callback);
}
