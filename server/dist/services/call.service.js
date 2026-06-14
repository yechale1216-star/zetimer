"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallHistory = exports.logCall = void 0;
const db_1 = __importDefault(require("../config/db"));
const logCall = async (data) => {
    // Create a call session for this activity
    const session = await db_1.default.callSession.create({
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
    return await db_1.default.callHistory.create({
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
exports.logCall = logCall;
const getCallHistory = async (schoolId, userId) => {
    return await db_1.default.callHistory.findMany({
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
exports.getCallHistory = getCallHistory;
