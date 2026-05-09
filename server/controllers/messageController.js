import Conversation from "../models/Conversation.js";
import Follow from "../models/Follow.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { emitToUser } from "../utils/socket.js";

const publicUserFields = "username email profilePic role profileVisibility accountStatus isOnline lastSeen";

const getParticipantKey = (userA, userB) => [userA.toString(), userB.toString()].sort().join(":");

const getRelationshipStatus = async (senderId, receiverId) => {
    const [senderFollowsReceiver, receiverFollowsSender] = await Promise.all([
        Follow.findOne({ follower: senderId, following: receiverId, status: "accepted" }),
        Follow.findOne({ follower: receiverId, following: senderId, status: "accepted" })
    ]);

    return senderFollowsReceiver && receiverFollowsSender ? "active" : "request";
};

const formatConversation = async (conversation, viewerId) => {
    const plain = conversation.toObject ? conversation.toObject() : conversation;
    const otherUser = plain.participants.find(participant => participant._id.toString() !== viewerId.toString());
    const unreadCount = await Message.countDocuments({
        conversation: plain._id,
        receiver: viewerId,
        readAt: null
    });

    return {
        ...plain,
        otherUser,
        unreadCount
    };
};

export const getInboxSummary = async (req, res, next) => {
    try {
        const [messagesUnread, requestsUnread] = await Promise.all([
            Message.countDocuments({
                receiver: req.user._id,
                readAt: null,
                conversation: {
                    $in: await Conversation.find({ participants: req.user._id, status: "active" }).distinct("_id")
                }
            }),
            Message.countDocuments({
                receiver: req.user._id,
                readAt: null,
                conversation: {
                    $in: await Conversation.find({ participants: req.user._id, status: "request" }).distinct("_id")
                }
            })
        ]);

        res.status(200).json({ success: true, data: { messagesUnread, requestsUnread, totalUnread: messagesUnread + requestsUnread } });
    } catch (error) {
        next(error);
    }
};

export const getConversations = async (req, res, next) => {
    try {
        const box = req.query.box === "requests" ? "requests" : "messages";
        const search = (req.query.search || "").trim().toLowerCase();
        const filter = box === "requests"
            ? { participants: req.user._id, status: "request" }
            : { participants: req.user._id, status: "active" };

        const conversations = await Conversation.find(filter)
            .populate("participants", publicUserFields)
            .populate({
                path: "lastMessage",
                populate: { path: "sender receiver", select: publicUserFields }
            })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .limit(100);

        const formatted = await Promise.all(conversations.map(conversation => formatConversation(conversation, req.user._id)));
        const data = search
            ? formatted.filter(conversation => conversation.otherUser?.username?.toLowerCase().includes(search))
            : formatted;

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getMessages = async (req, res, next) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user._id
        }).populate("participants", publicUserFields);

        if (!conversation) {
            res.status(404);
            throw new Error("Conversation not found");
        }

        const messages = await Message.find({ conversation: conversation._id })
            .populate("sender receiver", publicUserFields)
            .sort({ createdAt: 1 })
            .limit(200);

        res.status(200).json({
            success: true,
            data: {
                conversation: await formatConversation(conversation, req.user._id),
                messages
            }
        });
    } catch (error) {
        next(error);
    }
};

export const sendMessage = async (req, res, next) => {
    try {
        const text = (req.body.text || "").trim();
        const recipientId = req.body.recipientId;

        if (!recipientId || recipientId.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error("Choose another user to message");
        }

        if (!text) {
            res.status(400);
            throw new Error("Message cannot be empty");
        }

        const recipient = await User.findById(recipientId).select(publicUserFields);
        if (!recipient || recipient.accountStatus === "blocked") {
            res.status(404);
            throw new Error("User not available");
        }

        const status = await getRelationshipStatus(req.user._id, recipient._id);
        const participantKey = getParticipantKey(req.user._id, recipient._id);
        let conversation = await Conversation.findOne({ participantKey });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [req.user._id, recipient._id],
                participantKey,
                status,
                requester: req.user._id
            });
        } else {
            conversation.status = status;
            if (status === "request" && !conversation.requester) {
                conversation.requester = req.user._id;
            }
        }

        const message = await Message.create({
            conversation: conversation._id,
            sender: req.user._id,
            receiver: recipient._id,
            text
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        const populatedConversation = await Conversation.findById(conversation._id)
            .populate("participants", publicUserFields)
            .populate({
                path: "lastMessage",
                populate: { path: "sender receiver", select: publicUserFields }
            });
        const populatedMessage = await Message.findById(message._id).populate("sender receiver", publicUserFields);

        const receiverPayload = {
            conversation: await formatConversation(populatedConversation, recipient._id),
            message: populatedMessage,
            box: status === "active" ? "messages" : "requests"
        };
        const senderPayload = {
            conversation: await formatConversation(populatedConversation, req.user._id),
            message: populatedMessage,
            box: status === "active" ? "messages" : "requests"
        };

        emitToUser(recipient._id, "message:new", receiverPayload);
        emitToUser(req.user._id, "message:sent", senderPayload);

        res.status(201).json({ success: true, data: senderPayload });
    } catch (error) {
        next(error);
    }
};

export const markConversationRead = async (req, res, next) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            res.status(404);
            throw new Error("Conversation not found");
        }

        await Message.updateMany(
            { conversation: conversation._id, receiver: req.user._id, readAt: null },
            { readAt: new Date() }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};
