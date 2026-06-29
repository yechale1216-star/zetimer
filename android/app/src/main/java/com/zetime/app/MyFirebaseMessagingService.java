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
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.zetime.app.R;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MyFirebaseMessaging";

    // Notification channel IDs
    private static final String CHANNEL_CALLS    = "incoming_calls";
    private static final String CHANNEL_MESSAGES = "messages";

    // Notification ID ranges
    private static final int NOTIF_ID_CALL = 1001;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM from: " + remoteMessage.getFrom());

        Map<String, String> data = remoteMessage.getData();
        Log.d(TAG, "FCM payload: " + data);

        if (data.isEmpty()) return;

        String type = data.get("type");
        if (type == null) return;

        switch (type) {
            case "incoming_call":
                Log.d(TAG, "Handling incoming call");
                handleIncomingCall(data);
                break;
            case "cancel_call":
                Log.d(TAG, "Handling cancel call");
                handleCancelCall(data);
                break;
            case "new_message":
                Log.d(TAG, "Handling new message notification");
                handleNewMessage(data);
                break;
            default:
                Log.d(TAG, "Unknown FCM type: " + type);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEW MESSAGE NOTIFICATION
    // ─────────────────────────────────────────────────────────────────────────

    private void handleNewMessage(Map<String, String> data) {
        String conversationId = data.get("conversationId");
        String senderName     = data.get("senderName");
        String senderAvatar   = data.get("senderAvatar");
        String preview        = data.get("messagePreview");
        String tag            = data.get("tag"); // "chat-<conversationId>"

        if (senderName == null) senderName = "New Message";
        if (preview    == null) preview    = "You have a new message";

        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createMessageChannel(nm);

        // Open app to the messaging screen on tap
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
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)   // Hide on lock screen
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 250, 150, 250})
                // Group notifications per conversation (Telegram-style stacking)
                .setGroup(tag != null ? tag : "chat-default")
                .setGroupSummary(false);

        // Use conversationId hash as notification ID so same chat groups correctly
        int notifId = conversationId != null ? Math.abs(conversationId.hashCode()) : (int) System.currentTimeMillis();
        nm.notify(notifId, builder.build());

        // Show a summary notification (required for grouped notifications on Android 7+)
        showMessageSummary(nm, senderName, preview, tag);
    }

    /** Shows a grouped summary notification — the outer "shell" of the grouped messages. */
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

    // ─────────────────────────────────────────────────────────────────────────
    // INCOMING CALL
    // ─────────────────────────────────────────────────────────────────────────

    private void handleIncomingCall(Map<String, String> data) {
        String callerName  = data.get("callerName");
        String callerAvatar = data.get("callerAvatar");
        String callId      = data.get("callId");
        String callType    = data.get("callType");

        Intent intent = new Intent(this, CallService.class);
        intent.putExtra("ACTION", "START_CALL");
        intent.putExtra("callerName", callerName);
        intent.putExtra("callerAvatar", callerAvatar);
        intent.putExtra("callId", callId);
        intent.putExtra("callType", callType);
        ContextCompat.startForegroundService(this, intent);

        showIncomingCallNotification(callerName, callId, callType);
    }

    private void handleCancelCall(Map<String, String> data) {
        Intent intent = new Intent(this, CallService.class);
        this.stopService(intent);

        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID_CALL);
    }

    private void showIncomingCallNotification(String callerName, String callId, String callType) {
        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createCallChannel(nm);

        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("isIncomingCall", true);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callType", callType);
        PendingIntent fsPendingIntent = PendingIntent.getActivity(this, 0,
                fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent answerIntent = new Intent(this, CallNotificationActionReceiver.class);
        answerIntent.setAction("ACTION_ANSWER");
        answerIntent.putExtra("callId", callId);
        PendingIntent answerPI = PendingIntent.getBroadcast(this, 1, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent declineIntent = new Intent(this, CallNotificationActionReceiver.class);
        declineIntent.setAction("ACTION_DECLINE");
        declineIntent.putExtra("callId", callId);
        PendingIntent declinePI = PendingIntent.getBroadcast(this, 2, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_CALLS)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Incoming " + (callType != null ? callType.toLowerCase() : "voice") + " call")
                .setContentText(callerName)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setAutoCancel(true)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(fsPendingIntent, true)
                .addAction(R.mipmap.ic_launcher, "Decline", declinePI)
                .addAction(R.mipmap.ic_launcher, "Answer",  answerPI);

        nm.notify(NOTIF_ID_CALL, builder.build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATION CHANNELS
    // ─────────────────────────────────────────────────────────────────────────

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

    private void createCallChannel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel ch = new NotificationChannel(
                CHANNEL_CALLS, "Incoming Calls", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Incoming voice and video call notifications");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 1000, 500, 1000});
        AudioAttributes aa = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
        nm.createNotificationChannel(ch);
        Log.d(TAG, "Call channel created");
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed: " + token);
        // Token will be re-registered next time the app authenticates via socket
    }
}
