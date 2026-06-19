'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebRTC } from '@/lib/hooks/use-webrtc';
import { IncomingCallModal } from '@/components/messaging/calling/IncomingCallModal';
import { CallOverlay } from '@/components/messaging/calling/CallOverlay';
import { authService } from '@/lib/auth/auth';
import { useToast } from '@/hooks/use-toast';

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
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;
    let ringInterval: NodeJS.Timeout;

    if (webrtc.callStatus === 'RINGING' && incomingCallData) {
      // 1. Auto-missed call after 30 seconds
      timeout = setTimeout(() => {
        handleReject();
      }, 30000);

      // 2. Play synthetic ringing sound
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContext();
        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        
        const playRing = () => {
          if (!audioCtx || !gainNode) return;
          oscillator = audioCtx.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
          oscillator.frequency.setValueAtTime(480, audioCtx.currentTime + 0.1); // slightly discordant European ring
          
          oscillator.connect(gainNode);
          oscillator.start();
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // low volume
          
          // Ring for 2 seconds
          setTimeout(() => {
            if (oscillator) {
              oscillator.stop();
              oscillator.disconnect();
            }
          }, 2000);
        };

        // Play immediately, then repeat every 4 seconds
        playRing();
        ringInterval = setInterval(playRing, 4000);
      } catch (e) {
        console.warn('AudioContext not supported or blocked:', e);
      }
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(ringInterval);
      if (oscillator) {
        try { oscillator.stop(); oscillator.disconnect(); } catch (e) {}
      }
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
      webrtc.answerCall(incomingCallData.from, incomingCallData.offer, incomingCallData.type);
      setIncomingCallData(null);
    }
  };

  const handleReject = () => {
    webrtc.endCall();
    setIncomingCallData(null);
    setParticipants(prev => prev.filter(p => p.isLocal));
  };

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
