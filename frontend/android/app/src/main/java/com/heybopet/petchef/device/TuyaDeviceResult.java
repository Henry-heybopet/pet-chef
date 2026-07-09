package com.heybopet.petchef.device;

public class TuyaDeviceResult<T> {
    public interface Callback<T> {
        void onResult(TuyaDeviceResult<T> result);
    }

    public final boolean success;
    public final T data;
    public final TuyaDeviceError error;

    private TuyaDeviceResult(boolean success, T data, TuyaDeviceError error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }

    public static <T> TuyaDeviceResult<T> ok(T data) {
        return new TuyaDeviceResult<>(true, data, null);
    }

    public static <T> TuyaDeviceResult<T> fail(String code, String message) {
        return new TuyaDeviceResult<>(false, null, new TuyaDeviceError(code, message));
    }

    public static <T> TuyaDeviceResult<T> fail(String code, String message, String tuyaCode) {
        return new TuyaDeviceResult<>(false, null, new TuyaDeviceError(code, message, tuyaCode));
    }
}
