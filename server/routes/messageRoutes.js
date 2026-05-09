import express from "express";
import {
    getConversations,
    getInboxSummary,
    getMessages,
    markConversationRead,
    sendMessage
} from "../controllers/messageController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/summary", protect, getInboxSummary);
router.get("/conversations", protect, getConversations);
router.get("/conversations/:conversationId/messages", protect, getMessages);
router.put("/conversations/:conversationId/read", protect, markConversationRead);
router.post("/", protect, sendMessage);

export default router;
