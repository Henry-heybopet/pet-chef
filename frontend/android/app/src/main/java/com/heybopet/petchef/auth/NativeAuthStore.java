package com.heybopet.petchef.auth;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;

public class NativeAuthStore {
    private static final String PREFS = "heybo_native_auth";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_NICKNAME = "nickname";
    private static final String KEY_TUYA_UID = "tuya_uid";
    private static final String KEY_TUYA_PASSWORD = "tuya_password";

    private final SharedPreferences prefs;

    public NativeAuthStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public void saveAuthState(String token, String userId, String nickname, String tuyaUid, String tuyaPassword) {
        prefs.edit()
            .putString(KEY_TOKEN, nullToEmpty(token))
            .putString(KEY_USER_ID, nullToEmpty(userId))
            .putString(KEY_NICKNAME, nullToEmpty(nickname))
            .putString(KEY_TUYA_UID, nullToEmpty(tuyaUid))
            .putString(KEY_TUYA_PASSWORD, nullToEmpty(tuyaPassword))
            .apply();
    }

    public String getToken() {
        return prefs.getString(KEY_TOKEN, "");
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, "");
    }

    public String getNickname() {
        return prefs.getString(KEY_NICKNAME, "");
    }

    public String getTuyaUid() {
        String value = prefs.getString(KEY_TUYA_UID, "");
        return TextUtils.isEmpty(value) && !TextUtils.isEmpty(getUserId()) ? "heybo_" + getUserId() : value;
    }

    public String getTuyaPassword() {
        String value = prefs.getString(KEY_TUYA_PASSWORD, "");
        return TextUtils.isEmpty(value) ? getTuyaUid() : value;
    }

    public boolean isLoggedIn() {
        return !TextUtils.isEmpty(getToken()) && !TextUtils.isEmpty(getUserId());
    }

    public void clear() {
        prefs.edit().clear().apply();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
