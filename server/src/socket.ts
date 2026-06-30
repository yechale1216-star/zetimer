import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendPushNotification, sendCallNotification, sendCallCancellation, sendMessageNotification } from './services/notification.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';

// ── School subscription status cache ────────────────────────────────────────
const schoolStatusCache = new Map<string, { status: string; expires: number }>();
const SCHOOL_CACHE_TTL = 5 * 60 * 1000;

// ── Conversation membership cache ────────────────────────────────────────────
const convMemberCache = new Map<string, { memberIds: string[]; expires: number }>();
const CONV_CACHE_TTL = 60 * 1000;

// ── Recent message tempId deduplication window ───────────────────────────────
const recentTempIds = new Map<string, { messageId: string; expires: number }>();
const TEMPID_TTL = 60 * 1000;

function cleanupTempIds() {
  const now = Date.now();
  for (const [key, val] of recentTempIds) {
    if (val.expires < now) recentTempIds.delete(key);
  }
}

export const activeCalls = new Map<string, {
  callId: string;
  from: string;
  to: string;
  offer: any;
  type: string;
  profile: any;
  timestamp: number;
}>();

export const userSockets = new Map<string, string>();
export let ioInstance: SocketIOServer | null = null;
export const getIO = () => ioInstance;

// Clean up expired calls (older than 45 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [callId, call] of activeCalls.entries()) {
    if (now - call.timestamp > 45000) {
      activeCalls.delete(callId);
    }
  }
}, 10000);

export const initSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ['websocket'],
  });
  ioInstance = io;
  const socketData = new Map<string, { userId: string; schoolId: string }>();
  const userSchoolMap = new Map<string, string>();
  const onlineUsers = new Set<string>();

  async function getConversationMemberIds(conversationId: string): Promise<string[]> {
    const cached = convMemberCache.get(conversationId);
    if (cached && cached.expires > Date.now()) return cached.memberIds;
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const memberIds = members.map(m => m.userId);
    convMemberCache.set(conversationId, { memberIds, expires: Date.now() + CONV_CACHE_TTL });
    return memberIds;
  }

  async function emitPresenceToSchoolMates(event: 'user_online' | 'user_offline', userId: string, schoolId: string, excludeSocketId?: string) {
    try {
      const sharedConvMembers = await prisma.conversationMember.findMany({
        where: {
          conversation: { schoolId },
          conversationId: { in: (await prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true } })).map(m => m.conversationId) }
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      for (const { userId: mateId } of sharedConvMembers) {
        if (mateId === userId) continue;
        const mateSocketId = userSockets.get(mateId);
        if (mateSocketId && mateSocketId !== excludeSocketId) io.to(mateSocketId).emit(event, userId);
      }
    } catch (err) { console.error(`[Socket] Failed to emit ${event}:`, err); }
  }

  io.on('connection', (socket) => {
    socket.on('authenticate', async ({ token }: { token: string }) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const { id: userId, schoolId } = decoded;
        userSockets.set(userId, socket.id);
        socketData.set(socket.id, { userId, schoolId });
        userSchoolMap.set(userId, schoolId);
        onlineUsers.add(userId);
        const schoolOnline = Array.from(onlineUsers).filter(uid => userSchoolMap.get(uid) === schoolId);
        socket.emit('initial_online_users', schoolOnline);
        emitPresenceToSchoolMates('user_online', userId, schoolId, socket.id);

        // --- Push Pending Incoming Calls ---
        // If there is an active call for this user, deliver it via socket immediately!
        for (const call of activeCalls.values()) {
          if (call.to === userId) {
            console.log(`[Socket] Pushing pending call ${call.callId} to user ${userId} who just connected.`);
            socket.emit('incoming_call', {
              from: call.from,
              offer: call.offer,
              type: call.type,
              profile: call.profile,
              callId: call.callId,
            });
            // Inform caller B is ringing
            const callerSocketId = userSockets.get(call.from);
            if (callerSocketId) {
              io.to(callerSocketId).emit('call_ringing', { from: userId });
            }
          }
        }
      } catch (error) { socket.emit('auth_error', { message: 'Authentication failed' }); }
    });

    socket.on('register_push_token', async ({ token }: { token: string }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || !token) return;
      try {
        await prisma.user.update({ where: { id: tenant.userId }, data: { pushToken: token } });
      } catch (err) { console.error('[Socket] push token error:', err); }
    });

    socket.on('join_conversation', async (conversationId: string) => {
      socket.join(conversationId);
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      prisma.message.findMany({
        where: { conversationId, schoolId: tenant.schoolId, senderId: { not: tenant.userId }, readBy: { none: { userId: tenant.userId } } },
        select: { id: true }, take: 100, orderBy: { createdAt: 'desc' },
      }).then(unread => {
        if (unread.length > 0) socket.to(conversationId).emit('messages_delivered', { conversationId, userId: tenant.userId, messageIds: unread.map(m => m.id) });
      });
    });

    socket.on('send_message', async (data: any) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || tenant.userId !== data.senderId) return;
      try {
        if (data.tempId) {
          const dedupeKey = `${tenant.schoolId}:${data.tempId}`;
          const existing = recentTempIds.get(dedupeKey);
          if (existing && existing.expires > Date.now()) {
            socket.emit('message_sent', { tempId: data.tempId, messageId: existing.messageId });
            return;
          }
        }

        // Build attachment JSON — strip local blob URLs so only real URLs reach the DB
        let attachmentsJson: any = undefined;
        if (data.attachment) {
          const { isLocal, ...cleanAttachment } = data.attachment;
          // Only persist if it has a real (non-blob) URL
          if (cleanAttachment.url && !cleanAttachment.url.startsWith('blob:')) {
            attachmentsJson = [cleanAttachment];
          }
        }

        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: data.senderId,
            schoolId: tenant.schoolId,
            content: data.content,
            type: data.type,
            replyToId: data.replyToId,
            attachments: attachmentsJson ?? undefined,
          },
          include: { sender: { select: { id: true, full_name: true, profile_photo: true } } }
        });
        if (data.tempId) recentTempIds.set(`${tenant.schoolId}:${data.tempId}`, { messageId: message.id, expires: Date.now() + TEMPID_TTL });
        io.to(data.conversationId).emit('new_message', { ...message, tempId: data.tempId });
        socket.emit('message_sent', { tempId: data.tempId, messageId: message.id });
        
        // ── Push notification: only for OFFLINE users ──────────────────────────
        // Online users already received the message via Socket.IO above.
        // Sending a push to them too would create a duplicate notification.
        getConversationMemberIds(data.conversationId).then(async (memberIds) => {
          const offlineTargets = memberIds.filter(id => id !== data.senderId && !onlineUsers.has(id));
          if (offlineTargets.length === 0) return;

          const usersWithTokens = await prisma.user.findMany({
            where: { id: { in: offlineTargets }, pushToken: { not: null } },
            select: { id: true, pushToken: true }
          });

          const expiredIds: string[] = [];
          for (const u of usersWithTokens) {
            if (!u.pushToken) continue;
            const result = await sendMessageNotification(u.pushToken, {
              conversationId: data.conversationId,
              senderId: message.sender.id,
              senderName: message.sender.full_name,
              senderAvatar: message.sender.profile_photo || '',
              messagePreview: data.content || (data.attachment ? '📎 Attachment' : 'New message'),
              messageType: data.type || 'TEXT',
            });
            if (result === 'EXPIRED_TOKEN') expiredIds.push(u.id);
          }
          // Clean up expired tokens automatically
          if (expiredIds.length > 0) {
            prisma.user.updateMany({ where: { id: { in: expiredIds } }, data: { pushToken: null } }).catch(() => {});
          }
        });
      } catch (error) { socket.emit('message_error', { message: 'Failed to send', tempId: data.tempId }); }
    });

    // ── Delete message ─────────────────────────────────────────────────────────
    socket.on('delete_message', async (data: { messageId: string; conversationId: string; deleteForEveryone?: boolean }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      try {
        // Verify the message belongs to this school and the requester is the sender (or an admin)
        const message = await prisma.message.findFirst({
          where: { id: data.messageId, schoolId: tenant.schoolId },
          select: { id: true, senderId: true, conversationId: true },
        });
        if (!message) return;

        const isOwner = message.senderId === tenant.userId;
        if (!isOwner) return; // Only sender can delete for now

        await prisma.message.update({
          where: { id: data.messageId },
          data: { isDeleted: true, content: null },
        });

        io.to(data.conversationId).emit('message_deleted', {
          messageId: data.messageId,
          conversationId: data.conversationId,
        });
      } catch (err) {
        console.error('[Socket] delete_message error:', err);
      }
    });

    // ── Edit message ────────────────────────────────────────────────────────────
    socket.on('edit_message', async (data: { messageId: string; conversationId: string; content: string }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      try {
        const message = await prisma.message.findFirst({
          where: { id: data.messageId, schoolId: tenant.schoolId, senderId: tenant.userId },
          select: { id: true, conversationId: true },
        });
        if (!message) return;

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { content: data.content, editedAt: new Date() },
        });

        io.to(data.conversationId).emit('message_edited', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          content: data.content,
          editedAt: updated.editedAt,
        });
      } catch (err) {
        console.error('[Socket] edit_message error:', err);
      }
    });

    // ── Pin / Unpin message ─────────────────────────────────────────────────────
    socket.on('pin_message', async (data: { messageId: string; conversationId: string }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      try {
        // Verify user is a member of the conversation
        const membership = await prisma.conversationMember.findFirst({
          where: { conversationId: data.conversationId, userId: tenant.userId },
          select: { id: true },
        });
        if (!membership) return;

        // Toggle: unpin if already pinned, pin if not
        const existing = await prisma.pinnedMessage.findUnique({
          where: { conversationId_messageId: { conversationId: data.conversationId, messageId: data.messageId } },
        });

        if (existing) {
          await prisma.pinnedMessage.delete({
            where: { conversationId_messageId: { conversationId: data.conversationId, messageId: data.messageId } },
          });
          io.to(data.conversationId).emit('message_pinned', {
            messageId: data.messageId,
            conversationId: data.conversationId,
            pinnedBy: tenant.userId,
            isPinned: false,
          });
        } else {
          const pinned = await prisma.pinnedMessage.create({
            data: {
              conversationId: data.conversationId,
              messageId: data.messageId,
              pinnedBy: tenant.userId,
            },
            include: {
              message: { select: { id: true, content: true, type: true, sender: { select: { full_name: true } } } },
            },
          });
          io.to(data.conversationId).emit('message_pinned', {
            messageId: data.messageId,
            conversationId: data.conversationId,
            pinnedBy: tenant.userId,
            isPinned: true,
            messageContent: pinned.message.content,
            senderName: pinned.message.sender.full_name,
            messageType: pinned.message.type,
          });
        }
      } catch (err) {
        console.error('[Socket] pin_message error:', err);
      }
    });

    socket.on('typing', (data: any) => socket.to(data.conversationId).emit('user_typing', data));
    socket.on('mark_conversation_read', async (data: any) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || tenant.userId !== data.userId || !data.messageIds?.length) return;
      try {
        await prisma.$transaction(data.messageIds.map((messageId: string) => prisma.messageRead.upsert({
          where: { messageId_userId: { messageId, userId: data.userId } }, update: { readAt: new Date() }, create: { messageId, userId: data.userId, schoolId: tenant.schoolId }
        })));
        socket.to(data.conversationId).emit('messages_read', { conversationId: data.conversationId, userId: data.userId, messageIds: data.messageIds });
      } catch (err) {}
    });

    socket.on('call_user', async (data: any) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || tenant.userId !== data.from) return;
      const targetUser = await prisma.user.findFirst({ where: { id: data.to, schoolId: tenant.schoolId, is_active: true }, select: { id: true, pushToken: true } });
      if (!targetUser) return;

      const callId = data.callId || `call-${Date.now()}`;
      
      // Store in activeCalls so that if client is offline or reconnects, they can recover the call
      activeCalls.set(callId, {
        callId: callId,
        from: data.from,
        to: data.to,
        offer: data.offer,
        type: data.type || 'VOICE',
        profile: data.profile,
        timestamp: Date.now()
      });

      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) io.to(targetSocketId).emit('incoming_call', data);
      
      if (targetUser.pushToken) {
        // High-priority silent data notification to wake Android app for Full Screen Intent
        const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zetime-backend.onrender.com';
        sendCallNotification(targetUser.pushToken, {
          callId: callId,
          callerId: data.from,
          callerName: data.profile.name,
          callerAvatar: data.profile.avatar,
          callType: data.type || 'VOICE',
          serverUrl: serverUrl,
        });
      }
      (prisma as any).callSession?.create({ data: { schoolId: tenant.schoolId, type: data.type, status: 'RINGING', participants: { create: [{ userId: data.from, schoolId: tenant.schoolId }, { userId: data.to, schoolId: tenant.schoolId }] } } }).catch(() => {});
    });

    socket.on('call_ringing', (data: any) => {
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('call_ringing', { from: data.from });
    });

    socket.on('answer_call', (data: any) => {
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('call_answered', { from: data.from, answer: data.answer });
      // Remove call from active list on answer
      if (data.callId) {
        activeCalls.delete(data.callId);
      } else {
        for (const [id, call] of activeCalls.entries()) {
          if ((call.from === data.from && call.to === data.to) || (call.from === data.to && call.to === data.from)) {
            activeCalls.delete(id);
          }
        }
      }
    });

    socket.on('ice_candidate', (data: any) => {
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('ice_candidate', { from: data.from, candidate: data.candidate });
    });

    socket.on('media_state_change', (data: any) => {
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('media_state_changed', { 
        from: data.from, 
        isCameraOff: data.isCameraOff, 
        isMuted: data.isMuted 
      });
    });

    socket.on('reject_call', async (data: any) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('call_rejected', { from: data.from });
      
      // Clean up call memory state
      if (data.callId) {
        activeCalls.delete(data.callId);
      } else {
        for (const [id, call] of activeCalls.entries()) {
          if ((call.from === data.from && call.to === data.to) || (call.from === data.to && call.to === data.from)) {
            activeCalls.delete(id);
          }
        }
      }

      // Cancel native ringing if active
      const targetUser = await prisma.user.findUnique({ where: { id: data.to }, select: { pushToken: true } });
      if (targetUser?.pushToken) {
        sendCallCancellation(targetUser.pushToken, data.callId || '');
      }

      if (data.conversationId) {
        const msg = await prisma.message.create({ 
          data: { 
            conversationId: data.conversationId, 
            senderId: data.from, 
            schoolId: tenant.schoolId, 
            content: data.reason === 'MISSED' ? 'Missed Call' : 'Declined Call', 
            type: data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE',
            metadata: { reason: data.reason || 'DECLINED' }
          } 
        });
        io.to(data.conversationId).emit('new_message', msg);
      }
    });

    socket.on('end_call', async (data: any) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('call_ended', { from: data.from });

      // Clean up call memory state
      if (data.callId) {
        activeCalls.delete(data.callId);
      } else {
        for (const [id, call] of activeCalls.entries()) {
          if ((call.from === data.from && call.to === data.to) || (call.from === data.to && call.to === data.from)) {
            activeCalls.delete(id);
          }
        }
      }

      // Cancel native ringing if active
      const targetUser = await prisma.user.findUnique({ where: { id: data.to }, select: { pushToken: true } });
      if (targetUser?.pushToken) {
        sendCallCancellation(targetUser.pushToken, data.callId || '');
      }

      if (data.conversationId) {
        let content = 'Call ended';
        let msgType = data.type === 'VIDEO' ? 'CALL_VIDEO' : 'CALL_VOICE';
        if (data.reason === 'CANCELLED') {
           content = 'Canceled Call';
           msgType = data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE';
        } else if (data.reason === 'MISSED') {
           content = 'Missed Call';
           msgType = data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE';
        }

        const msg = await prisma.message.create({ 
          data: { 
            conversationId: data.conversationId, 
            senderId: data.from, 
            schoolId: tenant.schoolId, 
            content, 
            type: msgType,
            metadata: { duration: data.duration, reason: data.reason }
          } 
        });
        io.to(data.conversationId).emit('new_message', msg);
      }
    });

    socket.on('disconnect', () => {
      const data = socketData.get(socket.id);
      if (data) {
        userSockets.delete(data.userId);
        onlineUsers.delete(data.userId);
        emitPresenceToSchoolMates('user_offline', data.userId, data.schoolId, socket.id);
      }
      socketData.delete(socket.id);
    });
  });
  return io;
};
