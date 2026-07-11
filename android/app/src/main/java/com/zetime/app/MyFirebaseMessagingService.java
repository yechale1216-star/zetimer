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
    private static final String CHANNEL_HIGH     = "high_priority";
    private static final String CHANNEL_DEFAULT  = "default_priority";
    private static final String CHANNEL_LOW      = "low_priority";

    // Notification ID ranges
    private static final int NOTIF_ID_CALL = 1001;

    private boolean isAppInForeground() {
        if (MainActivity.isAppInForeground) {
            return true;
        }
        try {
            android.app.ActivityManager.RunningAppProcessInfo appProcessInfo = new android.app.ActivityManager.RunningAppProcessInfo();
            android.app.ActivityManager.getMyMemoryState(appProcessInfo);
            return (appProcessInfo.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                    || appProcessInfo.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE);
        } catch (Exception e) {
            return false;
        }
    }

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
                if (isAppInForeground()) {
                    Log.d(TAG, "App is in foreground. Showing CallManager banner overlay.");
                    String callerName = data.get("callerName");
                    String callId      = data.get("callId");
                    String callerId    = data.get("callerId");
                    String callType    = data.get("callType");
                    String serverUrl   = data.get("serverUrl");
                    CallManager.getInstance().showBanner(
                        MainActivity.getInstance(),
                        callerName != null ? callerName : "Unknown Caller",
                        callId,
                        callerId,
                        callType,
                        serverUrl
                    );
                    break;
                }
                handleIncomingCall(data);
                break;
            case "cancel_call":
                Log.d(TAG, "Handling cancel call");
                handleCancelCall(data);
                break;
            case "new_message":
            case "late_arrival":
            case "absent_arrival":
            case "excused_arrival":
            case "new_announcement":
            case "system_update":
            case "account_security":
                Log.d(TAG, "Handling generic notification: " + type);
                handleGenericNotification(data);
                break;
            default:
                Log.d(TAG, "Unknown FCM type: " + type);
                handleGenericNotification(data);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERIC NOTIFICATION HANDLING
    // ─────────────────────────────────────────────────────────────────────────

    private void handleGenericNotification(Map<String, String> data) {
        String type           = data.get("type");
        String title          = data.get("title");
        String body           = data.get("body");
        String route          = data.get("route");
        String conversationId = data.get("conversationId");
        String studentId      = data.get("studentId");
        String schoolId       = data.get("schoolId");
        String tag            = data.get("tag");
        
        if (title == null) title = "Zetime Alert";
        if (body  == null) body  = "You have a new update";
        if (type  == null) type  = "general";

        // Suppress native system tray display if app is currently in foreground
        if (isAppInForeground() && MainActivity.getInstance() != null) {
            Log.d(TAG, "App is in foreground. Suppressing system tray display and posting directly to JS.");
            com.getcapacitor.JSObject notifData = new com.getcapacitor.JSObject();
            for (Map.Entry<String, String> entry : data.entrySet()) {
                notifData.put(entry.getKey(), entry.getValue());
            }
            MainActivity.getInstance().postForegroundNotification(notifData);
            return;
        }

        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createNotificationChannels(nm);

        // Determine priority, channel, and vibration
        String channelId = CHANNEL_DEFAULT;
        int importance = NotificationCompat.PRIORITY_DEFAULT;
        long[] vibratePattern = new long[]{0, 200, 100, 200};
        String category = NotificationCompat.CATEGORY_EVENT;

        if ("new_message".equals(type) || "account_security".equals(type)) {
            channelId = CHANNEL_HIGH;
            importance = NotificationCompat.PRIORITY_HIGH;
            vibratePattern = new long[]{0, 250, 150, 250};
            category = "new_message".equals(type) ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_STATUS;
        } else if ("system_update".equals(type)) {
            channelId = CHANNEL_LOW;
            importance = NotificationCompat.PRIORITY_LOW;
            vibratePattern = null;
            category = NotificationCompat.CATEGORY_STATUS;
        }

        // Open app to target route on tap
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra("notifType", type);
        openIntent.putExtra("route", route);
        openIntent.putExtra("openConversationId", conversationId);
        openIntent.putExtra("studentId", studentId);
        openIntent.putExtra("schoolId", schoolId);

        int requestCode = (conversationId != null) ? conversationId.hashCode() 
                        : (studentId != null) ? studentId.hashCode() 
                        : (int) System.currentTimeMillis();

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, Math.abs(requestCode),
                openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Sound config using generated R.raw.notification
        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.notification);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(importance)
                .setCategory(category)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Visible on lock screen
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setLights(0xFF00FF00, 3000, 3000); // Pulse LED

        if (!CHANNEL_LOW.equals(channelId)) {
            builder.setSound(soundUri);
            if (vibratePattern != null) {
                builder.setVibrate(vibratePattern);
            }
        } else {
            builder.setSound(null);
        }

        // Handle badges if present
        int unreadCount = 0;
        if (data.containsKey("badge")) {
            try { unreadCount = Integer.parseInt(data.get("badge")); } catch (Exception e) {}
        }
        if (unreadCount > 0) {
            builder.setNumber(unreadCount);
        }

        // Stacking / Grouping
        String groupKey = tag;
        if (groupKey == null) {
            if ("new_message".equals(type)) {
                groupKey = "chat-" + (conversationId != null ? conversationId : "default");
            } else if (type.contains("arrival") || type.contains("absent") || type.contains("excused")) {
                groupKey = "attendance";
            } else if ("new_announcement".equals(type)) {
                groupKey = "announcements";
            } else {
                groupKey = "general";
            }
        }

        builder.setGroup(groupKey);
        builder.setGroupSummary(false);

        int notifId = (conversationId != null) ? Math.abs(conversationId.hashCode()) 
                    : (studentId != null) ? Math.abs(studentId.hashCode()) 
                    : (int) System.currentTimeMillis();

        nm.notify(notifId, builder.build());

        // Group summary notification (required for stacking on Android 7+)
        showGroupSummary(nm, groupKey, type, channelId, unreadCount);
    }

    private void showGroupSummary(NotificationManager nm, String groupKey, String type, String channelId, int unreadCount) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, Math.abs(groupKey.hashCode()),
                openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String summaryText = "Zetime Notifications";
        if (groupKey.startsWith("chat-")) {
            summaryText = "Zetime Chat Messages";
        } else if ("attendance".equals(groupKey)) {
            summaryText = "Zetime Attendance Updates";
        } else if ("announcements".equals(groupKey)) {
            summaryText = "Zetime Announcements";
        }

        NotificationCompat.Builder summary = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setStyle(new NotificationCompat.InboxStyle().setSummaryText(summaryText))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setGroup(groupKey)
                .setGroupSummary(true)
                .setAutoCancel(true)
                .setContentIntent(pi);

        if (unreadCount > 0) {
            summary.setNumber(unreadCount);
        }

        nm.notify(Math.abs(groupKey.hashCode()), summary.build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INCOMING CALL
    // ─────────────────────────────────────────────────────────────────────────

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
            ContextCompat.startForegroundService(this, intent);
        } catch (Exception e) {
            Log.e(TAG, "Not allowed to start foreground service from background, falling back to background service", e);
            try {
                this.startService(intent);
            } catch (Exception ex) {
                Log.e(TAG, "Failed to start call service completely", ex);
            }
        }

        showIncomingCallNotification(callerName, callId, callType, callerId, serverUrl);
    }

    private void handleCancelCall(Map<String, String> data) {
        // Stop the background CallService (for locked/background calls)
        Intent intent = new Intent(this, CallService.class);
        this.stopService(intent);

        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIF_ID_CALL);
            nm.cancel(1002);
        }

        // Dismiss the foreground banner if showing (for foreground calls)
        CallManager.getInstance().handleCallCanceled();
    }

    private void showIncomingCallNotification(String callerName, String callId, String callType, String callerId, String serverUrl) {
        NotificationManager nm = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        createNotificationChannels(nm);

        Intent fullScreenIntent = new Intent(this, IncomingCallActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("callerId", callerId);
        fullScreenIntent.putExtra("isIncomingCall", true);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("serverUrl", serverUrl);
        PendingIntent fsPendingIntent = PendingIntent.getActivity(this, 99,
                fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent answerIntent = new Intent(this, MainActivity.class);
        answerIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        answerIntent.putExtra("callAction",  "ANSWER");
        answerIntent.putExtra("callId",      callId);
        answerIntent.putExtra("callerId",    callerId);
        answerIntent.putExtra("callType",    callType);
        answerIntent.putExtra("callerName",  callerName);
        answerIntent.putExtra("serverUrl",   serverUrl);
        PendingIntent answerPI = PendingIntent.getActivity(this, 1, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent declineIntent = new Intent(this, CallNotificationActionReceiver.class);
        declineIntent.setAction("ACTION_DECLINE");
        declineIntent.putExtra("callId",    callId);
        declineIntent.putExtra("serverUrl", serverUrl);
        PendingIntent declinePI = PendingIntent.getBroadcast(this, 2, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String callTypeLabel = "VIDEO".equalsIgnoreCase(callType) ? "Video" : "Voice";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_CALLS)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Incoming " + callTypeLabel + " Call")
                .setContentText(callerName)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setAutoCancel(false)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(fsPendingIntent, true)
                .addAction(R.mipmap.ic_launcher, "Decline", declinePI)
                .addAction(R.mipmap.ic_launcher, "Answer",  answerPI);

        nm.notify(NOTIF_ID_CALL, builder.build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATION CHANNELS Setup
    // ─────────────────────────────────────────────────────────────────────────

    private void createNotificationChannels(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        AudioAttributes aa = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
        
        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.notification);

        // 1. High Priority Channel
        NotificationChannel highCh = new NotificationChannel(
                CHANNEL_HIGH, "High Priority Alert", NotificationManager.IMPORTANCE_HIGH);
        highCh.setDescription("Voice/video calls, chat messages, and security alerts.");
        highCh.enableVibration(true);
        highCh.setVibrationPattern(new long[]{0, 250, 150, 250});
        highCh.setShowBadge(true);
        highCh.setSound(soundUri, aa);
        nm.createNotificationChannel(highCh);

        // 2. Default Priority Channel
        NotificationChannel defaultCh = new NotificationChannel(
                CHANNEL_DEFAULT, "Default Notification", NotificationManager.IMPORTANCE_DEFAULT);
        defaultCh.setDescription("Attendance alerts and announcements.");
        defaultCh.enableVibration(true);
        defaultCh.setVibrationPattern(new long[]{0, 200, 100, 200});
        defaultCh.setShowBadge(true);
        defaultCh.setSound(soundUri, aa);
        nm.createNotificationChannel(defaultCh);

        // 3. Low Priority Channel
        NotificationChannel lowCh = new NotificationChannel(
                CHANNEL_LOW, "Low Priority Update", NotificationManager.IMPORTANCE_LOW);
        lowCh.setDescription("System updates and minor alerts.");
        lowCh.enableVibration(false);
        lowCh.setShowBadge(true);
        lowCh.setSound(null, null);
        nm.createNotificationChannel(lowCh);

        // 4. Calls Channel (existing)
        NotificationChannel callCh = new NotificationChannel(
                CHANNEL_CALLS, "Incoming Calls", NotificationManager.IMPORTANCE_HIGH);
        callCh.setDescription("Incoming voice and video call notifications");
        callCh.enableVibration(true);
        callCh.setVibrationPattern(new long[]{0, 1000, 500, 1000});
        AudioAttributes callAa = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
        callCh.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), callAa);
        nm.createNotificationChannel(callCh);
        Log.d(TAG, "Notification channels verified");
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed: " + token);

        // Read the stored auth token and API URL from SharedPreferences
        android.content.SharedPreferences prefs = getSharedPreferences("zetime_prefs", android.content.Context.MODE_PRIVATE);
        String authToken = prefs.getString("auth_token", null);
        if (authToken == null || authToken.isEmpty()) {
            Log.d(TAG, "No auth token found in SharedPreferences. Skipping token refresh on server.");
            return;
        }

        String baseUrl = prefs.getString("api_url", "https://zetime-backend.onrender.com");
        String apiUrl = baseUrl + "/api/auth/push-token";

        // Persist the new token to the backend so server-side pushes keep working
        // We do this on a background thread to avoid blocking the main thread
        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL(apiUrl);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setRequestProperty("Authorization", "Bearer " + authToken);

                String jsonBody = "{\"token\":\"" + token + "\"}";
                byte[] bytes = jsonBody.getBytes("UTF-8");
                conn.getOutputStream().write(bytes);

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "FCM token refresh POST response: " + responseCode);
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to save refreshed FCM token to server: " + e.getMessage());
            }
        }).start();
    }
}
