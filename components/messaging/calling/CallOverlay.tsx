'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Maximize2, Minimize2, Users, Volume2, SwitchCamera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/utils';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream | null;
  isLocal?: boolean;
}

interface CallOverlayProps {
  status: 'RINGING' | 'CONNECTING' | 'CONNECTED';
  type: 'VOICE' | 'VIDEO';
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteMediaStates: Record<string, { isCameraOff: boolean; isMuted: boolean }>;
  participants: Participant[];
  caller: { name: string; avatar?: string };
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onFlipCamera?: () => void;
}

// ── Stable video element that attaches the stream via ref ────────────────────
const VideoStream = React.memo(
  ({ stream, isLocal = false, className }: { stream: MediaStream | null; isLocal?: boolean; className?: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      if (stream) {
        el.srcObject = stream;
        el.play().catch(() => {}); // autoplay may be deferred on mobile
      } else {
        el.srcObject = null;
      }
    }, [stream]);

    if (!stream) return null;

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline       // CRITICAL for iOS/Android
        muted={isLocal}   // avoid echo on own stream
        className={cn('w-full h-full object-cover', isLocal && 'scale-x-[-1]', className)}
      />
    );
  }
);
VideoStream.displayName = 'VideoStream';

// ── Stable audio element that attaches the stream via ref ────────────────────
const AudioStream = React.memo(({ stream }: { stream: MediaStream | null }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch((e) => console.log('[AudioStream] auto-play blocked or failed:', e));
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      className="hidden" // No UI needed for audio, just the element
    />
  );
});
AudioStream.displayName = 'AudioStream';

// ── Main component ────────────────────────────────────────────────────────────
export const CallOverlay: React.FC<CallOverlayProps> = ({
  status,
  type,
  isMuted,
  isCameraOff,
  localStream,
  remoteStreams,
  remoteMediaStates,
  participants,
  caller,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onFlipCamera,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [callTime, setCallTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'CONNECTED') {
      interval = setInterval(() => setCallTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const firstRemote = participants.find(p => !p.isLocal);
  const firstRemoteStream = firstRemote ? remoteStreams[firstRemote.id] : null;
  const isRemoteCameraOff = !!(firstRemote && remoteMediaStates[firstRemote.id]?.isCameraOff);
  const hasRemoteVideo =
    firstRemoteStream &&
    firstRemoteStream.getVideoTracks().length > 0 &&
    firstRemoteStream.getVideoTracks()[0].enabled &&
    !isRemoteCameraOff;

  // ── Minimized bubble ─────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
        className="fixed bottom-24 right-4 z-[110] w-44 h-60 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden cursor-move border border-white/10"
      >
        {type === 'VIDEO' && firstRemoteStream ? (
          <VideoStream stream={firstRemoteStream} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 gap-3">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              <AvatarImage src={caller.avatar} />
              <AvatarFallback className="bg-slate-700 text-white text-xl font-bold">
                {caller.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-white/70 text-center px-2 truncate w-full">{caller.name}</span>
            {status === 'CONNECTED' && (
              <span className="text-[10px] text-green-400 font-mono">{formatTime(callTime)}</span>
            )}
          </div>
        )}
        {/* Expand button */}
        <button
          onClick={() => setIsMinimized(false)}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/40 flex items-center justify-center text-white"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
        {/* End call */}
        <button
          onClick={onEndCall}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-red-500 flex items-center justify-center shadow-lg animate-pulse"
        >
          <PhoneOff className="h-4 w-4 text-white" />
        </button>
      </motion.div>
    );
  }

  // ── Full screen ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-gradient-to-b from-[#2e8af6] via-[#3b6df1] to-[#6d28d9] flex flex-col overflow-hidden select-none pb-safe pt-safe"
    >
      {/* Hidden audio outputs for all remote participants who don't have an active video stream */}
      {participants.map(p => {
        if (p.isLocal) return null;
        const stream = remoteStreams[p.id];
        const isShowingVideo = type === 'VIDEO' && hasRemoteVideo && p.id === firstRemote?.id;
        if (isShowingVideo) return null;
        return <AudioStream key={p.id} stream={stream} />;
      })}

      {/* ── Background: remote video overlay if active ─────────────────────── */}
      {type === 'VIDEO' && hasRemoteVideo && (
        <div className="absolute inset-0 z-0">
          <VideoStream stream={firstRemoteStream!} className="absolute inset-0" />
          {/* Gradient overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </div>
      )}

      {/* ── Top Header ───────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={() => setIsMinimized(true)}
          className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
        >
          {/* Minimization icon shown in Telegram screen: two diagonal arrows pointing inwards */}
          <Minimize2 className="h-6 w-6 stroke-[2.5]" />
        </button>

        <div className="flex flex-col items-center">
          {status === 'CONNECTED' && (
            <span className="text-white/80 font-mono text-sm font-semibold tracking-wider drop-shadow">
              {formatTime(callTime)}
            </span>
          )}
        </div>

        {/* Placeholder for top right alignment */}
        <div className="w-10" />
      </div>

      {/* ── Center Call Info ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="relative flex items-center justify-center">
          {/* Concentric waves / glowing rings centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: [0.25, 0.46, 0.45, 0.94], // clean ease out
                  delay: i * 0.8,
                }}
                className="absolute w-40 h-40 rounded-full border border-white/20 bg-white/5"
              />
            ))}
          </div>

          <Avatar className={cn(
            "relative h-32 w-32 md:h-40 md:w-40 border-2 shadow-2xl transition-all duration-700 ease-in-out border-white/30",
            status === 'CONNECTED' ? "border-green-400" : ""
          )}>
            <AvatarImage src={caller.avatar || undefined} className="object-cover" />
            <AvatarFallback className="text-4xl font-extrabold bg-[#2b7bd5] text-white">
              {caller.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center mt-2">
          <h2 className="text-white text-3xl font-semibold tracking-wide drop-shadow-md">
            {caller.name}
          </h2>
          <p className="text-white/80 text-[15px] font-medium mt-1.5 drop-shadow-sm tracking-wide">
            {status === 'RINGING'
              ? 'Ringing ..'
              : status === 'CONNECTING'
              ? 'Connecting ..'
              : status === 'CONNECTED'
              ? 'In Ongoing Call'
              : 'Reconnecting ..'}
          </p>
        </div>
      </div>

      {/* ── Local Camera PIP (Video mode only) ───────────────────────────── */}
      {type === 'VIDEO' && hasRemoteVideo && (
        <div className="relative z-20 select-none">
          <motion.div
            drag
            dragMomentum={false}
            className="absolute z-30 rounded-2xl overflow-hidden border border-white/25 shadow-2xl bg-black/40 cursor-move w-[90px] h-[130px] sm:w-[110px] sm:h-[160px] bottom-4 right-4"
          >
            {!isCameraOff ? (
              <VideoStream stream={localStream} isLocal={true} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80">
                <span className="text-[10px] text-white/50 font-bold uppercase">Cam Off</span>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Controls Layout matching Screen 2 ────────────────────────────── */}
      <div className="relative z-20 w-full max-w-md mx-auto px-4 pb-12 mt-auto">
        <div className="flex items-center justify-around w-full">
          {/* Speaker Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const audioElements = document.getElementsByTagName('audio');
                  for (let i = 0; i < audioElements.length; i++) {
                    const audio = audioElements[i];
                    // Toggle volume logic for testing
                    audio.volume = audio.volume === 1.0 ? 0.3 : 1.0;
                  }
                  console.log('Speaker button toggled');
                }
              }}
              className="h-14 w-14 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg border border-white/5"
            >
              <Volume2 className="h-6 w-6 text-white stroke-[2]" />
            </button>
            <span className="text-white text-[12px] font-medium tracking-wide drop-shadow-sm">
              Speaker
            </span>
          </div>

          {/* Start/Stop Video Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleCamera}
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg border border-white/5",
                isCameraOff ? "bg-white text-slate-900" : "bg-white/15 hover:bg-white/25 text-white"
              )}
            >
              {isCameraOff ? (
                <VideoOff className="h-6 w-6 stroke-[2]" />
              ) : (
                <Video className="h-6 w-6 stroke-[2]" />
              )}
            </button>
            <span className="text-white text-[12px] font-medium tracking-wide drop-shadow-sm">
              {isCameraOff ? 'Start Video' : 'Stop Video'}
            </span>
          </div>

          {/* Mute/Unmute Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleMute}
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg border border-white/5",
                isMuted ? "bg-white text-slate-900 border-white" : "bg-white/15 hover:bg-white/25 text-white"
              )}
            >
              {isMuted ? (
                <MicOff className="h-6 w-6 stroke-[2]" />
              ) : (
                <Mic className="h-6 w-6 stroke-[2]" />
              )}
            </button>
            <span className="text-white text-[12px] font-medium tracking-wide drop-shadow-sm">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onEndCall}
              className="h-14 w-14 rounded-full bg-[#e15241] hover:bg-[#c23f2f] text-white flex items-center justify-center transition-all active:scale-95 shadow-lg border border-white/5"
            >
              <PhoneOff className="h-6 w-6 text-white stroke-[2]" />
            </button>
            <span className="text-white text-[12px] font-medium tracking-wide drop-shadow-sm font-semibold">
              End Call
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
