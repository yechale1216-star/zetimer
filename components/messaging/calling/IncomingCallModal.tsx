'use client';

import React from 'react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop Blur */}
          <div className="absolute inset-0 bg-background/40 backdrop-blur-xl" />

          {/* Modal Card */}
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-background/80 shadow-2xl border border-white/20 backdrop-blur-2xl px-8 py-12 text-center">
            {/* Animated Ringing Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.3, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeOut",
                }}
                className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-2xl"
              />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <Avatar className="h-28 w-28 border-4 border-background shadow-xl mb-6">
                <AvatarImage src={caller.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                  {caller.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h3 className="text-2xl font-bold mb-1 tracking-tight">{caller.name}</h3>
              <p className="text-primary font-medium flex items-center gap-2 mb-12">
                {type === 'VIDEO' ? (
                  <><Video className="h-4 w-4" /> Incoming Video Call</>
                ) : (
                  <><Phone className="h-4 w-4" /> Incoming Voice Call</>
                )}
              </p>

              <div className="flex items-center justify-center gap-10">
                <div className="flex flex-col items-center gap-3">
                  <Button
                    onClick={onReject}
                    variant="destructive"
                    size="icon"
                    className="h-16 w-16 rounded-full shadow-lg active:scale-90 transition-transform bg-red-500 hover:bg-red-600"
                  >
                    <PhoneOff className="h-8 w-8" />
                  </Button>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Button
                    onClick={onAccept}
                    size="icon"
                    className="h-16 w-16 rounded-full shadow-lg active:scale-90 transition-transform bg-green-500 hover:bg-green-600"
                  >
                    {type === 'VIDEO' ? (
                      <Video className="h-8 w-8 text-white" />
                    ) : (
                      <Phone className="h-8 w-8 text-white" />
                    )}
                  </Button>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Accept</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
