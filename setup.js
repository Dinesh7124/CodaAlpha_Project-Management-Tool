// setup.js — TaskFlow Pro auto file generator
// Usage: cd C:\Projects\ProjectManagementTool && node setup.js

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SERVER = path.join(ROOT, "server");
const CLIENT = path.join(ROOT, "client");

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.replace(/^\n/, ""), "utf8");
  console.log("  OK  " + path.relative(ROOT, filePath));
}

console.log("\nWriting SERVER files...\n");

write(path.join(SERVER, "package.json"), `
{
  "name": "taskflow-server",
  "version": "2.0.0",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dotenv": "^17.0.0",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.8.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.10",
    "prisma": "^6.19.3"
  }
}
`);

write(path.join(SERVER, ".env"), `
DATABASE_URL="file:./dev.db"
JWT_SECRET="taskflow_pro_super_secret_2026_change_me_in_production"
PORT=5000
CLIENT_URL="http://localhost:5173"
`);

write(path.join(SERVER, "server.js"), `
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./src/routes/authRoutes.js";
import projectRoutes from "./src/routes/projectRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import commentRoutes from "./src/routes/commentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import { setupSocket } from "./src/socket/index.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use((req, _res, next) => { req.io = io; next(); });

app.get("/", (_req, res) => {
  res.json({ success: true, message: "TaskFlow Pro API is running", version: "2.0.0" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

setupSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("\\n🚀 TaskFlow Pro API running on http://localhost:" + PORT);
  console.log("📡 Socket.IO ready\\n");
});
`);

write(path.join(SERVER, "src/config/prisma.js"), `
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis;
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`);

write(path.join(SERVER, "src/middleware/auth.js"), `
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "devsecret";

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "7d" });
}
`);

write(path.join(SERVER, "src/middleware/errorHandler.js"), `
export function notFound(req, res) {
  res.status(404).json({ error: "Route " + req.originalUrl + " not found" });
}

export function errorHandler(err, _req, res, _next) {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}
`);

write(path.join(SERVER, "src/utils/validate.js"), `
export function requireFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length) {
    const err = new Error("Missing fields: " + missing.join(", "));
    err.status = 400;
    throw err;
  }
}

export function isValidEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

export function pickAvatarColor(name) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f59e0b","#10b981","#06b6d4","#3b82f6"];
  const idx = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[idx % colors.length];
}
`);

write(path.join(SERVER, "src/socket/index.js"), `
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "devsecret";

export function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.user = jwt.verify(token, SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected: " + socket.user.email);
    socket.join("user:" + socket.user.id);

    socket.on("project:join", (id) => socket.join("project:" + id));
    socket.on("project:leave", (id) => socket.leave("project:" + id));
    socket.on("disconnect", () => console.log("User disconnected: " + socket.user.email));
  });
}
`);

write(path.join(SERVER, "src/controllers/authController.js"), `
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { signToken } from "../middleware/auth.js";
import { requireFields, isValidEmail, pickAvatarColor } from "../utils/validate.js";

export async function register(req, res, next) {
  try {
    const { email, name, password } = req.body;
    requireFields(req.body, ["email", "name", "password"]);
    if (!isValidEmail(email)) { const e = new Error("Invalid email"); e.status = 400; throw e; }
    if (password.length < 6) { const e = new Error("Password min 6 chars"); e.status = 400; throw e; }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { const e = new Error("Email already registered"); e.status = 409; throw e; }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hash, avatarColor: pickAvatarColor(name) },
    });
    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    requireFields(req.body, ["email", "password"]);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }
    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitize(user));
  } catch (err) { next(err); }
}

function sanitize(u) {
  return { id: u.id, email: u.email, name: u.name, avatarColor: u.avatarColor };
}
`);

write(path.join(SERVER, "src/controllers/projectController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function listProjects(req, res, next) {
  try {
    const projects = await prisma.project.findMany({
      where: { OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(projects.map((p) => ({ ...p, taskCount: p._count.tasks, _count: undefined })));
  } catch (err) { next(err); }
}

export async function createProject(req, res, next) {
  try {
    const { name, description, color } = req.body;
    requireFields(req.body, ["name"]);
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        color: color || "#6366f1",
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: "owner" } },
      },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        members: { include: { user: true } },
      },
    });
    res.status(201).json(project);
  } catch (err) { next(err); }
}

export async function getProject(req, res, next) {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarColor: true } },
            comments: { include: { author: { select: { id: true, name: true, avatarColor: true } } }, orderBy: { createdAt: "asc" } },
          },
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        },
      },
    });
    if (!project) { const e = new Error("Project not found"); e.status = 404; throw e; }
    res.json(project);
  } catch (err) { next(err); }
}

export async function updateProject(req, res, next) {
  try {
    const { name, description, color } = req.body;
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!existing) { const e = new Error("Only owner can update"); e.status = 403; throw e; }
    const project = await prisma.project.update({ where: { id: req.params.id }, data: { name, description, color } });
    req.io.to("project:" + req.params.id).emit("project:updated", project);
    res.json(project);
  } catch (err) { next(err); }
}

export async function deleteProject(req, res, next) {
  try {
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!existing) { const e = new Error("Only owner can delete"); e.status = 403; throw e; }
    await prisma.project.delete({ where: { id: req.params.id } });
    req.io.to("project:" + req.params.id).emit("project:deleted", { id: req.params.id });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function inviteMember(req, res, next) {
  try {
    const { email } = req.body;
    requireFields(req.body, ["email"]);
    const project = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!project) { const e = new Error("Only owner can invite"); e.status = 403; throw e; }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { const e = new Error("No user with that email"); e.status = 404; throw e; }
    const existing = await prisma.member.findFirst({ where: { projectId: req.params.id, userId: user.id } });
    if (existing) { const e = new Error("Already a member"); e.status = 409; throw e; }

    const member = await prisma.member.create({
      data: { projectId: req.params.id, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    });
    const notification = await prisma.notification.create({
      data: { userId: user.id, message: "You were invited to " + project.name, link: "/projects/" + req.params.id },
    });
    req.io.to("user:" + user.id).emit("notification", notification);
    req.io.to("project:" + req.params.id).emit("member:added", member);
    res.status(201).json(member);
  } catch (err) { next(err); }
}

export async function removeMember(req, res, next) {
  try {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!project) { const e = new Error("Only owner can remove"); e.status = 403; throw e; }
    if (req.params.userId === project.ownerId) { const e = new Error("Cannot remove owner"); e.status = 400; throw e; }
    await prisma.member.deleteMany({ where: { projectId: req.params.id, userId: req.params.userId } });
    req.io.to("project:" + req.params.id).emit("member:removed", { userId: req.params.userId });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

write(path.join(SERVER, "src/controllers/taskController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

async function assertProjectAccess(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
  });
  if (!project) { const e = new Error("Project not found"); e.status = 404; throw e; }
  return project;
}

export async function createTask(req, res, next) {
  try {
    const { projectId, title, description, status, priority, assigneeId, dueDate, order } = req.body;
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
        order: order ?? 0,
      },
      include: { assignee: { select: { id: true, name: true, avatarColor: true } }, comments: true },
    });
    req.io.to("project:" + projectId).emit("task:created", task);

    if (assigneeId && assigneeId !== req.user.id) {
      const notification = await prisma.notification.create({
        data: { userId: assigneeId, message: "You were assigned to " + title, link: "/projects/" + projectId },
      });
      req.io.to("user:" + assigneeId).emit("notification", notification);
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

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        comments: { include: { author: { select: { id: true, name: true, avatarColor: true } } } },
      },
    });
    req.io.to("project:" + task.projectId).emit("task:updated", task);
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
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

write(path.join(SERVER, "src/controllers/commentController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function createComment(req, res, next) {
  try {
    const { taskId, body } = req.body;
    requireFields(req.body, ["taskId", "body"]);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) { const e = new Error("Task not found"); e.status = 404; throw e; }

    const access = await prisma.project.findFirst({
      where: { id: task.projectId, OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }] },
    });
    if (!access) { const e = new Error("Access denied"); e.status = 403; throw e; }

    const comment = await prisma.comment.create({
      data: { taskId, body, authorId: req.user.id },
      include: { author: { select: { id: true, name: true, avatarColor: true } } },
    });
    req.io.to("project:" + task.projectId).emit("comment:created", comment);

    if (task.assigneeId && task.assigneeId !== req.user.id) {
      const notification = await prisma.notification.create({
        data: { userId: task.assigneeId, message: "New comment on " + task.title, link: "/projects/" + task.projectId },
      });
      req.io.to("user:" + task.assigneeId).emit("notification", notification);
    }
    res.status(201).json(comment);
  } catch (err) { next(err); }
}

export async function listTaskComments(req, res, next) {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.taskId },
      include: { author: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (err) { next(err); }
}

export async function deleteComment(req, res, next) {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) { const e = new Error("Comment not found"); e.status = 404; throw e; }
    if (comment.authorId !== req.user.id) { const e = new Error("Not your comment"); e.status = 403; throw e; }
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

write(path.join(SERVER, "src/controllers/notificationController.js"), `
import { prisma } from "../config/prisma.js";

export async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    const n = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!n) { const e = new Error("Not found"); e.status = 404; throw e; }
    const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

write(path.join(SERVER, "src/routes/authRoutes.js"), `
import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);
export default router;
`);

write(path.join(SERVER, "src/routes/projectRoutes.js"), `
import { Router } from "express";
import { listProjects, createProject, getProject, updateProject, deleteProject, inviteMember, removeMember } from "../controllers/projectController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/members", inviteMember);
router.delete("/:id/members/:userId", removeMember);
export default router;
`);

write(path.join(SERVER, "src/routes/taskRoutes.js"), `
import { Router } from "express";
import { createTask, updateTask, deleteTask } from "../controllers/taskController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
export default router;
`);

write(path.join(SERVER, "src/routes/commentRoutes.js"), `
import { Router } from "express";
import { createComment, listTaskComments, deleteComment } from "../controllers/commentController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.post("/", createComment);
router.get("/task/:taskId", listTaskComments);
router.delete("/:id", deleteComment);
export default router;
`);

write(path.join(SERVER, "src/routes/notificationRoutes.js"), `
import { Router } from "express";
import { listNotifications, markRead, markAllRead } from "../controllers/notificationController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.get("/", listNotifications);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);
export default router;
`);

write(path.join(SERVER, "prisma/schema.prisma"), `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  password      String
  avatarColor   String         @default("#6366f1")
  createdAt     DateTime       @default(now())
  ownedProjects Project[]      @relation("Owner")
  memberships   Member[]
  assignedTasks Task[]         @relation("Assignee")
  comments      Comment[]
  notifications Notification[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#6366f1")
  ownerId     String
  owner       User     @relation("Owner", fields: [ownerId], references: [id])
  members     Member[]
  tasks       Task[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Member {
  id        String  @id @default(cuid())
  userId    String
  projectId String
  role      String  @default("member")
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([userId, projectId])
}

model Task {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      String    @default("todo")
  priority    String    @default("medium")
  order       Int       @default(0)
  dueDate     DateTime?
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assigneeId  String?
  assignee    User?     @relation("Assignee", fields: [assigneeId], references: [id])
  comments    Comment[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  message   String
  link      String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
`);

console.log("\nWriting CLIENT files...\n");

write(path.join(CLIENT, "package.json"), `
{
  "name": "taskflow-client",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
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

write(path.join(CLIENT, "vite.config.js"), `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:5000" },
  },
});
`);

write(path.join(CLIENT, "tailwind.config.js"), `
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
`);

write(path.join(CLIENT, "postcss.config.js"), `
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
`);

write(path.join(CLIENT, "index.html"), `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskFlow Pro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`);

write(path.join(CLIENT, "src/index.css"), `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-100 text-slate-800;
  font-family: system-ui, -apple-system, sans-serif;
}

.btn { @apply px-4 py-2 rounded-lg font-medium transition; }
.btn-primary { @apply bg-indigo-600 text-white hover:bg-indigo-700; }
.btn-ghost { @apply text-slate-600 hover:bg-slate-200; }
.input { @apply w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500; }
.card { @apply bg-white rounded-xl shadow-sm border border-slate-200; }
`);

write(path.join(CLIENT, "src/main.jsx"), `
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
`);

write(path.join(CLIENT, "src/lib/api.js"), `
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
`);

write(path.join(CLIENT, "src/lib/utils.js"), `
export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
`);

write(path.join(CLIENT, "src/context/AuthContext.jsx"), `
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (token && u) setUser(JSON.parse(u));
    setLoading(false);
  }, []);

  const login = (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
`);

write(path.join(CLIENT, "src/context/SocketContext.jsx"), `
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    const socket = io("/", { auth: { token } });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
}
`);

write(path.join(CLIENT, "src/App.jsx"), `
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/projects/:id" element={<Private><ProjectPage /></Private>} />
      </Routes>
    </SocketProvider>
  );
}
`);

write(path.join(CLIENT, "src/components/ui/Button.jsx"), `
export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : "";
  return (
    <button className={"btn " + base + " " + className} {...props}>
      {children}
    </button>
  );
}
`);

write(path.join(CLIENT, "src/components/ui/Input.jsx"), `
export default function Input({ className = "", ...props }) {
  return <input className={"input " + className} {...props} />;
}
`);

write(path.join(CLIENT, "src/components/ui/Avatar.jsx"), `
import { initials } from "../../lib/utils.js";

export default function Avatar({ name, color = "#6366f1", size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
`);

write(path.join(CLIENT, "src/components/ui/Modal.jsx"), `
export default function Modal({ open, onClose, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className={"card w-full " + width + " max-h-[85vh] overflow-y-auto p-6"}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
`);

write(path.join(CLIENT, "src/components/ui/Badge.jsx"), `
export default function Badge({ children, color = "#6366f1" }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: color + "22", color }}
    >
      {children}
    </span>
  );
}
`);

write(path.join(CLIENT, "src/components/ui/Spinner.jsx"), `
export default function Spinner({ size = 24 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
      style={{ width: size, height: size }}
    />
  );
}
`);

write(path.join(CLIENT, "src/components/layout/Sidebar.jsx"), `
import { Link, useLocation } from "react-router-dom";

const items = [
  { to: "/", label: "Dashboard", icon: "🏠" },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="w-56 bg-white border-r border-slate-200 p-4 hidden md:block">
      <Link to="/" className="block text-xl font-bold text-indigo-600 mb-6">
        TaskFlow Pro
      </Link>
      <nav className="space-y-1">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className={
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm " +
              (pathname === it.to ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")
            }
          >
            <span>{it.icon}</span> {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
`);

write(path.join(CLIENT, "src/components/layout/Topbar.jsx"), `
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";
import Button from "../ui/Button.jsx";

export default function Topbar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-3">
        {user && (
          <>
            <Avatar name={user.name} color={user.avatarColor} />
            <span className="text-sm font-medium">{user.name}</span>
          </>
        )}
        <Button variant="ghost" onClick={logout}>Logout</Button>
      </div>
    </header>
  );
}
`);

write(path.join(CLIENT, "src/components/layout/Layout.jsx"), `
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
`);

write(path.join(CLIENT, "src/components/board/TaskCard.jsx"), `
export default function TaskCard({ task, onClick }) {
  const priorityColor = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" }[task.priority] || "#64748b";
  return (
    <div onClick={onClick} className="card p-3 cursor-pointer hover:shadow-md transition">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: priorityColor + "22", color: priorityColor }}
        >
          {task.priority}
        </span>
      </div>
      <p className="font-medium text-sm">{task.title}</p>
      {task.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        <span>{task.comments?.length ? "💬 " + task.comments.length : ""}</span>
        {task.assignee && (
          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {task.assignee.name}
          </span>
        )}
      </div>
    </div>
  );
}
`);

write(path.join(CLIENT, "src/components/board/Column.jsx"), `
import { useState } from "react";
import TaskCard from "./TaskCard.jsx";

export default function Column({ column, tasks, onCreate, onOpen }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate(column.id, title);
    setTitle("");
    setAdding(false);
  };

  return (
    <div className="bg-slate-200/60 rounded-xl p-3 min-h-[300px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-semibold">{column.title}</h2>
        <span className="text-xs bg-white px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => onOpen(t.id)} />)}
      </div>
      {adding ? (
        <form onSubmit={submit} className="mt-2">
          <input
            autoFocus
            className="input"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !title && setAdding(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-left text-sm text-slate-500 hover:text-slate-800 mt-2 px-2 py-1 rounded hover:bg-white/50"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
`);

write(path.join(CLIENT, "src/components/board/Board.jsx"), `
import Column from "./Column.jsx";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export default function Board({ tasks, onCreate, onOpen }) {
  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <Column
          key={col.id}
          column={col}
          tasks={tasksByStatus(col.id)}
          onCreate={onCreate}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
`);

write(path.join(CLIENT, "src/components/board/TaskModal.jsx"), `
import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Avatar from "../ui/Avatar.jsx";
import { timeAgo } from "../../lib/utils.js";

export default function TaskModal({ task, members, onClose, onUpdated, onDeleted, socket }) {
  const [localTask, setLocalTask] = useState(task);
  const [comment, setComment] = useState("");

  useEffect(() => { setLocalTask(task); }, [task]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onComment = (c) => {
      if (c.taskId === task.id) {
        setLocalTask((t) => ({ ...t, comments: [...(t.comments || []), c] }));
      }
    };
    s.on("comment:created", onComment);
    return () => s.off("comment:created", onComment);
  }, [socket, task.id]);

  const update = async (patch) => {
    const { data } = await api.patch("/tasks/" + task.id, patch);
    setLocalTask(data);
    onUpdated(data);
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post("/comments", { taskId: task.id, body: comment });
    setComment("");
  };

  const del = async () => {
    await api.delete("/tasks/" + task.id);
    onDeleted(task.id);
    onClose();
  };

  return (
    <Modal open onClose={onClose} width="max-w-2xl">
      <input
        className="text-xl font-bold w-full border-0 focus:outline-none"
        value={localTask.title}
        onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
        onBlur={() => update({ title: localTask.title })}
      />
      <textarea
        className="input mt-3"
        rows="3"
        placeholder="Description..."
        value={localTask.description || ""}
        onChange={(e) => setLocalTask({ ...localTask, description: e.target.value })}
        onBlur={() => update({ description: localTask.description })}
      />

      <div className="grid grid-cols-3 gap-3 mt-4">
        <select
          className="input"
          value={localTask.status}
          onChange={(e) => update({ status: e.target.value })}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          className="input"
          value={localTask.priority}
          onChange={(e) => update({ priority: e.target.value })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          className="input"
          value={localTask.assigneeId || ""}
          onChange={(e) => update({ assigneeId: e.target.value || null })}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
          ))}
        </select>
      </div>

      <h3 className="font-semibold mt-6 mb-3">Comments</h3>
      <div className="space-y-2 mb-4">
        {localTask.comments?.map((c) => (
          <div key={c.id} className="flex gap-3 bg-slate-50 rounded-lg p-3">
            <Avatar name={c.author?.name} color={c.author?.avatarColor} size={28} />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{c.author?.name}</span>
                <span className="text-slate-400 text-xs">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm mt-0.5">{c.body}</p>
            </div>
          </div>
        ))}
        {(!localTask.comments || localTask.comments.length === 0) && (
          <p className="text-sm text-slate-400">No comments yet.</p>
        )}
      </div>
      <form onSubmit={postComment} className="flex gap-2">
        <input
          className="input"
          placeholder="Write a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button type="submit">Post</Button>
      </form>

      <div className="flex justify-between mt-6">
        <button onClick={del} className="text-red-600 text-sm hover:underline">Delete task</button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
`);

write(path.join(CLIENT, "src/components/notifications/NotificationPanel.jsx"), `
import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { timeAgo } from "../../lib/utils.js";

export default function NotificationPanel({ socket }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/notifications").then((r) => setItems(r.data.notifications));
  }, []);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onN = (n) => setItems((prev) => [n, ...prev]);
    s.on("notification", onN);
    return () => s.off("notification", onN);
  }, [socket]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative px-3 py-1 rounded-lg hover:bg-slate-100"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 max-h-96 overflow-y-auto z-50">
          {items.length === 0 && <p className="p-4 text-sm text-slate-400">No notifications</p>}
          {items.map((n) => (
            <div key={n.id} className={"p-3 border-b border-slate-100 " + (n.read ? "" : "bg-indigo-50/50")}>
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`);

write(path.join(CLIENT, "src/pages/Login.jsx"), `
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/" + mode, form);
      login(data.token, data.user);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
          TaskFlow Pro
        </h1>
        <p className="text-slate-500 mb-6 text-sm">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>
        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full">
            {mode === "login" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          {mode === "login" ? "Create account" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
`);

write(path.join(CLIENT, "src/pages/Dashboard.jsx"), `
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/layout/Layout.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useSocket } from "../context/SocketContext.jsx";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

export default function Dashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");

  const load = () => api.get("/projects").then((r) => setProjects(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    await api.post("/projects", { name, color });
    setName("");
    load();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Projects</h1>
            <p className="text-slate-500 text-sm">Welcome back, {user?.name}</p>
          </div>
          <NotificationPanel socket={socket} />
        </div>

        <form onSubmit={create} className="flex gap-2 mb-8">
          <Input
            placeholder="New project name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit">Create</Button>
        </form>

        <div className="grid md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={"/projects/" + p.id}
              className="card p-5 hover:shadow-lg transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg"
                  style={{ background: p.color + "22", border: "2px solid " + p.color }}
                />
                <h3 className="font-semibold text-lg group-hover:text-indigo-600">{p.name}</h3>
              </div>
              <p className="text-sm text-slate-500">
                {p.members?.length || 0} member{p.members?.length !== 1 ? "s" : ""} · {p.taskCount || 0} tasks
              </p>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-12">
              No projects yet. Create your first one above.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
`);

write(path.join(CLIENT, "src/pages/ProjectPage.jsx"), `
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import Board from "../components/board/Board.jsx";
import TaskModal from "../components/board/TaskModal.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useSocket } from "../context/SocketContext.jsx";

export default function ProjectPage() {
  const { id } = useParams();
  const socket = useSocket();
  const [project, setProject] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(null);

  const load = useCallback(() => api.get("/projects/" + id).then((r) => setProject(r.data)), [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    s.emit("project:join", id);

    const upsert = (task) => setProject((p) => {
      if (!p) return p;
      const tasks = p.tasks.some((t) => t.id === task.id)
        ? p.tasks.map((t) => (t.id === task.id ? task : t))
        : [...p.tasks, task];
      return { ...p, tasks };
    });

    s.on("task:created", upsert);
    s.on("task:updated", upsert);
    s.on("task:deleted", ({ id: tid }) => setProject((p) =>
      p ? { ...p, tasks: p.tasks.filter((t) => t.id !== tid) } : p));
    s.on("comment:created", (c) => setProject((p) => {
      if (!p) return p;
      return {
        ...p,
        tasks: p.tasks.map((t) => t.id === c.taskId ? { ...t, comments: [...(t.comments || []), c] } : t),
      };
    }));
    s.on("member:added", () => load());

    return () => {
      s.emit("project:leave", id);
      s.off("task:created"); s.off("task:updated"); s.off("task:deleted");
      s.off("comment:created"); s.off("member:added");
    };
  }, [id, load, socket]);

  if (!project) return <Layout><div className="text-center py-12 text-slate-500">Loading...</div></Layout>;

  const createTask = async (status, title) => {
    await api.post("/tasks", { projectId: id, title, status });
  };

  const invite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await api.post("/projects/" + id + "/members", { email: inviteEmail });
      setInviteEmail("");
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  const activeTask = activeTaskId ? project.tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back</Link>
          <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: project.color }}>{project.name}</h1>
              {project.description && <p className="text-slate-500 text-sm mt-1">{project.description}</p>}
              <p className="text-xs text-slate-400 mt-1">
                {project.members.map((m) => m.user.name).join(", ")}
              </p>
            </div>
            <form onSubmit={invite} className="flex gap-2">
              <Input
                placeholder="Invite by email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button type="submit">Invite</Button>
            </form>
          </div>
        </div>

        <Board
          tasks={project.tasks}
          onCreate={createTask}
          onOpen={setActiveTaskId}
        />

        {activeTask && (
          <TaskModal
            task={activeTask}
            members={project.members}
            socket={socket}
            onClose={() => setActiveTaskId(null)}
            onUpdated={(t) => setProject((p) => ({
              ...p,
              tasks: p.tasks.map((x) => (x.id === t.id ? t : x)),
            }))}
            onDeleted={(tid) => setProject((p) => ({
              ...p,
              tasks: p.tasks.filter((x) => x.id !== tid),
            }))}
          />
        )}
      </div>
    </Layout>
  );
}
`);

console.log("\n✅ All files written successfully!\n");
console.log("Next steps:");
console.log("  1. cd server");
console.log("  2. npm install");
console.log("  3. npx prisma generate");
console.log("  4. npx prisma db push");
console.log("  5. npm run dev");
console.log("  In another terminal:");
console.log("  6. cd client");
console.log("  7. npm install");
console.log("  8. npm run dev");
console.log("");