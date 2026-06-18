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
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // In production, replace with your actual frontend URL
            methods: ['GET', 'POST'],
        },
    });
    const userSockets = new Map(); // userId -> socketId
    const socketData = new Map(); // socketId -> data
    const onlineUsers = new Set(); // Set of online userIds
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        socket.on('authenticate', async ({ token }) => {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                const { id: userId, schoolId } = decoded;
                if (!userId || !schoolId) {
                    throw new Error('Invalid token mission user data');
                }
                userSockets.set(userId, socket.id);
                socketData.set(socket.id, { userId, schoolId });
                onlineUsers.add(userId);
                console.log(`User ${userId} from school ${schoolId} authenticated with socket ${socket.id}`);
                // 1. Send the current list of online users to the newly authenticated user
                socket.emit('initial_online_users', Array.from(onlineUsers));
                // 2. Notify friends/contacts that user is online
                socket.broadcast.emit('user_online', userId);
            }
            catch (error) {
                console.error('Socket authentication failed:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
        });
        socket.on('send_message', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.senderId) {
                console.error('Unauthorized message attempt');
                return;
            }
            try {
                // Verify school subscription status
                const school = await prisma.school.findUnique({
                    where: { id: tenant.schoolId },
                    include: { subscription: true }
                });
                const status = (school?.subscription?.status || school?.subscriptionStatus || 'ACTIVE').toUpperCase();
                if (status === 'SUSPENDED' || status === 'EXPIRED') {
                    const errorMsg = status === 'SUSPENDED'
                        ? 'Your school account is suspended.'
                        : 'Your school subscription has expired. Please upgrade to continue messaging.';
                    socket.emit('message_error', {
                        message: errorMsg,
                        code: `SCHOOL_${status}`
                    });
                    return;
                }
                // Verify conversation belongs to this school
                const conversation = await prisma.conversation.findFirst({
                    where: { id: data.conversationId, schoolId: tenant.schoolId }
                });
                if (!conversation) {
                    console.error(`Conversation ${data.conversationId} not found in school ${tenant.schoolId}`);
                    return;
                }
                const messageData = {
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    schoolId: tenant.schoolId,
                    content: data.content,
                    type: data.type,
                    metadata: data.content ? {
                        links: Array.from(data.content.matchAll(/((https?:\/\/[^\s]+)|(www\.[^\s]+))/g)).map(m => m[0])
                    } : undefined,
                };
                if (data.attachment && data.attachment.url) {
                    messageData.attachments = [
                        {
                            url: data.attachment.url,
                            name: data.attachment.name,
                            type: data.attachment.type,
                            size: data.attachment.size,
                        }
                    ];
                }
                const message = await prisma.message.create({
                    data: messageData,
                    include: {
                        sender: {
                            select: {
                                id: true,
                                full_name: true,
                                profile_photo: true,
                            },
                        },
                    },
                });
                // Broadcast to everyone in the conversation, including the sender
                // We include tempId so the sender can replace their optimistic message
                io.to(data.conversationId).emit('new_message', {
                    ...message,
                    tempId: data.tempId
                });
                await prisma.conversation.update({
                    where: { id: data.conversationId }, // schoolId check already done above
                    data: { updatedAt: new Date() },
                });
            }
            catch (error) {
                console.error('Error sending message:', error);
                socket.emit('message_error', { message: 'Failed to send message' });
            }
        });
        socket.on('typing', (data) => {
            socket.to(data.conversationId).emit('user_typing', data);
        });
        socket.on('edit_message', async (data) => {
            io.to(data.conversationId).emit('message_edited', data);
        });
        socket.on('delete_message', async (data) => {
            io.to(data.conversationId).emit('message_deleted', data);
        });
        socket.on('pin_message', async (data) => {
            io.to(data.conversationId).emit('message_pinned', data);
        });
        socket.on('unpin_message', async (data) => {
            io.to(data.conversationId).emit('message_unpinned', data);
        });
        socket.on('toggle_reaction', async (data) => {
            io.to(data.conversationId).emit('reaction_updated', data);
        });
        socket.on('mark_as_read', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.userId)
                return;
            try {
                // Verify message belongs to this school
                const msg = await prisma.message.findFirst({
                    where: { id: data.messageId, schoolId: tenant.schoolId }
                });
                if (!msg)
                    return;
                await prisma.messageRead.upsert({
                    where: {
                        messageId_userId: {
                            messageId: data.messageId,
                            userId: data.userId,
                        },
                    },
                    update: { readAt: new Date() },
                    create: {
                        messageId: data.messageId,
                        userId: data.userId,
                        schoolId: tenant.schoolId,
                    },
                });
                socket.to(data.conversationId).emit('message_read', data);
            }
            catch (error) {
                console.error('Error marking message as read:', error);
            }
        });
        // --- WebRTC Signaling ---
        socket.on('call_user', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.from)
                return;
            // Verify target user belongs to the same school
            const targetUser = await prisma.user.findFirst({
                where: { id: data.to, schoolId: tenant.schoolId, is_active: true }
            });
            if (!targetUser) {
                console.error('Call target not found in school');
                return;
            }
            const targetSocketId = userSockets.get(data.to);
            // Create call session
            const session = await prisma.callSession.create({
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
                    from: data.from,
                    offer: data.offer,
                    profile: data.profile,
                    type: data.type,
                    sessionId: session.id
                });
            }
        });
        socket.on('answer_call', (data) => {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('call_answered', {
                    from: data.from,
                    answer: data.answer
                });
            }
        });
        socket.on('ice_candidate', (data) => {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('ice_candidate', {
                    from: data.from,
                    candidate: data.candidate
                });
            }
        });
        socket.on('reject_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('call_rejected', { from: data.from });
            }
            if (data.conversationId) {
                await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
                        schoolId: tenant.schoolId,
                        content: 'Missed Call',
                        type: 'CALL_MISSED_VOICE',
                    }
                });
                io.to(data.conversationId).emit('new_message', {
                    conversationId: data.conversationId,
                    senderId: data.from,
                    content: 'Missed Call',
                    type: 'CALL_MISSED_VOICE',
                    createdAt: new Date(),
                });
            }
        });
        socket.on('end_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('call_ended', { from: data.from });
            }
            if (data.conversationId) {
                const durationText = data.duration ? `(${Math.floor(data.duration / 60)}m ${data.duration % 60}s)` : '';
                await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
                        schoolId: tenant.schoolId,
                        content: `Call ended ${durationText}`,
                        type: 'CALL_VOICE',
                    }
                });
                io.to(data.conversationId).emit('new_message', {
                    conversationId: data.conversationId,
                    senderId: data.from,
                    content: `Call ended ${durationText}`,
                    type: 'CALL_VOICE',
                    createdAt: new Date(),
                });
            }
        });
        socket.on('media_state_change', (data) => {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('media_state_changed', {
                    from: data.from,
                    isCameraOff: data.isCameraOff,
                    isMuted: data.isMuted
                });
            }
        });
        socket.on('disconnect', async () => {
            console.log('A user disconnected:', socket.id);
            const data = socketData.get(socket.id);
            if (data) {
                const { userId, schoolId } = data;
                // Update lastActive in DB
                try {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { lastActive: new Date() }
                    });
                }
                catch (err) {
                    console.error('Failed to update lastActive on disconnect:', err);
                }
                userSockets.delete(userId);
                onlineUsers.delete(userId);
                socket.broadcast.emit('user_offline', userId);
            }
            socketData.delete(socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
