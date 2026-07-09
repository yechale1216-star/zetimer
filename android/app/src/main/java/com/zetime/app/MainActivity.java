package com.zetime.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static volatile boolean isAppInForeground = false;
    private static MainActivity instance = null;

    public static MainActivity getInstance() {
        return instance;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        instance = this;
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
    public void onResume() {
        super.onResume();
        isAppInForeground = true;
    }

    @Override
    public void onStart() {
        super.onStart();
        isAppInForeground = true;
    }

    @Override
    public void onStop() {
        super.onStop();
        isAppInForeground = false;
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    public void postForegroundNotification(com.getcapacitor.JSObject data) {
        CallPlugin plugin = (CallPlugin) bridge.getPlugin("CallPlugin").getInstance();
        if (plugin != null) {
            plugin.notifyForegroundNotification(data);
        }
    }

    /**
     * Saves the JWT auth token to SharedPreferences so onNewToken in
     * MyFirebaseMessagingService can include it when syncing refreshed FCM tokens.
     * Called from the Capacitor JS layer via a window message evaluated on the bridge.
     */
    public static void saveAuthTokenToPrefs(android.content.Context ctx, String token) {
        android.content.SharedPreferences prefs = ctx.getSharedPreferences("zetime_prefs", android.content.Context.MODE_PRIVATE);
        prefs.edit().putString("auth_token", token).apply();
        android.util.Log.d("MainActivity", "Auth token persisted to SharedPreferences");
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        // Support both key names:
        //   "notifType"  → set by our MyFirebaseMessagingService when app was in background (custom notification)
        //   "type"       → set by Google Play Services FCM tap when app was killed / screen locked
        String notifType = intent.getStringExtra("notifType");
        if (notifType == null || notifType.isEmpty()) {
            notifType = intent.getStringExtra("type");
        }

        // Support both conversationId key names for the same reason
        String conversationId = intent.getStringExtra("openConversationId");
        if (conversationId == null || conversationId.isEmpty()) {
            conversationId = intent.getStringExtra("conversationId");
        }

        // Support isIncomingCall from both native Java (boolean extra) and FCM data (string "true")
        boolean isIncomingCall = intent.getBooleanExtra("isIncomingCall", false)
                || "true".equals(intent.getStringExtra("isIncomingCall"));

        if (notifType != null && !notifType.isEmpty() && !"incoming_call".equals(notifType)) {
            com.getcapacitor.JSObject routeObj = new com.getcapacitor.JSObject();
            routeObj.put("action", "NAVIGATE");
            routeObj.put("type", notifType);
            routeObj.put("route", intent.getStringExtra("route"));
            routeObj.put("conversationId", conversationId);
            routeObj.put("studentId", intent.getStringExtra("studentId"));
            routeObj.put("schoolId", intent.getStringExtra("schoolId"));

            CallPlugin.setPendingCall(routeObj);

            if (bridge != null) {
                com.getcapacitor.PluginHandle handle = bridge.getPlugin("CallPlugin");
                if (handle != null) {
                    CallPlugin plugin = (CallPlugin) handle.getInstance();
                    if (plugin != null) {
                        plugin.handleNavigationAction(routeObj);
                    }
                }
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

            if (bridge != null) {
                com.getcapacitor.PluginHandle handle = bridge.getPlugin("CallPlugin");
                if (handle != null) {
                    CallPlugin plugin = (CallPlugin) handle.getInstance();
                    if (plugin != null) {
                        plugin.handleCallAction(action, callId);
                    }
                }
            }
        } else if (isIncomingCall || "incoming_call".equals(notifType)) {
            String callId    = intent.getStringExtra("callId");
            String callerId  = intent.getStringExtra("callerId");
            String callerName = intent.getStringExtra("callerName");
            String callType  = intent.getStringExtra("callType");
            String serverUrl = intent.getStringExtra("serverUrl");

            com.getcapacitor.JSObject callObj = new com.getcapacitor.JSObject();
            callObj.put("action", "INCOMING_CALL");
            callObj.put("callId", callId);
            callObj.put("callerId", callerId);
            callObj.put("callerName", callerName);
            callObj.put("callType", callType);
            if (serverUrl != null) callObj.put("serverUrl", serverUrl);

            CallPlugin.setPendingCall(callObj);

            if (bridge != null) {
                com.getcapacitor.PluginHandle handle = bridge.getPlugin("CallPlugin");
                if (handle != null) {
                    CallPlugin plugin = (CallPlugin) handle.getInstance();
                    if (plugin != null) {
                        plugin.handleIncomingCall(callObj);
                    }
                }
            }
        }
    }
}
