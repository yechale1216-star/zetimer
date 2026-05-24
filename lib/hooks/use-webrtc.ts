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

export const useWebRTC = (options: WebRTCOptions) => {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [callStatus, setCallStatus] = useState<'IDLE' | 'RINGING' | 'CONNECTING' | 'CONNECTED'>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const callType = useRef<'VOICE' | 'VIDEO'>('VOICE');

  const cleanupUser = useCallback((userId: string) => {
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const cleanupAll = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStreams({});
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
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: event.streams[0]
      }));
      if (options.onRemoteStream) options.onRemoteStream(userId, event.streams[0]);
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
    callType.current = type;
    try {
      const stream = localStream || await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO',
      });
      if (!localStream) setLocalStream(stream);

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
      cleanupAll();
    }
  }, [options.userId, socket, localStream, createPeerConnection, cleanupAll]);

  const answerCall = useCallback(async (fromId: string, offer: any, type: 'VOICE' | 'VIDEO') => {
    setCallStatus('CONNECTING');
    callType.current = type;
    try {
      const stream = localStream || await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'VIDEO',
      });
      if (!localStream) setLocalStream(stream);

      const pc = createPeerConnection(fromId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer_call', { to: fromId, from: options.userId, answer });
      }
      setCallStatus('CONNECTED');
    } catch (error) {
      console.error('Error answering call:', error);
      cleanupAll();
    }
  }, [socket, options.userId, localStream, createPeerConnection, cleanupAll]);

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
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming_call', (data) => {
      if (options.onIncomingCall) options.onIncomingCall(data);
      setCallStatus('RINGING');
    });

    socket.on('call_answered', async (data) => {
      const pc = peerConnections.current.get(data.from || data.to); // Depending on signal structure
      // Wait, signaling needs to pass the userId who answered
    });

    // Redefining signaling events for multi-peer
    const handleAnswer = async ({ from, answer }: any) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('CONNECTED');
        if (options.onCallAccepted) options.onCallAccepted(from);
      }
    };

    const handleIceCandidate = async ({ from, candidate }: any) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ice candidate', e);
        }
      }
    };

    socket.on('call_answered', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    
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
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
};
