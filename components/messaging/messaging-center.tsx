'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatLayout } from '@/components/messaging/chat-layout';
import { ChatSidebar } from '@/components/messaging/chat-sidebar';
import { ChatWindow } from '@/components/messaging/chat-window';
import { useSocket } from '@/components/providers/socket-provider';
import { authService } from '@/lib/auth/auth';
import { useToast } from '@/hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function MessagingCenter() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationData, setActiveConversationData] = useState<any>(null);
  
  // KEY: messages are stored per-conversation, never mixed
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, any[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);

  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Use a ref so the socket handler always sees the latest activeConversationId
  // This solves the stale closure problem that caused message mixing
  const activeConversationIdRef = useRef<string | null>(null);
  const userRef = useRef<any>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  // ── Load sidebar data ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
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
            lastMessage: c.messages?.[0]?.content || 'Start a conversation',
            timestamp: c.messages?.[0]?.createdAt
              ? new Date(c.messages[0].createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
            updatedAt: new Date(c.updatedAt || c.createdAt).getTime(),
            unreadCount: 0,
            isGroup,
            memberIds: c.members.map((m: any) => m.userId),
            phone: otherMember?.phone || '',
            role: otherMember?.role || (isGroup ? 'Group' : 'User'),
            realContactId: otherMember?.id || null,
            isNewContact: false,
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
          lastMessage: `Tap to message this ${contact.role}`,
          timestamp: '',
          updatedAt: 0,
          unreadCount: 0,
          isGroup: false,
          memberIds: [user.id, contact.id],
          phone: contact.phone || '',
          role: contact.role,
          realContactId: contact.id,
          isNewContact: true,
        });

        handledUserIds.add(contact.id);
      }

      // Sort: active chats by recency, directory by name
      const activeChats = finalItems.filter(i => !i.isNewContact);
      const directory = finalItems.filter(i => i.isNewContact);
      activeChats.sort((a, b) => b.updatedAt - a.updatedAt);
      directory.sort((a, b) => a.name.localeCompare(b.name));

      setConversations([...activeChats, ...directory]);
    } catch (error) {
      console.error('[Messaging] Failed to load data:', error);
      toast({ title: 'Error', description: 'Could not load conversations', variant: 'destructive' });
    } finally {
      setIsLoadingSidebar(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Fetch messages for the selected conversation ─────────────────────────────
  const loadMessages = useCallback(async (conversationId: string) => {
    // If already cached, use cache instantly
    if (messagesByConversation[conversationId]) return;

    setIsLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        console.error('[Messaging] Failed to fetch messages', res.status);
        return;
      }

      const msgs: any[] = await res.json();
      if (!Array.isArray(msgs)) return;

      const formatted = msgs.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender?.full_name || 'Unknown',
        content: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'read',
        type: m.type || 'TEXT',
        attachments: m.attachments,
        isMe: m.senderId === userRef.current?.id,
      }));

      // Store messages keyed by conversationId — never mixed
      setMessagesByConversation(prev => ({ ...prev, [conversationId]: formatted }));
    } catch (err) {
      console.error('[Messaging] Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [messagesByConversation]);

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

          if (!res.ok) throw new Error('Failed to create conversation');

          const newConv = await res.json();
          const realId = newConv.id;

          // Update sidebar entry with real conversation id
          setConversations(prev =>
            prev.map(c =>
              c.id === id
                ? { ...c, id: realId, isNewContact: false, lastMessage: 'Start a conversation' }
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
          toast({ title: 'Error', description: 'Could not start conversation', variant: 'destructive' });
        }
        return;
      }

      // --- CORE FIX: switch conversations atomically ---
      // 1. Switch active conversation FIRST (clears the window immediately)
      setActiveConversationId(id);
      setActiveConversationData(chatData);

      // 2. Join the socket room for this conversation
      if (socket && isConnected) {
        socket.emit('join_conversation', id);
      }

      // 3. Load messages for this specific conversation
      await loadMessages(id);
    },
    [user, socket, isConnected, loadMessages]
  );

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
        timestamp: new Date(message.createdAt || new Date()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'delivered',
        type: message.type || 'TEXT',
        attachments: message.attachments,
        isMe: message.senderId === currentUser?.id,
      };

      // Append ONLY to the correct conversation bucket
      setMessagesByConversation(prev => {
        const existing = prev[convId] || [];
        // Deduplicate by id
        if (existing.some(m => m.id === formatted.id)) return prev;
        return { ...prev, [convId]: [...existing, formatted] };
      });

      // Update sidebar last-message preview
      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? {
                ...c,
                lastMessage: message.content,
                timestamp: 'Just now',
                updatedAt: Date.now(),
                unreadCount:
                  convId !== activeConversationIdRef.current
                    ? (c.unreadCount || 0) + 1
                    : 0,
              }
            : c
        )
      );
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, isConnected, user]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    (content: string, options?: { type: string; attachment?: any }) => {
      if (!socket || !isConnected || !activeConversationId || !user) return;

      const messageData = {
        conversationId: activeConversationId,
        senderId: user.id,
        content,
        type: options?.type || 'TEXT',
        attachment: options?.attachment,
      };

      socket.emit('send_message', messageData);
    },
    [socket, isConnected, activeConversationId, user]
  );

  // ── Derive the messages to display for the active conversation ───────────────
  const currentMessages = activeConversationId
    ? messagesByConversation[activeConversationId] || []
    : [];

  return (
    <div className="h-full">
      <ChatLayout
        sidebar={
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId || undefined}
            onSelectConversation={id => {
              const chat = conversations.find(c => c.id === id);
              handleSelectConversation(id, chat);
            }}
            isLoading={isLoadingSidebar}
          />
        }
        content={
          <ChatWindow
            activeConversation={activeConversationData}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingMessages}
            onBack={() => {
              setActiveConversationId(null);
              setActiveConversationData(null);
            }}
          />
        }
      />
    </div>
  );
}
