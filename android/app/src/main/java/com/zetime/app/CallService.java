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
import androidx.core.app.Person;
import androidx.core.graphics.drawable.IconCompat;

import com.zetime.app.R;

public class CallService extends Service {
    private static final String TAG = "CallService";
    private static final String CHANNEL_ID = "incoming_calls_channel_v5";
    private static final int NOTIF_ID = 1002;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;

    // Extras stored for building the foreground notification action buttons
    private String pendingCallerName;
    private String pendingCallerAvatar;
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
            // Stop any existing ringing first (Requirement 10: Stop any existing ringtone before starting another)
            stopRinging();

            // Dismiss any active foreground CallManager banner to avoid UI overlap
            try {
                CallManager.getInstance().dismissBanner();
                Log.d(TAG, "Dismissed CallManager banner before starting background ringtone");
            } catch (Exception e) {
                Log.e(TAG, "Error dismissing CallManager banner", e);
            }

            pendingCallerName = intent.getStringExtra("callerName");
            pendingCallerAvatar = intent.getStringExtra("callerAvatar");
            pendingCallId     = intent.getStringExtra("callId");
            pendingCallerId   = intent.getStringExtra("callerId");
            pendingCallType   = intent.getStringExtra("callType");
            pendingServerUrl  = intent.getStringExtra("serverUrl");

            Log.d(TAG, "Starting call ringing for: " + pendingCallerName + ", callId: " + pendingCallId);
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
        Log.d(TAG, "Constructing head-up CallStyle notification for " + pendingCallerName);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // IMPORTANCE_HIGH is required so the foreground notification triggers a Heads-Up popup
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Incoming Calls", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Incoming voice and video call alerts");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 600, 1000, 600});
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            // Mute notification sound (handled manually by CallService's MediaPlayer)
            channel.setSound(null, null);
            nm.createNotificationChannel(channel);
            Log.d(TAG, "Created incoming call notification channel with HIGH importance: " + CHANNEL_ID);
        }

        // Full-screen intent -> IncomingCallActivity (shows immediately over lock screen)
        Intent callScreenIntent = new Intent(this, IncomingCallActivity.class);
        callScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                | Intent.FLAG_ACTIVITY_NO_USER_ACTION 
                | Intent.FLAG_ACTIVITY_SINGLE_TOP 
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        callScreenIntent.putExtra("callId",     pendingCallId);
        callScreenIntent.putExtra("callerId",   pendingCallerId);
        callScreenIntent.putExtra("callerName", pendingCallerName);
        callScreenIntent.putExtra("callType",   pendingCallType);
        callScreenIntent.putExtra("serverUrl",  pendingServerUrl);
        PendingIntent callScreenPI = PendingIntent.getActivity(this, 99, callScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Log.d(TAG, "Configured fullScreenIntent PendingIntent");

        // Content intent (tap on notification) -> MainActivity
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

        // Answer PendingIntent (starts MainActivity with ANSWER action)
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

        // Decline PendingIntent (declines via CallNotificationActionReceiver)
        Intent declineIntent = new Intent(this, CallNotificationActionReceiver.class);
        declineIntent.setAction("ACTION_DECLINE");
        declineIntent.putExtra("callId",    pendingCallId);
        declineIntent.putExtra("serverUrl", pendingServerUrl);
        PendingIntent declinePI = PendingIntent.getBroadcast(this, 11, declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String callerLabel = pendingCallerName != null ? pendingCallerName : "Unknown";
        String callTypeLabel = "VIDEO".equalsIgnoreCase(pendingCallType) ? "Video" : "Voice";

        // Generate fallback initials avatar immediately
        android.graphics.Bitmap initialsBitmap = createInitialsBitmap(callerLabel);

        // Build native CallStyle Person
        Person caller = new Person.Builder()
                .setName(callerLabel)
                .setIcon(IconCompat.createWithBitmap(initialsBitmap))
                .setImportant(true)
                .build();

        // Build CallStyle
        NotificationCompat.CallStyle callStyle = NotificationCompat.CallStyle.forIncomingCall(
                caller, declinePI, answerPI);

        // Build the primary notificationCompat Builder using CallStyle
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Incoming " + callTypeLabel + " Call")
                .setContentText(callerLabel)
                .setSubText("Incoming voice call")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setSound(null)  // Handled by MediaPlayer
                .setSilent(true) // Handled by MediaPlayer
                .setContentIntent(openPI)
                .setFullScreenIntent(callScreenPI, true)
                .setStyle(callStyle);

        Notification notification = builder.build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, notification,
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
            } else {
                startForeground(NOTIF_ID, notification);
            }
            Log.d(TAG, "Service startForeground executed successfully with NOTIF_ID " + NOTIF_ID);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground notification", e);
        }

        // Asynchronously load the real photo if URL is provided
        loadAvatarAndResource(pendingCallerAvatar, callerLabel, declinePI, answerPI, NOTIF_ID, builder, nm);

        // Also call startActivity directly as a fallback.
        try {
            Intent directIntent = new Intent(this, IncomingCallActivity.class);
            directIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
                    | Intent.FLAG_ACTIVITY_NO_USER_ACTION 
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP 
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            directIntent.putExtra("callId",     pendingCallId);
            directIntent.putExtra("callerId",   pendingCallerId);
            directIntent.putExtra("callerName", pendingCallerName);
            directIntent.putExtra("callType",   pendingCallType);
            directIntent.putExtra("serverUrl",  pendingServerUrl);
            startActivity(directIntent);
            Log.d(TAG, "Direct launch of IncomingCallActivity succeeded");
        } catch (Exception e) {
            Log.w(TAG, "Direct launch of IncomingCallActivity failed (expected background delay)", e);
        }
    }

    private android.graphics.Bitmap createInitialsBitmap(String name) {
        int size = 120;
        android.graphics.Bitmap bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
        
        // Background circle
        android.graphics.Paint paint = new android.graphics.Paint();
        paint.setAntiAlias(true);
        paint.setColor(0xFF1a2351); // Dark blue Zetime background
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        
        // Initials text
        String[] parts = name.split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) initials.append(p.charAt(0));
            if (initials.length() >= 2) break;
        }
        String text = initials.toString().toUpperCase();
        
        paint.setColor(0xFFFFFFFF); // White text
        paint.setTextSize(48);
        paint.setTextAlign(android.graphics.Paint.Align.CENTER);
        paint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.SANS_SERIF, android.graphics.Typeface.BOLD));
        
        // Center text Vertically
        android.graphics.Rect bounds = new android.graphics.Rect();
        paint.getTextBounds(text, 0, text.length(), bounds);
        float y = (size / 2f) - bounds.exactCenterY();
        
        canvas.drawText(text, size / 2f, y, paint);
        return bitmap;
    }

    private android.graphics.Bitmap getCircleBitmap(android.graphics.Bitmap bitmap) {
        int size = Math.min(bitmap.getWidth(), bitmap.getHeight());
        android.graphics.Bitmap output = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(output);

        final int color = 0xff424242;
        final android.graphics.Paint paint = new android.graphics.Paint();
        final android.graphics.Rect rect = new android.graphics.Rect(0, 0, size, size);

        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(color);
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rect, paint);
        return output;
    }

    private void loadAvatarAndResource(String avatarUrl, final String callerLabel, final PendingIntent declinePI, final PendingIntent answerPI, final int notifId, final NotificationCompat.Builder builder, final NotificationManager nm) {
        if (avatarUrl == null || avatarUrl.isEmpty()) return;
        new Thread(() -> {
            try {
                Log.d(TAG, "Downloading avatar URL asynchronously: " + avatarUrl);
                java.net.URL url = new java.net.URL(avatarUrl);
                java.net.HttpURLConnection connection = (java.net.HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.connect();
                java.io.InputStream input = connection.getInputStream();
                android.graphics.Bitmap myBitmap = android.graphics.BitmapFactory.decodeStream(input);
                if (myBitmap != null) {
                    android.graphics.Bitmap circularBitmap = getCircleBitmap(myBitmap);
                    
                    // Create Person with the downloaded avatar
                    Person caller = new Person.Builder()
                            .setName(callerLabel)
                            .setIcon(IconCompat.createWithBitmap(circularBitmap))
                            .setImportant(true)
                            .build();
                    
                    // Re-apply CallStyle
                    NotificationCompat.CallStyle callStyle = NotificationCompat.CallStyle.forIncomingCall(
                            caller, declinePI, answerPI);
                    
                    builder.setStyle(callStyle);
                    builder.setLargeIcon(circularBitmap); // Secondary large icon binding
                    
                    // Re-notify
                    nm.notify(notifId, builder.build());
                    Log.d(TAG, "Successfully loaded caller photo and updated CallStyle notification");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error downloading caller avatar: " + e.getMessage());
            }
        }).start();
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
