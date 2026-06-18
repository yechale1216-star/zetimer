'use client';

import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, Users, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
  caller: {
    name: string;
    avatar?: string;
  };
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

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
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const constraintsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'CONNECTED') {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1);
      }, 1000);
    } else if (status === 'RINGING') {
      interval = setInterval(() => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([400, 200, 400]);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const VideoStream = ({ stream, isLocal = false }: { stream: MediaStream | null, isLocal?: boolean }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [videoTracksCount, setVideoTracksCount] = useState(0);
    const [audioTracksCount, setAudioTracksCount] = useState(0);

    useEffect(() => {
      if (!stream) return;
      
      const updateTracks = () => {
        setVideoTracksCount(stream.getVideoTracks().length);
        setAudioTracksCount(stream.getAudioTracks().length);
      };

      updateTracks();
      stream.addEventListener('addtrack', updateTracks);
      stream.addEventListener('removetrack', updateTracks);

      return () => {
        stream.removeEventListener('addtrack', updateTracks);
        stream.removeEventListener('removetrack', updateTracks);
      };
    }, [stream]);

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream, videoTracksCount, audioTracksCount]);

    if (!stream) {
      return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
          <VideoOff className="h-8 w-8 text-white/20 animate-pulse" />
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn("w-full h-full object-cover", isLocal && "mirror")}
      />
    );
  };

  const firstRemote = participants.find(p => !p.id.includes('local') && !(p as any).isLocal);
  const allParticipantsCount = participants.length;

  const renderRemoteContent = () => {
    if (!firstRemote) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-4">
          <span className="text-sm text-white/40 animate-pulse">Connecting...</span>
        </div>
      );
    }

    const isRemoteCameraOff = !!remoteMediaStates[firstRemote.id]?.isCameraOff;
    const remoteStream = remoteStreams[firstRemote.id];
    const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled;

    if (status === 'CONNECTING') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white gap-6 p-6 text-center">
          <Avatar className="h-28 w-28 border-4 border-white/10 shadow-2xl animate-pulse">
            <AvatarImage src={firstRemote.avatar || undefined} />
            <AvatarFallback className="text-4xl bg-slate-800 text-white font-semibold">
              {firstRemote.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xl md:text-2xl font-bold tracking-wide">{firstRemote.name}</span>
            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.2,
                    }}
                    className="h-1.5 w-1.5 rounded-full bg-green-500"
                  />
                ))}
              </div>
              <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-semibold">
                Connecting...
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isRemoteCameraOff) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4 p-6 text-center">
          <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-white/20 shadow-2xl">
            <AvatarImage src={firstRemote.avatar || undefined} />
            <AvatarFallback className="text-3xl md:text-4xl bg-slate-800 text-white font-semibold">
              {firstRemote.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <span className="text-base md:text-lg font-medium tracking-wide">{firstRemote.name}</span>
            <span className="text-xs md:text-sm bg-white/10 px-3 py-1 rounded-full text-white/60 font-medium inline-block mx-auto">
              Camera off
            </span>
          </div>
        </div>
      );
    }

    if (!hasRemoteVideo) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4 p-6 text-center">
          <Avatar className="h-24 w-24 md:h-28 md:w-28 border-2 border-white/20 animate-pulse shadow-2xl">
            <AvatarImage src={firstRemote.avatar || undefined} />
            <AvatarFallback className="text-3xl md:text-4xl bg-slate-800 text-white font-semibold">
              {firstRemote.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-base md:text-lg font-medium tracking-wide">{firstRemote.name}</span>
            <span className="text-xs md:text-sm text-white/40 animate-pulse">Waiting for remote video...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 w-full h-full z-0">
        <VideoStream stream={remoteStream} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none z-10" />
      </div>
    );
  };

  if (isMinimized) {
    const firstRemoteId = Object.keys(remoteStreams)[0];
    const firstRemoteStream = firstRemoteId ? remoteStreams[firstRemoteId] : null;

    return (
      <motion.div
        drag
        dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
        className="fixed bottom-20 right-4 z-[110] w-48 h-64 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden cursor-move border border-white/10"
      >
        {type === 'VIDEO' && firstRemoteStream ? (
          <VideoStream stream={firstRemoteStream} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center">
            <Avatar className="h-20 w-20 mb-2 border-2 border-white/20">
              <AvatarImage src={caller.avatar || undefined} />
              <AvatarFallback>{caller.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-white truncate w-full">{caller.name}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-black/20 text-white backdrop-blur-md"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 rounded-full shadow-lg"
            onClick={onEndCall}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={constraintsRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-slate-950 flex flex-col overflow-hidden select-none"
    >
      {/* Fullscreen Background Content (Remote Live Video or Status Screens) */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {type === 'VIDEO' ? (
          renderRemoteContent()
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/20 to-slate-950 opacity-50" />
        )}
      </div>

      {/* Header Overlay (Transparent Gradient background for readability) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full h-12 w-12 flex items-center justify-center active:scale-95 transition-transform"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex flex-col items-center">
          {status === 'CONNECTED' && (
            <span className="text-white/60 text-[10px] uppercase tracking-[0.3em] mb-1 font-semibold">Encrypted Call</span>
          )}
          <span className="text-white font-mono text-lg font-bold">
            {status === 'CONNECTED' ? formatTime(callTime) : ''}
          </span>
        </div>
        <div className="pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full h-12 w-12 flex items-center justify-center"
          >
            <div className="relative">
              <Users className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                {allParticipantsCount}
              </span>
            </div>
          </Button>
        </div>
      </div>

      {/* Main Body (Draggable Preview / Profile Centered UI) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center pointer-events-none z-10">
        {type === 'VOICE' && (
          <div className="pointer-events-auto flex flex-col items-center gap-8 mt-16">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
              />
              <motion.div
                animate={status === 'CONNECTED' ? {
                  x: [0, -1, 1, -1, 1, 0],
                  y: [0, 1, -1, 1, -1, 0],
                } : {}}
                transition={{
                  repeat: Infinity,
                  duration: 0.2,
                  ease: "linear",
                  repeatDelay: 2
                }}
                className="relative z-10"
              >
                <Avatar className="h-44 w-44 md:h-48 md:w-48 border-4 border-white/10 shadow-2xl">
                  <AvatarImage src={caller.avatar || undefined} />
                  <AvatarFallback className="text-6xl md:text-7xl font-black bg-gradient-to-br from-primary/40 to-primary/10 text-white shadow-inner flex items-center justify-center w-full h-full">
                    {caller.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </div>
            <div className="text-center">
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">{caller.name}</h2>
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.2,
                      }}
                      className="h-1.5 w-1.5 rounded-full bg-green-500"
                    />
                  ))}
                </div>
                <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-semibold">
                  {status === 'CONNECTED' ? 'Ongoing voice session' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Local Stream Floating Window (Video Call Mode) */}
        {type === 'VIDEO' && (
          <motion.div
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            dragMomentum={false}
            className="pointer-events-auto absolute top-24 right-4 md:top-28 md:right-8 w-28 h-40 md:w-40 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-30 bg-slate-900 flex flex-col items-center justify-center cursor-move"
          >
            {!isCameraOff ? (
              <VideoStream stream={localStream} isLocal={true} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-850">
                <Avatar className="h-10 w-10 md:h-12 md:w-12 border border-white/10 shadow-inner">
                  <AvatarFallback className="text-xs bg-white/10 text-white font-medium">You</AvatarFallback>
                </Avatar>
                <span className="text-[9px] md:text-[10px] text-white/40 uppercase font-bold tracking-wider">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] md:text-[9px] text-white font-medium uppercase tracking-wider flex items-center gap-1 pointer-events-none select-none">
              You {isMuted && <MicOff className="h-2.5 w-2.5 text-red-500" />}
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls Overlay (Bottom bar) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center p-6 pb-8 md:pb-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
        <div className="pointer-events-auto bg-white/10 backdrop-blur-2xl rounded-[3.5rem] p-3 md:p-4 border border-white/10 shadow-2xl flex items-center gap-4 md:gap-6 px-6 md:px-10">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 md:h-14 md:w-14 rounded-full transition-all active:scale-90 flex items-center justify-center",
              isMuted ? "bg-white text-slate-900 hover:bg-white/95" : "bg-white/10 text-white hover:bg-white/20"
            )}
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5 md:h-6 md:w-6" /> : <Mic className="h-5 w-5 md:h-6 md:w-6" />}
          </Button>

          {type === 'VIDEO' ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 md:h-14 md:w-14 rounded-full transition-all active:scale-90 flex items-center justify-center",
                isCameraOff ? "bg-white text-slate-900 hover:bg-white/95" : "bg-white/10 text-white hover:bg-white/20"
              )}
              onClick={onToggleCamera}
            >
              {isCameraOff ? <VideoOff className="h-5 w-5 md:h-6 md:w-6" /> : <Video className="h-5 w-5 md:h-6 md:w-6" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center"
            >
              <Volume2 className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          )}

          <div className="w-[1px] h-8 md:h-10 bg-white/10 mx-1 md:mx-2" />

          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 md:h-16 md:w-16 rounded-full shadow-xl bg-red-500 hover:bg-red-600 active:scale-95 transition-transform flex items-center justify-center"
            onClick={onEndCall}
          >
            <PhoneOff className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </motion.div>
  );
};
