import express from "express";
import {
  blockUser,
  discoverUsers,
  followUser,
  getAdminSocialOverview,
  getAdminReports,
  getFollowRequests,
  getNotifications,
  getPublicProfile,
  markNotificationsRead,
  reportUser,
  reviewReport,
  respondToFollowRequest,
  unfollowUser
} from "../controllers/socialController.js";
import { adminOnly, protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/users", protect, discoverUsers);
router.get("/profiles/:userId", protect, getPublicProfile);
router.post("/profiles/:userId/follow", protect, followUser);
router.delete("/profiles/:userId/follow", protect, unfollowUser);
router.post("/profiles/:userId/report", protect, reportUser);
router.post("/profiles/:userId/block", protect, blockUser);

router.get("/requests", protect, getFollowRequests);
router.put("/requests/:requestId", protect, respondToFollowRequest);

router.get("/notifications", protect, getNotifications);
router.put("/notifications/read", protect, markNotificationsRead);

router.get("/admin/overview", protect, adminOnly, getAdminSocialOverview);
router.get("/admin/reports", protect, adminOnly, getAdminReports);
router.put("/admin/reports/:reportId", protect, adminOnly, reviewReport);

export default router;
