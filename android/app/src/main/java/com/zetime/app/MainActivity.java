package com.zetime.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.util.Log;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivityCallState";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "onCreate activity instance initialized");
        registerPlugin(CallPlugin.class);

        // Standard flags for waking up and showing over lock screen on startup
        applyLockScreenFlags();
        
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "onNewIntent activity instance received action call");
        applyLockScreenFlags();
        handleIntent(intent);
    }

    private void applyLockScreenFlags() {
        Log.d(TAG, "Configuring window flags for lock screen interaction");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        // Force the screen to remain illuminated while call UI is active
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Force keyguard dismissal in locked state
        android.app.KeyguardManager keyguardManager = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                keyguardManager.requestDismissKeyguard(this, null);
                Log.d(TAG, "KeyguardManager.requestDismissKeyguard requested on Android O+");
            }
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        String notifType = intent.getStringExtra("notifType");
        Log.d(TAG, "Processing intent data: notifType=" + notifType);

        if ("new_message".equals(notifType)) {
            String conversationId = intent.getStringExtra("openConversationId");
            Log.d(TAG, "new_message notification click: conversationId=" + conversationId);
            CallPlugin plugin = (CallPlugin) bridge.getPlugin("CallPlugin").getInstance();
            if (plugin != null && conversationId != null) {
                plugin.handleCallAction("OPEN_CHAT", conversationId);
            }
        } else if (intent.hasExtra("callAction")) {
            String action = intent.getStringExtra("callAction");
            String callId = intent.getStringExtra("callId");
            String callerId = intent.getStringExtra("callerId");
            String callType = intent.getStringExtra("callType");
            
            Log.d(TAG, "callAction trigger: action=" + action + ", callId=" + callId + ", callerId=" + callerId);

            com.getcapacitor.JSObject callObj = new com.getcapacitor.JSObject();
            callObj.put("action", action);
            callObj.put("callId", callId);
            callObj.put("callerId", callerId);
            callObj.put("callType", callType);

            CallPlugin.setPendingCall(callObj);

            CallPlugin plugin = (CallPlugin) bridge.getPlugin("CallPlugin").getInstance();
            if (plugin != null) {
                plugin.handleCallAction(action, callId);
            }
        } else if (intent.getBooleanExtra("isIncomingCall", false) || intent.hasExtra("isIncomingCall")) {
            String callId = intent.getStringExtra("callId");
            String callerId = intent.getStringExtra("callerId");
            String callerName = intent.getStringExtra("callerName");
            String callType = intent.getStringExtra("callType");
            
            Log.d(TAG, "IncomingCall trigger: callId=" + callId + ", callerId=" + callerId + ", callerName=" + callerName);

            com.getcapacitor.JSObject callObj = new com.getcapacitor.JSObject();
            callObj.put("action", "INCOMING_CALL");
            callObj.put("callId", callId);
            callObj.put("callerId", callerId);
            callObj.put("callerName", callerName);
            callObj.put("callType", callType);

            CallPlugin.setPendingCall(callObj);

            CallPlugin plugin = (CallPlugin) bridge.getPlugin("CallPlugin").getInstance();
            if (plugin != null) {
                plugin.handleIncomingCall(callObj);
            }
        }
    }
}
