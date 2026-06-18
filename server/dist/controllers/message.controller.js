"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversation = exports.getMessages = exports.getConversations = void 0;
const db_1 = __importDefault(require("../config/db"));
const getConversations = async (req, res) => {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
        return res.status(401).json({ error: 'Unauthorized: School ID missing' });
    }
    try {
        const conversations = await db_1.default.conversation.findMany({
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
    }
    catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    const { conversationId } = req.params;
    const { limit = '50', cursor } = req.query;
    const schoolId = req.user?.schoolId;
    const userId = req.user?.id;
    if (!schoolId || !userId) {
        return res.status(401).json({ error: 'Unauthorized: School ID missing' });
    }
    const take = Math.min(Number(limit), 100); // Cap at 100 to protect DB
    try {
        // ── Single query — the WHERE { conversationId, schoolId } already:
        //    1. Scopes to the correct tenant (schoolId)
        //    2. Restricts to the correct conversation (conversationId)
        // A separate findFirst for conversation ownership would be a redundant
        // DB round-trip. If the conversation doesn't exist or belongs to another
        // school, the message query returns [] — safe and correct.
        //
        // We also verify that the requesting user is a member of this conversation
        // by checking ConversationMember, which is the real access control gate.
        const [membership, messages] = await Promise.all([
            db_1.default.conversationMember.findFirst({
                where: { conversationId, userId },
                select: { id: true },
            }),
            db_1.default.message.findMany({
                where: { conversationId, schoolId },
                take: take + 1, // fetch one extra to determine if there's a next page
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
                    readBy: { where: { schoolId } },
                    reactions: { where: { schoolId } },
                    replyTo: true,
                },
            }),
        ]);
        if (!membership) {
            return res.status(403).json({ error: 'Forbidden: You are not a member of this conversation' });
        }
        const hasNextPage = messages.length > take;
        const page = hasNextPage ? messages.slice(0, take) : messages;
        const nextCursor = hasNextPage ? page[page.length - 1]?.id : null;
        // Return in chronological order (oldest first)
        res.status(200).json({
            messages: page.reverse(),
            nextCursor,
            hasNextPage,
        });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};
exports.getMessages = getMessages;
const createConversation = async (req, res) => {
    const { name, isGroup, memberIds, avatar } = req.body;
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
        return res.status(401).json({ error: 'Unauthorized: School ID missing' });
    }
    try {
        // 1. Verify all members belong to the SAME school
        const usersInSchool = await db_1.default.user.findMany({
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
            const existingConversation = await db_1.default.conversation.findFirst({
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
        const conversation = await db_1.default.conversation.create({
            data: {
                name,
                isGroup,
                avatar,
                schoolId,
                members: {
                    create: memberIds.map((userId) => ({
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
    }
    catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
};
exports.createConversation = createConversation;
