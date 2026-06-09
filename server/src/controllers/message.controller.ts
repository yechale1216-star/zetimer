import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/tenant.middleware';

export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const schoolId = req.user?.schoolId;

  if (!schoolId) {
    return res.status(401).json({ error: 'Unauthorized: School ID missing' });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        schoolId,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                profile_photo: true,
                phone: true,
                role: true,
              },
            },
          },
        },
        messages: {
          where: { schoolId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { full_name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  const { conversationId } = req.params;
  const { limit = 50, cursor } = req.query;
  const schoolId = req.user?.schoolId;

  if (!schoolId) {
    return res.status(401).json({ error: 'Unauthorized: School ID missing' });
  }

  try {
    // Also verify the conversation belongs to this school
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, schoolId }
    });

    if (!conversation) {
      return res.status(403).json({ error: 'Forbidden: Access to this conversation is denied' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId, schoolId },
      take: Number(limit),
      ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            profile_photo: true,
            lastActive: true,
          },
        },
        readBy: {
          where: { schoolId }
        },
        reactions: {
          where: { schoolId }
        },
        replyTo: true,
      },
    });

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createConversation = async (req: AuthenticatedRequest, res: Response) => {
  const { name, isGroup, memberIds, avatar } = req.body;
  const schoolId = req.user?.schoolId;

  if (!schoolId) {
    return res.status(401).json({ error: 'Unauthorized: School ID missing' });
  }

  try {
    // 1. Verify all members belong to the SAME school
    const usersInSchool = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        schoolId,
        is_active: true,
        role: { in: ['admin', 'school_admin', 'teacher', 'parent'] }
      },
      select: { id: true }
    });

    if (usersInSchool.length !== memberIds.length) {
      return res.status(403).json({ 
        error: 'Forbidden: One or more users are not found in your school or are not authorized for communication' 
      });
    }

    // If not a group, check if a 1:1 conversation already exists in THIS school
    if (!isGroup && memberIds.length === 2) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          schoolId,
          isGroup: false,
          AND: [
            { members: { some: { userId: memberIds[0] } } },
            { members: { some: { userId: memberIds[1] } } },
          ],
        },
      });

      if (existingConversation) {
        return res.status(200).json(existingConversation);
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        name,
        isGroup,
        avatar,
        schoolId,
        members: {
          create: memberIds.map((userId: string) => ({
            userId,
            role: 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                profile_photo: true,
                phone: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

