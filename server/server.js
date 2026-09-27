import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import viewRoutes from "./src/routes/viewRoutes.js";
// ============================================================
// ROUTE IMPORTS
// ============================================================
import authRoutes from "./src/routes/authRoutes.js";
import passwordRoutes from "./src/routes/passwordRoutes.js";
import projectRoutes from "./src/routes/projectRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import commentRoutes from "./src/routes/commentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import labelRoutes from "./src/routes/labelRoutes.js";
import attachmentRoutes from "./src/routes/attachmentRoutes.js";
import subtaskRoutes from "./src/routes/subtaskRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import activityRoutes from "./src/routes/activityRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";

// ============================================================
// MIDDLEWARE / SETUP
// ============================================================
import { setupSocket } from "./src/socket/index.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use((req, _res, next) => { req.io = io; next(); });

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/", (_req, res) => {
  res.json({ success: true, message: "TaskFlow Pro API v3", version: "3.0.0" });
});

// ============================================================
// API ROUTES
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/views", viewRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/subtasks", subtaskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/users", userRoutes);

// ============================================================
// ERROR HANDLERS
// ============================================================
app.use(notFound);
app.use(errorHandler);

// ============================================================
// SOCKET.IO
// ============================================================
setupSocket(io);

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("\n🚀 TaskFlow Pro v3 on http://localhost:" + PORT);
  console.log("📡 Socket.IO ready\n");
});