package com.heybopet.petchef.device;

public class TuyaDeviceError {
    public static final String SDK_NOT_INITIALIZED = "SDK_NOT_INITIALIZED";
    public static final String MISSING_CREDENTIALS = "MISSING_CREDENTIALS";
    public static final String NOT_LOGGED_IN = "NOT_LOGGED_IN";
    public static final String HOME_MISSING = "HOME_MISSING";
    public static final String DEVICE_EMPTY = "DEVICE_EMPTY";
    public static final String DEVICE_NOT_FOUND = "DEVICE_NOT_FOUND";
    public static final String INVALID_ARGUMENT = "INVALID_ARGUMENT";
    public static final String TUYA_ERROR = "TUYA_ERROR";
    public static final String UNKNOWN = "UNKNOWN";

    public final String code;
    public final String message;
    public final String tuyaCode;

    public TuyaDeviceError(String code, String message) {
        this(code, message, null);
    }

    public TuyaDeviceError(String code, String message, String tuyaCode) {
        this.code = code;
        this.message = message;
        this.tuyaCode = tuyaCode;
    }
}
