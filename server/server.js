import express from "express";
import { createServer } from "http";
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
import messageRoutes from "./routes/messageRoutes.js";
import { initializeSocket } from "./utils/socket.js";

dotenv.config();

connectdb();

const app = express();
const server = createServer(app);

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());

app.use("/api/", gameRoutes); 
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/messages", messageRoutes);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

initializeSocket(server);

server.listen(PORT, () => {
    console.log(`Successfully connected to PORT: ${PORT}`);
});
