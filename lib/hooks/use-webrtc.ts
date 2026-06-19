'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/components/providers/socket-provider';

interface WebRTCOptions {
  userId: string;
  onIncomingCall?: (data: { from: string; profile: any; type: 'VOICE' | 'VIDEO' }) => void;
  onCallAccepted?: (userId: string) => void;
  onCallEnded?: (userId: string) => void;
  onRemoteStream?: (userId: string, stream: MediaStream) => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/** Returns a human-readable reason for getUserMedia errors. */
function describeMediaError(err: unknown): string {
  if (!(err instanceof Error)) return 'Could not access camera or microphone.';
  switch (err.name) {
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera or microphone is already in use by another app. Close it and try again.';
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera/microphone permission was denied. Please allow access in your browser settings.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone was found on this device.';
    case 'OverconstrainedError':
      return 'The requested media settings are not supported by your device.';
    default:
      return err.message || 'Could not access camera or microphone.';
  }
}

/**
 * Acquires a fresh MediaStream with the requested constraints.
 * Stops any tracks on an existing stream first so the OS releases
 * the device before we try to re-open it (prevents NotReadableError).
 */
async function acquireStream(
  existing: MediaStream | null,
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  if (existing) {
    existing.getTracks().forEach((t) => t.stop());
  }
  return navigator.mediaDevices.getUserMedia(constraints);
}

export const useWebRTC = (options: WebRTCOptions) => {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteMediaStates, setRemoteMediaStates] = useState<Record<string, { isCameraOff: boolean; isMuted: boolean }>>({});
  const [callStatus, setCallStatus] = useState<'IDLE' | 'RINGING' | 'CONNECTING' | 'CONNECTED'>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const callType = useRef<'VOICE' | 'VIDEO'>('VOICE');
  // Keep a ref to localStream so acquireStream always sees the latest value
  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // Keep refs of media settings to prevent stale closures in async callbacks
  const isCameraOffRef = useRef(isCameraOff);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isCameraOffRef.current = isCameraOff; }, [isCameraOff]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Queue to buffer incoming ICE candidates until the remote session description is set
  const queuedCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const cleanupUser = useCallback((userId: string) => {
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }
    queuedCandidates.current.delete(userId);
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setRemoteMediaStates(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const cleanupAll = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    queuedCandidates.current.clear();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStreams({});
    setRemoteMediaStates({});
    setCallStatus('IDLE');
  }, [localStream]);

  const createPeerConnection = useCallback((userId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', { to: userId, from: options.userId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      const stream = event.streams[0] || new MediaStream([event.track]);
      
      setRemoteStreams(prev => {
        const existing = prev[userId];
        if (existing) {
          // Add track to the existing stream if not present
          if (!existing.getTracks().find(t => t.id === event.track.id)) {
            existing.addTrack(event.track);
          }
          // Always return a new MediaStream instance so React updates bindings immediately
          return {
            ...prev,
            [userId]: new MediaStream(existing.getTracks())
          };
        }
        return {
          ...prev,
          [userId]: stream
        };
      });

      if (options.onRemoteStream) options.onRemoteStream(userId, stream);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        cleanupUser(userId);
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, [socket, options, cleanupUser]);

  const startCall = useCallback(async (toId: string, type: 'VOICE' | 'VIDEO', profile: any) => {
    setCallStatus('CONNECTING');
    setMediaError(null);
    callType.current = type;
    try {
      // acquireStream stops stale tracks first — prevents NotReadableError
      const stream = await acquireStream(localStreamRef.current, {
        audio: true,
        video: type === 'VIDEO' ? { facingMode: 'user' } : false,
      });
      setLocalStream(stream);

      const pc = createPeerConnection(toId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('call_user', {
          to: toId,
          offer,
          from: options.userId,
          profile,
          type,
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
      setMediaError(describeMediaError(error));
      cleanupAll();
    }
  }, [options.userId, socket, createPeerConnection, cleanupAll]);

  const answerCall = useCallback(async (fromId: string, offer: any, type: 'VOICE' | 'VIDEO') => {
    setCallStatus('CONNECTING');
    setMediaError(null);
    callType.current = type;
    try {
      // acquireStream stops stale tracks first — prevents NotReadableError
      const stream = await acquireStream(localStreamRef.current, {
        audio: true,
        video: type === 'VIDEO' ? { facingMode: 'user' } : false,
      });
      setLocalStream(stream);

      const pc = createPeerConnection(fromId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Drain queued ICE candidates
      const queue = queuedCandidates.current.get(fromId) || [];
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding queued candidate:', e);
        }
      }
      queuedCandidates.current.delete(fromId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer_call', { to: fromId, from: options.userId, answer });
        // Emit media state immediately on connection
        socket.emit('media_state_change', {
          to: fromId,
          from: options.userId,
          isCameraOff: isCameraOffRef.current,
          isMuted: isMutedRef.current,
        });
      }
      setCallStatus('CONNECTED');
    } catch (error) {
      console.error('Error answering call:', error);
      setMediaError(describeMediaError(error));
      cleanupAll();
    }
  }, [socket, options.userId, createPeerConnection, cleanupAll]);

  const endCall = useCallback(() => {
    peerConnections.current.forEach((_, userId) => {
      if (socket) socket.emit('end_call', { 
        to: userId, 
        from: options.userId,
        conversationId: (window as any).activeConversationId, // Hack to get conversationId if not passed
      });
    });
    cleanupAll();
  }, [socket, options.userId, cleanupAll]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const nextState = !audioTrack.enabled;
        audioTrack.enabled = nextState;
        setIsMuted(!nextState);

        // Notify active connections
        peerConnections.current.forEach((_, userId) => {
          if (socket) {
            socket.emit('media_state_change', {
              to: userId,
              from: options.userId,
              isCameraOff: isCameraOffRef.current,
              isMuted: !nextState,
            });
          }
        });
      }
    }
  }, [localStream, socket, options.userId]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextState = !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsCameraOff(!nextState);

        // Notify active connections
        peerConnections.current.forEach((_, userId) => {
          if (socket) {
            socket.emit('media_state_change', {
              to: userId,
              from: options.userId,
              isCameraOff: !nextState,
              isMuted: isMutedRef.current,
            });
          }
        });
      }
    }
  }, [localStream, socket, options.userId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_call', (data) => {
      if (options.onIncomingCall) options.onIncomingCall(data);
      setCallStatus('RINGING');
    });


    // Redefining signaling events for multi-peer
    const handleAnswer = async ({ from, answer }: any) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Drain queued ICE candidates
        const queue = queuedCandidates.current.get(from) || [];
        for (const candidate of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding queued candidate:', e);
          }
        }
        queuedCandidates.current.delete(from);

        setCallStatus('CONNECTED');
        if (options.onCallAccepted) options.onCallAccepted(from);

        // Emit media state immediately on connection
        if (socket) {
          socket.emit('media_state_change', {
            to: from,
            from: options.userId,
            isCameraOff: isCameraOffRef.current,
            isMuted: isMutedRef.current,
          });
        }
      }
    };

    const handleIceCandidate = async ({ from, candidate }: any) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding ice candidate', e);
          }
        } else {
          if (!queuedCandidates.current.has(from)) {
            queuedCandidates.current.set(from, []);
          }
          queuedCandidates.current.get(from)!.push(candidate);
        }
      }
    };

    const handleMediaStateChanged = ({ from, isCameraOff: remoteCameraOff, isMuted: remoteMuted }: any) => {
      console.log('Remote media state changed:', from, { remoteCameraOff, remoteMuted });
      setRemoteMediaStates(prev => ({
        ...prev,
        [from]: { isCameraOff: remoteCameraOff, isMuted: remoteMuted }
      }));
    };

    socket.on('call_answered', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('media_state_changed', handleMediaStateChanged);
    
    socket.on('call_ended', ({ from }: any) => {
      cleanupUser(from);
      if (peerConnections.current.size === 0) {
        cleanupAll();
        if (options.onCallEnded) options.onCallEnded(from);
      }
    });

    socket.on('call_rejected', ({ from }: any) => {
      cleanupUser(from);
      if (peerConnections.current.size === 0) {
        cleanupAll();
        if (options.onCallEnded) options.onCallEnded(from);
      }
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_answered', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('media_state_changed', handleMediaStateChanged);
      socket.off('call_ended');
      socket.off('call_rejected');
    };
  }, [socket, options, cleanupUser, cleanupAll]);

  return {
    localStream,
    remoteStreams,
    callStatus,
    isMuted,
    isCameraOff,
    mediaError,
    remoteMediaStates,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
};
