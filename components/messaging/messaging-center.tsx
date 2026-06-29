'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatLayout } from '@/components/messaging/chat-layout';
import { ChatSidebar } from '@/components/messaging/chat-sidebar';
import { ChatWindow } from '@/components/messaging/chat-window';
import { CreateGroupModal } from '@/components/messaging/create-group-modal';
import { GroupInfoPanel } from '@/components/messaging/group-info-panel';
import { UserInfoPanel } from '@/components/messaging/user-info-panel';
import { SavedMessagesPanel } from '@/components/messaging/saved-messages-panel';
import { Bookmark, X } from 'lucide-react';
import { useSocket } from '@/components/providers/socket-provider';
import { authService } from '@/lib/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/context/language-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { notifications } from '@/lib/utils/notifications';
import { updateAppBadge } from '@/lib/utils/app-badge';
import { formatLocalizedTime } from '@/lib/utils/date-utils';
import {
  cacheMessages,
  getCachedMessages,
  appendCachedMessage,
  updateCachedMessage,
  cacheConversations,
  getCachedConversations,
  enqueueOutboxMessage,
  getOutboxMessages,
  removeOutboxMessage,
  type OutboxMessage,
} from '@/lib/utils/message-cache';

import { apiUrl } from '@/lib/api-config';
const API_URL = apiUrl;

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null;
  const schoolId = typeof window !== 'undefined' ? localStorage.getItem('x-school-id') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(schoolId ? { 'x-school-id': schoolId } : {}),
  };
}

export function MessagingCenter() {
  const { t, language } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationData, setActiveConversationData] = useState<any>(null);
  
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, any[]>>({});
  // isFetchingMessages only drives the thin progress bar — never a blocking skeleton
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [showSavedMessages, setShowSavedMessages] = useState(false);
  const [forwardDialogData, setForwardDialogData] = useState<{
    messageIds?: string[];
    singleMessage?: any;
  } | null>(null);
  const [pinnedByConversation, setPinnedByConversation] = useState<Record<string, any>>({}); // conversationId -> pinnedMessage info

  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // conversationId -> typing status text
  const { toast } = useToast();

  // Refs so socket handlers always see latest values without stale closures
  const activeConversationIdRef = useRef<string | null>(null);
  const userRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    setUser(authService.getCurrentUser());
    
    // Register global bridge for sidebar to open group modal
    (window as any).openCreateGroup = () => setIsGroupModalOpen(true);

    // ── Handle notification tap → auto-open the conversation ──────────────────
    // Fired by SocketProvider when (a) user clicks an in-app notification or
    // (b) the service worker posts a NOTIFICATION_CLICK message after a push tap.
    const handleOpenConversation = (e: Event) => {
      const { conversationId } = (e as CustomEvent).detail || {};
      if (conversationId) {
        setActiveConversationId(conversationId);
      }
    };
    window.addEventListener('zetime:open_conversation', handleOpenConversation);

    // ── Update sidebar badge without a full re-fetch ───────────────────────────
    const handleNewMessageEvent = (e: Event) => {
      const { conversationId, senderName, preview, timestamp } = (e as CustomEvent).detail || {};
      if (!conversationId) return;
      setConversations(prev => prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          lastMessage: preview || conv.lastMessage,
          timestamp,
          unreadCount: (conv.unreadCount || 0) + 1,
        };
      }));
    };
    window.addEventListener('zetime:new_message', handleNewMessageEvent);

    // ── Telegram-style: Load cached conversations from IndexedDB instantly ──
    getCachedConversations().then(cached => {
      if (cached && cached.length > 0) {
        setConversations(cached);
        setIsLoadingSidebar(false);
        console.log('[Messaging] Loaded', cached.length, 'cached conversations from IndexedDB');
      }
    }).catch(() => {});

    return () => {
      delete (window as any).openCreateGroup;
      window.removeEventListener('zetime:open_conversation', handleOpenConversation);
      window.removeEventListener('zetime:new_message', handleNewMessageEvent);
    };
  }, []);

  // ── Sync Launcher Icon Badge Count ───────────────────────────────────────────
  useEffect(() => {
    let totalUnreadChats = 0;
    for (const c of conversations) {
      totalUnreadChats += (c.unreadCount || 0);
    }
    // Update the capacitor app badge
    updateAppBadge(totalUnreadChats).catch(() => {});
  }, [conversations]);



  // ── Load sidebar data ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    if (typeof window !== 'undefined' && !navigator.onLine) {
      console.log('[Messaging] Offline — using cached conversations');
      setIsLoadingSidebar(false);
      return;
    }
    try {
      const headers = getAuthHeaders();

      const [contactsRes, convRes] = await Promise.all([
        fetch(`${API_URL}/api/users/contacts`, { headers, cache: 'no-store' }),
        fetch(`${API_URL}/api/messages/conversations/${user.id}`, { headers, cache: 'no-store' }),
      ]);

      const contactsData = await contactsRes.json();
      const contacts: any[] = contactsData.data || [];

      const convs = await convRes.json();

      const finalItems: any[] = [];
      const handledUserIds = new Set<string>();

      // Process existing conversations first (most recent first)
      if (Array.isArray(convs)) {
        const sorted = [...convs].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );

        for (const c of sorted) {
          const isGroup = c.isGroup;
          let otherMember: any = null;

          if (!isGroup) {
            otherMember = c.members.find((m: any) => m.userId !== user.id)?.user;
            if (!otherMember) continue; // Skip orphaned conversations

            // De-duplicate: one entry per person (keep most recent)
            if (handledUserIds.has(otherMember.id)) continue;
            handledUserIds.add(otherMember.id);
          }

          finalItems.push({
            id: c.id,
            name: isGroup ? c.name : otherMember?.full_name || 'Unknown',
            avatar: isGroup ? c.avatar : otherMember?.profile_photo || undefined,
            isOnline: false,
            lastMessage: c.messages?.[0]?.content || t("no_messages"),
            timestamp: c.messages?.[0]?.createdAt
              ? formatLocalizedTime(c.messages[0].createdAt, language)
              : '',
            updatedAt: new Date(c.updatedAt || c.createdAt).getTime(),
            unreadCount: 0,
            isGroup,
            memberIds: c.members.map((m: any) => m.userId),
            phone: otherMember?.phone || '',
            role: otherMember?.role || (isGroup ? 'Group' : 'User'),
            realContactId: otherMember?.id || null,
            isNewContact: false,
            lastActive: otherMember?.lastActive,
          });
        }
      }

      // Add directory contacts (no conversation yet)
      for (const contact of contacts) {
        if (contact.id === user.id) continue;
        if (handledUserIds.has(contact.id)) continue;

        finalItems.push({
          id: `contact-${contact.id}`,
          name: contact.full_name,
          avatar: contact.profile_photo || undefined,
          isOnline: false,
          lastMessage: t("tap_to_message").replace("{role}", contact.role),
          timestamp: '',
          updatedAt: 0,
          unreadCount: 0,
          isGroup: false,
          memberIds: [user.id, contact.id],
          phone: contact.phone || '',
          role: contact.role,
          realContactId: contact.id,
          isNewContact: true,
          lastActive: contact.lastActive,
        });

        handledUserIds.add(contact.id);
      }

      // Sort: active chats by recency, directory by name
      const activeChats = finalItems.filter(i => !i.isNewContact);
      const directory = finalItems.filter(i => i.isNewContact);
      activeChats.sort((a, b) => b.updatedAt - a.updatedAt);
      directory.sort((a, b) => a.name.localeCompare(b.name));

      const finalConversations = [...activeChats, ...directory];
      setConversations(finalConversations);

      // ── Telegram-style: persist conversations to IndexedDB for offline ──
      cacheConversations(finalConversations).catch(() => {});
    } catch (error) {
      console.error('[Messaging] Failed to load data:', error);
      toast({ 
        title: t("error"), 
        description: t("load_conv_error"), 
        variant: 'destructive' 
      });
    } finally {
      setIsLoadingSidebar(false);
    }
  }, [user, t, toast, language]);

  useEffect(() => {
    loadData();

    const handleStudentChange = () => {
      setIsLoadingSidebar(true);
      loadData();
    };

    window.addEventListener("studentChanged", handleStudentChange);
    return () => window.removeEventListener("studentChanged", handleStudentChange);
  }, [loadData]);

  // ── Fetch messages for the selected conversation ─────────────────────────────
  const loadMessages = useCallback(async (conversationId: string) => {
    // ── Step 1: Load from IndexedDB cache instantly (if not already in memory) ──
    const hasInMemory = messagesByConversation[conversationId]?.length > 0;
    if (!hasInMemory) {
      try {
        const cached = await getCachedMessages(conversationId);
        if (cached && cached.length > 0) {
          setMessagesByConversation(prev => {
            // Don't overwrite if React state already has messages (e.g. from socket)
            if (prev[conversationId]?.length > 0) return prev;
            return { ...prev, [conversationId]: cached };
          });
          console.log('[Messaging] Loaded', cached.length, 'cached messages for', conversationId);
        }
      } catch {
        // IndexedDB failed — continue to server fetch
      }
    }

    // ── Step 2: Fetch from server in background (if online) ──
    if (typeof window !== 'undefined' && !navigator.onLine) {
      console.log('[Messaging] Offline — using cached messages only');
      return;
    }

    // Only show thin progress bar if we don't have any messages in memory yet
    const shouldShowProgress = !hasInMemory && (!messagesByConversation[conversationId] || messagesByConversation[conversationId].length === 0);
    if (shouldShowProgress) {
      setIsFetchingMessages(true);
    }
    try {
      const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        console.error('[Messaging] Failed to fetch messages', res.status);
        return;
      }

      const data = await res.json();
      const msgs: any[] = data.messages ? data.messages : (Array.isArray(data) ? data : []);
      if (!msgs.length && !Array.isArray(data)) return;

      const formatted = msgs.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender?.full_name || 'Unknown',
        senderAvatar: m.sender?.profile_photo,
        content: m.content,
        timestamp: formatLocalizedTime(m.createdAt, language),
        status: m.readBy && m.readBy.length > 0 ? 'read' : 'sent',
        type: m.type || 'TEXT',
        attachments: m.attachments,
        isMe: m.senderId === userRef.current?.id,
        reactions: m.reactions || [],
        isDeleted: m.isDeleted,
        editedAt: m.editedAt,
        metadata: m.metadata || null,
      }));

      // Store messages keyed by conversationId — never mixed
      setMessagesByConversation(prev => ({ ...prev, [conversationId]: formatted }));

      // ── Persist to IndexedDB for offline access ──
      cacheMessages(conversationId, formatted).catch(() => {});
    } catch (err) {
      console.error('[Messaging] Error loading messages:', err);
    } finally {
      if (shouldShowProgress) {
        setIsFetchingMessages(false);
      }
    }
  }, [messagesByConversation, language]);

  // Re-fetch conversations when network recovers (messages only — no full refetch)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[Messaging] Connection restored. Syncing active conversation...');
      // Only re-fetch messages for the active conversation.
      // The full conversation list is kept fresh by socket events.
      if (activeConversationIdRef.current) {
        loadMessages(activeConversationIdRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadMessages]);

  // ── Offline outbox drain ─────────────────────────────────────────────────────
  // When the socket reconnects, replay any messages that were queued while offline.
  // This is the core of "offline-first" messaging: users can type and send messages
  // even with no connection, and they'll be delivered as soon as connectivity returns.
  useEffect(() => {
    if (!isConnected || !socket || !user) return;

    const drainOutbox = async () => {
      const pending = await getOutboxMessages();
      if (pending.length === 0) return;

      console.log(`[Messaging] Draining ${pending.length} offline message(s) from outbox...`);

      for (const msg of pending) {
        // Re-emit the message via socket — the server's tempId dedup will
        // prevent double-inserts if the message was already persisted.
        socket.emit('send_message', {
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type,
          tempId: msg.tempId,
          replyToId: msg.replyToId,
          attachment: msg.attachment,
        });
        // Remove from outbox immediately — if it fails, the message_error
        // event will add it back with a failed status.
        await removeOutboxMessage(msg.tempId);
      }
    };

    drainOutbox();
  }, [isConnected, socket, user]);

  // ── Select conversation ──────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    async (id: string, chatData: any) => {
      if (!user) return;

      // If new contact without a conversation → create one first
      if (chatData?.isNewContact) {
        try {
          const res = await fetch(`${API_URL}/api/messages/conversations`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              isGroup: false,
              memberIds: [user.id, chatData.realContactId],
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            if (errorData.code === 'SCHOOL_EXPIRED' || errorData.code === 'SCHOOL_SUSPENDED') {
              toast({
                title: t("error"),
                description: t("plan_expired_error"),
                variant: 'destructive'
              });
            } else if (errorData.code === 'FEATURE_RESTRICTED') {
              toast({
                title: t("error"),
                description: t("feature_restricted_error"),
                variant: 'destructive'
              });
            } else {
              toast({ 
                title: t("error"), 
                description: errorData.message || t("start_conv_error"), 
                variant: 'destructive' 
              });
            }
            return;
          }

          const newConv = await res.json();
          const realId = newConv.id;

          // Update sidebar entry with real conversation id
          setConversations(prev =>
            prev.map(c =>
              c.id === id
                ? { ...c, id: realId, isNewContact: false, lastMessage: t("no_messages") }
                : c
            )
          );

          setActiveConversationId(realId);
          setActiveConversationData({ ...chatData, id: realId, isNewContact: false });

          // Initialise empty message list so we don't flash old messages
          setMessagesByConversation(prev => ({ ...prev, [realId]: [] }));

          if (socket && isConnected) {
            socket.emit('join_conversation', realId);
          }
        } catch (err) {
          toast({ 
            title: t("error"), 
            description: t("start_conv_error"), 
            variant: 'destructive' 
          });
        }
        return;
      }

      // --- Open conversation instantly (Telegram-style) ---
      // 1. Pre-seed an empty array immediately so the window renders now
      //    without any skeleton or blank-white-screen delay.
      setMessagesByConversation(prev => {
        if (prev[id]) return prev; // already cached — keep it
        return { ...prev, [id]: [] };
      });

      // 2. Switch active conversation
      setActiveConversationId(id);
      
      let finalChatData = chatData;
      if (chatData?.isGroup) {
        try {
          const res = await fetch(`${API_URL}/api/groups/${id}`, { headers: getAuthHeaders() });
          if (res.ok) {
            finalChatData = await res.json();
          }
        } catch (err) {
          console.error('Failed to fetch full group data:', err);
        }
      }
      setActiveConversationData(finalChatData);

      // 2. Join the socket room for this conversation
      if (socket && isConnected) {
        socket.emit('join_conversation', id);
      }

      // 3. Load messages for this specific conversation
      await loadMessages(id);
    },
    [user, socket, isConnected, loadMessages, t, toast]
  );

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!activeConversationId) return;
    try {
      const res = await fetch(`${API_URL}/api/groups/${activeConversationId}/members/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        // Refresh group data
        const groupRes = await fetch(`${API_URL}/api/groups/${activeConversationId}`, { headers: getAuthHeaders() });
        const data = await groupRes.json();
        setActiveConversationData(data);
        notifications.success("Success", "Member role updated");
      } else {
        const errorData = await res.json();
        notifications.error("Error", errorData.message || "Failed to update role");
      }
    } catch (err: any) {
      console.error('Failed to update role:', err);
      notifications.error("Error", err.message || "An error occurred");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeConversationId) return;
    try {
      const res = await fetch(`${API_URL}/api/groups/${activeConversationId}/members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        // Refresh group data
        const groupRes = await fetch(`${API_URL}/api/groups/${activeConversationId}`, { headers: getAuthHeaders() });
        const data = await groupRes.json();
        setActiveConversationData(data);
        notifications.success("Success", "Member removed from group");
      } else {
        const errorData = await res.json();
        notifications.error("Error", errorData.message || "Failed to remove member");
      }
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      notifications.error("Error", err.message || "An error occurred");
    }
  };

  const handleForwardTo = async (targetConvId: string) => {
    if (!forwardDialogData || !user) return;
    const { singleMessage, messageIds } = forwardDialogData;

    const msgsToForward = [];
    if (singleMessage) {
      msgsToForward.push(singleMessage);
    } else if (messageIds && activeConversationId) {
      const allMsgs = messagesByConversation[activeConversationId] || [];
      const selected = allMsgs.filter(m => messageIds.includes(m.id));
      msgsToForward.push(...selected);
    }

    if (msgsToForward.length === 0) {
      setForwardDialogData(null);
      return;
    }

    try {
      for (const msg of msgsToForward) {
        if (targetConvId === 'saved-messages') {
          // Forwarding directly to Saved Messages
          await fetch(`${API_URL}/api/saved-messages/messages`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              content: msg.content,
              type: msg.type || 'TEXT',
              attachment: msg.attachments?.[0],
              forwardedFromId: msg.id,
            }),
          });
        } else {
          // Forwarding to another normal active conversation via WebSocket
          if (socket && isConnected) {
            socket.emit('send_message', {
              conversationId: targetConvId,
              senderId: user.id,
              content: msg.content,
              type: msg.type || 'TEXT',
              attachment: msg.attachments?.[0],
            });
          }
        }
      }
      notifications.success("Success", `Forwarded ${msgsToForward.length} message(s)`);
    } catch (err) {
      toast({
        title: t("error"),
        description: "Failed to forward message(s)",
        variant: 'destructive',
      });
    } finally {
      setForwardDialogData(null);
    }
  };

  const handleAction = async (action: string, data: any) => {
    if (!socket || !isConnected) return;
    
    switch (action) {
      case 'edit':
        socket.emit('edit_message', { ...data, conversationId: activeConversationId });
        break;
      case 'delete': {
        // Optimistic local update: mark as deleted immediately
        const delId = data.messageId;
        setMessagesByConversation(prev => {
          const msgs = prev[activeConversationId!];
          if (!msgs) return prev;
          return { ...prev, [activeConversationId!]: msgs.map(m => m.id === delId ? { ...m, isDeleted: true, content: null } : m) };
        });
        socket.emit('delete_message', { messageId: delId, conversationId: activeConversationId });
        break;
      }
      case 'pin': {
        const messageId = data.messageId;
        const isPinned = data.isPinned;
        // Optimistic local update
        setPinnedByConversation(prev => {
          if (isPinned) {
            // Unpin optimistically
            const next = { ...prev };
            if (next[activeConversationId!]?.messageId === messageId) delete next[activeConversationId!];
            return next;
          } else {
            return { ...prev, [activeConversationId!]: { messageId, content: data.content, senderName: data.senderName, type: data.type } };
          }
        });
        socket.emit('pin_message', { messageId, conversationId: activeConversationId });
        break;
      }
      case 'react':
        socket.emit('toggle_reaction', { ...data, conversationId: activeConversationId, userId: user?.id });
        break;
      case 'forward':
        setForwardDialogData({ singleMessage: data.message });
        break;
      case 'forward_selected':
        setForwardDialogData({ messageIds: data.messageIds });
        break;
      case 'cancel_upload': {
        const msgId = data.messageId;
        setMessagesByConversation(prev => {
          const msgs = prev[activeConversationId!];
          if (!msgs) return prev;
          return {
            ...prev,
            [activeConversationId!]: msgs.filter(m => m.id !== msgId)
          };
        });
        break;
      }
      case 'upload_failed': {
        const msgId = data.messageId;
        setMessagesByConversation(prev => {
          const msgs = prev[activeConversationId!];
          if (!msgs) return prev;
          return {
            ...prev,
            [activeConversationId!]: msgs.map(m => m.id === msgId ? { ...m, status: 'failed' } : m)
          };
        });
        break;
      }
      case 'upload_retry_start': {
        const msgId = data.messageId;
        setMessagesByConversation(prev => {
          const msgs = prev[activeConversationId!];
          if (!msgs) return prev;
          return {
            ...prev,
            [activeConversationId!]: msgs.map(m => m.id === msgId ? { ...m, status: 'sending' } : m)
          };
        });
        break;
      }
    }
  };

  // Sync activeConversationData when conversations list updates (for real-time presence)
  useEffect(() => {
    if (activeConversationId) {
      const updated = conversations.find(c => c.id === activeConversationId);
      if (updated) {
        setActiveConversationData(updated);
      }
    }
  }, [conversations, activeConversationId]);

  // ── Mark messages as read (BATCHED) ────────────────────────────────────────
  // Old: N socket events for N unread messages = N DB upserts.
  // New: ONE event with all unread message IDs = ONE batch transaction.
  // This reduces socket + DB load by up to 50x on busy conversations.
  const markMessagesAsRead = useCallback((conversationId: string, msgs: any[]) => {
    if (!socket || !isConnected || !user) return;

    const unreadIds = msgs
      .filter(m => !m.isMe && m.status !== 'read')
      .map(m => m.id)
      // Only mark real IDs (not temp-* optimistic IDs)
      .filter(id => !id.startsWith('temp-'));

    if (unreadIds.length === 0) return;

    // Single batched event to the server
    socket.emit('mark_conversation_read', {
      conversationId,
      userId: user.id,
      messageIds: unreadIds,
    });

    // Optimistic local update
    setMessagesByConversation(prev => ({
      ...prev,
      [conversationId]: prev[conversationId].map(m =>
        !m.isMe && m.status !== 'read' ? { ...m, status: 'read' } : m
      ),
    }));
  }, [socket, isConnected, user]);

  useEffect(() => {
    if (activeConversationId) {
      const msgs = messagesByConversation[activeConversationId];
      if (msgs) {
        markMessagesAsRead(activeConversationId, msgs);
      }
    }
  }, [activeConversationId, messagesByConversation, markMessagesAsRead]);

  // ── Socket: authenticate + listen for new messages ────────────────────────
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const token = localStorage.getItem('attendance_token');
    socket.emit('authenticate', { token });

    const handleNewMessage = (message: any) => {
      const convId: string = message.conversationId;
      const currentUser = userRef.current;

      const formatted = {
        id: message.id || Date.now().toString(),
        senderId: message.senderId,
        senderName: message.sender?.full_name || 'Unknown',
        content: message.content,
        timestamp: formatLocalizedTime(message.createdAt || new Date(), language),
        status: 'sent',
        type: message.type || 'TEXT',
        attachments: message.attachments,
        isMe: message.senderId === currentUser?.id,
        tempId: message.tempId,
        metadata: message.metadata || null,
      };

      // Append ONLY to the correct conversation bucket
      setMessagesByConversation(prev => {
        const existing = prev[convId] || [];
        
        // If we find a message with the same tempId, it means this is the confirmation of our optimistic message
        if (formatted.tempId) {
          const index = existing.findIndex(m => m.id === formatted.tempId);
          if (index !== -1) {
            const updated = [...existing];
            updated[index] = { ...formatted };
            // Also update in IndexedDB cache
            cacheMessages(convId, updated).catch(() => {});
            return { ...prev, [convId]: updated };
          }
        }

        // Deduplicate by id
        if (existing.some(m => m.id === formatted.id)) return prev;

        // ── Persist new message to IndexedDB for offline access ──
        appendCachedMessage(convId, formatted).catch(() => {});

        return { ...prev, [convId]: [...existing, formatted] };
      });

      // Update sidebar last-message preview and re-sort (most recent at top, like Telegram)
      setConversations(prev => {
        const nowTs = Date.now();
        const updated = prev.map(c =>
          c.id === convId
            ? {
                ...c,
                lastMessage: message.content,
                timestamp: t("just_now"),
                updatedAt: nowTs,
                unreadCount:
                  convId !== activeConversationIdRef.current
                    ? (c.unreadCount || 0) + 1
                    : 0,
              }
            : c
        );

        // Separate and re-sort: active chats by recency, directory contacts stay at bottom
        const activeChats = updated.filter(c => !c.isNewContact).sort((a, b) => b.updatedAt - a.updatedAt);
        const directory = updated.filter(c => c.isNewContact);
        return [...activeChats, ...directory];
      });
    };

    const handleMessageRead = (data: { messageId: string; userId: string; conversationId: string }) => {
      const { messageId, conversationId } = data;
      setMessagesByConversation(prev => {
        const msgs = prev[conversationId];
        if (!msgs) return prev;
        // Update IndexedDB cache too
        updateCachedMessage(conversationId, messageId, m => ({ ...m, status: 'read' })).catch(() => {});
        return {
          ...prev,
          [conversationId]: msgs.map(m => m.id === messageId ? { ...m, status: 'read' } : m)
        };
      });
    };

    const handleInitialOnlineUsers = (userIds: string[]) => {
      setConversations(prev => prev.map(c => ({
        ...c,
        isOnline: !c.isGroup && c.memberIds?.some((id: string) => id !== userRef.current?.id && userIds.includes(id))
      })));
    };

    const handleUserOnline = (userId: string) => {
      setConversations(prev => prev.map(c => 
        !c.isGroup && c.memberIds?.includes(userId) ? { ...c, isOnline: true } : c
      ));
    };

    const handleUserOffline = (userId: string) => {
      setConversations(prev => prev.map(c => 
        !c.isGroup && c.memberIds?.includes(userId) ? { ...c, isOnline: false, lastActive: new Date() } : c
      ));
    };

    const handleMessageEdited = (data: { messageId: string, content: string, conversationId: string }) => {
      setMessagesByConversation(prev => {
        const msgs = prev[data.conversationId];
        if (!msgs) return prev;
        // Update IndexedDB cache
        updateCachedMessage(data.conversationId, data.messageId, m => ({ ...m, content: data.content, editedAt: new Date() })).catch(() => {});
        return {
          ...prev,
          [data.conversationId]: msgs.map(m => m.id === data.messageId ? { ...m, content: data.content, editedAt: new Date() } : m)
        };
      });
    };

    const handleMessageDeleted = (data: { messageId: string, conversationId: string }) => {
      setMessagesByConversation(prev => {
        const msgs = prev[data.conversationId];
        if (!msgs) return prev;
        // Update IndexedDB cache
        updateCachedMessage(data.conversationId, data.messageId, m => ({ ...m, isDeleted: true, content: null })).catch(() => {});
        return {
          ...prev,
          [data.conversationId]: msgs.map(m => m.id === data.messageId ? { ...m, isDeleted: true, content: null } : m)
        };
      });
    };

    const handleMessagePinned = (data: { messageId: string; conversationId: string; isPinned: boolean; messageContent?: string; senderName?: string; messageType?: string }) => {
      setPinnedByConversation(prev => {
        if (!data.isPinned) {
          const next = { ...prev };
          // Only remove if it's the message being unpinned
          if (next[data.conversationId]?.messageId === data.messageId) {
            delete next[data.conversationId];
          }
          return next;
        }
        return {
          ...prev,
          [data.conversationId]: {
            messageId: data.messageId,
            content: data.messageContent,
            senderName: data.senderName,
            type: data.messageType,
          },
        };
      });
      // Also update the isPinned flag on the message in state
      setMessagesByConversation(prev => {
        const msgs = prev[data.conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [data.conversationId]: msgs.map(m =>
            m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m
          ),
        };
      });
    };

    const handleReactionUpdated = (data: { messageId: string, emoji: string, userId: string, action: 'added' | 'removed', conversationId: string }) => {
      setMessagesByConversation(prev => {
        const msgs = prev[data.conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [data.conversationId]: msgs.map(m => {
            if (m.id !== data.messageId) return m;
            const existing = m.reactions || [];
            const updated = data.action === 'added' 
              ? [...existing, { emoji: data.emoji, userId: data.userId }]
              : existing.filter((r: any) => !(r.emoji === data.emoji && r.userId === data.userId));
            return { ...m, reactions: updated };
          })
        };
      });
    };

    // ── message_sent: server ACK — swap temp ID for real DB ID, status: sending→sent
    const handleMessageSent = (data: { tempId: string; messageId: string }) => {
      if (!data.tempId || !data.messageId) return;
      setMessagesByConversation(prev => {
        const updated: Record<string, any[]> = {};
        for (const [convId, msgs] of Object.entries(prev)) {
          updated[convId] = msgs.map(m =>
            m.id === data.tempId
              ? { ...m, id: data.messageId, status: 'sent' }
              : m
          );
        }
        return updated;
      });
    };

    // ── messages_delivered: recipient opened conversation — mark as delivered
    const handleMessagesDelivered = (data: { conversationId: string; userId: string; messageIds: string[] }) => {
      if (!data.messageIds?.length) return;
      const idSet = new Set(data.messageIds);
      setMessagesByConversation(prev => {
        const msgs = prev[data.conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [data.conversationId]: msgs.map(m =>
            idSet.has(m.id) && m.isMe && m.status === 'sent'
              ? { ...m, status: 'delivered' }
              : m
          ),
        };
      });
    };

    // ── messages_read (batch): all messages read at once — one sweep
    const handleMessagesRead = (data: { conversationId: string; userId: string; messageIds: string[] }) => {
      if (!data.messageIds?.length) return;
      const idSet = new Set(data.messageIds);
      setMessagesByConversation(prev => {
        const msgs = prev[data.conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [data.conversationId]: msgs.map(m =>
            idSet.has(m.id) && m.isMe ? { ...m, status: 'read' } : m
          ),
        };
      });
    };

    const handleMessageError = (data: { message: string; code?: string; tempId?: string }) => {
      // Mark the optimistic message as failed
      if (data.tempId) {
        setMessagesByConversation(prev => {
          const updated: Record<string, any[]> = {};
          for (const [convId, msgs] of Object.entries(prev)) {
            updated[convId] = msgs.map(m =>
              m.id === data.tempId ? { ...m, status: 'failed' } : m
            );
          }
          return updated;
        });
      }
      toast({
        title: t("error"),
        description: data.code === 'SCHOOL_EXPIRED' ? t("plan_expired_error") : data.message,
        variant: 'destructive',
      });
    };

    const handleUserTyping = (data: { userId: string, full_name: string, conversationId: string }) => {
      if (data.userId === userRef.current?.id) return;
      setTypingUsers(prev => ({
        ...prev,
        [data.conversationId]: `${data.full_name} ${(t as any)("is_typing")}...`
      }));
    };


    const handleUserStopTyping = (data: { userId: string, conversationId: string }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[data.conversationId];
        return next;
      });
    };

    socket.on('message_pinned', handleMessagePinned);
    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('message_sent', handleMessageSent);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('messages_read', handleMessagesRead);
    socket.on('initial_online_users', handleInitialOnlineUsers);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('message_error', handleMessageError);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('message_pinned', handleMessagePinned);
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('message_sent', handleMessageSent);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('messages_read', handleMessagesRead);
      socket.off('initial_online_users', handleInitialOnlineUsers);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('message_error', handleMessageError);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [socket, isConnected, user]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    (content: string, options?: {
      type?: string;
      attachment?: any;
      replyToId?: string;
      isOptimistic?: boolean;
      tempId?: string;
      replaceTempId?: string;
    }) => {
      if (!activeConversationId || !user) return;

      // Case A: Upload finished — swap local-preview bubble with real attachment
      if (options?.replaceTempId) {
        const realTempId = options.replaceTempId;
        const updatedMessage = {
          id: realTempId,
          senderId: user.id,
          senderName: user.full_name || 'Me',
          content,
          timestamp: formatLocalizedTime(new Date(), language),
          status: 'sending' as const,
          type: options?.type || 'FILE',
          attachments: options?.attachment ? [options.attachment] : undefined,
          isMe: true,
        };
        setMessagesByConversation(prev => ({
          ...prev,
          [activeConversationId]: (prev[activeConversationId] || []).map(m =>
            m.id === realTempId ? updatedMessage : m
          ),
        }));
        if (!socket || !isConnected) return;
        socket.emit('send_message', {
          conversationId: activeConversationId,
          senderId: user.id,
          content,
          type: options?.type || 'FILE',
          attachment: options?.attachment,
          replyToId: options?.replyToId,
          tempId: realTempId,
        });
        return;
      }

      // Case B: Add new optimistic message
      const tempId = options?.tempId || `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        senderId: user.id,
        senderName: user.full_name || 'Me',
        content,
        timestamp: formatLocalizedTime(new Date(), language),
        status: 'sending' as const,
        type: options?.type || 'TEXT',
        attachments: options?.attachment ? [options.attachment] : undefined,
        isMe: true,
      };
      setMessagesByConversation(prev => ({
        ...prev,
        [activeConversationId]: [...(prev[activeConversationId] || []), optimisticMessage],
      }));

      // Update sidebar preview and bubble to top (even before server confirms)
      setConversations(prev => {
        const nowTs = Date.now();
        const updated = prev.map(c =>
          c.id === activeConversationId
            ? { ...c, lastMessage: content, timestamp: formatLocalizedTime(new Date(), language), updatedAt: nowTs }
            : c
        );
        const activeChats = updated.filter(c => !c.isNewContact).sort((a, b) => b.updatedAt - a.updatedAt);
        const directory = updated.filter(c => c.isNewContact);
        return [...activeChats, ...directory];
      });

      // isOptimistic = local preview only, don't emit to socket yet
      if (options?.isOptimistic) return;

      // Case C: Send via socket if connected, otherwise queue to offline outbox
      if (socket && isConnected) {
        socket.emit('send_message', {
          conversationId: activeConversationId,
          senderId: user.id,
          content,
          type: options?.type || 'TEXT',
          attachment: options?.attachment,
          replyToId: options?.replyToId,
          tempId,
        });
      } else {
        // Offline-first: persist to outbox so the message survives disconnections.
        // The outbox drain effect will re-emit this when the socket reconnects.
        enqueueOutboxMessage({
          tempId,
          conversationId: activeConversationId,
          senderId: user.id,
          content,
          type: options?.type || 'TEXT',
          attachment: options?.attachment,
          replyToId: options?.replyToId,
          createdAt: Date.now(),
          retries: 0,
        }).catch(() => {});
        console.log('[Messaging] Offline — message queued to outbox:', tempId);
      }
    },
    [socket, isConnected, activeConversationId, user, language]
  );

  // ── Derive the messages to display for the active conversation ───────────────
  const currentMessages = activeConversationId
    ? messagesByConversation[activeConversationId] || []
    : [];

  return (
    <div className="h-full relative overflow-hidden">
      <ChatLayout
        showContentOnMobile={!!activeConversationId || showSavedMessages}
        sidebar={
          <ChatSidebar
            conversations={conversations}
            activeConversationId={showSavedMessages ? 'saved-messages' : (activeConversationId || undefined)}
            onSelectConversation={id => {
              setShowSavedMessages(false);
              const chat = conversations.find(c => c.id === id);
              handleSelectConversation(id, chat);
            }}
            onOpenSavedMessages={() => {
              setShowSavedMessages(true);
              setActiveConversationId(null);
              setActiveConversationData(null);
              setIsInfoPanelOpen(false);
            }}
            isLoading={isLoadingSidebar || !user}
            currentUser={user}
          />
        }
        content={
          <div className="flex h-full overflow-hidden">
            {showSavedMessages ? (
              <SavedMessagesPanel
                onClose={() => setShowSavedMessages(false)}
              />
            ) : (
              <>
                <ChatWindow
                  activeConversation={activeConversationData}
                  messages={currentMessages}
                  typingStatus={activeConversationId ? typingUsers[activeConversationId] : undefined}
                  onSendMessage={handleSendMessage}
                  isLoading={isFetchingMessages}
                  onBack={() => {
                    setActiveConversationId(null);
                    setActiveConversationData(null);
                  }}
                  onToggleInfo={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
                  onAction={handleAction}
                  pinnedMessage={activeConversationId ? pinnedByConversation[activeConversationId] : undefined}
                />
                {isInfoPanelOpen && activeConversationData?.isGroup && (
                  <GroupInfoPanel 
                    group={activeConversationData}
                    currentUser={user}
                    onClose={() => setIsInfoPanelOpen(false)}
                    onUpdateRole={handleUpdateRole}
                    onRemoveMember={handleRemoveMember}
                  />
                )}
                {isInfoPanelOpen && !activeConversationData?.isGroup && (
                  <UserInfoPanel 
                    user={activeConversationData}
                    currentUser={user}
                    onClose={() => setIsInfoPanelOpen(false)}
                    onAction={handleAction}
                  />
                )}
              </>
            )}
          </div>
        }
      />

      <CreateGroupModal 
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreated={(group) => {
          setConversations(prev => [group, ...prev]);
          handleSelectConversation(group.id, group);
        }}
        currentUser={user}
      />

      {/* Target Conversation Selector Modal for Forwarding */}
      <AnimatePresence>
        {forwardDialogData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForwardDialogData(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative z-10 flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <span className="font-bold text-lg tracking-tight text-foreground">Forward Message</span>
                <Button variant="ghost" size="icon" onClick={() => setForwardDialogData(null)} className="h-8 w-8 rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {/* Pinned Saved Messages option */}
                <button
                  onClick={() => handleForwardTo('saved-messages')}
                  className="w-full flex items-center gap-3.5 p-3 rounded-2xl transition-colors hover:bg-emerald-600/10 hover:text-emerald-700 active:scale-[98] text-left group"
                >
                  <div className="h-11 w-11 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Bookmark className="h-5 w-5 text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground group-hover:text-emerald-750 transition-colors">Saved Messages</p>
                    <p className="text-xs text-muted-foreground/60">Forward to your private notes</p>
                  </div>
                </button>

                <div className="h-px bg-border/40 mx-2 my-1" />

                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleForwardTo(conv.id)}
                    className="w-full flex items-center gap-3.5 p-3 rounded-2xl transition-colors hover:bg-secondary active:scale-[98] text-left"
                  >
                    <Avatar className="h-11 w-11 border border-border/20">
                      <AvatarImage src={conv.avatar || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {conv.name?.slice(0, 2)?.toUpperCase() || 'CH'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{conv.name}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">
                        {conv.isGroup ? `${conv.members?.length || 0} members` : conv.role || 'Chat'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
