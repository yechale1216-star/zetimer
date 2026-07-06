'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { NativeBridge } from '@/lib/utils/native-bridge';
import { 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Megaphone, 
  RefreshCw, 
  ShieldAlert,
  Bell,
  X
} from 'lucide-react';

interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  route?: string;
  conversationId?: string;
  studentId?: string;
  schoolId?: string;
  badge?: string;
}

interface InAppNotificationContextType {
  showNotification: (payload: NotificationPayload) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export const useInAppNotification = () => {
  const context = useContext(InAppNotificationContext);
  if (!context) {
    throw new Error('useInAppNotification must be used within InAppNotificationProvider');
  }
  return context;
};

export const InAppNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const showNotification = useCallback((payload: NotificationPayload) => {
    // 1. Prevent duplicate visuals if user is already on the relevant chat screen
    if (payload.type === 'new_message' && payload.conversationId && pathname.includes('/communication')) {
      const activeChatId = typeof window !== 'undefined' ? localStorage.getItem('zetime:active_chat_id') : null;
      if (activeChatId === payload.conversationId) {
        console.log('[InAppNotification] Suppressed banner because chat conversation is currently open');
        return;
      }
    }

    // 2. Play Audio Tone (self-contained wav beep we generated)
    try {
      const audio = new Audio('/sounds/notification.wav');
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('[InAppNotification] Audio playback blocked or failed:', e));
    } catch (e) {
      console.warn('[InAppNotification] Failed to create audio element:', e);
    }

    // 3. Trigger Device Haptic Vibration
    NativeBridge.vibrate();

    // 4. Update Header Bell Badge (firing Event so main layouts refresh counters)
    window.dispatchEvent(new Event('new_notification'));

    // 5. Populate State to Show Banner
    setNotification(payload);
  }, [pathname]);

  // Handle Global Event listener for web/native integrations
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        showNotification(detail);
      }
    };

    window.addEventListener('zetime:in_app_notification', handleEvent);
    return () => {
      window.removeEventListener('zetime:in_app_notification', handleEvent);
    };
  }, [showNotification]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleNotificationClick = () => {
    if (!notification) return;
    
    // Tap triggers routing
    if (notification.route) {
      router.push(notification.route);
    } else if (notification.type === 'new_message' && notification.conversationId) {
      // Message fallback routing
      router.push(`/parent/communication`);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('zetime:open_conversation', {
          detail: { conversationId: notification.conversationId }
        }));
      }, 300);
    }

    setNotification(null);
  };

  // Helper to render beautiful colored icon based on alert category
  const renderCategoryIcon = (type: string) => {
    const size = 22;
    switch (type) {
      case 'new_message':
        return <MessageSquare size={size} className="text-blue-500" />;
      case 'late_arrival':
        return <Clock size={size} className="text-yellow-500" />;
      case 'absent_arrival':
        return <AlertTriangle size={size} className="text-red-500" />;
      case 'excused_arrival':
        return <CheckCircle2 size={size} className="text-green-500" />;
      case 'new_announcement':
        return <Megaphone size={size} className="text-indigo-500" />;
      case 'system_update':
        return <RefreshCw size={size} className="text-purple-500" />;
      case 'account_security':
        return <ShieldAlert size={size} className="text-rose-500" />;
      default:
        return <Bell size={size} className="text-gray-500" />;
    }
  };

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
      {children}

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] cursor-pointer"
            onClick={handleNotificationClick}
          >
            {/* Telegram Glassmorphic Card Style */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl p-4 flex gap-4 items-center transition duration-300 hover:shadow-2xl active:scale-98">
              
              {/* Colored Theme Icon Holder */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 shrink-0">
                {renderCategoryIcon(notification.type)}
              </div>

              {/* Text Holder */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                  {notification.title}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {notification.body}
                </p>
              </div>

              {/* Action area */}
              <div className="flex flex-col gap-1 items-end shrink-0">
                <span className="text-[10px] text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase">
                  now
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotification(null);
                  }}
                  className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  aria-label="Dismiss in-app alert"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </InAppNotificationContext.Provider>
  );
};
