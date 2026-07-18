package com.heybopet.petchef.device;

import java.util.HashMap;
import java.util.Map;

public class DeviceCommand {
    public static final String DP_POWER = "1";
    public static final String DP_MODE = "3";
    public static final String DP_COOK_TIME = "7";
    public static final String DP_COOK_TEMPERATURE = "9";
    public static final String DP_COOK_MODE_POWER = "102";
    public static final String DP_COOK_START_PAUSE_RESET = "107";
    public static final String DP_COOK_MODE_SPEED = "108";

    public final String devId;
    public final Map<String, Object> dps;

    public DeviceCommand(String devId, Map<String, Object> dps) {
        this.devId = devId;
        this.dps = dps;
    }

    public static DeviceCommand diyCooking(String devId, int temperature, int cookTime, int power, String speed) {
        Map<String, Object> dps = new HashMap<>();
        dps.put(DP_POWER, true);
        dps.put(DP_MODE, "diy");
        dps.put(DP_COOK_TEMPERATURE, temperature);
        dps.put(DP_COOK_TIME, cookTime);
        dps.put(DP_COOK_MODE_POWER, power);
        dps.put(DP_COOK_MODE_SPEED, speed);
        dps.put(DP_COOK_START_PAUSE_RESET, "start");
        return new DeviceCommand(devId, dps);
    }

    public static DeviceCommand cookingAction(String devId, String action) {
        Map<String, Object> dps = new HashMap<>();
        dps.put(DP_COOK_START_PAUSE_RESET, action);
        return new DeviceCommand(devId, dps);
    }
}
