import express from "express";
import {
  setGameStatus,
  getUserStatuses,
  getStatusesByAdmin,
  updateStatusByAdmin,
  deleteStatusByAdmin
} from "../controllers/statusController.js";
import { protect, adminOnly } from "../middlewares/auth.js";

const router = express.Router();

router.get("/admin/users/:userId", protect, adminOnly, getStatusesByAdmin);
router.put("/admin/users/:userId/games/:gameId", protect, adminOnly, updateStatusByAdmin);
router.delete("/admin/users/:userId/games/:gameId", protect, adminOnly, deleteStatusByAdmin);

router.get("/", protect, getUserStatuses);
router.put("/:gameId", protect, setGameStatus);

export default router;
