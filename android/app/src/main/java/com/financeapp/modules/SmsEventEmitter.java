package com.financeapp.modules;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class SmsEventEmitter extends ReactContextBaseJavaModule {

    public static final String EVENT_SMS_RECEIVED = "SMS_RECEIVED";
    private static SmsEventEmitter instance;

    public SmsEventEmitter(ReactApplicationContext reactContext) {
        super(reactContext);
        instance = this;
    }

    @NonNull
    @Override
    public String getName() {
        return "SmsEventEmitter";
    }

    public static void sendSmsEvent(String id, String address, String body, long date) {
        if (instance == null) return;
        ReactApplicationContext ctx = instance.getReactApplicationContext();
        if (!ctx.hasActiveReactInstance()) return;

        WritableMap params = Arguments.createMap();
        params.putString("id", id);
        params.putString("address", address);
        params.putString("body", body);
        params.putDouble("date", date);

        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
           .emit(EVENT_SMS_RECEIVED, params);
    }

    // JS must call addListener/removeListeners to satisfy RN event system
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(Integer count) {}
}
