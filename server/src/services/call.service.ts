import prisma from '../config/db';

export const logCall = async (data: {
  schoolId: string;
  userId: string;
  recipientId: string;
  type: string;
  status: string;
  duration?: number;
}) => {
  // Create a call session for this activity
  const session = await prisma.callSession.create({
    data: {
      schoolId: data.schoolId,
      type: data.type,
      status: 'COMPLETED',
      startTime: new Date(),
      endTime: new Date(),
      participants: {
        create: [
          { userId: data.userId, schoolId: data.schoolId },
          { userId: data.recipientId, schoolId: data.schoolId }
        ]
      }
    }
  });

  // Log the initiation for the caller
  return await prisma.callHistory.create({
    data: {
      schoolId: data.schoolId,
      userId: data.userId,
      callSessionId: session.id,
      type: data.type,
      status: data.status,
      duration: data.duration || 0,
    },
    include: {
      user: true,
      callSession: {
        include: {
          participants: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });
};

export const getCallHistory = async (schoolId: string, userId?: string) => {
  return await prisma.callHistory.findMany({
    where: {
      schoolId,
      ...(userId ? { userId } : {})
    },
    include: {
      user: true,
      callSession: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  full_name: true,
                  role: true,
                  profile_photo: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};
