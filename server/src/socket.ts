import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';

export const initSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*', // In production, replace with your actual frontend URL
      methods: ['GET', 'POST'],
    },
  });

  const userSockets = new Map<string, string>(); // userId -> socketId
  const socketData = new Map<string, { userId: string; schoolId: string }>(); // socketId -> data

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('authenticate', async ({ token }: { token: string }) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const { id: userId, schoolId } = decoded;

        if (!userId || !schoolId) {
          throw new Error('Invalid token mission user data');
        }

        userSockets.set(userId, socket.id);
        socketData.set(socket.id, { userId, schoolId });
        console.log(`User ${userId} from school ${schoolId} authenticated with socket ${socket.id}`);
        
        // Notify friends/contacts that user is online
        socket.broadcast.emit('user_online', userId);
      } catch (error) {
        console.error('Socket authentication failed:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on('send_message', async (data: {
      conversationId: string;
      senderId: string;
      content: string;
      type: string;
      attachment?: {
        url: string;
        name: string;
        type: string;
        size: number;
      };
    }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || tenant.userId !== data.senderId) {
        console.error('Unauthorized message attempt');
        return;
      }

      try {
        // Verify conversation belongs to this school
        const conversation = await prisma.conversation.findFirst({
          where: { id: data.conversationId, schoolId: tenant.schoolId }
        });

        if (!conversation) {
          console.error(`Conversation ${data.conversationId} not found in school ${tenant.schoolId}`);
          return;
        }

        const messageData: any = {
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

        io.to(data.conversationId).emit('new_message', message);
        
        await prisma.conversation.update({
          where: { id: data.conversationId }, // schoolId check already done above
          data: { updatedAt: new Date() },
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      socket.to(data.conversationId).emit('user_typing', data);
    });

    socket.on('mark_as_read', async (data: { messageId: string; userId: string; conversationId: string }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || tenant.userId !== data.userId) return;

      try {
        // Verify message belongs to this school
        const msg = await prisma.message.findFirst({
          where: { id: data.messageId, schoolId: tenant.schoolId }
        });
        if (!msg) return;

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
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // --- WebRTC Signaling ---
    
    socket.on('call_user', async (data: { to: string; offer: any; from: string; profile: any; type: 'VOICE' | 'VIDEO' }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant || tenant.userId !== data.from) return;

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
      const session = await (prisma as any).callSession.create({
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

    socket.on('answer_call', (data: { to: string; from: string; answer: any }) => {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call_answered', {
          from: data.from,
          answer: data.answer
        });
      }
    });

    socket.on('ice_candidate', (data: { to: string; from: string; candidate: any }) => {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice_candidate', {
          from: data.from,
          candidate: data.candidate
        });
      }
    });

    socket.on('reject_call', async (data: { to: string; from: string; conversationId: string }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;

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

    socket.on('end_call', async (data: { to: string; from: string; conversationId: string; duration?: number }) => {
      const tenant = socketData.get(socket.id);
      if (!tenant) return;

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

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const data = socketData.get(socket.id);
      if (data) {
        userSockets.delete(data.userId);
        socket.broadcast.emit('user_offline', data.userId);
      }
      socketData.delete(socket.id);
    });
  });

  return io;
};

