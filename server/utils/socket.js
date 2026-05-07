import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

let io;
const activeUsers = new Map();

const publicPresence = (user) => ({
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
    isOnline: true
});

export const getOnlineUserIds = () => Array.from(activeUsers.keys());

export const getPresenceSummary = () => ({
    onlineUserIds: getOnlineUserIds(),
    onlineCount: activeUsers.size
});

export const emitToUser = (userId, event, payload) => {
    if (!io || !userId) return;
    io.to(`user:${userId.toString()}`).emit(event, payload);
};

export const emitToAdmins = (event, payload) => {
    if (!io) return;
    io.to("admins").emit(event, payload);
};

export const emitNotification = async (notification) => {
    if (!notification) return;
    const populated = await notification.populate("actor", "username email profilePic role profileVisibility accountStatus createdAt");
    emitToUser(populated.recipient, "notification:new", populated.toObject());
};

export const emitPresenceSummary = () => {
    emitToAdmins("presence:summary", getPresenceSummary());
};

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Authentication required"));

            const decoded = jwt.verify(token, process.env.JWT);
            const user = await User.findById(decoded.id).select("-password");
            if (!user || user.accountStatus === "blocked") {
                return next(new Error("User unavailable"));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.user._id.toString();
        const sockets = activeUsers.get(userId) || new Set();
        const wasOffline = sockets.size === 0;

        sockets.add(socket.id);
        activeUsers.set(userId, sockets);
        socket.join(`user:${userId}`);

        if (socket.user.role === "admin") {
            socket.join("admins");
            socket.emit("presence:summary", getPresenceSummary());
        }

        if (wasOffline) {
            await User.findByIdAndUpdate(userId, { isOnline: true });
            emitToAdmins("presence:update", publicPresence(socket.user));
            emitPresenceSummary();
        }

        socket.on("disconnect", async () => {
            const userSockets = activeUsers.get(userId);
            if (!userSockets) return;

            userSockets.delete(socket.id);
            if (userSockets.size > 0) return;

            activeUsers.delete(userId);
            const lastSeen = new Date();
            await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
            emitToAdmins("presence:update", {
                userId,
                username: socket.user.username,
                role: socket.user.role,
                isOnline: false,
                lastSeen
            });
            emitPresenceSummary();
        });
    });

    return io;
};
