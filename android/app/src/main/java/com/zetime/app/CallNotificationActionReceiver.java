package com.zetime.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.content.ContextCompat;

public class CallNotificationActionReceiver extends BroadcastReceiver {

    private static final String TAG = "CallReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action   = intent.getAction();
        String callId   = intent.getStringExtra("callId");
        String callerId = intent.getStringExtra("callerId");
        String callType = intent.getStringExtra("callType");
        String serverUrl = intent.getStringExtra("serverUrl");
        String callerName = intent.getStringExtra("callerName");

        // Cancel both HUN notification (1001) and foreground service notification (1002)
        NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(1001);
            nm.cancel(1002);
        }

        // Stop the CallService (stops ringtone + vibration + foreground notification)
        Intent stopServiceIntent = new Intent(context, CallService.class);
        stopServiceIntent.putExtra("ACTION", "STOP_CALL");
        try {
            ContextCompat.startForegroundService(context, stopServiceIntent);
        } catch (Exception e) {
            try {
                context.startService(stopServiceIntent);
            } catch (Exception ex) {
                Log.e(TAG, "Failed to stop CallService", ex);
            }
        }

        if ("ACTION_ANSWER".equals(action)) {
            Log.d(TAG, "User answered call: " + callId);

            // Open MainActivity and navigate to the call screen
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_SINGLE_TOP |
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            );
            openAppIntent.putExtra("callAction",  "INCOMING_CALL");
            openAppIntent.putExtra("callId",      callId);
            openAppIntent.putExtra("callerId",    callerId);
            openAppIntent.putExtra("callType",    callType);
            openAppIntent.putExtra("callerName",  callerName);
            openAppIntent.putExtra("serverUrl",   serverUrl);
            context.startActivity(openAppIntent);

        } else if ("ACTION_DECLINE".equals(action)) {
            Log.d(TAG, "User declined call: " + callId);

            // Notify the backend that the call was declined (background thread)
            if (serverUrl != null && callId != null) {
                final String fCallId   = callId;
                final String fServerUrl = serverUrl;
                new Thread(() -> {
                    try {
                        java.net.URL url = new java.net.URL(fServerUrl + "/api/calls/public-reject");
                        java.net.HttpURLConnection conn =
                                (java.net.HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setRequestProperty("Content-Type", "application/json; utf-8");
                        conn.setDoOutput(true);
                        conn.setConnectTimeout(8000);
                        conn.setReadTimeout(8000);

                        String body = "{\"callId\":\"" + fCallId + "\"}";
                        byte[] bytes = body.getBytes("utf-8");
                        conn.getOutputStream().write(bytes);

                        int code = conn.getResponseCode();
                        Log.d(TAG, "Decline request response: " + code);
                        conn.disconnect();
                    } catch (Exception e) {
                        Log.e(TAG, "Error sending decline request", e);
                    }
                }).start();
            }
        }
    }
}
