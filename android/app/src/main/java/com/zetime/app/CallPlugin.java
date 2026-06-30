package com.zetime.app;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CallPlugin")
public class CallPlugin extends Plugin {
    private static com.getcapacitor.JSObject pendingCall = null;

    public static void setPendingCall(com.getcapacitor.JSObject call) {
        pendingCall = call;
    }

    @PluginMethod
    public void getPendingCall(PluginCall call) {
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        if (pendingCall != null) {
            ret.put("hasPending", true);
            ret.put("action", pendingCall.getString("action"));
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
        Intent intent = new Intent(getContext(), CallService.class);
        intent.putExtra("ACTION", "STOP_CALL");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void startRinging(PluginCall call) {
        String callerName = call.getString("callerName", "Unknown");
        Intent intent = new Intent(getContext(), CallService.class);
        intent.putExtra("ACTION", "START_CALL");
        intent.putExtra("callerName", callerName);
        getContext().startService(intent);
        call.resolve();
    }
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
}
