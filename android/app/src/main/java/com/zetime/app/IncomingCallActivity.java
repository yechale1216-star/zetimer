package com.zetime.app;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.Button;
import android.widget.TextView;
import android.util.Log;

/**
 * IncomingCallActivity
 *
 * A pure native Activity shown immediately over the lock screen when a call arrives
 * while the app is fully killed or the device is locked. It displays the caller's name,
 * provides Accept / Decline actions, then hands off to MainActivity (Capacitor) if accepted.
 *
 * This avoids the delay of waiting for the full Capacitor/Next.js WebView to load before
 * the user can respond to the call.
 */
public class IncomingCallActivity extends Activity {

    private static final String TAG = "IncomingCallActivity";

    private String callId;
    private String callerId;
    private String callerName;
    private String callType;
    private String serverUrl;

    private View pulseRing1;
    private View pulseRing2;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );

        callId     = intent.getStringExtra("callId");
        callerId   = intent.getStringExtra("callerId");
        callerName = intent.getStringExtra("callerName");
        callType   = intent.getStringExtra("callType");
        serverUrl  = intent.getStringExtra("serverUrl");

        Log.d(TAG, "IncomingCallActivity received new intent for call: " + callerName);
        
        TextView tvCallType   = findViewById(R.id.tv_call_type);
        TextView tvCallerName = findViewById(R.id.tv_caller_name);
        TextView tvInitials   = findViewById(R.id.tv_avatar_initials);
        
        if (tvCallerName != null) {
            String name = (callerName != null && !callerName.isEmpty()) ? callerName : "Unknown Caller";
            tvCallerName.setText(name);

            String[] parts = name.split("\\s+");
            StringBuilder initials = new StringBuilder();
            for (String p : parts) {
                if (!p.isEmpty()) initials.append(p.charAt(0));
                if (initials.length() >= 2) break;
            }
            if (tvInitials != null) tvInitials.setText(initials.toString().toUpperCase());

            boolean isVideo = "VIDEO".equalsIgnoreCase(callType);
            if (tvCallType != null) tvCallType.setText(isVideo ? "INCOMING VIDEO CALL" : "INCOMING VOICE CALL");
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Show over the lock screen WITHOUT dismissing the keyguard.
        // FLAG_DISMISS_KEYGUARD / requestDismissKeyguard() cause the OS to
        // intercept focus and show the PIN/password prompt on secure devices,
        // which blocks the call UI. Using only FLAG_SHOW_WHEN_LOCKED renders
        // the activity OVER the keyguard (Telegram-style) — the user sees the
        // incoming call immediately and the PIN is only requested if they tap
        // "Answer" (which opens MainActivity).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );
        // Make the activity full-screen (hide status bar for immersive call UI)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_incoming_call);

        // Extract intent extras
        Intent intent = getIntent();
        callId     = intent.getStringExtra("callId");
        callerId   = intent.getStringExtra("callerId");
        callerName = intent.getStringExtra("callerName");
        callType   = intent.getStringExtra("callType");
        serverUrl  = intent.getStringExtra("serverUrl");

        Log.d(TAG, "Incoming call from: " + callerName + " (" + callType + ")");

        // Bind views
        TextView tvCallType   = findViewById(R.id.tv_call_type);
        TextView tvCallerName = findViewById(R.id.tv_caller_name);
        TextView tvInitials   = findViewById(R.id.tv_avatar_initials);
        Button   btnAccept    = findViewById(R.id.btn_accept);
        Button   btnDecline   = findViewById(R.id.btn_decline);
        pulseRing1 = findViewById(R.id.pulse_ring_1);
        pulseRing2 = findViewById(R.id.pulse_ring_2);

        // Populate caller info
        String name = (callerName != null && !callerName.isEmpty()) ? callerName : "Unknown Caller";
        tvCallerName.setText(name);

        // Initials (up to 2 chars)
        String[] parts = name.split("\\s+");
        StringBuilder initials = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) initials.append(p.charAt(0));
            if (initials.length() >= 2) break;
        }
        tvInitials.setText(initials.toString().toUpperCase());

        // Call type label
        boolean isVideo = "VIDEO".equalsIgnoreCase(callType);
        tvCallType.setText(isVideo ? "INCOMING VIDEO CALL" : "INCOMING VOICE CALL");

        // Start avatar pulse animation
        startPulseAnimation();

        // ── Accept ──────────────────────────────────────────────────
        btnAccept.setOnClickListener(v -> {
            Log.d(TAG, "User tapped Accept");
            stopCallServiceRinging();
            cancelCallNotification();

            // Open MainActivity with ANSWER action
            Intent open = new Intent(this, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            open.putExtra("callAction",  "ANSWER");
            open.putExtra("callId",      callId);
            open.putExtra("callerId",    callerId);
            open.putExtra("callerName",  callerName);
            open.putExtra("callType",    callType);
            open.putExtra("serverUrl",   serverUrl);
            startActivity(open);
            finish();
        });

        // ── Decline ─────────────────────────────────────────────────
        btnDecline.setOnClickListener(v -> {
            Log.d(TAG, "User tapped Decline");
            stopCallServiceRinging();
            cancelCallNotification();
            sendDeclineToServer();
            finish();
        });
    }

    /** Animate both pulse rings with staggered scale/alpha loops */
    private void startPulseAnimation() {
        if (pulseRing1 == null || pulseRing2 == null) return;

        animateRing(pulseRing1, 0);
        animateRing(pulseRing2, 900);
    }

    private void animateRing(View ring, long startDelay) {
        ObjectAnimator scaleX = ObjectAnimator.ofFloat(ring, View.SCALE_X, 1f, 2.2f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(ring, View.SCALE_Y, 1f, 2.2f);
        ObjectAnimator alpha  = ObjectAnimator.ofFloat(ring, View.ALPHA,  0.6f, 0f);

        AnimatorSet set = new AnimatorSet();
        set.playTogether(scaleX, scaleY, alpha);
        set.setDuration(2400);
        set.setStartDelay(startDelay);
        set.setInterpolator(new AccelerateDecelerateInterpolator());
        // Use a listener to repeat
        set.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(android.animation.Animator animation) {
                ring.setScaleX(1f);
                ring.setScaleY(1f);
                ring.setAlpha(0.6f);
                // Re-start
                set.setStartDelay(0);
                set.start();
            }
        });
        set.start();
    }

    /** Ask CallService to stop ringing */
    private void stopCallServiceRinging() {
        try {
            Intent stop = new Intent(this, CallService.class);
            stop.putExtra("ACTION", "STOP_CALL");
            startService(stop);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop CallService", e);
        }
    }

    /** Cancel both notification IDs */
    private void cancelCallNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(1001);
                nm.cancel(1002);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel notification", e);
        }
    }

    /** POST /api/calls/public-reject on a background thread */
    private void sendDeclineToServer() {
        if (serverUrl == null || callId == null) return;
        final String fCallId = callId;
        final String fServerUrl = serverUrl;
        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL(fServerUrl + "/api/calls/public-reject");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                String body = "{\"callId\":\"" + fCallId + "\"}";
                conn.getOutputStream().write(body.getBytes("utf-8"));
                Log.d(TAG, "Decline POST response: " + conn.getResponseCode());
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Error sending decline", e);
            }
        }).start();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Clean up animations if activity is destroyed
        if (pulseRing1 != null) pulseRing1.clearAnimation();
        if (pulseRing2 != null) pulseRing2.clearAnimation();
    }
}
