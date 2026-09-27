// setup-advanced.js — TaskFlow Pro v3 (Advanced)
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const S = path.join(ROOT, "server");
const C = path.join(ROOT, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  ✓ " + path.relative(ROOT, p));
}

console.log("\n📦 SERVER files...\n");

// ============ server.js ============
w(path.join(S, "server.js"), `
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import authRoutes from "./src/routes/authRoutes.js";
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

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use((req, _res, next) => { req.io = io; next(); });

app.get("/", (_req, res) => {
  res.json({ success: true, message: "TaskFlow Pro API v3", version: "3.0.0" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/subtasks", subtaskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);
setupSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("\\n🚀 TaskFlow Pro v3 on http://localhost:" + PORT);
  console.log("📡 Socket.IO ready\\n");
});
`);

// ============ middleware/upload.js ============
w(path.join(S, "src/middleware/upload.js"), `
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
`);

// ============ middleware/permissions.js ============
w(path.join(S, "src/middleware/permissions.js"), `
import { prisma } from "../config/prisma.js";

const ROLE_LEVELS = { viewer: 1, member: 2, admin: 3, owner: 4 };

export async function requireProjectRole(projectId, userId, minRole = "member") {
  const member = await prisma.member.findFirst({
    where: { projectId, userId },
  });
  if (!member) {
    const e = new Error("Access denied");
    e.status = 403;
    throw e;
  }
  if (ROLE_LEVELS[member.role] < ROLE_LEVELS[minRole]) {
    const e = new Error("Insufficient permissions");
    e.status = 403;
    throw e;
  }
  return member;
}
`);

// ============ controllers/labelController.js ============
w(path.join(S, "src/controllers/labelController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function listLabels(req, res, next) {
  try {
    const labels = await prisma.label.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: "asc" },
    });
    res.json(labels);
  } catch (err) { next(err); }
}

export async function createLabel(req, res, next) {
  try {
    const { projectId, name, color } = req.body;
    requireFields(req.body, ["projectId", "name"]);
    const label = await prisma.label.create({
      data: { projectId, name, color: color || "#6366f1" },
    });
    req.io.to("project:" + projectId).emit("label:created", label);
    res.status(201).json(label);
  } catch (err) { next(err); }
}

export async function deleteLabel(req, res, next) {
  try {
    await prisma.label.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function addLabelToTask(req, res, next) {
  try {
    const { taskId, labelId } = req.body;
    const tl = await prisma.taskLabel.create({
      data: { taskId, labelId },
      include: { label: true },
    });
    res.status(201).json(tl);
  } catch (err) { next(err); }
}

export async function removeLabelFromTask(req, res, next) {
  try {
    const { taskId, labelId } = req.params;
    await prisma.taskLabel.deleteMany({ where: { taskId, labelId } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============ controllers/subtaskController.js ============
w(path.join(S, "src/controllers/subtaskController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function createSubtask(req, res, next) {
  try {
    const { taskId, title } = req.body;
    requireFields(req.body, ["taskId", "title"]);
    const count = await prisma.subtask.count({ where: { taskId } });
    const sub = await prisma.subtask.create({
      data: { taskId, title, order: count },
    });
    res.status(201).json(sub);
  } catch (err) { next(err); }
}

export async function toggleSubtask(req, res, next) {
  try {
    const { id } = req.params;
    const sub = await prisma.subtask.findUnique({ where: { id } });
    const updated = await prisma.subtask.update({
      where: { id },
      data: { completed: !sub.completed },
    });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function deleteSubtask(req, res, next) {
  try {
    await prisma.subtask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============ controllers/attachmentController.js ============
w(path.join(S, "src/controllers/attachmentController.js"), `
import { prisma } from "../config/prisma.js";

export async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId required" });

    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.originalname,
        url: "/uploads/" + req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
        taskId,
        uploaderId: req.user.id,
      },
    });
    res.status(201).json(attachment);
  } catch (err) { next(err); }
}

export async function listTaskAttachments(req, res, next) {
  try {
    const files = await prisma.attachment.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { createdAt: "desc" },
    });
    res.json(files);
  } catch (err) { next(err); }
}

export async function deleteAttachment(req, res, next) {
  try {
    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============ controllers/analyticsController.js ============
w(path.join(S, "src/controllers/analyticsController.js"), `
import { prisma } from "../config/prisma.js";

export async function projectAnalytics(req, res, next) {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({ where: { projectId } });

    const byStatus = { todo: 0, in_progress: 0, review: 0, done: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    let overdue = 0;

    const now = new Date();
    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.dueDate && new Date(t.dueDate) < now && t.status !== "done") overdue++;
    }

    const members = await prisma.member.count({ where: { projectId } });
    const comments = await prisma.comment.count({
      where: { task: { projectId } },
    });

    res.json({
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      members,
      comments,
      completionRate: tasks.length ? Math.round((byStatus.done / tasks.length) * 100) : 0,
    });
  } catch (err) { next(err); }
}

export async function globalAnalytics(req, res, next) {
  try {
    const projects = await prisma.project.findMany({
      where: { OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] },
      include: { tasks: true },
    });
    const totalTasks = projects.reduce((a, p) => a + p.tasks.length, 0);
    const doneTasks = projects.reduce((a, p) => a + p.tasks.filter((t) => t.status === "done").length, 0);
    res.json({
      totalProjects: projects.length,
      totalTasks,
      doneTasks,
      completionRate: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    });
  } catch (err) { next(err); }
}
`);

// ============ controllers/activityController.js ============
w(path.join(S, "src/controllers/activityController.js"), `
import { prisma } from "../config/prisma.js";

export async function logActivity(userId, projectId, action, meta) {
  return prisma.activity.create({
    data: { userId, projectId, action, meta: meta ? JSON.stringify(meta) : null },
  });
}

export async function listActivity(req, res, next) {
  try {
    const activities = await prisma.activity.findMany({
      where: { projectId: req.params.projectId },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(activities);
  } catch (err) { next(err); }
}
`);

// ============ controllers/userController.js ============
w(path.join(S, "src/controllers/userController.js"), `
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";

export async function updateProfile(req, res, next) {
  try {
    const { name, bio, theme, avatarColor } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, bio, theme, avatarColor },
    });
    res.json({ id: user.id, email: user.email, name: user.name, bio: user.bio, theme: user.theme, avatarColor: user.avatarColor });
  } catch (err) { next(err); }
}

export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "Both passwords required" });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(401).json({ error: "Wrong password" });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function searchUsers(req, res, next) {
  try {
    const q = req.query.q || "";
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.id } },
          q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {},
        ],
      },
      select: { id: true, name: true, email: true, avatarColor: true },
      take: 20,
    });
    res.json(users);
  } catch (err) { next(err); }
}
`);

// ============ routes ============
w(path.join(S, "src/routes/labelRoutes.js"), `
import { Router } from "express";
import { listLabels, createLabel, deleteLabel, addLabelToTask, removeLabelFromTask } from "../controllers/labelController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.get("/:projectId", listLabels);
r.post("/", createLabel);
r.delete("/:id", deleteLabel);
r.post("/task/add", addLabelToTask);
r.delete("/task/:taskId/:labelId", removeLabelFromTask);
export default r;
`);

w(path.join(S, "src/routes/subtaskRoutes.js"), `
import { Router } from "express";
import { createSubtask, toggleSubtask, deleteSubtask } from "../controllers/subtaskController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.post("/", createSubtask);
r.patch("/:id/toggle", toggleSubtask);
r.delete("/:id", deleteSubtask);
export default r;
`);

w(path.join(S, "src/routes/attachmentRoutes.js"), `
import { Router } from "express";
import { uploadAttachment, listTaskAttachments, deleteAttachment } from "../controllers/attachmentController.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const r = Router();
r.use(auth);
r.post("/", upload.single("file"), uploadAttachment);
r.get("/task/:taskId", listTaskAttachments);
r.delete("/:id", deleteAttachment);
export default r;
`);

w(path.join(S, "src/routes/analyticsRoutes.js"), `
import { Router } from "express";
import { projectAnalytics, globalAnalytics } from "../controllers/analyticsController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.get("/global", globalAnalytics);
r.get("/project/:projectId", projectAnalytics);
export default r;
`);

w(path.join(S, "src/routes/activityRoutes.js"), `
import { Router } from "express";
import { listActivity } from "../controllers/activityController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.get("/:projectId", listActivity);
export default r;
`);

w(path.join(S, "src/routes/userRoutes.js"), `
import { Router } from "express";
import { updateProfile, changePassword, searchUsers } from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);
r.patch("/me", updateProfile);
r.patch("/me/password", changePassword);
r.get("/search", searchUsers);
export default r;
`);

// ============ updated taskController with activity logging ============
w(path.join(S, "src/controllers/taskController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";
import { logActivity } from "./activityController.js";

async function assertProjectAccess(projectId, userId) {
  const p = await prisma.project.findFirst({
    where: { id: projectId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
  });
  if (!p) { const e = new Error("Project not found"); e.status = 404; throw e; }
  return p;
}

export async function createTask(req, res, next) {
  try {
    const { projectId, title, description, status, priority, assigneeId, dueDate, startDate, estimatedHrs, labelIds } = req.body;
    requireFields(req.body, ["projectId", "title"]);
    const project = await assertProjectAccess(projectId, req.user.id);

    const task = await prisma.task.create({
      data: {
        projectId, title,
        description: description || null,
        status: status || "todo",
        priority: priority || "medium",
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        estimatedHrs: estimatedHrs || null,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        comments: true, subtasks: true, attachments: true,
        labels: { include: { label: true } },
      },
    });

    if (labelIds?.length) {
      await prisma.taskLabel.createMany({
        data: labelIds.map((labelId) => ({ taskId: task.id, labelId })),
      });
      task.labels = await prisma.taskLabel.findMany({
        where: { taskId: task.id }, include: { label: true },
      });
    }

    req.io.to("project:" + projectId).emit("task:created", task);
    await logActivity(req.user.id, projectId, "created_task", { taskId: task.id, title });

    if (assigneeId && assigneeId !== req.user.id) {
      const notif = await prisma.notification.create({
        data: {
          userId: assigneeId, type: "task_assigned",
          message: "You were assigned to " + title, link: "/projects/" + projectId,
        },
      });
      req.io.to("user:" + assigneeId).emit("notification", notif);
    }
    res.status(201).json(task);
  } catch (err) { next(err); }
}

export async function updateTask(req, res, next) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) { const e = new Error("Task not found"); e.status = 404; throw e; }
    await assertProjectAccess(existing.projectId, req.user.id);

    const data = {};
    ["title","description","status","priority","order"].forEach((k) => {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    });
    if (req.body.assigneeId !== undefined) data.assigneeId = req.body.assigneeId || null;
    if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.startDate !== undefined) data.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    if (req.body.estimatedHrs !== undefined) data.estimatedHrs = req.body.estimatedHrs;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        comments: { include: { author: { select: { id: true, name: true, avatarColor: true } } } },
        subtasks: { orderBy: { order: "asc" } },
        attachments: true,
        labels: { include: { label: true } },
      },
    });

    req.io.to("project:" + task.projectId).emit("task:updated", task);
    if (req.body.status !== undefined && req.body.status !== existing.status) {
      await logActivity(req.user.id, task.projectId, "moved_task", {
        taskId: task.id, from: existing.status, to: req.body.status,
      });
    }
    res.json(task);
  } catch (err) { next(err); }
}

export async function deleteTask(req, res, next) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) { const e = new Error("Task not found"); e.status = 404; throw e; }
    await assertProjectAccess(existing.projectId, req.user.id);
    await prisma.task.delete({ where: { id: req.params.id } });
    req.io.to("project:" + existing.projectId).emit("task:deleted", { id: req.params.id });
    await logActivity(req.user.id, existing.projectId, "deleted_task", { title: existing.title });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

console.log("\n📦 CLIENT files...\n");

// ============ Client: package.json ============
w(path.join(C, "package.json"), `
{
  "name": "taskflow-client",
  "private": true,
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "axios": "^1.7.7",
    "date-fns": "^4.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.15.0",
    "socket.io-client": "^4.8.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "vite": "^5.4.11"
  }
}
`);

// ============ index.css ============
w(path.join(C, "src/index.css"), `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
}

.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
}

* { box-sizing: border-box; }

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  transition: background 0.3s, color 0.3s;
  margin: 0;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.dark ::-webkit-scrollbar-thumb { background: #475569; }

/* Glass card */
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.dark .glass {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(71, 85, 105, 0.4);
}

@layer components {
  .btn { @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2; }
  .btn-primary { @apply bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95; }
  .btn-ghost { @apply text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50; }
  .btn-danger { @apply bg-red-500 text-white hover:bg-red-600; }
  .input { @apply w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition; }
  .card { @apply bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slideUp 0.3s ease-out; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in { animation: fadeIn 0.2s ease-out; }

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
.pulse-ring { animation: pulse-ring 1.5s infinite; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
`);

// ============ contexts/ThemeContext.jsx ============
w(path.join(C, "src/context/ThemeContext.jsx"), `
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
`);

// ============ main.jsx ============
w(path.join(C, "src/main.jsx"), `
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
`);

// ============ ui/Button.jsx (updated) ============
w(path.join(C, "src/components/ui/Button.jsx"), `
export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    danger: "btn-danger",
  }[variant] || "";
  return (
    <button className={"btn " + base + " " + className} {...props}>
      {children}
    </button>
  );
}
`);

// ============ ui/Input.jsx ============
w(path.join(C, "src/components/ui/Input.jsx"), `
export default function Input({ className = "", ...props }) {
  return <input className={"input " + className} {...props} />;
}
`);

// ============ ui/Avatar.jsx ============
w(path.join(C, "src/components/ui/Avatar.jsx"), `
function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Avatar({ name, color = "#6366f1", size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
`);

// ============ ui/Modal.jsx (updated with animations) ============
w(path.join(C, "src/components/ui/Modal.jsx"), `
export default function Modal({ open, onClose, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={"glass w-full " + width + " max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl animate-slide-up"}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
`);

// ============ ui/Badge.jsx ============
w(path.join(C, "src/components/ui/Badge.jsx"), `
export default function Badge({ children, color = "#6366f1" }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center"
      style={{ background: color + "22", color }}
    >
      {children}
    </span>
  );
}
`);

// ============ ui/Spinner.jsx ============
w(path.join(C, "src/components/ui/Spinner.jsx"), `
export default function Spinner({ size = 24 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
      style={{ width: size, height: size }}
    />
  );
}
`);

// ============ ui/Tooltip.jsx ============
w(path.join(C, "src/components/ui/Tooltip.jsx"), `
export default function Tooltip({ children, text }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
        {text}
      </div>
    </div>
  );
}
`);

// ============ ui/ThemeToggle.jsx ============
w(path.join(C, "src/components/ui/ThemeToggle.jsx"), `
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
      title="Toggle theme"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
`);

// ============ lib/utils.js (extended) ============
w(path.join(C, "src/lib/utils.js"), `
export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return new Date(date).toLocaleDateString();
}

export function isOverdue(date) {
  return date && new Date(date) < new Date();
}

export function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const PRIORITY_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#dc2626",
};

export const STATUS_INFO = {
  todo: { label: "To Do", color: "#94a3b8", emoji: "📝" },
  in_progress: { label: "In Progress", color: "#3b82f6", emoji: "⚡" },
  review: { label: "Review", color: "#8b5cf6", emoji: "👀" },
  done: { label: "Done", color: "#10b981", emoji: "✅" },
};

export const PROJECT_ICONS = ["📁", "🚀", "🎯", "💡", "🔥", "⭐", "🏆", "💼", "📊", "🛠️", "🎨", "📱"];
export const PROJECT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#a855f7"];
`);

console.log("\n✅ All advanced files written!\n");
console.log("Next:");
console.log("  1. cd server");
console.log("  2. npm install multer");
console.log("  3. npx prisma db push");
console.log("  4. npm run dev");
console.log("  5. In another terminal: cd client && npm install && npm run dev");
console.log("");