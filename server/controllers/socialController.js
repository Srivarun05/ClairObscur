import User from "../models/User.js";
import Follow from "../models/Follow.js";
import Notification from "../models/Notification.js";
import Block from "../models/Block.js";
import Report from "../models/Report.js";

const publicUserFields = "username email profilePic role profileVisibility accountStatus createdAt";

const getFollowStats = async (userId) => {
    const [followersCount, followingCount] = await Promise.all([
        Follow.countDocuments({ following: userId, status: "accepted" }),
        Follow.countDocuments({ follower: userId, status: "accepted" })
    ]);

    return { followersCount, followingCount };
};

const getRelationship = async (viewerId, targetId) => {
    if (!viewerId || viewerId.toString() === targetId.toString()) return "self";
    const follow = await Follow.findOne({ follower: viewerId, following: targetId });
    return follow?.status || "none";
};

export const discoverUsers = async (req, res, next) => {
    try {
        const query = (req.query.q || "").trim();
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const searchFilter = escapedQuery
            ? {
                $or: [
                    { username: { $regex: escapedQuery, $options: "i" } },
                    { email: { $regex: escapedQuery, $options: "i" } }
                ]
            }
            : {};

        const users = await User.find({
            _id: { $ne: req.user._id },
            accountStatus: "active",
            ...searchFilter
        }).select(publicUserFields).sort({ username: 1 }).limit(20);

        const enriched = await Promise.all(users.map(async (user) => ({
            ...user.toObject(),
            ...(await getFollowStats(user._id)),
            relationship: await getRelationship(req.user._id, user._id)
        })));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        next(error);
    }
};

export const getPublicProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId).select(publicUserFields);
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        const relationship = await getRelationship(req.user?._id, user._id);
        const isAdmin = req.user?.role === "admin";
        const canViewDetails = isAdmin || user.profileVisibility === "public" || relationship === "accepted" || relationship === "self";
        const [followers, following, pendingRequests, blockedByUser, reports] = await Promise.all([
            Follow.find({ following: user._id, status: "accepted" }).populate("follower", publicUserFields),
            Follow.find({ follower: user._id, status: "accepted" }).populate("following", publicUserFields),
            isAdmin || relationship === "self" ? Follow.find({ following: user._id, status: "pending" }).populate("follower", publicUserFields) : [],
            isAdmin ? Block.find({ blocker: user._id }).populate("blocked", publicUserFields) : [],
            isAdmin ? Report.find({ reported: user._id }).populate("reporter", publicUserFields).sort({ createdAt: -1 }) : []
        ]);

        res.status(200).json({
            success: true,
            data: {
                user,
                relationship,
                canViewDetails,
                ...(await getFollowStats(user._id)),
                followers: canViewDetails || isAdmin ? followers.map(item => item.follower) : [],
                following: canViewDetails || isAdmin ? following.map(item => item.following) : [],
                pendingRequests,
                blockedUsers: blockedByUser,
                reports
            }
        });
    } catch (error) {
        next(error);
    }
};

export const followUser = async (req, res, next) => {
    try {
        const target = await User.findById(req.params.userId);
        if (!target) {
            res.status(404);
            throw new Error("User not found");
        }
        if (target._id.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error("You cannot follow yourself");
        }
        if (target.accountStatus === "blocked") {
            res.status(403);
            throw new Error("This account is blocked");
        }

        const status = target.profileVisibility === "private" ? "pending" : "accepted";
        const follow = await Follow.findOneAndUpdate(
            { follower: req.user._id, following: target._id },
            { status },
            { upsert: true, returnDocument: "after" }
        );

        await Notification.create({
            recipient: target._id,
            actor: req.user._id,
            type: status === "pending" ? "follow_request" : "follow",
            message: status === "pending"
                ? `${req.user.username} requested to follow you.`
                : `${req.user.username} followed you.`
        });

        res.status(200).json({ success: true, data: follow });
    } catch (error) {
        next(error);
    }
};

export const unfollowUser = async (req, res, next) => {
    try {
        await Follow.findOneAndDelete({ follower: req.user._id, following: req.params.userId });
        res.status(200).json({ success: true, message: "Unfollowed" });
    } catch (error) {
        next(error);
    }
};

export const getFollowRequests = async (req, res, next) => {
    try {
        const requests = await Follow.find({ following: req.user._id, status: "pending" })
            .populate("follower", publicUserFields)
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        next(error);
    }
};

export const respondToFollowRequest = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!["accepted", "declined"].includes(status)) {
            res.status(400);
            throw new Error("Invalid request status");
        }

        const request = await Follow.findOneAndUpdate(
            { _id: req.params.requestId, following: req.user._id, status: "pending" },
            { status },
            { returnDocument: "after" }
        ).populate("follower", publicUserFields);

        if (!request) {
            res.status(404);
            throw new Error("Follow request not found");
        }

        if (status === "accepted") {
            await Notification.create({
                recipient: request.follower._id,
                actor: req.user._id,
                type: "follow_accepted",
                message: `${req.user.username} accepted your follow request.`
            });
        }

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

export const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("actor", publicUserFields)
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        next(error);
    }
};

export const markNotificationsRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const reportUser = async (req, res, next) => {
    try {
        const reason = (req.body.reason || "").trim();
        if (reason.length < 10) {
            res.status(400);
            throw new Error("Please provide a specific report reason");
        }

        const report = await Report.create({
            reporter: req.user._id,
            reported: req.params.userId,
            reason
        });

        const admins = await User.find({ role: "admin" }).select("_id");
        if (admins.length > 0) {
            await Notification.insertMany(admins.map(admin => ({
                recipient: admin._id,
                actor: req.user._id,
                type: "report",
                message: `${req.user.username} reported an account for review.`,
                metadata: { reportId: report._id, reportedUserId: req.params.userId }
            })));
        }

        res.status(201).json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

export const blockUser = async (req, res, next) => {
    try {
        const block = await Block.findOneAndUpdate(
            { blocker: req.user._id, blocked: req.params.userId },
            { reason: req.body.reason || "" },
            { upsert: true, returnDocument: "after" }
        );
        await Follow.deleteMany({
            $or: [
                { follower: req.user._id, following: req.params.userId },
                { follower: req.params.userId, following: req.user._id }
            ]
        });
        res.status(200).json({ success: true, data: block });
    } catch (error) {
        next(error);
    }
};

export const getAdminSocialOverview = async (req, res, next) => {
    try {
        const users = await User.find({}).select(publicUserFields).sort({ createdAt: -1 });
        const rows = await Promise.all(users.map(async (user) => {
            const [stats, pendingRequestsCount, blockedUsersCount, reportsCount] = await Promise.all([
                getFollowStats(user._id),
                Follow.countDocuments({ following: user._id, status: "pending" }),
                Block.countDocuments({ blocker: user._id }),
                Report.countDocuments({ reported: user._id, status: "open" })
            ]);

            return {
                ...user.toObject(),
                ...stats,
                pendingRequestsCount,
                blockedUsersCount,
                reportsCount,
                fakeFollowerRisk: pendingRequestsCount > 10 || reportsCount > 3 ? "review" : "normal"
            };
        }));

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

export const getAdminReports = async (req, res, next) => {
    try {
        const reports = await Report.find({})
            .populate("reporter", publicUserFields)
            .populate("reported", publicUserFields)
            .populate("reviewedBy", publicUserFields)
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        next(error);
    }
};

export const reviewReport = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!["accepted", "declined"].includes(status)) {
            res.status(400);
            throw new Error("Invalid report review status");
        }

        const report = await Report.findByIdAndUpdate(
            req.params.reportId,
            {
                status,
                reviewedBy: req.user._id,
                reviewedAt: new Date()
            },
            { returnDocument: "after" }
        ).populate("reporter", publicUserFields).populate("reported", publicUserFields);

        if (!report) {
            res.status(404);
            throw new Error("Report not found");
        }

        await Notification.create({
            recipient: report.reporter._id,
            actor: req.user._id,
            type: "report",
            message: status === "accepted"
                ? `Your report about ${report.reported.username} was accepted by moderation.`
                : `Your report about ${report.reported.username} was declined by moderation.`
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};
