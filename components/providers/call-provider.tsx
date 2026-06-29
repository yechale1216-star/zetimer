'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebRTC } from '@/lib/hooks/use-webrtc';
import { IncomingCallModal } from '@/components/messaging/calling/IncomingCallModal';
import { CallOverlay } from '@/components/messaging/calling/CallOverlay';
import { authService } from '@/lib/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { NativeBridge } from '@/lib/utils/native-bridge';
import { App } from '@capacitor/app';

interface CallContextType {
  initiateCall: (toId: string, type: 'VOICE' | 'VIDEO', profile: any) => void;
  endCall: () => void;
  status: 'IDLE' | 'RINGING' | 'CONNECTING' | 'CONNECTED';
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [callType, setCallType] = useState<'VOICE' | 'VIDEO'>('VOICE');
  const { toast } = useToast();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setParticipants([{ id: user.id || 'local', name: 'You', avatar: '', isLocal: true }]);
    }
  }, []);

  const onIncomingCall = useCallback((data: any) => {
    setIncomingCallData(data);
    setCallType(data.type);
    setParticipants(prev => [
      ...prev.filter(p => p.isLocal),
      { id: data.from, name: data.profile.name, avatar: data.profile.avatar }
    ]);
  }, []);

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
    setCallType(type);
    setParticipants(prev => [
      ...prev.filter(p => p.isLocal),
      { id: toId, name: profile.name, avatar: profile.avatar }
    ]);
    webrtc.startCall(toId, type, profile);
  };

  const handleAccept = () => {
    if (incomingCallData) {
      NativeBridge.endNativeCall();
      webrtc.answerCall(incomingCallData.from, incomingCallData.offer, incomingCallData.type);
      setIncomingCallData(null);
    }
  };

  const handleReject = (isMissed: boolean = false) => {
    NativeBridge.endNativeCall();
    // Emit reject_call to notify the caller before cleaning up
    if (incomingCallData) {
      webrtc.rejectCall(incomingCallData.from, isMissed);
    } else {
      webrtc.endCall();
    }
    setIncomingCallData(null);
    setParticipants(prev => prev.filter(p => p.isLocal));
  };

  // ── Handle Native Intents (Answer from Lock Screen) ────────────────────────
  useEffect(() => {
    if (!NativeBridge.isNative()) return;

    const checkIntent = async () => {
      // Capacitor App.addListener('appRestoredResult') might be useful, 
      // but usually we check for specific actions in MainActivity and bridge them.
      // For now, ensure we stop ringing if the app is resumed/opened.
      NativeBridge.endNativeCall();
    };

    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkIntent();
      }
    });

    return () => {
      sub.then(s => s.remove());
    };
  }, []);

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
