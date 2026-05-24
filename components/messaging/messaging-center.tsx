'use client';

import React, { useState, useEffect } from 'react';
import { ChatLayout } from '@/components/messaging/chat-layout';
import { ChatSidebar } from '@/components/messaging/chat-sidebar';
import { ChatWindow } from '@/components/messaging/chat-window';
import { useSocket } from '@/components/providers/socket-provider';
import { authService } from '@/lib/auth/auth';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function MessagingCenter() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationData, setActiveConversationData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Fetch all contacts for this school explicitly (Parents, Teachers, Admins)
      const sid = user.schoolId || user.school_id || '';
      const contactsRes = await fetch(`${API_URL}/api/users/contacts`, {
        headers: { 'x-school-id': sid },
        cache: 'no-store'
      });
      const contactsData = await contactsRes.json();
      const contacts = contactsData.data || [];

      // 2. Fetch existing conversations
      const convRes = await fetch(`${API_URL}/api/messages/conversations/${user.id}`, { cache: 'no-store' });
      const convs = await convRes.json();

      // 3. Process existing conversations (Groups and 1:1)
      const finalItems: any[] = [];
      const handledUserIds = new Set();

      if (Array.isArray(convs)) {
        // Sort conversations by most recent message/update first
        const sortedConvs = [...convs].sort((a, b) => 
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );

        for (const c of sortedConvs) {
          const isGroup = c.isGroup;
          let otherMember = null;
          
          if (!isGroup) {
            otherMember = c.members.find((m: any) => m.userId !== user.id)?.user;
            if (otherMember) {
              const cleanPhone = otherMember.phone ? otherMember.phone.replace(/\s+/g, '') : null;
              
              // De-duplicate: If we already have a more recent 1:1 with this person, skip
              if (handledUserIds.has(otherMember.id)) continue;
              
              handledUserIds.add(otherMember.id);
            }
          }

          finalItems.push({
            id: c.id,
            name: isGroup ? c.name : (otherMember?.full_name || 'Unknown'),
            avatar: isGroup ? c.avatar : (otherMember?.profile_photo || undefined),
            isOnline: false,
            lastMessage: c.messages?.[0]?.content || 'Start a new conversation',
            timestamp: c.messages?.[0]?.createdAt ? new Date(c.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            updatedAt: new Date(c.updatedAt || c.createdAt).getTime(),
            unreadCount: 0, 
            isGroup,
            memberIds: c.members.map((m: any) => m.userId),
            phone: otherMember?.phone || '',
            role: otherMember?.role || (isGroup ? 'Group' : 'User'),
            realContactId: otherMember?.id || null,
            isNewContact: false
          });
        }
      }

      // 4. Group all remaining school directory members
      for (const contact of contacts) {
        if (contact.id === user.id) continue;
        
        // Skip users we already have an active conversation with
        if (handledUserIds.has(contact.id)) continue;

        finalItems.push({
          id: `contact-${contact.id}`,
          name: contact.full_name,
          avatar: contact.profile_photo || undefined,
          isOnline: false,
          lastMessage: `Send a message to this ${contact.role}`,
          timestamp: '',
          updatedAt: 0, // Directory users go below active conversations
          unreadCount: 0,
          isGroup: false,
          memberIds: [user.id, contact.id],
          phone: contact.phone || '',
          role: contact.role,
          realContactId: contact.id,
          isNewContact: true
        });

        // Mark as handled to prevent duplication within directory
        handledUserIds.add(contact.id);
      }

      // 5. Final Sort (Telegram Style): 
      // Most recent active conversations first, then Alphabetical Directory
      finalItems.sort((a, b) => {
        if (a.isNewContact !== b.isNewContact) {
            return a.isNewContact ? 1 : -1;
        }
        if (!a.isNewContact) {
            return b.updatedAt - a.updatedAt;
        }
        return a.name.localeCompare(b.name);
      });

      setConversations(finalItems);
    } catch (error) {
      console.error('Failed to load messaging data', error);
      toast({ title: 'Error', description: 'Could not load messaging data', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSelectConversation = async (id: string, chatData: any) => {
    if (!user) return;
    
    // If it's a new contact without conversation, we create the conversation first
    if (chatData?.isNewContact) {
      try {
        const res = await fetch(`${API_URL}/api/messages/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isGroup: false,
            memberIds: [user.id, chatData.realContactId]
          })
        });
        const newConv = await res.json();
        setActiveConversationId(newConv.id);
        setActiveConversationData({ ...chatData, id: newConv.id, isNewContact: false });
        
        // Reload list to align real IDs
        loadData();
      } catch (err) {
        toast({ title: 'Error', description: 'Could not start conversation', variant: 'destructive' });
      }
    } else {
      setActiveConversationId(id);
      setActiveConversationData(chatData);
    }
  };

  useEffect(() => {
    if (activeConversationId && activeConversationData) {
      // Fetch messages for this conversation
      fetch(`${API_URL}/api/messages/${activeConversationId}`)
        .then(r => r.json())
        .then(msgs => {
          if (Array.isArray(msgs)) {
            const formatted = msgs.map(m => ({
              id: m.id,
              senderId: m.senderId,
              senderName: m.sender?.full_name || 'Unknown',
              content: m.content,
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'read',
              type: m.type,
              isMe: m.senderId === user?.id
            }));
            setMessages(formatted);
          }
        });

      if (socket && isConnected) {
        socket.emit('join_conversation', activeConversationId);
      }
    }
  }, [activeConversationId, socket, isConnected, user]);

  useEffect(() => {
    if (socket && isConnected && user) {
      socket.emit('authenticate', user.id);

      socket.on('new_message', (message) => {
        if (message.conversationId === activeConversationId) {
          setMessages((prev) => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, { 
              ...message, 
              isMe: message.senderId === user.id,
              timestamp: new Date(message.createdAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }];
          });
        }
        
        // Update last message in sidebar
        setConversations((prev) => prev.map(c => 
          c.id === message.conversationId 
            ? { ...c, lastMessage: message.content, timestamp: 'Just now' } 
            : c
        ));
      });
    }

    return () => {
      if (socket) socket.off('new_message');
    };
  }, [socket, isConnected, user, activeConversationId]);

  const handleSendMessage = (content: string, options?: { type: string; attachmentUrl?: string }) => {
    if (socket && isConnected && activeConversationId && user) {
      const messageData = {
        conversationId: activeConversationId,
        senderId: user.id,
        content,
        type: options?.type || 'TEXT',
        attachment: options?.attachmentUrl ? {
          url: options.attachmentUrl,
          name: content,
          type: options.type,
          size: 0,
        } : undefined
      };

      const newMessage = {
        id: Date.now().toString(),
        ...messageData,
        senderName: user.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        isMe: true,
      };
      
      // Remove optimistic update to prevent duplication on echo
      // setMessages((prev) => [...prev, newMessage]);
      socket.emit('send_message', messageData);
    }
  };

  return (
    <div className="h-full">
      <ChatLayout
        sidebar={
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId || undefined}
            onSelectConversation={(id) => {
              const chat = conversations.find(c => c.id === id);
              handleSelectConversation(id, chat);
            }}
          />
        }
        content={
          <ChatWindow
            activeConversation={activeConversationData}
            messages={messages}
            onSendMessage={handleSendMessage}
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
