import GameStatus from "../models/GameStatus.js";
import User from "../models/User.js";

export const setGameStatus = async (req, res, next) => {
    try {
        const { gameId } = req.params;
        
        const { status, playTime, startDate, endDate, ngPlus, notes } = req.body; 
        
        const userId = req.user._id;

        if (!status) {
            await GameStatus.findOneAndDelete({ user: userId, game: gameId });
            return res.status(200).json({ success: true, message: "Status removed" });
        }

        const updateData = { status };
        if (playTime !== undefined) updateData.playTime = playTime;
        if (startDate !== undefined) updateData.startDate = startDate || null;
        if (endDate !== undefined) updateData.endDate = endDate || null;
        if (ngPlus !== undefined) updateData.ngPlus = ngPlus;
        if (notes !== undefined) updateData.notes = notes;

        const gameStatus = await GameStatus.findOneAndUpdate(
            { user: userId, game: gameId },
            updateData,
            { returnDocument: 'after', upsert: true }
        );
        
        res.status(200).json({ success: true, data: gameStatus });
    } catch (error) { 
        next(error); 
    }
};

export const getUserStatuses = async (req, res, next) => {
    try {
        const statuses = await GameStatus.find({ user: req.user._id }).populate('game');
        res.status(200).json({ success: true, data: statuses });
    } catch (error) { 
        next(error); 
    }
};

const assertAdminCanManageUserLibrary = async (adminUser, targetUserId) => {
    const targetUser = await User.findById(targetUserId).select("-password");

    if (!targetUser) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (targetUser.role === "admin" && targetUser._id.toString() !== adminUser._id.toString()) {
        const error = new Error("Admins cannot override another admin's library");
        error.statusCode = 403;
        throw error;
    }

    return targetUser;
};

export const getStatusesByAdmin = async (req, res, next) => {
    try {
        const targetUser = await assertAdminCanManageUserLibrary(req.user, req.params.userId);
        const statuses = await GameStatus.find({ user: targetUser._id }).populate("game");

        res.status(200).json({ success: true, user: targetUser, data: statuses });
    } catch (error) {
        next(error);
    }
};

export const updateStatusByAdmin = async (req, res, next) => {
    try {
        const { userId, gameId } = req.params;
        const { status, playTime, startDate, endDate, ngPlus, notes } = req.body;

        const targetUser = await assertAdminCanManageUserLibrary(req.user, userId);

        if (!status) {
            await GameStatus.findOneAndDelete({ user: targetUser._id, game: gameId });
            return res.status(200).json({ success: true, message: "Status removed by admin" });
        }

        const updateData = { status };
        if (playTime !== undefined) updateData.playTime = playTime;
        if (startDate !== undefined) updateData.startDate = startDate || null;
        if (endDate !== undefined) updateData.endDate = endDate || null;
        if (ngPlus !== undefined) updateData.ngPlus = ngPlus;
        if (notes !== undefined) updateData.notes = notes;

        const gameStatus = await GameStatus.findOneAndUpdate(
            { user: targetUser._id, game: gameId },
            updateData,
            { returnDocument: "after", upsert: true }
        ).populate("game");

        res.status(200).json({ success: true, data: gameStatus });
    } catch (error) {
        next(error);
    }
};

export const deleteStatusByAdmin = async (req, res, next) => {
    try {
        const { userId, gameId } = req.params;
        const targetUser = await assertAdminCanManageUserLibrary(req.user, userId);

        await GameStatus.findOneAndDelete({ user: targetUser._id, game: gameId });
        res.status(200).json({ success: true, message: "Library entry deleted by admin" });
    } catch (error) {
        next(error);
    }
};
