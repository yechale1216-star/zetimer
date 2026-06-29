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

            // TODO: Notify backend that call was declined
        }
    }
}
