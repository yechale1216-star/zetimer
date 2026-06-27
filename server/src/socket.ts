import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendPushNotification } from './services/notification.service';

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

export const initSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ['websocket'],
  });

  const userSockets = new Map<string, string>();
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
        
        // Push notification logic
        getConversationMemberIds(data.conversationId).then(async (memberIds) => {
          const targets = memberIds.filter(id => id !== data.senderId);
          const usersWithTokens = await prisma.user.findMany({ where: { id: { in: targets }, pushToken: { not: null } }, select: { pushToken: true } });
          for (const u of usersWithTokens) {
            if (u.pushToken) sendPushNotification(u.pushToken, `New from ${message.sender.full_name}`, data.content || 'Attachment', { type: 'message', conversationId: data.conversationId });
          }
        });
      } catch (error) { socket.emit('message_error', { message: 'Failed to send', tempId: data.tempId }); }
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

      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) io.to(targetSocketId).emit('incoming_call', data);
      
      if (targetUser.pushToken) {
        sendPushNotification(targetUser.pushToken, `Incoming ${data.type} call`, `${data.profile.name} is calling...`, { type: 'incoming_call', from: data.from, callType: data.type, profile: JSON.stringify(data.profile) });
      }
      (prisma as any).callSession?.create({ data: { schoolId: tenant.schoolId, type: data.type, status: 'RINGING', participants: { create: [{ userId: data.from, schoolId: tenant.schoolId }, { userId: data.to, schoolId: tenant.schoolId }] } } }).catch(() => {});
    });

    socket.on('answer_call', (data: any) => {
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('call_answered', { from: data.from, answer: data.answer });
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
      if (data.conversationId) {
        const msg = await prisma.message.create({ data: { conversationId: data.conversationId, senderId: data.from, schoolId: tenant.schoolId, content: 'Missed Call', type: data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE' } });
        io.to(data.conversationId).emit('new_message', msg);
      }
    });

    socket.on('end_call', async (data: any) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;
      const s = userSockets.get(data.to);
      if (s) io.to(s).emit('call_ended', { from: data.from });
      if (data.conversationId) {
        const msg = await prisma.message.create({ data: { conversationId: data.conversationId, senderId: data.from, schoolId: tenant.schoolId, content: 'Call ended', type: 'CALL_VOICE' } });
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
