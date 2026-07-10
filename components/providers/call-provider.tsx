'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebRTC } from '@/lib/hooks/use-webrtc';
import { IncomingCallModal } from '@/components/messaging/calling/IncomingCallModal';
import { CallOverlay } from '@/components/messaging/calling/CallOverlay';
import { authService } from '@/lib/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { NativeBridge } from '@/lib/utils/native-bridge';
import { App } from '@capacitor/app';
import { useSuspension } from '@/lib/context/suspension-context';
import { useAuth } from '@/lib/context/auth-context';

interface CallContextType {
  initiateCall: (toId: string, type: 'VOICE' | 'VIDEO', profile: any) => void;
  endCall: () => void;
  status: 'IDLE' | 'RINGING' | 'CONNECTING' | 'CONNECTED';
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [callType, setCallType] = useState<'VOICE' | 'VIDEO'>('VOICE');
  const [pendingAction, setPendingAction] = useState<{ action: string; callId: string; callerId?: string; callType?: string } | null>(null);
  const [isWaitingForOffer, setIsWaitingForOffer] = useState(false);
  const { toast } = useToast();
  const { isSuspended } = useSuspension();

  useEffect(() => {
    if (currentUser) {
      setParticipants(prev => {
        const local = { id: currentUser.id || 'local', name: 'You', avatar: currentUser.profile_photo || '', isLocal: true };
        return [local, ...prev.filter(p => !p.isLocal)];
      });
    } else {
      setParticipants([]);
    }
  }, [currentUser]);

  const onIncomingCall = useCallback((data: any) => {
    if (isSuspended) {
      console.log('[CallProvider] Rejecting incoming call signal due to school suspension');
      return;
    }
    console.log('[CallProvider] Received incoming call from socket. Offer present:', !!data.offer);
    setIncomingCallData(data);
    setCallType(data.type);
    setParticipants(prev => [
      ...prev.filter(p => p.isLocal),
      { id: data.from, name: data.profile.name, avatar: data.profile.avatar }
    ]);
  }, [isSuspended]);

  const onCallAccepted = useCallback((userId: string) => {
    console.log('Call accepted by:', userId);
  }, []);

  const onCallRejected = useCallback((userId: string) => {
    // Show the caller a clear "call rejected" notification
    const name = participants.find(p => p.id === userId)?.name || 'The other person';
    toast({
      title: '📵 Call Declined',
      description: `${name} declined your call.`,
      variant: 'destructive',
    });
  }, [participants, toast]);

  const onCallEnded = useCallback((userId: string) => {
    setParticipants(prev => {
      const next = prev.filter(p => p.id !== userId);
      // If only the local participant remains, clear the incoming call data
      if (next.length <= 1) {
        setIncomingCallData(null);
      }
      return next;
    });
  }, []);

  const webrtc = useWebRTC({
    userId: currentUser?.id || '',
    onIncomingCall,
    onCallAccepted,
    onCallRejected,
    onCallEnded,
  });

  // Show a toast whenever the WebRTC hook reports a media-access error
  useEffect(() => {
    if (webrtc.mediaError) {
      toast({
        title: 'Camera / Microphone Error',
        description: webrtc.mediaError,
        variant: 'destructive',
      });
    }
  }, [webrtc.mediaError, toast]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let audioCtx: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    let ringInterval: NodeJS.Timeout;
    
    // Track active oscillators for clean disposal
    const activeOscillators: any[] = [];

    if (webrtc.callStatus === 'RINGING') {
      const isIncoming = !!incomingCallData;

      // 1. Auto-missed call after 30 seconds
      timeout = setTimeout(() => {
        handleReject(true);
      }, 30000);

      // 2. Play synthetic calling/ringing sound
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContext();
        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        
        const playTone = () => {
          if (!audioCtx || !gainNode) return;
          
          if (!isIncoming) {
            // --- CALLER: Outgoing dual-tone ringback (440Hz + 480Hz) ---
            // Pattern: 1.5s tone, 3.0s pause. Repeats every 4.5 seconds.
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const ringGain = audioCtx.createGain();
            
            osc1.type = 'sine';
            osc2.type = 'sine';
            
            osc1.frequency.setValueAtTime(440, audioCtx.currentTime); 
            osc2.frequency.setValueAtTime(480, audioCtx.currentTime);
            
            osc1.connect(ringGain);
            osc2.connect(ringGain);
            ringGain.connect(gainNode!);
            
            const now = audioCtx.currentTime;
            ringGain.gain.setValueAtTime(0, now);
            ringGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
            ringGain.gain.setValueAtTime(0.08, now + 1.5);
            ringGain.gain.linearRampToValueAtTime(0, now + 1.6);
            
            osc1.start();
            osc2.start();
            activeOscillators.push(osc1, osc2);
            
            setTimeout(() => {
              try {
                osc1.stop();
                osc2.stop();
                osc1.disconnect();
                osc2.disconnect();
                ringGain.disconnect();
                
                const i1 = activeOscillators.indexOf(osc1);
                if (i1 > -1) activeOscillators.splice(i1, 1);
                const i2 = activeOscillators.indexOf(osc2);
                if (i2 > -1) activeOscillators.splice(i2, 1);
              } catch (e) {}
            }, 1800);
          } else {
            // --- RECIPIENT: Rapid musical incoming call ringtone ---
            // Pulse: 0.4s tone, 0.2s pause, 0.4s tone, 2.0s pause. Repeats every 3.2s.
            const playPulse = (delay: number) => {
              if (!audioCtx || !gainNode) return;
              const osc1 = audioCtx.createOscillator();
              const osc2 = audioCtx.createOscillator();
              const ringGain = audioCtx.createGain();

              osc1.type = 'triangle';
              osc2.type = 'sine';

              osc1.frequency.setValueAtTime(550, audioCtx.currentTime + delay);
              osc2.frequency.setValueAtTime(750, audioCtx.currentTime + delay);

              osc1.connect(ringGain);
              osc2.connect(ringGain);
              ringGain.connect(gainNode!);

              const now = audioCtx.currentTime + delay;
              ringGain.gain.setValueAtTime(0, now);
              ringGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
              ringGain.gain.setValueAtTime(0.15, now + 0.4);
              ringGain.gain.linearRampToValueAtTime(0, now + 0.45);

              osc1.start(now);
              osc2.start(now);
              activeOscillators.push(osc1, osc2);

              setTimeout(() => {
                try {
                  osc1.stop();
                  osc2.stop();
                  osc1.disconnect();
                  osc2.disconnect();
                  ringGain.disconnect();
                  
                  const i1 = activeOscillators.indexOf(osc1);
                  if (i1 > -1) activeOscillators.splice(i1, 1);
                  const i2 = activeOscillators.indexOf(osc2);
                  if (i2 > -1) activeOscillators.splice(i2, 1);
                } catch (e) {}
              }, (delay + 0.6) * 1000);
            };

            playPulse(0);
            playPulse(0.6);
          }
        };

        playTone();
        ringInterval = setInterval(playTone, isIncoming ? 3200 : 4500);
      } catch (e) {
        console.warn('AudioContext not supported or blocked:', e);
      }
    }

    return () => {
      // CLEAR NATIVE RINGING ON UNMOUNT OR STATE CHANGE
      NativeBridge.endNativeCall();
      clearTimeout(timeout);
      clearInterval(ringInterval);
      
      activeOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      activeOscillators.length = 0;

      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [webrtc.callStatus, incomingCallData]);

  const initiateCall = (toId: string, type: 'VOICE' | 'VIDEO', profile: any) => {
    if (isSuspended) {
      toast({
        title: 'Portal Read-Only',
        description: 'Voice and video calls are disabled under school suspension.',
        variant: 'destructive',
      });
      return;
    }
    setCallType(type);
    setParticipants(prev => [
      ...prev.filter(p => p.isLocal),
      { id: toId, name: profile.name, avatar: profile.avatar }
    ]);
    
    const callerProfile = {
      name: currentUser?.name || 'Unknown User',
      avatar: currentUser?.profile_photo || ''
    };
    webrtc.startCall(toId, type, callerProfile);
  };

  const handleAccept = useCallback(() => {
    if (incomingCallData) {
      if (!incomingCallData.offer) {
        console.log('[CallProvider] User accepted call but offer not received yet. Setting isWaitingForOffer to true.');
        setIsWaitingForOffer(true);
        return;
      }
      console.log('[CallProvider] Answering call immediately.');
      NativeBridge.endNativeCall();
      webrtc.answerCall(incomingCallData.from, incomingCallData.offer, incomingCallData.type);
      setIncomingCallData(null);
      setIsWaitingForOffer(false);
    }
  }, [incomingCallData, webrtc]);

  const handleReject = useCallback((isMissed: boolean = false) => {
    NativeBridge.endNativeCall();
    setIsWaitingForOffer(false);
    // Emit reject_call to notify the caller before cleaning up
    if (incomingCallData) {
      webrtc.rejectCall(incomingCallData.from, isMissed);
    } else {
      webrtc.endCall();
    }
    setIncomingCallData(null);
    setParticipants(prev => prev.filter(p => p.isLocal));
  }, [incomingCallData, webrtc]);

  // Auto-answer when wait-triggered and socket offer arrives
  useEffect(() => {
    if (incomingCallData && incomingCallData.offer && isWaitingForOffer) {
      console.log('[CallProvider] Offer received while waiting. Answering call now.');
      NativeBridge.endNativeCall();
      webrtc.answerCall(incomingCallData.from, incomingCallData.offer, incomingCallData.type);
      setIncomingCallData(null);
      setIsWaitingForOffer(false);
    }
  }, [incomingCallData, isWaitingForOffer, webrtc]);

  // ── Handle Pending Call Action from Native Bridge ──────────────────────────
  const handlePendingCallAction = useCallback((action: string, callId: string, callerId?: string, callerName?: string, callType?: string) => {
    console.log(`[CallProvider] Handling pending call action: ${action} for call ${callId}, caller: ${callerName}`);
    
    if (action === 'INCOMING_CALL') {
      const resolvedName = callerName && callerName.trim() ? callerName : 'Unknown Caller';
      const activeCall = {
        from: callerId || 'unknown',
        callId,
        type: callType === 'VIDEO' ? 'VIDEO' : 'VOICE',
        profile: { name: resolvedName, avatar: '' }
      };
      setIncomingCallData(activeCall);
      setCallType(callType === 'VIDEO' ? 'VIDEO' : 'VOICE');
      setParticipants(prev => [
        ...prev.filter(p => p.isLocal),
        { id: activeCall.from, name: activeCall.profile.name, avatar: activeCall.profile.avatar }
      ]);
    } else if (action === 'ANSWER') {
      console.log('[CallProvider] Received ANSWER action. Setting pendingAction.');
      setPendingAction({ action, callId, callerId, callType });
    } else if (action === 'DECLINE') {
      console.log('[CallProvider] Received DECLINE action.');
      if (callerId) {
        webrtc.rejectCall(callerId, false);
      }
      setIncomingCallData(null);
      setParticipants(prev => prev.filter(p => p.isLocal));
      NativeBridge.endNativeCall();
    }
  }, [webrtc]);

  // Execute ANSWER when both incomingCallData and ANSWER pending action exist
  useEffect(() => {
    if (incomingCallData && pendingAction && pendingAction.action === 'ANSWER' && pendingAction.callId === incomingCallData.callId) {
      console.log('[CallProvider] Executing deferred ANSWER action');
      NativeBridge.endNativeCall();
      webrtc.answerCall(incomingCallData.from, incomingCallData.offer, incomingCallData.type);
      setIncomingCallData(null);
      setPendingAction(null);
    }
  }, [incomingCallData, pendingAction, webrtc]);

  // Poll/Check pending intents on resume or startup
  useEffect(() => {
    if (!NativeBridge.isNative()) return;

    const checkPending = async () => {
      try {
        const res = await NativeBridge.getPendingCall();
        if (res && res.hasPending && res.action) {
          if (res.action === 'NAVIGATE') {
            console.log('[CallProvider] Found pending navigation action:', res);
            window.dispatchEvent(new CustomEvent('zetime:navigate', {
              detail: {
                type: res.type,
                route: res.route,
                conversationId: res.conversationId,
                studentId: res.studentId,
                schoolId: res.schoolId
              }
            }));
          } else {
            handlePendingCallAction(res.action, res.callId || '', res.callerId, res.callerName, res.callType);
          }
        }
      } catch (e) {
        console.warn('[CallProvider] checkPending failed:', e);
      }
    };

    // Check immediately on load
    checkPending();

    // Also check when app comes to active
    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkPending();
      }
    });

    return () => {
      sub.then(s => s.remove());
    };
  }, [handlePendingCallAction]);

  useEffect(() => {
    if (!NativeBridge.isNative()) return;

    const sub = NativeBridge.addCallActionListener((action, callId) => {
      console.log(`Native call action received: ${action} for ${callId}`);
      if (action === 'ANSWER') {
        handleAccept();
      } else if (action === 'DECLINE') {
        handleReject();
      }
    });

    return () => {
      // @ts-ignore
      sub?.then(s => s.remove());
    };
  }, [handleAccept, handleReject]);

  const activeCaller = participants.find(p => !p.isLocal);

  return (
    <CallContext.Provider value={{ initiateCall, endCall: webrtc.endCall, status: webrtc.callStatus }}>
      {children}
      
      {/* Global Modals */}
      <IncomingCallModal
        isOpen={!!incomingCallData}
        caller={activeCaller || { name: 'Unknown' }}
        type={callType}
        isConnecting={isWaitingForOffer}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {webrtc.callStatus !== 'IDLE' && !incomingCallData && (
        <CallOverlay
          status={webrtc.callStatus === 'RINGING' ? 'RINGING' : webrtc.callStatus}
          type={callType}
          isMuted={webrtc.isMuted}
          isCameraOff={webrtc.isCameraOff}
          localStream={webrtc.localStream}
          remoteStreams={webrtc.remoteStreams}
          remoteMediaStates={webrtc.remoteMediaStates}
          participants={participants}
          caller={activeCaller || { name: 'Unknown' }}
          onEndCall={webrtc.endCall}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onFlipCamera={webrtc.flipCamera}
        />
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
