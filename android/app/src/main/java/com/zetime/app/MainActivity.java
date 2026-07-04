package com.zetime.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        registerPlugin(CallPlugin.class);

        // Turn screen on and show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        String notifType = intent.getStringExtra("notifType");

        if ("new_message".equals(notifType)) {
            String conversationId = intent.getStringExtra("openConversationId");
            CallPlugin plugin = (CallPlugin) bridge.getPlugin("CallPlugin").getInstance();
            if (plugin != null && conversationId != null) {
                plugin.handleCallAction("OPEN_CHAT", conversationId);
            }
        } else if (intent.hasExtra("callAction")) {
            String action = intent.getStringExtra("callAction");
            String callId = intent.getStringExtra("callId");
            String callerId = intent.getStringExtra("callerId");
            String callType = intent.getStringExtra("callType");
            
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
