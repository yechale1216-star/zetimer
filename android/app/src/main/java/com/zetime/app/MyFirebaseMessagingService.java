package com.zetime.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.zetime.app.R;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MyFirebaseMessaging";
    private static final String CHANNEL_MESSAGES = "messages";
    private static final int NOTIF_ID_CALL = 1001;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM onMessageReceived from: " + remoteMessage.getFrom());

        Map<String, String> data = remoteMessage.getData();
        Log.d(TAG, "FCM data payload map: " + data);

        if (data.isEmpty()) {
            Log.d(TAG, "FCM data payload is empty, skipping");
            return;
        }

        String type = data.get("type");
        if (type == null) {
            Log.d(TAG, "FCM data type is null, skipping");
            return;
        }

        switch (type) {
            case "incoming_call":
                Log.d(TAG, "Dispatching incoming call event data to CallService");
                handleIncomingCall(data);
                break;
            case "cancel_call":
                Log.d(TAG, "Dispatching cancel call event data to CallService");
                handleCancelCall(data);
                break;
            case "new_message":
                Log.d(TAG, "Dispatching new message notification");
                handleNewMessage(data);
                break;
            default:
                Log.d(TAG, "Unknown FCM data type: " + type);
        }
    }

    private void handleIncomingCall(Map<String, String> data) {
        String callerName  = data.get("callerName");
        String callerAvatar = data.get("callerAvatar");
        String callId      = data.get("callId");
        String callerId    = data.get("callerId");
        String callType    = data.get("callType");
        String serverUrl   = data.get("serverUrl");

        Intent intent = new Intent(this, CallService.class);
        intent.putExtra("ACTION", "START_CALL");
        intent.putExtra("callerName", callerName);
        intent.putExtra("callerAvatar", callerAvatar);
        intent.putExtra("callId", callId);
        intent.putExtra("callerId", callerId);
        intent.putExtra("callType", callType);
        intent.putExtra("serverUrl", serverUrl);

        try {
            Log.d(TAG, "Invoking startForegroundService for CallService");
            ContextCompat.startForegroundService(this, intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed startForegroundService, fallback to normal startService", e);
            try {
                this.startService(intent);
            } catch (Exception ex) {
                Log.e(TAG, "Failed startService completely", ex);
            }
        }
    }

    private void handleCancelCall(Map<String, String> data) {
        String callId = data.get("callId");
        Log.d(TAG, "Cancel call command received for callId: " + callId);
        Intent intent = new Intent(this, CallService.class);
        intent.putExtra("ACTION", "STOP_CALL");
        try {
            this.startService(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed startService to stop call service", e);
            this.stopService(intent);
        }

        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIF_ID_CALL);
            Log.d(TAG, "Incoming Call notification manual deletion triggered");
        }
    }

    private void handleNewMessage(Map<String, String> data) {
        String conversationId = data.get("conversationId");
        String senderName     = data.get("senderName");
        String preview        = data.get("messagePreview");
        String tag            = data.get("tag"); // "chat-<conversationId>"

        if (senderName == null) senderName = "New Message";
        if (preview    == null) preview    = "You have a new message";

        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createMessageChannel(nm);

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra("openConversationId", conversationId);
        openIntent.putExtra("notifType", "new_message");

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, (conversationId != null ? conversationId.hashCode() : 0),
                openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_MESSAGES)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(senderName)
                .setContentText(preview)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(preview))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 250, 150, 250})
                .setGroup(tag != null ? tag : "chat-default")
                .setGroupSummary(false);

        int notifId = conversationId != null ? Math.abs(conversationId.hashCode()) : (int) System.currentTimeMillis();
        nm.notify(notifId, builder.build());

        showMessageSummary(nm, senderName, preview, tag);
    }

    private void showMessageSummary(NotificationManager nm, String senderName, String preview, String group) {
        if (group == null) group = "chat-default";

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 9999,
                openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder summary = new NotificationCompat.Builder(this, CHANNEL_MESSAGES)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setStyle(new NotificationCompat.InboxStyle()
                        .setSummaryText("Zetime Messages"))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setGroup(group)
                .setGroupSummary(true)
                .setAutoCancel(true)
                .setContentIntent(pi);

        nm.notify(group.hashCode(), summary.build());
    }

    private void createMessageChannel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel ch = new NotificationChannel(
                CHANNEL_MESSAGES, "Messages", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Incoming chat message notifications");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 250, 150, 250});
        ch.setShowBadge(true);
        
        AudioAttributes aa = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
        ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), aa);
        nm.createNotificationChannel(ch);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New token generated: " + token);
    }
}
