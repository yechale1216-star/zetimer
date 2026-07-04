package com.zetime.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CallNotificationActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String callId = intent.getStringExtra("callId");

        if ("ACTION_ANSWER".equals(action)) {
            Log.d("CallReceiver", "Answering call: " + callId);
            
            // Stop ringing
            Intent serviceIntent = new Intent(context, CallService.class);
            serviceIntent.putExtra("ACTION", "STOP_CALL");
            context.startService(serviceIntent);

            // Open app and navigate to call screen
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("callAction", "ANSWER");
            openAppIntent.putExtra("callId", callId);
            openAppIntent.putExtra("callerId", intent.getStringExtra("callerId"));
            openAppIntent.putExtra("callType", intent.getStringExtra("callType"));
            context.startActivity(openAppIntent);

        } else if ("ACTION_DECLINE".equals(action)) {
            Log.d("CallReceiver", "Declining call: " + callId);
            
            // Stop ringing
            Intent serviceIntent = new Intent(context, CallService.class);
            serviceIntent.putExtra("ACTION", "STOP_CALL");
            context.startService(serviceIntent);
            
            // Cancel notification
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(1001);

            // Notify backend that call was declined using background thread HTTP call
            final String serverUrl = intent.getStringExtra("serverUrl");
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
                            
                            String jsonInputString = "{\"callId\": \"" + callId + "\"}";
                            try (java.io.OutputStream os = conn.getOutputStream()) {
                                byte[] input = jsonInputString.getBytes("utf-8");
                                os.write(input, 0, input.length);
                            }
                            
                            int code = conn.getResponseCode();
                            Log.d("CallReceiver", "Reject request background code: " + code);
                        } catch (Exception e) {
                            Log.e("CallReceiver", "Error sending reject request", e);
                        }
                    }
                }).start();
            }
        }
    }
}
