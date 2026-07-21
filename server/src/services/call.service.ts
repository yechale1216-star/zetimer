import prisma from '../config/db';

export interface LogCallParams {
  callId?: string;
  schoolId: string;
  userId: string;       // caller
  recipientId: string;  // callee
  conversationId?: string;
  type: string;         // VOICE | VIDEO
  status: string;       // ANSWERED | MISSED | DECLINED | CANCELLED | FAILED | BUSY
  duration?: number;    // seconds
  answerTime?: Date;
  endTime?: Date;
  disconnectReason?: string;
  networkQuality?: string;
}

/**
 * Create a complete call log entry including a CallSession record and
 * a CallHistory record for the initiating user. All new fields are stored.
 */
export const logCall = async (params: LogCallParams) => {
  const now = new Date();

  // Create (or upsert by callId) the session record
  let session;
  if (params.callId) {
    session = await prisma.callSession.upsert({
      where: { callId: params.callId },
      create: {
        callId: params.callId,
        schoolId: params.schoolId,
        conversationId: params.conversationId,
        type: params.type,
        status: params.status,
        startTime: now,
        answerTime: params.answerTime,
        endTime: params.endTime ?? now,
        duration: params.duration ?? 0,
        disconnectReason: params.disconnectReason,
        networkQuality: params.networkQuality,
        participants: {
          create: [
            { userId: params.userId, schoolId: params.schoolId },
            { userId: params.recipientId, schoolId: params.schoolId },
          ],
        },
      },
      update: {
        status: params.status,
        endTime: params.endTime ?? now,
        duration: params.duration ?? 0,
        answerTime: params.answerTime,
        disconnectReason: params.disconnectReason,
        networkQuality: params.networkQuality,
      },
    });
  } else {
    session = await prisma.callSession.create({
      data: {
        schoolId: params.schoolId,
        conversationId: params.conversationId,
        type: params.type,
        status: params.status,
        startTime: now,
        answerTime: params.answerTime,
        endTime: params.endTime ?? now,
        duration: params.duration ?? 0,
        disconnectReason: params.disconnectReason,
        networkQuality: params.networkQuality,
        participants: {
          create: [
            { userId: params.userId, schoolId: params.schoolId },
            { userId: params.recipientId, schoolId: params.schoolId },
          ],
        },
      },
    });
  }

  // Log CallHistory for the caller
  const historyEntry = await prisma.callHistory.create({
    data: {
      callId: params.callId,
      schoolId: params.schoolId,
      userId: params.userId,
      recipientId: params.recipientId,
      callSessionId: session.id,
      type: params.type,
      status: params.status,
      duration: params.duration ?? 0,
      answerTime: params.answerTime,
      endTime: params.endTime ?? now,
      disconnectReason: params.disconnectReason,
    },
    include: {
      user: { select: { id: true, full_name: true, profile_photo: true } },
      callSession: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, full_name: true, profile_photo: true, role: true } },
            },
          },
        },
      },
    },
  });

  return historyEntry;
};

/**
 * Fetch call history for a user within their school,
 * ordered by most recent first.
 */
export const getCallHistory = async (schoolId: string, userId?: string, limit = 50) => {
  return await prisma.callHistory.findMany({
    where: {
      schoolId,
      ...(userId ? { OR: [{ userId }, { recipientId: userId }] } : {}),
    },
    include: {
      user: { select: { id: true, full_name: true, profile_photo: true, role: true } },
      callSession: {
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, full_name: true, profile_photo: true, role: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};
