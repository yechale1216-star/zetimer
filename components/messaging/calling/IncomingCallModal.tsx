'use client';

import React from 'react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/utils';

interface IncomingCallModalProps {
  isOpen: boolean;
  caller: {
    name: string;
    avatar?: string;
  };
  type: 'VOICE' | 'VIDEO';
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  caller,
  type,
  onAccept,
  onReject,
}) => {
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
        interval = setInterval(() => {
          navigator.vibrate([1000, 500, 1000]);
        }, 4000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-gradient-to-b from-[#2e8af6] via-[#3b6df1] to-[#6d28d9] flex flex-col justify-between p-6 select-none overflow-hidden pb-safe pt-safe"
        >
          {/* Top subtle identifier */}
          <div className="flex justify-center pt-8">
            <span className="text-white/60 text-xs font-semibold tracking-[0.2em] uppercase">
              Incoming Call
            </span>
          </div>

          {/* Center Caller Info Area */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
              {/* Expanding Concentric Pulsing Ripples */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: [1, 2.3], opacity: [0.6, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: [0.25, 0.46, 0.45, 0.94],
                      delay: i * 0.8,
                    }}
                    className="absolute w-40 h-40 rounded-full border border-white/20 bg-white/5"
                  />
                ))}
              </div>

              {/* Shaking Avatar on alert */}
              <motion.div
                animate={{
                  x: [0, -2, 2, -2, 2, 0],
                  y: [0, 1, -1, 1, -1, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <Avatar className="h-32 w-32 border-2 border-white/30 shadow-2xl">
                  <AvatarImage src={caller.avatar || undefined} className="object-cover" />
                  <AvatarFallback className="text-4xl font-extrabold bg-[#2b7bd5] text-white">
                    {caller.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            </div>

            <div className="text-center mt-2">
              <h2 className="text-white text-3xl font-semibold tracking-wide drop-shadow-md">
                {caller.name}
              </h2>
              <p className="text-white/80 text-[15px] font-medium mt-1.5 drop-shadow-sm tracking-wide">
                {type === 'VIDEO' ? 'Zetime Video Call' : 'Zetime Voice Call'}
              </p>
            </div>
          </div>

          {/* Action buttons matching Screen 3 bottom style */}
          <div className="w-full max-w-sm mx-auto px-4 pb-14 mt-auto">
            <div className="flex items-center justify-around w-full">
              {/* Decline Call Option */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onReject}
                  className="h-16 w-16 rounded-full bg-[#e15241] hover:bg-[#c23f2f] text-white flex items-center justify-center transition-all active:scale-95 shadow-xl border border-white/5"
                >
                  <PhoneOff className="h-7 w-7 text-white stroke-[2]" />
                </button>
                <span className="text-white/95 text-[13px] font-medium tracking-wide drop-shadow-sm">
                  Decline
                </span>
              </div>

              {/* Accept Call Option */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onAccept}
                  className="h-16 w-16 rounded-full bg-[#2ec150] hover:bg-[#25a943] text-white flex items-center justify-center transition-all active:scale-95 shadow-xl border border-white/5"
                >
                  {type === 'VIDEO' ? (
                    <Video className="h-7 w-7 text-white stroke-[2]" />
                  ) : (
                    <Phone className="h-7 w-7 text-white stroke-[2]" />
                  )}
                </button>
                <span className="text-white/95 text-[13px] font-medium tracking-wide drop-shadow-sm">
                  Accept
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
