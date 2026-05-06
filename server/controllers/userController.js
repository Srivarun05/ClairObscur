import User from "../models/User.js"; 
import fs from "fs";

export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select("-password");
        
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        if (user._id.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error("You cannot delete your own admin account");
        }

        if (req.user.role === 'admin' && user.role === 'admin') {
            res.status(403);
            throw new Error("Admins cannot delete other Admins");
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("-password");

        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        if (req.body.username) {
            user.username = req.body.username;
        }

        if (req.body.profileVisibility && ["public", "private"].includes(req.body.profileVisibility)) {
            user.profileVisibility = req.body.profileVisibility;
        }

        if (req.file) {
            if (user.profilePic) {
                fs.unlink(user.profilePic, (err) => {
                    if (err) console.error("Failed to delete old profile picture:", err);
                });
            }
            user.profilePic = req.file.path.replace(/\\/g, "/");
        }

        const updatedUser = await user.save();

        res.status(200).json({
            success: true,
            data: {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                profilePic: updatedUser.profilePic,
                role: updatedUser.role,
                profileVisibility: updatedUser.profileVisibility,
                accountStatus: updatedUser.accountStatus
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateUserByAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        if (req.user.role === 'admin' && user.role === 'admin') {
            res.status(403);
            throw new Error("Admins cannot edit the details of other Admins");
        }

        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        if (req.body.accountStatus && ["active", "blocked"].includes(req.body.accountStatus)) {
            user.accountStatus = req.body.accountStatus;
        }
        if (req.body.profileVisibility && ["public", "private"].includes(req.body.profileVisibility)) {
            user.profileVisibility = req.body.profileVisibility;
        }

        const updatedUser = await user.save();

        res.status(200).json({ 
            success: true, 
            data: updatedUser 
        });
    } catch (error) {
        next(error);
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        if (user._id.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error("You cannot change your own role");
        }

        if (req.user.role === 'admin' && user.role === 'admin') {
            res.status(403);
            throw new Error("Admins cannot modify the roles of other Admins");
        }

        user.role = req.body.role || user.role;
        const updatedUser = await user.save();

        res.status(200).json({ 
            success: true, 
            data: updatedUser 
        });
    } catch (error) {
        next(error);
    }
};
