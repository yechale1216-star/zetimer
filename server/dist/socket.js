"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // In production, replace with your actual frontend URL
            methods: ['GET', 'POST'],
        },
    });
    const userSockets = new Map(); // userId -> socketId
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        socket.on('authenticate', async (userId) => {
            userSockets.set(userId, socket.id);
            console.log(`User ${userId} authenticated with socket ${socket.id}`);
            // Notify friends/contacts that user is online
            socket.broadcast.emit('user_online', userId);
        });
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
        });
        socket.on('send_message', async (data) => {
            try {
                const messageData = {
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    content: data.content,
                    type: data.type,
                };
                if (data.attachment) {
                    messageData.attachments = {
                        create: {
                            url: data.attachment.url,
                            name: data.attachment.name,
                            type: data.attachment.type,
                            size: data.attachment.size,
                        }
                    };
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
                        attachments: true,
                    },
                });
                io.to(data.conversationId).emit('new_message', message);
                await prisma.conversation.update({
                    where: { id: data.conversationId },
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
        socket.on('mark_as_read', async (data) => {
            try {
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
            const targetSocketId = userSockets.get(data.to);
            // Create call session
            const session = await prisma.callSession.create({
                data: {
                    type: data.type,
                    status: 'RINGING',
                    participants: {
                        create: [
                            { userId: data.from },
                            { userId: data.to }
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
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('call_rejected', { from: data.from });
            }
            if (data.conversationId) {
                await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
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
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Remove user from the map
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userSockets.delete(userId);
                    socket.broadcast.emit('user_offline', userId);
                    break;
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
