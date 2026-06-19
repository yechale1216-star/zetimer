"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./config/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';
// In-memory caches to minimize DB hits in the critical path
const schoolStatusCache = new Map();
const userProfileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    const userSockets = new Map(); // userId -> socketId
    const socketData = new Map(); // socketId -> data
    const onlineUsers = new Set(); // Set of online userIds
    io.on('connection', (socket) => {
        socket.on('authenticate', async ({ token }) => {
            try {
                const start = Date.now();
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                const { id: userId, schoolId } = decoded;
                if (!userId || !schoolId)
                    throw new Error('Invalid token');
                userSockets.set(userId, socket.id);
                socketData.set(socket.id, { userId, schoolId });
                onlineUsers.add(userId);
                // Auto-join conversation rooms
                const memberships = await db_1.default.conversationMember.findMany({
                    where: { userId },
                    select: { conversationId: true }
                });
                memberships.forEach(m => socket.join(m.conversationId));
                socket.join(`user_${userId}`);
                console.log(`[Socket] Auth ${userId}: ${Date.now() - start}ms`);
                socket.emit('initial_online_users', Array.from(onlineUsers));
                socket.broadcast.emit('user_online', userId);
            }
            catch (error) {
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });
        socket.on('join_conversation', (conversationId) => {
            if (conversationId)
                socket.join(conversationId);
        });
        socket.on('send_message', async (data) => {
            const start = Date.now();
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.senderId)
                return;
            try {
                const cachedSchool = schoolStatusCache.get(tenant.schoolId);
                const shouldFetchSchool = !cachedSchool || cachedSchool.expires < Date.now();
                const [school, cachedSender] = await Promise.all([
                    shouldFetchSchool
                        ? db_1.default.school.findUnique({
                            where: { id: tenant.schoolId },
                            select: { subscriptionStatus: true, subscription: { select: { status: true } } }
                        })
                        : Promise.resolve(null),
                    userProfileCache.get(data.senderId) ? Promise.resolve(userProfileCache.get(data.senderId)) : db_1.default.user.findUnique({
                        where: { id: data.senderId },
                        select: { id: true, full_name: true, profile_photo: true }
                    })
                ]);
                if (shouldFetchSchool && school) {
                    const status = (school.subscription?.status || school.subscriptionStatus || 'ACTIVE').toUpperCase();
                    schoolStatusCache.set(tenant.schoolId, { status, expires: Date.now() + CACHE_TTL });
                    if (status === 'SUSPENDED' || status === 'EXPIRED') {
                        socket.emit('message_error', { message: 'Subscription issue', code: `SCHOOL_${status}` });
                        return;
                    }
                }
                if (cachedSender)
                    userProfileCache.set(data.senderId, cachedSender);
                const messageId = (0, node_crypto_1.randomUUID)();
                const createdAt = new Date();
                const messagePayload = {
                    id: messageId,
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    schoolId: tenant.schoolId,
                    content: data.content,
                    type: data.type,
                    createdAt,
                    sender: cachedSender,
                    tempId: data.tempId,
                    status: 'sent',
                    attachments: data.attachment ? [data.attachment] : undefined,
                    metadata: data.content ? {
                        links: Array.from(data.content.matchAll(/((https?:\/\/[^\s]+)|(www\.[^\s]+))/g)).map(m => m[0])
                    } : undefined,
                };
                io.to(data.conversationId).emit('new_message', messagePayload);
                console.log(`[Socket] Send -> Broadcast: ${Date.now() - start}ms`);
                db_1.default.$transaction([
                    db_1.default.message.create({
                        data: {
                            id: messageId,
                            conversationId: data.conversationId,
                            senderId: data.senderId,
                            schoolId: tenant.schoolId,
                            content: data.content,
                            type: data.type,
                            createdAt,
                            attachments: data.attachment ? [data.attachment] : undefined,
                            metadata: messagePayload.metadata
                        }
                    }),
                    db_1.default.conversation.update({
                        where: { id: data.conversationId },
                        data: { updatedAt: new Date() }
                    })
                ]).catch(err => {
                    console.error('[Socket] DB error:', err);
                    socket.emit('message_error', { message: 'Save failed', tempId: data.tempId });
                });
            }
            catch (error) {
                socket.emit('message_error', { message: 'Failed to send' });
            }
        });
        socket.on('mark_as_delivered', (data) => {
            // Broadcast delivery status to the sender
            socket.to(data.conversationId).emit('message_delivered', data);
        });
        socket.on('mark_as_read', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            db_1.default.messageRead.upsert({
                where: { messageId_userId: { messageId: data.messageId, userId: data.userId } },
                update: { readAt: new Date() },
                create: { messageId: data.messageId, userId: data.userId, schoolId: tenant.schoolId }
            }).catch(() => { });
            socket.to(data.conversationId).emit('message_read', data);
        });
        socket.on('typing', (d) => socket.to(d.conversationId).emit('user_typing', d));
        socket.on('edit_message', (d) => {
            db_1.default.message.update({ where: { id: d.messageId }, data: { content: d.content, editedAt: new Date() } }).catch(() => { });
            io.to(d.conversationId).emit('message_edited', d);
        });
        socket.on('delete_message', (d) => {
            db_1.default.message.update({ where: { id: d.messageId }, data: { isDeleted: true } }).catch(() => { });
            io.to(d.conversationId).emit('message_deleted', d);
        });
        // --- ENHANCED CALL HANDLING ---
        socket.on('call_user', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.from)
                return;
            const targetUser = await db_1.default.user.findUnique({
                where: { id: data.to },
                select: { schoolId: true, is_active: true }
            });
            if (!targetUser || targetUser.schoolId !== tenant.schoolId)
                return;
            const targetSocketId = userSockets.get(data.to);
            const session = await db_1.default.callSession.create({
                data: {
                    schoolId: tenant.schoolId,
                    type: data.type,
                    status: 'RINGING',
                    participants: {
                        create: [
                            { userId: data.from, schoolId: tenant.schoolId },
                            { userId: data.to, schoolId: tenant.schoolId }
                        ]
                    }
                }
            });
            if (targetSocketId) {
                io.to(targetSocketId).emit('incoming_call', {
                    ...data,
                    sessionId: session.id
                });
            }
        });
        socket.on('answer_call', (d) => {
            const s = userSockets.get(d.to);
            if (s)
                io.to(s).emit('call_answered', d);
        });
        socket.on('ice_candidate', (d) => {
            const s = userSockets.get(d.to);
            if (s)
                io.to(s).emit('ice_candidate', d);
        });
        socket.on('reject_call', async (d) => {
            const tenant = socketData.get(socket.id);
            const s = userSockets.get(d.to);
            if (s)
                io.to(s).emit('call_rejected', { from: d.from });
            if (d.conversationId && tenant) {
                const msg = await db_1.default.message.create({
                    data: {
                        conversationId: d.conversationId,
                        senderId: d.from,
                        schoolId: tenant.schoolId,
                        content: 'Missed Call',
                        type: 'CALL_MISSED_VOICE'
                    },
                    include: { sender: { select: { id: true, full_name: true, profile_photo: true } } }
                });
                io.to(d.conversationId).emit('new_message', msg);
            }
        });
        socket.on('end_call', async (d) => {
            const tenant = socketData.get(socket.id);
            const s = userSockets.get(d.to);
            if (s)
                io.to(s).emit('call_ended', { from: d.from });
            if (d.conversationId && tenant) {
                const durationText = d.duration ? `(${Math.floor(d.duration / 60)}m ${d.duration % 60}s)` : '';
                const msg = await db_1.default.message.create({
                    data: {
                        conversationId: d.conversationId,
                        senderId: d.from,
                        schoolId: tenant.schoolId,
                        content: `Call ended ${durationText}`,
                        type: 'CALL_VOICE'
                    },
                    include: { sender: { select: { id: true, full_name: true, profile_photo: true } } }
                });
                io.to(d.conversationId).emit('new_message', msg);
            }
        });
        socket.on('media_state_change', (d) => {
            const s = userSockets.get(d.to);
            if (s)
                io.to(s).emit('media_state_changed', d);
        });
        socket.on('disconnect', () => {
            const data = socketData.get(socket.id);
            if (data) {
                userSockets.delete(data.userId);
                onlineUsers.delete(data.userId);
                socket.broadcast.emit('user_offline', data.userId);
                db_1.default.user.update({ where: { id: data.userId }, data: { lastActive: new Date() } }).catch(() => { });
            }
            socketData.delete(socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
