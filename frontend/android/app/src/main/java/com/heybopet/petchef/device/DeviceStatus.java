package com.heybopet.petchef.device;

import java.util.Map;

public class DeviceStatus {
    public static final String OFFLINE = "offline";
    public static final String STANDBY = "standby";
    public static final String LOW_TEMP_COOKING = "low_temp_cooking";
    public static final String DONE = "done";
    public static final String FAULT = "fault";

    public final String devId;
    public final String name;
    public final String productId;
    public final boolean online;
    public final String cookingStatus;
    public final Map<String, Object> dps;

    public DeviceStatus(String devId, String name, String productId, boolean online, Map<String, Object> dps) {
        this.devId = devId;
        this.name = name;
        this.productId = productId;
        this.online = online;
        this.dps = dps;
        this.cookingStatus = resolveCookingStatus(online, dps);
    }

    private static String resolveCookingStatus(boolean online, Map<String, Object> dps) {
        if (!online) return OFFLINE;
        Object fault = dps == null ? null : dps.get("12");
        if (fault != null && !"0".equals(String.valueOf(fault))) return FAULT;
        Object state = dps == null ? null : dps.get("5");
        if ("cooking".equals(String.valueOf(state))) return LOW_TEMP_COOKING;
        if ("done".equals(String.valueOf(state)) || "complete".equals(String.valueOf(state))) return DONE;
        return STANDBY;
    }
}
