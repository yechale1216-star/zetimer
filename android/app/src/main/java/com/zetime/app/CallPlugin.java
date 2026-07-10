package com.zetime.app;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CallPlugin")
public class CallPlugin extends Plugin implements CallManager.CallBannerListener {
    private static final String TAG = "CallPlugin";
    private static com.getcapacitor.JSObject pendingCall = null;

    public static void setPendingCall(com.getcapacitor.JSObject call) {
        pendingCall = call;
    }

    @Override
    public void load() {
        super.load();
        // Register this plugin as the banner listener so Accept/Decline fire JS events
        CallManager.getInstance().setListener(this);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CallManager.CallBannerListener callbacks
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    public void onBannerAccept(String callId, String callerId, String callerName, String callType, String serverUrl) {
        Log.d(TAG, "Banner ACCEPT -> firing JS ANSWER event for callId=" + callId);
        JSObject ret = new JSObject();
        ret.put("action", "ANSWER");
        ret.put("callId", callId);
        ret.put("callerId", callerId);
        ret.put("callerName", callerName);
        ret.put("callType", callType);
        ret.put("serverUrl", serverUrl);
        notifyListeners("onCallAction", ret);
    }

    @Override
    public void onBannerDecline(String callId, String serverUrl) {
        Log.d(TAG, "Banner DECLINE -> firing JS DECLINE event for callId=" + callId);
        JSObject ret = new JSObject();
        ret.put("action", "DECLINE");
        ret.put("callId", callId);
        notifyListeners("onCallAction", ret);
    }

    @Override
    public void onBannerDismissed(String callId) {
        Log.d(TAG, "Banner auto-dismissed for callId=" + callId);
        JSObject ret = new JSObject();
        ret.put("action", "DECLINE");
        ret.put("callId", callId);
        notifyListeners("onCallAction", ret);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Plugin Methods (JS bridge)
    // ═══════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void getPendingCall(PluginCall call) {
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        if (pendingCall != null) {
            ret.put("hasPending", true);
            ret.put("action", pendingCall.getString("action"));
            ret.put("type", pendingCall.getString("type"));
            ret.put("route", pendingCall.getString("route"));
            ret.put("conversationId", pendingCall.getString("conversationId"));
            ret.put("studentId", pendingCall.getString("studentId"));
            ret.put("schoolId", pendingCall.getString("schoolId"));

            // For backward compatibility on existing call receiver:
            ret.put("callId", pendingCall.getString("callId"));
            ret.put("callerId", pendingCall.getString("callerId"));
            ret.put("callerName", pendingCall.getString("callerName"));
            ret.put("callType", pendingCall.getString("callType"));

            pendingCall = null;
        } else {
            ret.put("hasPending", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void endCall(PluginCall call) {
        // Dismiss the foreground banner if showing
        CallManager.getInstance().dismissBanner();

        // Also stop the background CallService
        Intent intent = new Intent(getContext(), CallService.class);
        intent.putExtra("ACTION", "STOP_CALL");
        getContext().startService(intent);
        call.resolve();
    }

    /**
     * Start the background CallService (full-screen IncomingCallActivity).
     * Used for background/locked screen calls.
     */
    @PluginMethod
    public void startRinging(PluginCall call) {
        String callerName = call.getString("callerName", "Unknown");
        String callId      = call.getString("callId");
        String callerId    = call.getString("callerId");
        String callType    = call.getString("callType");
        String serverUrl   = call.getString("serverUrl");

        Intent intent = new Intent(getContext(), CallService.class);
        intent.putExtra("ACTION", "START_CALL");
        intent.putExtra("callerName", callerName);
        intent.putExtra("callId", callId);
        intent.putExtra("callerId", callerId);
        intent.putExtra("callType", callType);
        intent.putExtra("serverUrl", serverUrl);

        getContext().startService(intent);
        call.resolve();
    }

    /**
     * Show the Telegram-style floating banner over the current Activity.
     * Used for foreground incoming calls — does NOT open a separate Activity.
     */
    @PluginMethod
    public void showCallBanner(PluginCall call) {
        String callerName = call.getString("callerName", "Unknown");
        String callId      = call.getString("callId");
        String callerId    = call.getString("callerId");
        String callType    = call.getString("callType");
        String serverUrl   = call.getString("serverUrl");

        Activity activity = getActivity();
        CallManager.getInstance().showBanner(activity, callerName, callId, callerId, callType, serverUrl);
        call.resolve();
    }

    /**
     * Dismiss the floating banner if currently showing.
     */
    @PluginMethod
    public void dismissCallBanner(PluginCall call) {
        CallManager.getInstance().dismissBanner();
        call.resolve();
    }

    @PluginMethod
    public void saveAuthToken(PluginCall call) {
        String token = call.getString("token");
        if (token != null) {
            MainActivity.saveAuthTokenToPrefs(getContext(), token);
        }
        call.resolve();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Internal action dispatchers (called from Java, not from JS)
    // ═══════════════════════════════════════════════════════════════════════

    public void handleCallAction(String action, String payload) {
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("action", action);
        if ("OPEN_CHAT".equals(action)) {
            ret.put("conversationId", payload);
        } else {
            ret.put("callId", payload);
        }
        notifyListeners("onCallAction", ret);
    }

    public void handleNavigationAction(com.getcapacitor.JSObject routeObj) {
        notifyListeners("onCallAction", routeObj);
    }

    public void notifyForegroundNotification(com.getcapacitor.JSObject notifData) {
        notifyListeners("onForegroundNotification", notifData);
    }

    public void handleIncomingCall(com.getcapacitor.JSObject callObj) {
        notifyListeners("onCallAction", callObj);
    }
}
