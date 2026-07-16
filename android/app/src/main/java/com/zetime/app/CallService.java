package com.zetime.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.content.pm.ServiceInfo;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.zetime.app.R;

public class CallService extends Service {
    private static final String TAG = "CallService";
    private static final String CHANNEL_ID = "active_calls";
    private static final int NOTIF_ID = 1002;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;

    // Extras stored for building the foreground notification action buttons
    private String pendingCallerName;
    private String pendingCallId;
    private String pendingCallerId;
    private String pendingCallType;
    private String pendingServerUrl;

    @Override
    public void onCreate() {
        super.onCreate();
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            // SCREEN_BRIGHT_WAKE_LOCK wakes the display when a call arrives with locked screen
            wakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                    "Zetime:CallWakeLock"
            );
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getStringExtra("ACTION");
        if ("START_CALL".equals(action)) {
            pendingCallerName = intent.getStringExtra("callerName");
            pendingCallId     = intent.getStringExtra("callId");
            pendingCallerId   = intent.getStringExtra("callerId");
            pendingCallType   = intent.getStringExtra("callType");
            pendingServerUrl  = intent.getStringExtra("serverUrl");

            Log.d(TAG, "Starting call ringing for: " + pendingCallerName);
            startRinging();
            showForegroundNotification();
        } else if ("STOP_CALL".equals(action)) {
            Log.d(TAG, "Stopping call ringing");
            stopRinging();
            stopForeground(true);
            stopSelf();
        }
        return START_STICKY;
    }

    private void startRinging() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

            if (mediaPlayer == null) {
                Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(this, ringtoneUri);

                // Use STREAM_RING so the ringtone respects the ring volume but plays
                // even when the notification stream is muted (phone-call behavior)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                } else {
                    mediaPlayer.setAudioStreamType(AudioManager.STREAM_RING);
                }

                mediaPlayer.setLooping(true);
                mediaPlayer.prepare();
                mediaPlayer.start();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting ringtone", e);
        }

        // Vibrate regardless of ringer mode (mirrors phone-call behavior)
        try {
            if (vibrator != null) {
                long[] pattern = new long[]{0, 1000, 600, 1000, 600};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting vibration", e);
        }

        // Wake the screen
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(45_000L); // hold up to 45 seconds
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }

    private void stopRinging() {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping media player", e);
        }
        try {
            if (vibrator != null) vibrator.cancel();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping vibration", e);
        }
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception e) {
            Log.e(TAG, "Error releasing wake lock", e);
        }
        // Explicitly abandon audio focus so the WebView's getUserMedia() can
        // successfully claim the microphone without audio-focus conflicts.
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // On O+ we should release the audio focus request object, but since
                    // we used a stream-based request, abandonAudioFocus(null) clears it.
                    audioManager.abandonAudioFocus(null);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error abandoning audio focus", e);
        }
    }

    private void showForegroundNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // IMPORTANCE_HIGH is required so the foreground notification triggers a Heads-Up
        // popup AND fires the full-screen intent on the lock screen.
        // IMPORTANCE_LOW actively suppresses both — do NOT use it for incoming calls.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Incoming Calls", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Incoming voice and video call alerts");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000});
            // Use ringtone sound for this channel
            android.media.AudioAttributes callAa = new android.media.AudioAttributes.Builder()
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            channel.setSound(android.media.RingtoneManager.getDefaultUri(
                    android.media.RingtoneManager.TYPE_RINGTONE), callAa);
            nm.createNotificationChannel(channel);
        }

        // Full-screen intent -> IncomingCallActivity (shows immediately over lock screen)
        Intent callScreenIntent = new Intent(this, IncomingCallActivity.class);
        callScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        callScreenIntent.putExtra("callId",     pendingCallId);
        callScreenIntent.putExtra("callerId",   pendingCallerId);
        callScreenIntent.putExtra("callerName", pendingCallerName);
        callScreenIntent.putExtra("callType",   pendingCallType);
        callScreenIntent.putExtra("serverUrl",  pendingServerUrl);
        PendingIntent callScreenPI = PendingIntent.getActivity(this, 99, callScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Content intent -> MainActivity (for tapping the notification banner)
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openIntent.putExtra("isIncomingCall", true);
        openIntent.putExtra("callId",    pendingCallId);
        openIntent.putExtra("callerId",  pendingCallerId);
        openIntent.putExtra("callerName", pendingCallerName);
        openIntent.putExtra("callType",  pendingCallType);
        openIntent.putExtra("serverUrl", pendingServerUrl);
        PendingIntent openPI = PendingIntent.getActivity(this, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Answer action
        Intent answerIntent = new Intent(this, MainActivity.class);
        answerIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        answerIntent.putExtra("callAction",  "ANSWER");
        answerIntent.putExtra("callId",      pendingCallId);
        answerIntent.putExtra("callerId",    pendingCallerId);
        answerIntent.putExtra("callType",    pendingCallType);
        answerIntent.putExtra("callerName",  pendingCallerName);
        answerIntent.putExtra("serverUrl",   pendingServerUrl);
        PendingIntent answerPI = PendingIntent.getActivity(this, 10, answerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Decline action
        Intent declineIntent = new Intent(this, CallNotificationActionReceiver.class);
        declineIntent.setAction("ACTION_DECLINE");
        declineIntent.putExtra("callId",    pendingCallId);
        declineIntent.putExtra("serverUrl", pendingServerUrl);
        PendingIntent declinePI = PendingIntent.getBroadcast(this, 11, declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String callerLabel = pendingCallerName != null ? pendingCallerName : "Unknown";
        String callTypeLabel = "VIDEO".equalsIgnoreCase(pendingCallType) ? "Video" : "Voice";

        // Create custom RemoteViews styled precisely like the foreground call banner
        android.widget.RemoteViews customView = new android.widget.RemoteViews(getPackageName(), R.layout.layout_notification_call_banner);
        customView.setTextViewText(R.id.banner_caller_name, callerLabel);
        customView.setTextViewText(R.id.banner_call_subtitle, "VIDEO".equalsIgnoreCase(pendingCallType) ? "Incoming video call" : "Incoming voice call");
        
        String name = (pendingCallerName != null && !pendingCallerName.isEmpty()) ? pendingCallerName : "Unknown Caller";
        String[] parts = name.split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) initials.append(p.charAt(0));
            if (initials.length() >= 2) break;
        }
        customView.setTextViewText(R.id.banner_avatar_initials, initials.toString().toUpperCase());
        
        customView.setOnClickPendingIntent(R.id.banner_btn_accept, answerPI);
        customView.setOnClickPendingIntent(R.id.banner_btn_decline, declinePI);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Incoming " + callTypeLabel + " Call")
                .setContentText(callerLabel)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(openPI)
                .setFullScreenIntent(callScreenPI, true)
                // Custom banner view for the notification drawer/expanded state
                .setCustomBigContentView(customView)
                // Keep compact content simple for lock-screen preview
                .setCustomContentView(customView)
                // NOTE: Do NOT use DecoratedCustomViewStyle — on HIGH-importance channels
                // it can suppress the custom HUN view on some OEMs. We rely on
                // setFullScreenIntent (IncomingCallActivity) for the lock-screen UI.
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePI)
                .addAction(android.R.drawable.ic_menu_call, "Answer", answerPI)
                .build();


        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, notification,
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
            } else {
                startForeground(NOTIF_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground notification", e);
            // Still proceed — ringing continues via MediaPlayer + Vibrator
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopRinging();
        super.onDestroy();
    }
}
