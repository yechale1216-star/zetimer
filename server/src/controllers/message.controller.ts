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
      select: {
        id: true,
        name: true,
        isGroup: true,
        avatar: true,
        description: true,
        groupType: true,
        isAnnouncement: true,
        isSavedMessages: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            isMuted: true,
            user: {
              select: {
                id: true,
                full_name: true,
                profile_photo: true,
                phone: true,
                role: true,
                lastActive: true,
              },
            },
          },
        },
        messages: {
          where: { schoolId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            senderId: true,
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
  const { limit = '30', cursor } = req.query;
  const schoolId = req.user?.schoolId;
  const userId = req.user?.id;

  if (!schoolId || !userId) {
    return res.status(401).json({ error: 'Unauthorized: School ID missing' });
  }

  const take = Math.min(Math.max(Number(limit) || 30, 1), 50); // Default 30, cap at 50

  try {
    const [membership, messages] = await Promise.all([
      prisma.conversationMember.findFirst({
        where: { conversationId, userId },
        select: { id: true },
      }),
      prisma.message.findMany({
        where: { conversationId, schoolId },
        take: take + 1, // fetch one extra to determine if there's a next page
        ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          editedAt: true,
          isDeleted: true,
          replyToId: true,
          forwardedFromId: true,
          attachments: true,
          metadata: true,
          sender: {
            select: {
              id: true,
              full_name: true,
              profile_photo: true,
            },
          },
          readBy: {
            where: { schoolId, userId: { not: userId } },
            take: 1,
            select: {
              userId: true,
            },
          },
          reactions: {
            where: { schoolId },
            select: {
              id: true,
              userId: true,
              emoji: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              type: true,
              sender: {
                select: {
                  full_name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this conversation' });
    }

    const hasMore = messages.length > take;
    const page = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    // Return in chronological order (oldest first)
    res.status(200).json({
      messages: page.reverse(),
      nextCursor,
      hasMore,
      hasNextPage: hasMore,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createConversation = async (req: AuthenticatedRequest, res: Response) => {
  const { name, isGroup, memberIds, avatar } = req.body;

  // Use x-school-id header as the authoritative school context.
  // req.user.schoolId can fall back to the JWT's default school (which may be suspended/wrong)
  // when tenantMiddleware cannot resolve the role for the /api/messages path.
  const headerSchoolId = req.headers['x-school-id'] as string | undefined;
  const schoolId = headerSchoolId || req.user?.schoolId;

  if (!schoolId) {
    return res.status(401).json({ error: 'Unauthorized: School ID missing' });
  }

  try {
    // Verify all members are either:
    // a) Staff/Teachers/Admins in this school (via User.schoolId)
    // b) Parents linked to this school (via ParentStudentLink)
    // This handles the case of a parent (whose User.schoolId = SchoolA) messaging
    // a teacher in SchoolB (their child's school).
    const staffInSchool = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        schoolId,
        is_active: true,
      },
      select: { id: true }
    });

    const parentLinksInSchool = await prisma.parentStudentLink.findMany({
      where: {
        parentId: { in: memberIds },
        schoolId,
      },
      select: { parentId: true }
    });
    const parentIds = new Set(parentLinksInSchool.map((l: any) => l.parentId));
    const staffIds = new Set(staffInSchool.map((u: any) => u.id));

    const validMemberIds: string[] = memberIds.filter((id: string) => staffIds.has(id) || parentIds.has(id));

    if (validMemberIds.length !== memberIds.length) {
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

