import express from "express";
import dotenv from "dotenv";
import connectdb from "./config/db.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import errorHandler from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import gameRoutes from "./routes/gameRoutes.js"; 
import favoriteRoutes from "./routes/favoriteRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import statusRoutes from "./routes/statusRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";

dotenv.config();

connectdb();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/", gameRoutes); 
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/social", socialRoutes);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Successfully connected to PORT: ${PORT}`);
});
