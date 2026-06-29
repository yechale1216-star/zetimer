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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

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
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
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
      className="fixed inset-0 z-[110] bg-slate-950 flex flex-col overflow-hidden select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Hidden audio outputs for all remote participants who don't have an active video stream */}
      {participants.map(p => {
        if (p.isLocal) return null;
        const stream = remoteStreams[p.id];
        const isShowingVideo = type === 'VIDEO' && hasRemoteVideo && p.id === firstRemote?.id;
        if (isShowingVideo) return null;
        return <AudioStream key={p.id} stream={stream} />;
      })}

      {/* ── Background: remote video or gradient ─────────────────────── */}
      <div className="absolute inset-0 z-0">
        {type === 'VIDEO' && hasRemoteVideo ? (
          <>
            <VideoStream stream={firstRemoteStream!} className="absolute inset-0" />
            {/* Gradient overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />
          </>
        ) : type === 'VIDEO' && firstRemote && !hasRemoteVideo ? (
          // Telegram Style: show local video taking full screen while waiting
          <>
             {localStream && !isCameraOff ? (
                <VideoStream stream={localStream} isLocal={true} className="absolute inset-0" />
             ) : (
                <div className="w-full h-full bg-slate-900" />
             )}
             <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
             {/* Center name and status */}
             <div className="absolute top-28 left-1/2 -translate-x-1/2 flex flex-col items-center">
                 <h1 className="text-white text-3xl md:text-4xl font-normal drop-shadow-md tracking-wide">{firstRemote.name}</h1>
                 <p className="text-white text-[15px] font-medium mt-1 drop-shadow-md">
                  {status === 'RINGING' ? 'Ringing...' : status === 'CONNECTING' ? 'Connecting...' : status === 'CONNECTED' ? 'Waiting for video...' : 'Reconnecting...'}
                 </p>
             </div>
          </>
        ) : (
          // Voice call background
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-primary/10 to-slate-950" />
        )}
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={() => setIsMinimized(true)}
          className="p-2 text-white active:scale-90 transition-transform drop-shadow-md"
        >
          <Minimize2 className="h-6 w-6 md:h-7 md:w-7" />
        </button>

        <div className="flex flex-col items-center">
          {status === 'CONNECTED' && type === 'VOICE' && (
            <>
              <span className="text-white/50 text-[10px] uppercase tracking-[0.25em] font-semibold">Encrypted</span>
              <span className="text-white font-mono text-base font-bold">
                {formatTime(callTime)}
              </span>
            </>
          )}
        </div>

        <button className="p-2 text-white active:scale-90 transition-transform drop-shadow-md">
          <Volume2 className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      </div>

      {/* ── Center: Voice call avatar / name ─────────────────────────────── */}
      {type === 'VOICE' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="relative">
            {/* Professional Smooth Ripple Effect */}
            <div className="absolute inset-0">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: [1, 2.8], opacity: [0.5, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: [0.33, 1, 0.68, 1], // easeOutQuart
                    delay: i * 1,
                  }}
                  className="absolute inset-0 rounded-full border border-green-500/30 bg-green-500/5 backdrop-blur-[2px]"
                />
              ))}
            </div>

            <Avatar className={cn(
              "relative h-36 w-36 md:h-44 md:w-44 border-[3px] shadow-2xl transition-all duration-700 ease-in-out",
              (status === 'CONNECTED' || status === 'RINGING' || status === 'CONNECTING')
                ? "border-green-500 ring-[12px] ring-green-500/5 shadow-green-500/10"
                : "border-white/15"
            )}>
              <AvatarImage src={caller.avatar} />
              <AvatarFallback className={cn(
                "text-6xl font-black transition-colors duration-700",
                (status === 'CONNECTED' || status === 'RINGING' || status === 'CONNECTING')
                  ? "bg-green-600 text-white"
                  : "bg-slate-800 text-white"
              )}>
                {caller.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center">
            <h2 className="text-white text-2xl md:text-3xl font-bold">{caller.name}</h2>
            <p className="text-white/50 text-sm mt-1 uppercase tracking-widest">
              {status === 'CONNECTED'
                ? 'In Call'
                : status === 'RINGING'
                ? 'Ringing...'
                : status === 'CONNECTING'
                ? 'Connecting...'
                : 'Reconnecting...'}
            </p>
          </div>
        </div>
      )}

      {/* ── Local PIP (Video mode only) ─────────────────────────────────── */}
      {type === 'VIDEO' && hasRemoteVideo && (
        <div className="relative z-20 flex-1">
          {/* Local self-view: fixed to bottom-right but above controls */}
          <motion.div
            drag
            dragMomentum={false}
            className={cn(
              "absolute z-30 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 cursor-move",
              // Responsive sizing & positioning
              "w-[90px] h-[130px] sm:w-[110px] sm:h-[160px] md:w-[130px] md:h-[190px]",
              "bottom-4 right-4"
            )}
          >
            {!isCameraOff ? (
              <VideoStream stream={localStream} isLocal={true} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-850">
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarFallback className="text-xs bg-white/10 text-white">You</AvatarFallback>
                </Avatar>
                <span className="text-[8px] text-white/40 uppercase font-bold">Cam Off</span>
              </div>
            )}
            {/* Mute indicator */}
            {isMuted && (
              <div className="absolute bottom-1 right-1 bg-red-500/80 rounded-full p-0.5">
                <MicOff className="h-2 w-2 text-white" />
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Voice call spacer ─────────────────────────────────────────────── */}
      {type === 'VOICE' && <div className="flex-1" />}

      {/* ── Controls Bar ─────────────────────────────────────────────────── */}
      {type === 'VIDEO' ? (
        <div className="relative z-20 flex items-start justify-between w-full max-w-sm mx-auto pb-10 pt-4 px-8 mt-auto">
          {/* Flip */}
          <div className="flex flex-col items-center gap-2">
            <button
              className="h-[60px] w-[60px] rounded-full bg-white text-slate-800 flex items-center justify-center transition-transform active:scale-90 shadow-2xl"
              onClick={onFlipCamera}
            >
              <SwitchCamera className="h-7 w-7" />
            </button>
            <span className="text-white text-[12px] tracking-wide font-medium drop-shadow-md">Flip</span>
          </div>

          {/* Stop Video */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleCamera}
              className={cn(
                "h-[60px] w-[60px] rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-2xl",
                isCameraOff ? "bg-white text-slate-900" : "bg-white/15 backdrop-blur-2xl border-white/20 text-white"
              )}
            >
              {isCameraOff ? <VideoOff className="h-7 w-7" /> : <Video className="h-7 w-7" />}
            </button>
            <span className="text-white text-[12px] tracking-wide font-medium drop-shadow-md">
              {isCameraOff ? 'Video On' : 'Stop Video'}
            </span>
          </div>

          {/* Mute */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleMute}
              className={cn(
                "h-[60px] w-[60px] rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-2xl",
                isMuted ? "bg-white text-slate-900" : "bg-white/15 backdrop-blur-2xl border-white/20 text-white"
              )}
            >
              {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
            </button>
            <span className="text-white text-[12px] tracking-wide font-medium drop-shadow-md">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </div>

          {/* End Call */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onEndCall}
              className="h-[60px] w-[60px] rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-transform active:scale-90"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
            <span className="text-white text-[12px] tracking-wide font-medium drop-shadow-md">End Call</span>
          </div>
        </div>
      ) : (
        <div className="relative z-20 flex items-center justify-center pb-8 pt-4 px-4 mt-auto">
          <div className="bg-white/10 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl flex items-center gap-3 md:gap-5 px-6 md:px-8 py-3 md:py-4">
            {/* Mute */}
            <button
              onClick={onToggleMute}
              className={cn(
                "h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center transition-all active:scale-90",
                isMuted ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
              )}
            >
              {isMuted ? <MicOff className="h-5 w-5 md:h-6 md:w-6" /> : <Mic className="h-5 w-5 md:h-6 md:w-6" />}
            </button>

            {/* Speaker */}
            <button className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-all active:scale-90">
              <Volume2 className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/15 mx-1" />

            {/* End Call */}
            <button
              onClick={onEndCall}
              className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all active:scale-95"
            >
              <PhoneOff className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
