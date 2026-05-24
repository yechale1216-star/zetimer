import { Request, Response } from 'express';
import prisma from '../config/db';

export const getConversations = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
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

export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { limit = 50, cursor } = req.query;

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      take: Number(limit),
      ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            profile_photo: true,
          },
        },
        readBy: true,
        reactions: true,
        attachments: true,
        replyTo: true,
      },
    });

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createConversation = async (req: Request, res: Response) => {
  const { name, isGroup, memberIds, avatar } = req.body;

  try {
    // If not a group, check if a 1:1 conversation already exists
    if (!isGroup && memberIds.length === 2) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
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
