"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallHistory = exports.logCall = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * Create a complete call log entry including a CallSession record and
 * a CallHistory record for the initiating user. All new fields are stored.
 */
const logCall = async (params) => {
    const now = new Date();
    // Create (or upsert by callId) the session record
    let session;
    if (params.callId) {
        session = await db_1.default.callSession.upsert({
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
    }
    else {
        session = await db_1.default.callSession.create({
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
    const historyEntry = await db_1.default.callHistory.create({
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
exports.logCall = logCall;
/**
 * Fetch call history for a user within their school,
 * ordered by most recent first.
 */
const getCallHistory = async (schoolId, userId, limit = 50) => {
    return await db_1.default.callHistory.findMany({
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
exports.getCallHistory = getCallHistory;
