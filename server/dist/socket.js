"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = exports.getIO = exports.ioInstance = exports.userSockets = exports.activeCalls = void 0;
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const notification_service_1 = require("./services/notification.service");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'zetime-secret-key-2024-secure-and-long-enough';
// ── School subscription status cache ────────────────────────────────────────
const schoolStatusCache = new Map();
const SCHOOL_CACHE_TTL = 5 * 60 * 1000;
async function isSchoolSuspended(schoolId) {
    if (!schoolId)
        return false;
    const cached = schoolStatusCache.get(schoolId);
    if (cached && cached.expires > Date.now()) {
        return cached.status === 'SUSPENDED';
    }
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { subscriptionStatus: true },
        });
        const status = (school?.subscriptionStatus || 'ACTIVE').toUpperCase();
        schoolStatusCache.set(schoolId, { status, expires: Date.now() + SCHOOL_CACHE_TTL });
        return status === 'SUSPENDED';
    }
    catch {
        return false;
    }
}
// ── Conversation membership cache ────────────────────────────────────────────
const convMemberCache = new Map();
const CONV_CACHE_TTL = 60 * 1000;
// ── Recent message tempId deduplication window ───────────────────────────────
const recentTempIds = new Map();
const TEMPID_TTL = 60 * 1000;
function cleanupTempIds() {
    const now = Date.now();
    for (const [key, val] of recentTempIds) {
        if (val.expires < now)
            recentTempIds.delete(key);
    }
}
// ── Active calls store ────────────────────────────────────────────────────────
// Stores pending/ringing calls. Keyed by callId.
exports.activeCalls = new Map();
// ── Multi-device user socket map ──────────────────────────────────────────────
// Maps userId → Set<socketId> so we can reach ALL logged-in devices.
exports.userSockets = new Map();
exports.ioInstance = null;
const getIO = () => exports.ioInstance;
exports.getIO = getIO;
/** Helper: emit to ALL sockets of a user */
function emitToUser(io, userId, event, data) {
    const sids = exports.userSockets.get(userId);
    if (!sids)
        return;
    for (const sid of sids) {
        io.to(sid).emit(event, data);
    }
}
/** Helper: emit to ALL other sockets of the same user (exclude one socket) */
function emitToUserExcept(io, userId, excludeSocketId, event, data) {
    const sids = exports.userSockets.get(userId);
    if (!sids)
        return;
    for (const sid of sids) {
        if (sid !== excludeSocketId)
            io.to(sid).emit(event, data);
    }
}
// Clean up expired calls (older than 45 seconds)
setInterval(() => {
    const now = Date.now();
    for (const [callId, call] of exports.activeCalls.entries()) {
        if (now - call.timestamp > 45000) {
            if (call.timeoutHandle)
                clearTimeout(call.timeoutHandle);
            exports.activeCalls.delete(callId);
        }
    }
    cleanupTempIds();
}, 10000);
const initSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingInterval: 25000,
        pingTimeout: 60000,
        transports: ['websocket'],
    });
    exports.ioInstance = io;
    const socketData = new Map();
    const userSchoolMap = new Map();
    const onlineUsers = new Set();
    async function getConversationMemberIds(conversationId) {
        const cached = convMemberCache.get(conversationId);
        if (cached && cached.expires > Date.now())
            return cached.memberIds;
        const members = await prisma.conversationMember.findMany({
            where: { conversationId },
            select: { userId: true },
        });
        const memberIds = members.map(m => m.userId);
        convMemberCache.set(conversationId, { memberIds, expires: Date.now() + CONV_CACHE_TTL });
        return memberIds;
    }
    async function emitPresenceToSchoolMates(event, userId, schoolId, excludeSocketId) {
        try {
            const sharedConvMembers = await prisma.conversationMember.findMany({
                where: {
                    conversation: { schoolId },
                    conversationId: { in: (await prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true } })).map(m => m.conversationId) }
                },
                select: { userId: true },
                distinct: ['userId'],
            });
            for (const { userId: mateId } of sharedConvMembers) {
                if (mateId === userId)
                    continue;
                const sids = exports.userSockets.get(mateId);
                if (sids) {
                    for (const sid of sids) {
                        if (sid !== excludeSocketId)
                            io.to(sid).emit(event, userId);
                    }
                }
            }
        }
        catch (err) {
            console.error(`[Socket] Failed to emit ${event}:`, err);
        }
    }
    io.on('connection', (socket) => {
        // ── Authentication ──────────────────────────────────────────────────────
        socket.on('authenticate', async ({ token }) => {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                const { id: userId, schoolId } = decoded;
                // Register this socket for the user (multi-device support)
                if (!exports.userSockets.has(userId)) {
                    exports.userSockets.set(userId, new Set());
                }
                exports.userSockets.get(userId).add(socket.id);
                socketData.set(socket.id, { userId, schoolId });
                userSchoolMap.set(userId, schoolId);
                onlineUsers.add(userId);
                const schoolOnline = Array.from(onlineUsers).filter(uid => userSchoolMap.get(uid) === schoolId);
                socket.emit('initial_online_users', schoolOnline);
                emitPresenceToSchoolMates('user_online', userId, schoolId, socket.id);
                // Re-deliver any pending incoming call for this user
                for (const call of exports.activeCalls.values()) {
                    if (call.to === userId) {
                        console.log(`[Socket] Pushing pending call ${call.callId} to user ${userId} who just connected.`);
                        socket.emit('incoming_call', {
                            from: call.from,
                            offer: call.offer,
                            type: call.type,
                            profile: call.profile,
                            callId: call.callId,
                        });
                        // Inform caller their target is now ringing
                        emitToUser(io, call.from, 'call_ringing', { from: userId });
                    }
                }
            }
            catch (error) {
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });
        socket.on('register_push_token', async ({ token }) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || !token)
                return;
            try {
                await prisma.user.update({ where: { id: tenant.userId }, data: { pushToken: token } });
            }
            catch (err) {
                console.error('[Socket] push token error:', err);
            }
        });
        socket.on('join_conversation', async (conversationId) => {
            socket.join(conversationId);
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            prisma.message.findMany({
                where: { conversationId, schoolId: tenant.schoolId, senderId: { not: tenant.userId }, readBy: { none: { userId: tenant.userId } } },
                select: { id: true }, take: 100, orderBy: { createdAt: 'desc' },
            }).then(unread => {
                if (unread.length > 0)
                    socket.to(conversationId).emit('messages_delivered', { conversationId, userId: tenant.userId, messageIds: unread.map(m => m.id) });
            });
        });
        socket.on('send_message', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.senderId)
                return;
            let targetSchoolId = tenant.schoolId;
            if (data.conversationId) {
                const conv = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { schoolId: true }
                });
                if (conv?.schoolId) {
                    targetSchoolId = conv.schoolId;
                }
            }
            const senderInfo = await prisma.user.findUnique({
                where: { id: data.senderId },
                select: { schoolId: true, role: true }
            });
            const isConvSuspended = await isSchoolSuspended(targetSchoolId || '');
            const isSenderSuspended = (senderInfo && senderInfo.role !== 'parent')
                ? await isSchoolSuspended(senderInfo.schoolId || '')
                : false;
            if (isConvSuspended || isSenderSuspended) {
                socket.emit('message_error', { tempId: data.tempId, message: 'Your school account is suspended. Read-only access only.' });
                socket.emit('school_suspended', { message: 'Your school account is suspended.' });
                return;
            }
            try {
                if (data.tempId) {
                    const dedupeKey = `${tenant.schoolId}:${data.tempId}`;
                    const existing = recentTempIds.get(dedupeKey);
                    if (existing && existing.expires > Date.now()) {
                        socket.emit('message_sent', { tempId: data.tempId, messageId: existing.messageId });
                        return;
                    }
                }
                let attachmentsJson = undefined;
                if (data.attachment) {
                    const { isLocal, ...cleanAttachment } = data.attachment;
                    if (cleanAttachment.url && !cleanAttachment.url.startsWith('blob:')) {
                        attachmentsJson = [cleanAttachment];
                    }
                }
                const message = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.senderId,
                        schoolId: targetSchoolId,
                        content: data.content,
                        type: data.type,
                        replyToId: data.replyToId,
                        attachments: attachmentsJson ?? undefined,
                    },
                    include: { sender: { select: { id: true, full_name: true, profile_photo: true } } }
                });
                if (data.tempId)
                    recentTempIds.set(`${tenant.schoolId}:${data.tempId}`, { messageId: message.id, expires: Date.now() + TEMPID_TTL });
                io.to(data.conversationId).emit('new_message', { ...message, tempId: data.tempId });
                socket.emit('message_sent', { tempId: data.tempId, messageId: message.id });
                getConversationMemberIds(data.conversationId).then(async (memberIds) => {
                    const offlineTargets = memberIds.filter(id => id !== data.senderId && !onlineUsers.has(id));
                    if (offlineTargets.length === 0)
                        return;
                    const usersWithTokens = await prisma.user.findMany({
                        where: { id: { in: offlineTargets }, pushToken: { not: null } },
                        select: { id: true, pushToken: true }
                    });
                    const expiredIds = [];
                    for (const u of usersWithTokens) {
                        if (!u.pushToken)
                            continue;
                        const result = await (0, notification_service_1.sendMessageNotification)(u.pushToken, {
                            conversationId: data.conversationId,
                            senderId: message.sender.id,
                            senderName: message.sender.full_name,
                            senderAvatar: message.sender.profile_photo || '',
                            messagePreview: data.content || (data.attachment ? '📎 Attachment' : 'New message'),
                            messageType: data.type || 'TEXT',
                        });
                        if (result === 'EXPIRED_TOKEN')
                            expiredIds.push(u.id);
                    }
                    if (expiredIds.length > 0) {
                        prisma.user.updateMany({ where: { id: { in: expiredIds } }, data: { pushToken: null } }).catch(() => { });
                    }
                });
            }
            catch (error) {
                socket.emit('message_error', { message: 'Failed to send', tempId: data.tempId });
            }
        });
        // ── Delete message ─────────────────────────────────────────────────────
        socket.on('delete_message', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            if (await isSchoolSuspended(tenant.schoolId)) {
                socket.emit('school_suspended', { message: 'Your school account is suspended.' });
                return;
            }
            try {
                const message = await prisma.message.findFirst({
                    where: { id: data.messageId, schoolId: tenant.schoolId },
                    select: { id: true, senderId: true, conversationId: true },
                });
                if (!message)
                    return;
                if (message.senderId !== tenant.userId)
                    return;
                await prisma.message.update({
                    where: { id: data.messageId },
                    data: { isDeleted: true, content: null },
                });
                io.to(data.conversationId).emit('message_deleted', {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                });
            }
            catch (err) {
                console.error('[Socket] delete_message error:', err);
            }
        });
        // ── Edit message ──────────────────────────────────────────────────────
        socket.on('edit_message', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            if (await isSchoolSuspended(tenant.schoolId)) {
                socket.emit('school_suspended', { message: 'Your school account is suspended.' });
                return;
            }
            try {
                const message = await prisma.message.findFirst({
                    where: { id: data.messageId, schoolId: tenant.schoolId, senderId: tenant.userId },
                    select: { id: true, conversationId: true },
                });
                if (!message)
                    return;
                const updated = await prisma.message.update({
                    where: { id: data.messageId },
                    data: { content: data.content, editedAt: new Date() },
                });
                io.to(data.conversationId).emit('message_edited', {
                    messageId: data.messageId,
                    conversationId: data.conversationId,
                    content: data.content,
                    editedAt: updated.editedAt,
                });
            }
            catch (err) {
                console.error('[Socket] edit_message error:', err);
            }
        });
        // ── Pin / Unpin message ───────────────────────────────────────────────
        socket.on('pin_message', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            if (await isSchoolSuspended(tenant.schoolId)) {
                socket.emit('school_suspended', { message: 'Your school account is suspended.' });
                return;
            }
            try {
                const membership = await prisma.conversationMember.findFirst({
                    where: { conversationId: data.conversationId, userId: tenant.userId },
                    select: { id: true },
                });
                if (!membership)
                    return;
                const existing = await prisma.pinnedMessage.findUnique({
                    where: { conversationId_messageId: { conversationId: data.conversationId, messageId: data.messageId } },
                });
                if (existing) {
                    await prisma.pinnedMessage.delete({
                        where: { conversationId_messageId: { conversationId: data.conversationId, messageId: data.messageId } },
                    });
                    io.to(data.conversationId).emit('message_pinned', {
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        pinnedBy: tenant.userId,
                        isPinned: false,
                    });
                }
                else {
                    const pinned = await prisma.pinnedMessage.create({
                        data: {
                            conversationId: data.conversationId,
                            messageId: data.messageId,
                            pinnedBy: tenant.userId,
                        },
                        include: {
                            message: { select: { id: true, content: true, type: true, sender: { select: { full_name: true } } } },
                        },
                    });
                    io.to(data.conversationId).emit('message_pinned', {
                        messageId: data.messageId,
                        conversationId: data.conversationId,
                        pinnedBy: tenant.userId,
                        isPinned: true,
                        messageContent: pinned.message.content,
                        senderName: pinned.message.sender.full_name,
                        messageType: pinned.message.type,
                    });
                }
            }
            catch (err) {
                console.error('[Socket] pin_message error:', err);
            }
        });
        socket.on('typing', (data) => socket.to(data.conversationId).emit('user_typing', data));
        socket.on('mark_conversation_read', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.userId || !data.messageIds?.length)
                return;
            try {
                // Use Promise.allSettled with individual upserts instead of $transaction to prevent
                // Prisma engine panics caused by concurrent constraint collisions on the same rows.
                await Promise.allSettled(data.messageIds.map((messageId) => prisma.messageRead.upsert({
                    where: { messageId_userId: { messageId, userId: data.userId } },
                    update: { readAt: new Date() },
                    create: { messageId, userId: data.userId, schoolId: tenant.schoolId },
                })));
                socket.to(data.conversationId).emit('messages_read', { conversationId: data.conversationId, userId: data.userId, messageIds: data.messageIds });
            }
            catch (err) {
                console.warn('[Socket] mark_conversation_read error (non-fatal):', err);
            }
        });
        // ── CALL: Initiate ────────────────────────────────────────────────────
        socket.on('call_user', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant || tenant.userId !== data.from)
                return;
            const callerInfo = await prisma.user.findUnique({
                where: { id: data.from },
                select: { schoolId: true, role: true, full_name: true }
            });
            const targetUser = await prisma.user.findFirst({
                where: { id: data.to, is_active: true },
                select: { id: true, schoolId: true, role: true, pushToken: true }
            });
            if (!targetUser)
                return;
            let callSchoolId = tenant.schoolId;
            if (callerInfo && callerInfo.role !== 'parent') {
                callSchoolId = callerInfo.schoolId || '';
            }
            else if (targetUser && targetUser.role !== 'parent') {
                callSchoolId = targetUser.schoolId || '';
            }
            else if (targetUser) {
                callSchoolId = targetUser.schoolId || '';
            }
            if (await isSchoolSuspended(callSchoolId)) {
                socket.emit('call_blocked', {
                    code: 'SCHOOL_SUSPENDED',
                    callType: data.type || 'VOICE',
                    message: 'Voice and video calls are disabled while the school account is suspended.',
                });
                return;
            }
            const callId = data.callId || `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Server-side timeout: auto-cancel after 45 seconds if unanswered
            const timeoutHandle = setTimeout(() => {
                const call = exports.activeCalls.get(callId);
                if (call) {
                    exports.activeCalls.delete(callId);
                    // Notify caller of missed call
                    emitToUser(io, call.from, 'call_missed', { callId, reason: 'NO_ANSWER' });
                    // Notify callee to stop ringing
                    emitToUser(io, call.to, 'call_ended', { from: call.from, callId, reason: 'MISSED' });
                }
            }, 45000);
            exports.activeCalls.set(callId, {
                callId,
                from: data.from,
                to: data.to,
                offer: data.offer,
                type: data.type || 'VOICE',
                profile: data.profile,
                timestamp: Date.now(),
                timeoutHandle,
            });
            // Emit to ALL sockets of the target user (multi-device ring)
            emitToUser(io, data.to, 'incoming_call', {
                from: data.from,
                offer: data.offer,
                type: data.type || 'VOICE',
                profile: data.profile,
                callId,
            });
            // Send FCM push notification (wakes device when backgrounded/locked)
            if (targetUser.pushToken) {
                const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zetime-backend.onrender.com';
                (0, notification_service_1.sendCallNotification)(targetUser.pushToken, {
                    callId,
                    callerId: data.from,
                    callerName: data.profile?.name || callerInfo?.full_name || 'Unknown',
                    callerAvatar: data.profile?.avatar || '',
                    callType: (data.type || 'VOICE'),
                    serverUrl,
                });
            }
            const resolvedSchoolId = targetUser.schoolId || callerInfo?.schoolId;
            if (resolvedSchoolId) {
                prisma.callSession?.create({
                    data: {
                        schoolId: resolvedSchoolId,
                        type: data.type,
                        status: 'RINGING',
                        participants: {
                            create: [
                                { userId: data.from, schoolId: resolvedSchoolId },
                                { userId: data.to, schoolId: resolvedSchoolId }
                            ]
                        }
                    }
                }).catch(() => { });
            }
        });
        socket.on('call_ringing', (data) => {
            // Callee notifies caller that the call is ringing
            emitToUser(io, data.to, 'call_ringing', { from: data.from });
        });
        // ── CALL: Answer ──────────────────────────────────────────────────────
        socket.on('answer_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            console.log(`[Socket] answer_call: from=${data.from} to=${data.to} callId=${data.callId}`);
            const answererInfo = await prisma.user.findUnique({
                where: { id: data.from },
                select: { schoolId: true, role: true }
            });
            const callerInfo = await prisma.user.findUnique({
                where: { id: data.to },
                select: { schoolId: true, role: true }
            });
            let callSchoolId = tenant.schoolId;
            if (answererInfo && answererInfo.role !== 'parent') {
                callSchoolId = answererInfo.schoolId || '';
            }
            else if (callerInfo && callerInfo.role !== 'parent') {
                callSchoolId = callerInfo.schoolId || '';
            }
            else if (answererInfo) {
                callSchoolId = answererInfo.schoolId || '';
            }
            if (await isSchoolSuspended(callSchoolId || '')) {
                socket.emit('call_blocked', {
                    code: 'SCHOOL_SUSPENDED',
                    callType: data.type || 'VOICE',
                    message: 'Voice and video calls are disabled while the school account is suspended.',
                });
                return;
            }
            // Emit answer to the caller
            console.log(`[Socket] Relaying call_answered to caller ${data.to}`);
            emitToUser(io, data.to, 'call_answered', { from: data.from, answer: data.answer });
            // Stop ringing on all OTHER devices of the answerer (multi-device sync)
            emitToUserExcept(io, data.from, socket.id, 'call_stop_ringing', { callId: data.callId });
            // Clean up call state
            const callEntry = data.callId ? exports.activeCalls.get(data.callId) : null;
            if (data.callId && callEntry) {
                if (callEntry.timeoutHandle)
                    clearTimeout(callEntry.timeoutHandle);
                exports.activeCalls.delete(data.callId);
            }
            else {
                for (const [id, call] of exports.activeCalls.entries()) {
                    if ((call.from === data.from && call.to === data.to) || (call.from === data.to && call.to === data.from)) {
                        if (call.timeoutHandle)
                            clearTimeout(call.timeoutHandle);
                        exports.activeCalls.delete(id);
                    }
                }
            }
        });
        socket.on('ice_candidate', (data) => {
            emitToUser(io, data.to, 'ice_candidate', { from: data.from, candidate: data.candidate });
        });
        // ── ICE Restart ───────────────────────────────────────────────────────
        // Relay ICE restart offer from one peer to the other
        socket.on('ice_restart', (data) => {
            emitToUser(io, data.to, 'ice_restart', { from: data.from, offer: data.offer });
        });
        socket.on('ice_restart_answer', (data) => {
            emitToUser(io, data.to, 'ice_restart_answer', { from: data.from, answer: data.answer });
        });
        socket.on('media_state_change', (data) => {
            emitToUser(io, data.to, 'media_state_changed', {
                from: data.from,
                isCameraOff: data.isCameraOff,
                isMuted: data.isMuted
            });
        });
        // ── CALL: Reject ──────────────────────────────────────────────────────
        socket.on('reject_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            // Notify caller
            emitToUser(io, data.to, 'call_rejected', { from: data.from });
            // Stop ringing on all devices of the callee (they explicitly rejected)
            emitToUserExcept(io, data.from, socket.id, 'call_stop_ringing', { callId: data.callId });
            // Clean up call state
            if (data.callId) {
                const call = exports.activeCalls.get(data.callId);
                if (call?.timeoutHandle)
                    clearTimeout(call.timeoutHandle);
                exports.activeCalls.delete(data.callId);
            }
            else {
                for (const [id, call] of exports.activeCalls.entries()) {
                    if ((call.from === data.from && call.to === data.to) || (call.from === data.to && call.to === data.from)) {
                        if (call.timeoutHandle)
                            clearTimeout(call.timeoutHandle);
                        exports.activeCalls.delete(id);
                    }
                }
            }
            // Cancel native ringing on target's devices
            const targetUser = await prisma.user.findUnique({ where: { id: data.to }, select: { pushToken: true } });
            if (targetUser?.pushToken) {
                (0, notification_service_1.sendCallCancellation)(targetUser.pushToken, data.callId || '');
            }
            if (data.conversationId) {
                const msg = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
                        schoolId: tenant.schoolId,
                        content: data.reason === 'MISSED' ? 'Missed Call' : 'Declined Call',
                        type: data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE',
                        metadata: { reason: data.reason || 'DECLINED' }
                    }
                });
                io.to(data.conversationId).emit('new_message', msg);
            }
        });
        // ── CALL: End ─────────────────────────────────────────────────────────
        socket.on('end_call', async (data) => {
            const tenant = socketData.get(socket.id);
            if (!tenant)
                return;
            emitToUser(io, data.to, 'call_ended', { from: data.from });
            // Clean up call state
            if (data.callId) {
                const call = exports.activeCalls.get(data.callId);
                if (call?.timeoutHandle)
                    clearTimeout(call.timeoutHandle);
                exports.activeCalls.delete(data.callId);
            }
            else {
                for (const [id, call] of exports.activeCalls.entries()) {
                    if ((call.from === data.from && call.to === data.to) || (call.from === data.to && call.to === data.from)) {
                        if (call.timeoutHandle)
                            clearTimeout(call.timeoutHandle);
                        exports.activeCalls.delete(id);
                    }
                }
            }
            // Cancel native ringing if still active
            const targetUser = await prisma.user.findUnique({ where: { id: data.to }, select: { pushToken: true } });
            if (targetUser?.pushToken) {
                (0, notification_service_1.sendCallCancellation)(targetUser.pushToken, data.callId || '');
            }
            if (data.conversationId) {
                let content = 'Call ended';
                let msgType = data.type === 'VIDEO' ? 'CALL_VIDEO' : 'CALL_VOICE';
                if (data.reason === 'CANCELLED') {
                    content = 'Canceled Call';
                    msgType = data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE';
                }
                else if (data.reason === 'MISSED') {
                    content = 'Missed Call';
                    msgType = data.type === 'VIDEO' ? 'CALL_MISSED_VIDEO' : 'CALL_MISSED_VOICE';
                }
                const msg = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: data.from,
                        schoolId: tenant.schoolId,
                        content,
                        type: msgType,
                        metadata: { duration: data.duration, reason: data.reason }
                    }
                });
                io.to(data.conversationId).emit('new_message', msg);
            }
        });
        // ── Disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            const data = socketData.get(socket.id);
            if (data) {
                const { userId, schoolId } = data;
                // Remove only this socket from the user's socket set
                const sids = exports.userSockets.get(userId);
                if (sids) {
                    sids.delete(socket.id);
                    if (sids.size === 0) {
                        // User fully offline — all devices disconnected
                        exports.userSockets.delete(userId);
                        onlineUsers.delete(userId);
                        emitPresenceToSchoolMates('user_offline', userId, schoolId, socket.id);
                    }
                }
            }
            socketData.delete(socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
