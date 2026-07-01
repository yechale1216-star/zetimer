package com.zetime.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CallNotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "CallNotificationActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String callId = intent.getStringExtra("callId");

        Log.d(TAG, "Notification action received: action=" + action + ", callId=" + callId);

        if ("ACTION_ANSWER".equals(action)) {
            Log.d(TAG, "Handling ACTION_ANSWER code path");
            
            // 1. Stop ringing and close CallService
            Intent serviceIntent = new Intent(context, CallService.class);
            serviceIntent.putExtra("ACTION", "STOP_CALL");
            context.startService(serviceIntent);

            // 2. Open MainActivity and navigate to calling screen
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("callAction", "ANSWER");
            openAppIntent.putExtra("callId", callId);
            openAppIntent.putExtra("callerId", intent.getStringExtra("callerId"));
            openAppIntent.putExtra("callType", intent.getStringExtra("callType"));
            context.startActivity(openAppIntent);
            Log.d(TAG, "MainActivity launched for answering");

        } else if ("ACTION_DECLINE".equals(action)) {
            Log.d(TAG, "Handling ACTION_DECLINE code path");
            
            // 1. Stop ringing and close CallService
            Intent serviceIntent = new Intent(context, CallService.class);
            serviceIntent.putExtra("ACTION", "STOP_CALL");
            context.startService(serviceIntent);
            
            // 2. Cancel Notification
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(1001);
                Log.d(TAG, "Notification 1001 cancelled programmatic trigger");
            }
            
            // 3. Notify backend API of rejection
            final String serverUrl = intent.getStringExtra("serverUrl");
            Log.d(TAG, "Rejection URL target: " + serverUrl);
            if (serverUrl != null && callId != null) {
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            java.net.URL url = new java.net.URL(serverUrl + "/api/calls/public-reject");
                            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("POST");
                            conn.setRequestProperty("Content-Type", "application/json; utf-8");
                            conn.setDoOutput(true);
                            
                            String jsonInputString = "{\"callId\": \"" + callId + "\", \"reason\": \"DECLINED\"}";
                            try (java.io.OutputStream os = conn.getOutputStream()) {
                                byte[] input = jsonInputString.getBytes("utf-8");
                                os.write(input, 0, input.length);
                            }
                            
                            int code = conn.getResponseCode();
                            Log.d(TAG, "Backend public-reject (DECLINED) responded with code: " + code);
                        } catch (Exception e) {
                            Log.e(TAG, "Failed sending rejection to backend server", e);
                        }
                    }
                }).start();
            }
        }
    }
}
