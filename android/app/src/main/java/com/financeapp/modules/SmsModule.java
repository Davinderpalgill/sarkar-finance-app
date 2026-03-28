package com.financeapp.modules;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Telephony;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SmsModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "SmsModule";
    private static final int MAX_SMS = 1000;

    // Bank sender address fragments to filter (case-insensitive substring match)
    private static final Set<String> BANK_SENDER_KEYWORDS = new HashSet<>(Arrays.asList(
        "HDFC", "SBIBNK", "ICICIB", "AXISBK", "KOTAKB", "IDFCFB",
        "PHONEPE", "GPAY", "PAYTM", "YESBNK", "INDBNK", "PNBSMS",
        "BOIIND", "CANBNK", "UNIONB", "SCBNK", "HDFCBK", "SBIPSG",
        "ICICIT", "AXISBN", "KOTAK"
    ));

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public SmsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Read historical SMS from the inbox.
     * @param lookbackMs How many ms back to search (e.g. 180 * 24 * 3600 * 1000L)
     * @param promise    Resolves with WritableArray of {id, address, body, date}
     */
    @ReactMethod
    public void readInboxSms(double lookbackMs, Promise promise) {
        executor.execute(() -> {
            try {
                Context context = getReactApplicationContext();
                long since = System.currentTimeMillis() - (long) lookbackMs;

                Uri inboxUri = Telephony.Sms.Inbox.CONTENT_URI;
                String[] projection = {
                    Telephony.Sms._ID,
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE
                };
                String selection = Telephony.Sms.DATE + " >= ?";
                String[] selectionArgs = { String.valueOf(since) };
                String sortOrder = Telephony.Sms.DATE + " DESC LIMIT " + MAX_SMS;

                Cursor cursor = context.getContentResolver().query(
                    inboxUri, projection, selection, selectionArgs, sortOrder
                );

                WritableArray result = Arguments.createArray();

                if (cursor != null) {
                    int idIdx      = cursor.getColumnIndex(Telephony.Sms._ID);
                    int addrIdx    = cursor.getColumnIndex(Telephony.Sms.ADDRESS);
                    int bodyIdx    = cursor.getColumnIndex(Telephony.Sms.BODY);
                    int dateIdx    = cursor.getColumnIndex(Telephony.Sms.DATE);

                    while (cursor.moveToNext()) {
                        String address = cursor.getString(addrIdx);
                        if (!isBankSender(address)) continue;

                        WritableMap sms = Arguments.createMap();
                        sms.putString("id",      cursor.getString(idIdx));
                        sms.putString("address", address);
                        sms.putString("body",    cursor.getString(bodyIdx));
                        sms.putDouble("date",    cursor.getLong(dateIdx));
                        result.pushMap(sms);
                    }
                    cursor.close();
                }

                promise.resolve(result);
            } catch (Exception e) {
                promise.reject("SMS_READ_ERROR", e.getMessage(), e);
            }
        });
    }

    /**
     * Returns true if the sender address belongs to a known bank/fintech.
     */
    private boolean isBankSender(String address) {
        if (address == null) return false;
        String upper = address.toUpperCase();
        for (String keyword : BANK_SENDER_KEYWORDS) {
            if (upper.contains(keyword)) return true;
        }
        return false;
    }

    @Override
    public void invalidate() {
        executor.shutdown();
        super.invalidate();
    }
}
