package com.zetime.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
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
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        vibrator = (Vibrator) this.getSystemService(Context.VIBRATOR_SERVICE);
        PowerManager powerManager = (PowerManager) this.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zetime:CallWakeLock");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        
        String action = intent.getStringExtra("ACTION");
        if ("START_CALL".equals(action)) {
            Log.d(TAG, "Starting call ringing for: " + intent.getStringExtra("callerName"));
            startRinging();
            showForegroundNotification(intent.getStringExtra("callerName"));
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
            if (mediaPlayer == null) {
                Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                mediaPlayer = MediaPlayer.create(this, ringtoneUri);
                if (mediaPlayer != null) {
                    mediaPlayer.setLooping(true);
                    mediaPlayer.start();
                }
            }

            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 1000, 500}, 0));
                } else {
                    vibrator.vibrate(new long[]{0, 1000, 500}, 0);
                }
            }

            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(30000); // 30 seconds timeout
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting ringtone", e);
        }
    }

    private void stopRinging() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
            mediaPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    private void showForegroundNotification(String callerName) {
        NotificationManager notificationManager = (NotificationManager) this.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Active Calls", NotificationManager.IMPORTANCE_LOW);
            notificationManager.createNotificationChannel(channel);
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Zetime Call")
                .setContentText("Call from " + (callerName != null ? callerName : "Unknown"))
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1002, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL | ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(1002, notification);
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
