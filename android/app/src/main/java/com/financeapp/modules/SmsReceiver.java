package com.financeapp.modules;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/**
 * BroadcastReceiver for incoming SMS.
 * Registered in AndroidManifest.xml with SMS_RECEIVED action.
 * Forwards parsed messages to JS via SmsEventEmitter.
 */
public class SmsReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }

        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages == null) return;

        // Group multi-part messages by originating address
        StringBuilder bodyBuilder = new StringBuilder();
        String address = null;
        long date = System.currentTimeMillis();
        String id = String.valueOf(date); // synthetic ID for real-time SMS

        for (SmsMessage msg : messages) {
            if (address == null) {
                address = msg.getDisplayOriginatingAddress();
                date = msg.getTimestampMillis();
            }
            bodyBuilder.append(msg.getMessageBody());
        }

        if (address != null) {
            SmsEventEmitter.sendSmsEvent(id, address, bodyBuilder.toString(), date);
        }
    }
}
