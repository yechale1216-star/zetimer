"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversation = exports.getMessages = exports.getConversations = void 0;
const db_1 = __importDefault(require("../config/db"));
const getConversations = async (req, res) => {
    const { userId } = req.params;
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
    const { limit = 50, cursor } = req.query;
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
        return res.status(401).json({ error: 'Unauthorized: School ID missing' });
    }
    try {
        // Also verify the conversation belongs to this school
        const conversation = await db_1.default.conversation.findFirst({
            where: { id: conversationId, schoolId }
        });
        if (!conversation) {
            return res.status(403).json({ error: 'Forbidden: Access to this conversation is denied' });
        }
        const messages = await db_1.default.message.findMany({
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
