"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';
// ── School subscription status cache ────────────────────────────────────────
// Keyed by schoolId; avoids repeated DB calls on every message send.
const schoolStatusCache = new Map();
const SCHOOL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// ── Conversation membership cache ────────────────────────────────────────────
// Keyed by conversationId; avoids repeated DB member lookups.
// Each entry: { memberIds: string[], expires: number }
const convMemberCache = new Map();
const CONV_CACHE_TTL = 60 * 1000; // 60 seconds
// ── Recent message tempId deduplication window ───────────────────────────────
// Prevents duplicate DB inserts when the client retries a message that was
// already persisted (e.g. ACK lost during reconnect).
// Keyed by `${schoolId}:${tempId}`, value: messageId stored in DB.
const recentTempIds = new Map();
const TEMPID_TTL = 60 * 1000; // 1 minute dedup window
function cleanupTempIds() {
    const now = Date.now();
    for (const [key, val] of recentTempIds) {
        if (val.expires < now)
            recentTempIds.delete(key);
    }
}
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // In production: replace with your actual frontend URL
            methods: ['GET', 'POST'],
        },
        // ── Mobile-optimized keep-alive settings ──────────────────────────────
        // pingInterval: 25s — how often the server pings each client
        // pingTimeout: 60s  — how long to wait for a pong before dropping
        // These values keep connections alive through carrier NAT timeouts
        // (~30s for most mobile networks) without being too aggressive.
        pingInterval: 25000,
        pingTimeout: 60000,
        // Always prefer WebSocket; skip the polling upgrade handshake.
        transports: ['websocket'],
    });
    // userId → socketId (latest connection)
    const userSockets = new Map();
    // socketId → { userId, schoolId }
    const socketData = new Map();
    // userId → schoolId (for presence scoping)
    const userSchoolMap = new Map();
    // Set of currently online userIds
    const onlineUsers = new Set();
    // ── Helper: get conversation member IDs (with cache) ────────────────────
    async function getConversationMemberIds(conversationId) {
        const cached = convMemberCache.get(conversationId);
        if (cached && cached.expires > Date.now())
            return cached.memberIds;
        const members = await prisma.conversationMember.findMany({
            where: { conversationId },
            select: { userId: true },
        });
        const memberIds = members.map(m => m.userId);
        convMemberCache.set(conversationId, { memberIds, expires: Date.now() + CONV_CACHE_TTL });
        return memberIds;
    }
    // ── Helper: emit presence event only to school-mates ────────────────────
    // Telegram-style: only broadcast online/offline to users who share
    // at least one conversation with the target user, within the same school.
    // This closes a cross-tenant presence leak where ALL users in ALL schools
    // could see each other's presence status.
    async function emitPresenceToSchoolMates(event, userId, schoolId, excludeSocketId) {
        try {
            // Find all users in the same school who share a conversation
            const sharedConvMembers = await prisma.conversationMember.findMany({
                where: {
                    conversation: { schoolId },
                    conversationId: {
                        in: (await prisma.conversationMember.findMany({
                            where: { userId },
                            select: { conversationId: true },
                        })).map(m => m.conversationId)
                    }
                },
                select: { userId: true },
                distinct: ['userId'],
            });
            for (const { userId: mateId } of sharedConvMembers) {
                if (mateId === userId)
                    continue;
                const mateSocketId = userSockets.get(mateId);
                if (mateSocketId && mateSocketId !== excludeSocketId) {
                    io.to(mateSocketId).emit(event, userId);
                }
            }
        }
        catch (err) {
            console.error(`[Socket] Failed to emit ${event} to school-mates:`, err);
        }
    }
    io.on('connection', (socket) => {
        console.log('[Socket] New connection:', socket.id);
        // ── Authenticate ────────────────────────────────────────────────────────
        socket.on('authenticate', async ({ token }) => {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                const { id: userId, schoolId } = decoded;
                if (!userId || !schoolId)
                    throw new Error('Invalid token: missing user data');
                // If this user already has a socket, clean up the old mapping
                const prevSocketId = userSockets.get(userId);
                if (prevSocketId && prevSocketId !== socket.id) {
                    socketData.delete(prevSocketId);
                }
                userSockets.set(userId, socket.id);
                socketData.set(socket.id, { userId, schoolId });
                userSchoolMap.set(userId, schoolId);
                onlineUsers.add(userId);
                console.log(`[Socket] Authenticated: user=${userId} school=${schoolId} socket=${socket.id}`);
                // Send current online users list (same school only)
                const schoolOnline = Array.from(onlineUsers).filter(uid => userSchoolMap.get(uid) === schoolId);
                socket.emit('initial_online_users', schoolOnline);
                // Notify school-mates that this user is now online
                emitPresenceToSchoolMates('user_online', userId, schoolId, socket.id);
            }
            catch (error) {
                console.error('[Socket] Authentication failed:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });
        // ── Join conversation room ──────────────────────────────────────────────
        socket.on('join_conversation', async (conversationId) => {
            socket.join(conversationId);
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            // ── Delivered acknowledgment ─────────────────────────────────────────
            // When a user opens a conversation, mark all unread messages in that
            // conversation as "delivered" to them. This is the "two ticks" moment.
            // We do this in a fire-and-forget fashion so join is instant.
            prisma.message.findMany({
                where: {
                    conversationId,
                    schoolId: tenant.schoolId,
                    senderId: { not: tenant.userId },
                    readBy: { none: { userId: tenant.userId } },
                },
                select: { id: true },
                take: 100, // Only process the most recent unread batch
                orderBy: { createdAt: 'desc' },
            }).then(unread => {
                if (unread.length === 0)
                    return;
                // Notify the conversation room that this user has received these messages
                socket.to(conversationId).emit('messages_delivered', {
                    conversationId,
                    userId: tenant.userId,
                    messageIds: unread.map(m => m.id),
                });
            }).catch(err => {
                console.error('[Socket] Failed to emit messages_delivered:', err);
            });
        });
        // ── Send message ────────────────────────────────────────────────────────
        socket.on('send_message', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.senderId) {
                console.error('[Socket] Unauthorized message attempt');
                socket.emit('message_error', { message: 'Unauthorized', tempId: data.tempId });
                return;
            }
            try {
                // ── Idempotency: skip if this tempId was already persisted ──────────
                if (data.tempId) {
                    const dedupeKey = `${tenant.schoolId}:${data.tempId}`;
                    const existing = recentTempIds.get(dedupeKey);
                    if (existing && existing.expires > Date.now()) {
                        // Already saved — re-broadcast the ack so the client can confirm
                        socket.emit('message_sent', { tempId: data.tempId, messageId: existing.messageId });
                        return;
                    }
                    // Periodic cleanup (run 1% of the time to avoid overhead)
                    if (Math.random() < 0.01)
                        cleanupTempIds();
                }
                // ── Check school subscription (cached 5 min) ─────────────────────
                let status;
                const cachedSchool = schoolStatusCache.get(tenant.schoolId);
                if (cachedSchool && cachedSchool.expires > Date.now()) {
                    status = cachedSchool.status;
                }
                else {
                    const school = await prisma.school.findUnique({
                        where: { id: tenant.schoolId },
                        include: { subscription: true },
                    });
                    if (school) {
                        status = (school.subscription?.status || school.subscriptionStatus || 'ACTIVE').toUpperCase();
                        schoolStatusCache.set(tenant.schoolId, { status, expires: Date.now() + SCHOOL_CACHE_TTL });
                    }
                }
                if (status === 'SUSPENDED' || status === 'EXPIRED') {
                    socket.emit('message_error', {
                        message: status === 'SUSPENDED'
                            ? 'Your school account is suspended.'
                            : 'Your school subscription has expired. Please upgrade to continue messaging.',
                        code: `SCHOOL_${status}`,
                        tempId: data.tempId,
                    });
                    return;
                }
                // ── Verify conversation belongs to this school (single fast query) ──
                const conversation = await prisma.conversation.findFirst({
                    where: { id: data.conversationId, schoolId: tenant.schoolId },
                    select: { id: true },
                });
                if (!conversation) {
                    console.error(`[Socket] Conversation ${data.conversationId} not in school ${tenant.schoolId}`);
                    socket.emit('message_error', { message: 'Conversation not found', tempId: data.tempId });
                    return;
                }
                // ── Persist message ──────────────────────────────────────────────────
                const messageData = {
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    schoolId: tenant.schoolId,
                    content: data.content,
                    type: data.type,
                    ...(data.replyToId ? { replyToId: data.replyToId } : {}),
                };
                if (data.attachment?.url) {
                    messageData.attachments = [data.attachment];
                }
                const message = await prisma.message.create({
                    data: messageData,
                    include: {
                        sender: {
                            select: { id: true, full_name: true, profile_photo: true },
                        },
                    },
                });
                // ── Register tempId for deduplication ───────────────────────────────
                if (data.tempId) {
                    recentTempIds.set(`${tenant.schoolId}:${data.tempId}`, {
                        messageId: message.id,
                        expires: Date.now() + TEMPID_TTL,
                    });
                }
                // ── Broadcast to conversation room (non-blocking) ───────────────────
                // Include tempId so the sender's client can swap the optimistic bubble
                // for the confirmed one without duplication.
                io.to(data.conversationId).emit('new_message', {
                    ...message,
                    tempId: data.tempId,
                });
                // ── Confirm to sender ────────────────────────────────────────────────
                socket.emit('message_sent', { tempId: data.tempId, messageId: message.id });
                // ── Update conversation timestamp (non-blocking, fire-and-forget) ───
                prisma.conversation.update({
                    where: { id: data.conversationId },
                    data: { updatedAt: new Date() },
                }).catch(err => console.error('[Socket] Failed to update conversation updatedAt:', err));
            }
            catch (error) {
                console.error('[Socket] Error sending message:', error);
                socket.emit('message_error', { message: 'Failed to send message', tempId: data.tempId });
            }
        });
        // ── Typing indicators ───────────────────────────────────────────────────
        socket.on('typing', (data) => {
            socket.to(data.conversationId).emit('user_typing', data);
        });
        // ── Message actions ─────────────────────────────────────────────────────
        socket.on('edit_message', (data) => {
            io.to(data.conversationId).emit('message_edited', data);
        });
        socket.on('delete_message', (data) => {
            io.to(data.conversationId).emit('message_deleted', data);
        });
        socket.on('pin_message', (data) => {
            io.to(data.conversationId).emit('message_pinned', data);
        });
        socket.on('unpin_message', (data) => {
            io.to(data.conversationId).emit('message_unpinned', data);
        });
        socket.on('toggle_reaction', (data) => {
            io.to(data.conversationId).emit('reaction_updated', data);
        });
        // ── Batched read receipts ───────────────────────────────────────────────
        // Old pattern: N socket events for N unread messages = N DB upserts.
        // New pattern: ONE event per conversation open = ONE batch upsert.
        // This reduces DB load by up to 50× on busy conversations.
        socket.on('mark_conversation_read', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.userId)
                return;
            if (!data.messageIds?.length)
                return;
            try {
                // Batch upsert all read receipts in a single transaction
                await prisma.$transaction(data.messageIds.map(messageId => prisma.messageRead.upsert({
                    where: { messageId_userId: { messageId, userId: data.userId } },
                    update: { readAt: new Date() },
                    create: {
                        messageId,
                        userId: data.userId,
                        schoolId: tenant.schoolId,
                    },
                })));
                // Notify the conversation room (so senders see double-tick turn blue)
                socket.to(data.conversationId).emit('messages_read', {
                    conversationId: data.conversationId,
                    userId: data.userId,
                    messageIds: data.messageIds,
                });
            }
            catch (error) {
                console.error('[Socket] Error batch-marking messages read:', error);
            }
        });
        // ── Legacy single mark_as_read (keep for backward compat) ──────────────
        socket.on('mark_as_read', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.userId)
                return;
            try {
                await prisma.messageRead.upsert({
                    where: { messageId_userId: { messageId: data.messageId, userId: data.userId } },
                    update: { readAt: new Date() },
                    create: { messageId: data.messageId, userId: data.userId, schoolId: tenant.schoolId },
                });
                socket.to(data.conversationId).emit('message_read', data);
            }
            catch (error) {
                console.error('[Socket] Error marking message read:', error);
            }
        });
        // ── WebRTC Signaling ────────────────────────────────────────────────────
        socket.on('call_user', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.from)
                return;
            const targetUser = await prisma.user.findFirst({
                where: { id: data.to, schoolId: tenant.schoolId, is_active: true },
            });
            if (!targetUser)
                return;
            const session = await prisma.callSession.create({
                data: {
                    schoolId: tenant.schoolId,
                    type: data.type,
                    status: 'RINGING',
                    participants: {
                        create: [
                            { userId: data.from, schoolId: tenant.schoolId },
                            { userId: data.to, schoolId: tenant.schoolId },
                        ],
                    },
                },
            });
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('incoming_call', {
                    from: data.from,
                    offer: data.offer,
                    profile: data.profile,
                    type: data.type,
                    sessionId: session.id,
                });
            }
        });
        socket.on('answer_call', (data) => {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_answered', { from: data.from, answer: data.answer });
        });
        socket.on('ice_candidate', (data) => {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId)
                io.to(targetSocketId).emit('ice_candidate', { from: data.from, candidate: data.candidate });
        });
        socket.on('reject_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_rejected', { from: data.from });
            if (data.conversationId) {
                const msg = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
                        schoolId: tenant.schoolId,
                        content: 'Missed Call',
                        type: 'CALL_MISSED_VOICE',
                    },
                });
                io.to(data.conversationId).emit('new_message', { ...msg });
            }
        });
        socket.on('end_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId)
                io.to(targetSocketId).emit('call_ended', { from: data.from });
            if (data.conversationId) {
                const durationText = data.duration ? `(${Math.floor(data.duration / 60)}m ${data.duration % 60}s)` : '';
                const msg = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
                        schoolId: tenant.schoolId,
                        content: `Call ended ${durationText}`,
                        type: 'CALL_VOICE',
                    },
                });
                io.to(data.conversationId).emit('new_message', { ...msg });
            }
        });
        socket.on('media_state_change', (data) => {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('media_state_changed', {
                    from: data.from,
                    isCameraOff: data.isCameraOff,
                    isMuted: data.isMuted,
                });
            }
        });
        // ── Disconnect ──────────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            console.log('[Socket] Disconnected:', socket.id);
            const data = socketData.get(socket.id);
            if (data) {
                const { userId, schoolId } = data;
                // Update lastActive (fire-and-forget)
                prisma.user.update({
                    where: { id: userId },
                    data: { lastActive: new Date() },
                }).catch(err => console.error('[Socket] Failed to update lastActive:', err));
                userSockets.delete(userId);
                userSchoolMap.delete(userId);
                onlineUsers.delete(userId);
                // Scope presence to school-mates only
                emitPresenceToSchoolMates('user_offline', userId, schoolId, socket.id);
            }
            socketData.delete(socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
