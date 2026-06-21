'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io as ClientIO, Socket } from 'socket.io-client';
import { socketUrl } from '@/lib/api-config';
import { authService } from '@/lib/auth/auth';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  /** Manually force a reconnect (e.g. after restoring from background) */
  reconnect: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const authenticate = useCallback(async (s: Socket) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null;
    if (token && s.connected) {
      s.emit('authenticate', { token });

      // --- Register Push Token ---
      try {
        const { requestPushNotificationPermission } = await import('@/lib/firebase-client');
        const pushToken = await requestPushNotificationPermission();
        if (pushToken) {
          s.emit('register_push_token', { token: pushToken });
        }
      } catch (err) {
        console.warn('[SocketProvider] Push registration failed:', err);
      }
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  useEffect(() => {
    // ── WebSocket-first transport (skip HTTP long-polling entirely).
    // This reduces connection latency by ~300ms on initial connect and
    // eliminates the polling overhead that drains battery on mobile.
    const socketInstance = ClientIO(socketUrl, {
      transports: ['websocket'],       // Never fall back to polling
      reconnection: true,
      reconnectionAttempts: Infinity,  // Never give up — Telegram doesn't give up
      reconnectionDelay: 1000,         // Start at 1s
      reconnectionDelayMax: 30000,     // Cap at 30s (mobile: don't hammer the server)
      randomizationFactor: 0.5,        // Jitter to avoid thundering herd on server restart
      timeout: 20000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
      setIsConnected(true);
      // ── CRITICAL: Re-authenticate after every reconnect.
      // Without this, the server treats the reconnected socket as unauthenticated,
      // causing all subsequent events to be rejected silently.
      authenticate(socketInstance);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);

      // If the server disconnected us intentionally (e.g. timeout), reconnect immediately.
      // Socket.IO handles transport-close and ping-timeout automatically; we handle the rest.
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempt(s)`);
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] Reconnect attempt #${attempt}`);
    });

    socketInstance.on('new_message', (message: any) => {
      const currentUser = authService.getCurrentUser();
      
      // Don't notify for our own messages
      if (currentUser && message.senderId === currentUser.id) return;

      // Dispatch event so NotificationPopover refreshes
      window.dispatchEvent(new Event('new_notification'));
      
      // Only notify if permissions are granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = message.senderName || message.sender?.full_name || 'New Message';
        const body = message.content || (message.type !== 'TEXT' ? 'Sent an attachment' : 'New message');
        const icon = message.senderAvatar || message.sender?.profile_photo || '/favicon.ico';
        
        try {
          const notification = new Notification(title, {
            body,
            icon,
            tag: `chat-${message.conversationId}`,
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
            // If they are on a different page, this brings the app to focus. 
            // In a more complex app, we could navigate to /chat or the specific conversation.
          };
        } catch (e) {
          console.error('[Socket] Failed to show notification:', e);
        }
      }
    });

    setSocket(socketInstance);

    // ── Network-aware reconnection.
    // When a mobile device goes offline then comes back, the socket may
    // have silently dropped. Listen to the browser online event and force
    // a reconnect rather than waiting for the next reconnection attempt.
    const handleOnline = () => {
      console.log('[Socket] Network restored — reconnecting...');
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };

    const handleOffline = () => {
      console.log('[Socket] Network lost — socket will auto-reconnect when back online');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(err => console.warn('[SocketProvider] Notification permission error:', err));
      }

      // Register Firebase Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then((reg) => console.log('[SocketProvider] Service Worker registered:', reg.scope))
          .catch((err) => console.warn('[SocketProvider] SW registration failed:', err));
      }
    }

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [authenticate]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
