package com.zetime.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static boolean isAppInForeground = false;
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
    protected void onResume() {
        super.onResume();
        isAppInForeground = true;
    }

    @Override
    protected void onPause() {
        super.onPause();
        isAppInForeground = false;
    }

    @Override
    protected void onNewIntent(Intent intent) {
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

        String notifType = intent.getStringExtra("notifType");

        if (notifType != null && !notifType.isEmpty()) {
            com.getcapacitor.JSObject routeObj = new com.getcapacitor.JSObject();
            routeObj.put("action", "NAVIGATE");
            routeObj.put("type", notifType);
            routeObj.put("route", intent.getStringExtra("route"));
            routeObj.put("conversationId", intent.getStringExtra("openConversationId"));
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
