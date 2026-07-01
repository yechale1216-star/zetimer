package com.zetime.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.content.pm.ServiceInfo;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import com.zetime.app.R;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class CallService extends Service {
    private static final String TAG = "CallService";
    private static final String CHANNEL_CALLS = "incoming_calls";
    private static final int NOTIF_ID_CALL = 1001;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private Runnable timeoutRunnable = null;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate service initialized");
        vibrator = (Vibrator) this.getSystemService(Context.VIBRATOR_SERVICE);
        PowerManager powerManager = (PowerManager) this.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            // FULL_WAKE_LOCK turns screen ON and ACQUIRE_CAUSES_WAKEUP forces immediate hardware wake up on locking
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, 
                "Zetime:CallWakeLock"
            );
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.d(TAG, "onStartCommand received null intent");
            return START_NOT_STICKY;
        }
        
        String action = intent.getStringExtra("ACTION");
        Log.d(TAG, "onStartCommand Action: " + action);

        if ("START_CALL".equals(action)) {
            String callerName = intent.getStringExtra("callerName");
            String callerAvatar = intent.getStringExtra("callerAvatar");
            String callId = intent.getStringExtra("callId");
            String callerId = intent.getStringExtra("callerId");
            String callType = intent.getStringExtra("callType");
            String serverUrl = intent.getStringExtra("serverUrl");

            Log.d(TAG, "START_CALL details: callerName=" + callerName + ", callId=" + callId + ", callType=" + callType);

            // 1. Build call notification WITH Full-Screen Lock Screen Intent
            Intent fullScreenIntent = new Intent(this, MainActivity.class);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            fullScreenIntent.putExtra("callId", callId);
            fullScreenIntent.putExtra("callerId", callerId);
            fullScreenIntent.putExtra("isIncomingCall", true);
            fullScreenIntent.putExtra("callerName", callerName);
            fullScreenIntent.putExtra("callType", callType);
            fullScreenIntent.putExtra("serverUrl", serverUrl);
            
            PendingIntent fsPendingIntent = PendingIntent.getActivity(this, 100,
                    fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            // Setup Answer action
            Intent answerIntent = new Intent(this, CallNotificationActionReceiver.class);
            answerIntent.setAction("ACTION_ANSWER");
            answerIntent.putExtra("callId", callId);
            answerIntent.putExtra("callerId", callerId);
            answerIntent.putExtra("callType", callType);
            PendingIntent answerPI = PendingIntent.getBroadcast(this, 101, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            // Setup Decline action
            Intent declineIntent = new Intent(this, CallNotificationActionReceiver.class);
            declineIntent.setAction("ACTION_DECLINE");
            declineIntent.putExtra("callId", callId);
            declineIntent.putExtra("serverUrl", serverUrl);
            PendingIntent declinePI = PendingIntent.getBroadcast(this, 102, declineIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                createCallChannel(nm);
            }

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
                    .addAction(R.mipmap.ic_launcher, "Answer", answerPI);

            Notification notification = builder.build();

            // 2. Start service as foreground call immediately (satisfies Android 14 requirements)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIF_ID_CALL, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
                } else {
                    startForeground(NOTIF_ID_CALL, notification);
                }
                Log.d(TAG, "Service started in foreground successfully");
            } catch (Exception e) {
                Log.e(TAG, "Failed startForeground call", e);
            }

            // 3. Play audio and vibration, light up screen
            startRinging();

            // 4. Set backup native timeout for 30s
            startTimeoutTimer(callId, serverUrl);

        } else if ("STOP_CALL".equals(action)) {
            Log.d(TAG, "STOP_CALL command received. Cleaning up CallService");
            stopTimeoutTimer();
            stopRinging();
            stopForeground(true);
            stopSelf();
        }
        return START_STICKY;
    }

    private void startRinging() {
        try {
            if (mediaPlayer == null) {
                Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                mediaPlayer = MediaPlayer.create(this, ringtoneUri);
                if (mediaPlayer != null) {
                    mediaPlayer.setLooping(true);
                    mediaPlayer.start();
                    Log.d(TAG, "Ringtone player started successfully");
                }
            }

            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 1000, 500}, 0));
                } else {
                    vibrator.vibrate(new long[]{0, 1000, 500}, 0);
                }
                Log.d(TAG, "Vibrator waveform started successfully");
            }

            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(30000); // 30s screen-on duration
                Log.d(TAG, "Screen force-wakeup lock acquired");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in startRinging", e);
        }
    }

    private void stopRinging() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.release();
                Log.d(TAG, "MediaPlayer released");
            } catch (Exception e) {
                Log.e(TAG, "Error releasing MediaPlayer", e);
            }
            mediaPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
            Log.d(TAG, "Vibration cancelled");
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "Wake lock released");
        }
    }

    private void startTimeoutTimer(final String callId, final String serverUrl) {
        stopTimeoutTimer();
        timeoutRunnable = new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "Incoming call Native Timeout triggered after 30 seconds");
                stopRinging();
                notifyBackendMissed(callId, serverUrl);
                
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(NOTIF_ID_CALL);
                }
                stopForeground(true);
                stopSelf();
            }
        };
        timeoutHandler.postDelayed(timeoutRunnable, 30000);
        Log.d(TAG, "Timeout timer scheduled for 30s");
    }

    private void stopTimeoutTimer() {
        if (timeoutRunnable != null) {
            timeoutHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
            Log.d(TAG, "Timeout timer cancelled");
        }
    }

    private void notifyBackendMissed(final String callId, final String serverUrl) {
        if (serverUrl == null || callId == null) return;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(serverUrl + "/api/calls/public-reject");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    conn.setDoOutput(true);
                    
                    String jsonInputString = "{\"callId\": \"" + callId + "\", \"reason\": \"MISSED\"}";
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonInputString.getBytes("utf-8");
                        os.write(input, 0, input.length);
                    }
                    
                    int code = conn.getResponseCode();
                    Log.d(TAG, "API public-reject (MISSED) response code: " + code);
                } catch (Exception e) {
                    Log.e(TAG, "API request failure in notifyBackendMissed", e);
                }
            }
        }).start();
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
        ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), aa);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setBypassDnd(true);
        
        nm.createNotificationChannel(ch);
        Log.d(TAG, "Call Notification Channel created/verified on Android O+");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy service cleanup");
        stopTimeoutTimer();
        stopRinging();
        super.onDestroy();
    }
}
