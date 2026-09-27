// fix-v6.js — Fix all 18 failed tests
const fs = require("fs");
const path = require("path");

const S = path.join(__dirname, "server");
const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  ✓ " + path.relative(__dirname, p));
}

console.log("\n🔧 Fixing 18 failed tests...\n");

// ============================================================
// A3 FIX — Better login error message
// ============================================================
w(path.join(S, "src/controllers/authController.js"), `
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { signToken } from "../middleware/auth.js";
import { requireFields, isValidEmail, pickAvatarColor } from "../utils/validate.js";

export async function register(req, res, next) {
  try {
    const { email, name, password } = req.body;
    requireFields(req.body, ["email", "name", "password"]);

    if (!isValidEmail(email)) {
      const e = new Error("Please enter a valid email address");
      e.status = 400;
      throw e;
    }
    if (password.length < 6) {
      const e = new Error("Password must be at least 6 characters long");
      e.status = 400;
      throw e;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const e = new Error("This email is already registered. Try logging in instead.");
      e.status = 409;
      throw e;
    }

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
    if (!user) {
      const e = new Error("No account found with this email. Please register first.");
      e.status = 401;
      throw e;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const e = new Error("Incorrect password. Please try again.");
      e.status = 401;
      throw e;
    }

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
  return { id: u.id, email: u.email, name: u.name, avatarColor: u.avatarColor, theme: u.theme, bio: u.bio };
}
`);

// ============================================================
// B5 FIX + C8 FIX — Project members count + optimistic drag
// ============================================================
w(path.join(S, "src/controllers/projectController.js"), `
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
    res.json(projects.map((p) => ({
      ...p,
      taskCount: p._count.tasks,
      memberCount: p.members.length,
      _count: undefined,
    })));
  } catch (err) { next(err); }
}

export async function createProject(req, res, next) {
  try {
    const { name, description, color, icon } = req.body;
    requireFields(req.body, ["name"]);

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        color: color || "#6366f1",
        icon: icon || "📁",
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: "owner" } },
      },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
      },
    });
    res.status(201).json(project);
  } catch (err) { next(err); }
}

export async function getProject(req, res, next) {
  try {
    const { id } = req.params;
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }],
      },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatarColor: true } },
            comments: { include: { author: { select: { id: true, name: true, avatarColor: true } } }, orderBy: { createdAt: "asc" } },
            subtasks: { orderBy: { order: "asc" } },
            attachments: true,
            labels: { include: { label: true } },
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
    const { id } = req.params;
    const { name, description, color, icon } = req.body;
    const existing = await prisma.project.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existing) { const e = new Error("Only owner can update"); e.status = 403; throw e; }
    const project = await prisma.project.update({ where: { id }, data: { name, description, color, icon } });
    req.io.to("project:" + id).emit("project:updated", project);
    res.json(project);
  } catch (err) { next(err); }
}

export async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.project.findFirst({ where: { id, ownerId: req.user.id } });
    if (!existing) { const e = new Error("Only owner can delete"); e.status = 403; throw e; }
    await prisma.project.delete({ where: { id } });
    req.io.to("project:" + id).emit("project:deleted", { id });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function inviteMember(req, res, next) {
  try {
    const { id } = req.params;
    const { email } = req.body;
    requireFields(req.body, ["email"]);
    const project = await prisma.project.findFirst({ where: { id, ownerId: req.user.id } });
    if (!project) {
      const member = await prisma.member.findFirst({
        where: { projectId: id, userId: req.user.id, role: { in: ["admin"] } },
      });
      if (!member) { const e = new Error("Only owner or admin can invite"); e.status = 403; throw e; }
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { const e = new Error("No user found with that email"); e.status = 404; throw e; }
    const existing = await prisma.member.findFirst({ where: { projectId: id, userId: user.id } });
    if (existing) { const e = new Error("User is already a member"); e.status = 409; throw e; }
    const member = await prisma.member.create({
      data: { projectId: id, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    });
    const notification = await prisma.notification.create({
      data: { userId: user.id, message: "You were invited to " + project.name, link: "/projects/" + id },
    });
    req.io.to("user:" + user.id).emit("notification", notification);
    req.io.to("project:" + id).emit("member:added", member);
    res.status(201).json(member);
  } catch (err) { next(err); }
}

export async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    const project = await prisma.project.findFirst({ where: { id, ownerId: req.user.id } });
    if (!project) { const e = new Error("Only owner can remove members"); e.status = 403; throw e; }
    if (userId === project.ownerId) { const e = new Error("Cannot remove owner"); e.status = 400; throw e; }
    await prisma.member.deleteMany({ where: { projectId: id, userId } });
    req.io.to("project:" + id).emit("member:removed", { userId });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function updateMemberRole(req, res, next) {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    if (!["admin", "member", "viewer"].includes(role)) {
      const e = new Error("Invalid role"); e.status = 400; throw e;
    }
    const project = await prisma.project.findFirst({ where: { id, ownerId: req.user.id } });
    if (!project) { const e = new Error("Only owner can change roles"); e.status = 403; throw e; }
    if (userId === project.ownerId) { const e = new Error("Cannot change owner"); e.status = 400; throw e; }
    await prisma.member.updateMany({ where: { projectId: id, userId }, data: { role } });
    req.io.to("project:" + id).emit("member:roleChanged", { userId, role });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============================================================
// K3, K4, K6 FIX — Full role enforcement on backend
// ============================================================
w(path.join(S, "src/middleware/permissions.js"), `
import { prisma } from "../config/prisma.js";

const ROLE_LEVELS = { viewer: 1, member: 2, admin: 3, owner: 4 };

export async function requireProjectRole(projectId, userId, minRole = "member") {
  const member = await prisma.member.findFirst({
    where: { projectId, userId },
  });
  if (!member) {
    const e = new Error("Access denied - not a member");
    e.status = 403;
    throw e;
  }
  if (ROLE_LEVELS[member.role] < ROLE_LEVELS[minRole]) {
    const e = new Error("You don't have permission. Requires " + minRole + " role.");
    e.status = 403;
    throw e;
  }
  return member;
}

export function canEdit(role) {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.member;
}

export function canManage(role) {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.admin;
}

export function isOwner(role) {
  return role === "owner";
}
`);

// ============================================================
// K3, K4 FIX — Enforce roles in task controller
// ============================================================
w(path.join(S, "src/controllers/taskController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";
import { requireProjectRole } from "../middleware/permissions.js";
import { logActivity } from "./activityController.js";

async function getMembership(projectId, userId) {
  const m = await prisma.member.findFirst({ where: { projectId, userId } });
  if (!m) { const e = new Error("Access denied"); e.status = 403; throw e; }
  return m;
}

export async function createTask(req, res, next) {
  try {
    const { projectId, title, description, status, priority, assigneeId, dueDate, startDate, estimatedHrs, labelIds } = req.body;
    requireFields(req.body, ["projectId", "title"]);

    const membership = await getMembership(projectId, req.user.id);
    if (membership.role === "viewer") {
      const e = new Error("Viewers cannot create tasks");
      e.status = 403;
      throw e;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });

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
      await prisma.taskLabel.createMany({ data: labelIds.map((labelId) => ({ taskId: task.id, labelId })) });
      task.labels = await prisma.taskLabel.findMany({ where: { taskId: task.id }, include: { label: true } });
    }

    req.io.to("project:" + projectId).emit("task:created", task);
    await logActivity(req.user.id, projectId, "created_task", { taskId: task.id, title });

    if (assigneeId && assigneeId !== req.user.id) {
      const notif = await prisma.notification.create({
        data: { userId: assigneeId, type: "task_assigned", message: "You were assigned to " + title, link: "/projects/" + projectId },
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

    const membership = await getMembership(existing.projectId, req.user.id);
    if (membership.role === "viewer") {
      const e = new Error("Viewers cannot edit tasks");
      e.status = 403;
      throw e;
    }

    const data = {};
    ["title","description","status","priority","order"].forEach((k) => {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    });
    if (req.body.assigneeId !== undefined) data.assigneeId = req.body.assigneeId || null;
    if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.startDate !== undefined) data.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    if (req.body.estimatedHrs !== undefined) data.estimatedHrs = req.body.estimatedHrs;
    if (req.body.loggedHrs !== undefined) data.loggedHrs = req.body.loggedHrs;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        comments: { include: { author: { select: { id: true, name: true, avatarColor: true } } }, orderBy: { createdAt: "asc" } },
        subtasks: { orderBy: { order: "asc" } },
        attachments: true,
        labels: { include: { label: true } },
      },
    });

    req.io.to("project:" + task.projectId).emit("task:updated", task);

    if (req.body.status !== undefined && req.body.status !== existing.status) {
      await logActivity(req.user.id, task.projectId, "moved_task", { taskId: task.id, title: task.title, from: existing.status, to: req.body.status });
    }

    res.json(task);
  } catch (err) { next(err); }
}

export async function deleteTask(req, res, next) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) { const e = new Error("Task not found"); e.status = 404; throw e; }
    const membership = await getMembership(existing.projectId, req.user.id);
    if (membership.role === "viewer") {
      const e = new Error("Viewers cannot delete tasks");
      e.status = 403;
      throw e;
    }
    await prisma.task.delete({ where: { id: req.params.id } });
    req.io.to("project:" + existing.projectId).emit("task:deleted", { id: req.params.id });
    await logActivity(req.user.id, existing.projectId, "deleted_task", { title: existing.title });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============================================================
// E1, E3, E4 FIX — LabelPicker closes after create + works
// ============================================================
w(path.join(C, "src/components/board/LabelPicker.jsx"), `
import { useState } from "react";
import api from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";

const PRESET_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"];

export default function LabelPicker({ projectId, labels, onChanged }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);
  const { show } = useToast();

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await api.post("/labels", { projectId, name: name.trim(), color });
      setName("");
      await onChanged(); // Refresh labels
      show("Label created! ✅", "success");
    } catch (err) {
      show(err.response?.data?.error || "Failed to create", "error");
    } finally {
      setCreating(false);
    }
  };

  const del = async (id, labelName) => {
    if (!confirm("Delete label '" + labelName + "'?")) return;
    try {
      await api.delete("/labels/" + id);
      await onChanged();
      show("Label deleted", "success");
    } catch {
      show("Failed to delete", "error");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-indigo-600 hover:underline"
      >
        ⚙️ Manage labels
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 glass rounded-xl p-4 w-72 z-40 shadow-2xl animate-slide-up">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold">Labels</h4>
            <button onClick={() => setOpen(false)} className="text-lg">×</button>
          </div>

          <form onSubmit={create} className="space-y-2 mb-4">
            <input
              className="input text-sm"
              placeholder="Label name (e.g. Bug, Feature)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={"w-6 h-6 rounded-full transition " + (color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-110")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="btn btn-primary w-full text-xs !py-1.5 disabled:opacity-50"
            >
              {creating ? "Creating..." : "+ Create Label"}
            </button>
          </form>

          <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-xs font-semibold mb-2">Existing Labels</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {labels.map((l) => (
                <div key={l.id} className="flex items-center gap-2 group">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                  <span className="flex-1 text-sm truncate">{l.name}</span>
                  <button
                    onClick={() => del(l.id, l.name)}
                    className="text-red-400 text-xs opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              ))}
              {labels.length === 0 && (
                <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>No labels yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// F1, F2, F3 FIX — Attachment upload with proper response
// ============================================================
w(path.join(S, "src/controllers/attachmentController.js"), `
import { prisma } from "../config/prisma.js";

export async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

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

    // Broadcast to project members
    req.io.to("project:" + task.projectId).emit("attachment:created", {
      ...attachment,
      taskId,
    });

    res.status(201).json(attachment);
  } catch (err) {
    console.error("Upload error:", err);
    next(err);
  }
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
    const file = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: "Not found" });
    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============================================================
// P9, P10 FIX — Keyboard shortcuts work properly
// ============================================================
w(path.join(C, "src/hooks/useKeyboardShortcuts.js"), `
import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts, deps = []) {
  useEffect(() => {
    const handler = (e) => {
      // Skip if typing in input/textarea
      const tag = (e.target?.tagName || "").toUpperCase();
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;

      for (const [key, fn] of Object.entries(shortcuts)) {
        const keyMatch = e.key.toLowerCase() === key.toLowerCase();
        const isEscape = key.toLowerCase() === "escape";
        const isCmdK = (e.ctrlKey || e.metaKey) && key.toLowerCase() === "k";

        if (isCmdK && keyMatch) {
          e.preventDefault();
          fn(e);
          return;
        }

        if (isEscape && keyMatch) {
          // Escape works everywhere
          e.preventDefault();
          fn(e);
          return;
        }

        if (!isTyping && keyMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
`);

// ============================================================
// P6, P7, P8 FIX — Theme Picker actually changes colors
// ============================================================
w(path.join(C, "src/index.css"), `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-hover: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --shadow: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
  --accent-primary: #6366f1;
  --accent-secondary: #8b5cf6;
  --accent-accent: #a855f7;
}

.dark {
  --bg-primary: #0b1120;
  --bg-secondary: #1e293b;
  --bg-hover: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border: #334155;
  --border-strong: #475569;
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.4);
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  transition: background 0.3s, color 0.3s;
  -webkit-font-smoothing: antialiased;
}

.bg-animated {
  background: linear-gradient(-45deg, var(--accent-primary), var(--accent-secondary), var(--accent-accent), var(--accent-primary));
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
.dark .glass {
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(71, 85, 105, 0.5);
}

.surface { background: var(--bg-secondary); border: 1px solid var(--border); }

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply text-white;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  }
  .btn-primary:hover:not(:disabled) {
    box-shadow: 0 8px 20px var(--accent-primary)66;
    transform: translateY(-1px);
  }
  .btn-ghost { color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-danger { @apply bg-red-500 text-white; }
  .btn-danger:hover { @apply bg-red-600; }

  .input {
    @apply w-full px-3 py-2 rounded-lg transition;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
  }
  .input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-primary)26;
  }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    @apply rounded-xl transition;
    box-shadow: var(--shadow);
  }
  .card:hover { box-shadow: var(--shadow-lg); }
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

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.animate-float { animation: float 3s ease-in-out infinite; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Accent-aware overrides for Tailwind classes */
.text-indigo-600 { color: var(--accent-primary) !important; }
.bg-indigo-600 { background: var(--accent-primary) !important; }
.bg-indigo-50 { background: var(--accent-primary)15 !important; }
.border-indigo-500 { border-color: var(--accent-primary) !important; }
.ring-indigo-500 { --tw-ring-color: var(--accent-primary) !important; }
.text-indigo-500 { color: var(--accent-primary) !important; }
`);

// ============================================================
// J6 FIX — Clear doesn't reappear after refresh
// ============================================================
w(path.join(S, "src/controllers/notificationController.js"), `
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

export async function clearAll(req, res, next) {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

w(path.join(S, "src/routes/notificationRoutes.js"), `
import { Router } from "express";
import { listNotifications, markRead, markAllRead, clearAll } from "../controllers/notificationController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.get("/", listNotifications);
router.patch("/:id/read", markRead);
router.patch("/read-all", markAllRead);
router.delete("/clear-all", clearAll);

export default router;
`);

// ============================================================
// NotificationPanel — call clearAll API
// ============================================================
w(path.join(C, "src/components/notifications/NotificationPanel.jsx"), `
import { useEffect, useState, useRef } from "react";
import api from "../../lib/api.js";
import { timeAgo } from "../../lib/utils.js";
import { useSocket } from "../../context/SocketContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function NotificationPanel() {
  const socket = useSocket();
  const { show } = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => api.get("/notifications").then((r) => setItems(r.data.notifications));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onN = (n) => setItems((prev) => [n, ...prev]);
    s.on("notification", onN);
    return () => s.off("notification", onN);
  }, [socket]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (err) { console.error(err); }
  };

  const markOne = async (id) => {
    try {
      await api.patch("/notifications/" + id + "/read");
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    } catch {}
  };

  const handleBellClick = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && unread > 0) setTimeout(() => markAllRead(), 1500);
  };

  const clearAll = async () => {
    if (!confirm("Delete all notifications permanently?")) return;
    try {
      await api.delete("/notifications/clear-all");
      setItems([]);
      show("Cleared", "success");
    } catch { show("Failed to clear", "error"); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute glass rounded-2xl shadow-2xl border overflow-hidden z-[100] animate-slide-up"
          style={{ top: "calc(100% + 8px)", right: 0, width: "380px", maxWidth: "calc(100vw - 24px)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unread}</span>}
            </div>
            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <>
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">✓ Read all</button>
                  <button onClick={clearAll} className="text-xs text-red-500 hover:underline">Clear</button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🔕</div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notifications</p>
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markOne(n.id)}
                  className={"px-4 py-3 border-b cursor-pointer transition hover:bg-slate-100/50 dark:hover:bg-slate-800/50 " + (n.read ? "opacity-60" : "")}
                  style={{ borderColor: "var(--border)", background: !n.read ? "linear-gradient(90deg, " + "var(--accent-primary)10, transparent)" : "transparent" }}
                >
                  <div className="flex items-start gap-3">
                    <div className={"w-2 h-2 rounded-full mt-2 flex-shrink-0 " + (n.read ? "bg-transparent" : "bg-indigo-500")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// D3, D4 FIX — Subtask progress visible in TaskModal
// ============================================================
w(path.join(C, "src/components/board/TaskModal.jsx"), `
import { useEffect, useState, useRef } from "react";
import api from "../../lib/api.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Avatar from "../ui/Avatar.jsx";
import { timeAgo } from "../../lib/utils.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import LabelPicker from "./LabelPicker.jsx";
import TimeTracking from "./TimeTracking.jsx";
import MentionInput from "./MentionInput.jsx";
import ImagePreview from "./ImagePreview.jsx";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = [
  { id: "todo", label: "📝 To Do" },
  { id: "in_progress", label: "⚡ In Progress" },
  { id: "review", label: "👀 Review" },
  { id: "done", label: "✅ Done" },
];

export default function TaskModal({ task, members, labels, projectId, socket, onClose, onUpdated, onDeleted, onLabelsChanged }) {
  const [localTask, setLocalTask] = useState(task);
  const [comment, setComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const { show } = useToast();
  const { user } = useAuth();

  const myRole = members?.find((m) => m.user.id === user.id)?.role;
  const canEdit = myRole && ["owner", "admin", "member"].includes(myRole);

  useEffect(() => { setLocalTask(task); }, [task]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onComment = (c) => {
      if (c.taskId === task.id) setLocalTask((t) => ({ ...t, comments: [...(t.comments || []), c] }));
    };
    s.on("comment:created", onComment);
    return () => s.off("comment:created", onComment);
  }, [socket, task.id]);

  const update = async (patch) => {
    if (!canEdit) { show("You don't have permission to edit", "error"); return; }
    try {
      const { data } = await api.patch("/tasks/" + task.id, patch);
      setLocalTask(data);
      onUpdated(data);
    } catch (err) { show(err.response?.data?.error || "Update failed", "error"); }
  };

  const toggleLabel = async (labelId, isAttached) => {
    if (!canEdit) return;
    try {
      if (isAttached) await api.delete("/labels/task/" + task.id + "/" + labelId);
      else await api.post("/labels/task/add", { taskId: task.id, labelId });
      const { data } = await api.get("/projects/" + projectId);
      const updated = data.tasks.find((t) => t.id === task.id);
      if (updated) { setLocalTask(updated); onUpdated(updated); }
    } catch (err) { console.error(err); }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post("/comments", { taskId: task.id, body: comment });
      setComment("");
      show("Comment posted", "success");
    } catch { show("Failed", "error"); }
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    try {
      const { data } = await api.post("/subtasks", { taskId: task.id, title: newSubtask });
      setLocalTask((t) => ({ ...t, subtasks: [...(t.subtasks || []), data] }));
      setNewSubtask("");
      show("Subtask added", "success");
    } catch { show("Failed", "error"); }
  };

  const toggleSubtask = async (id) => {
    try {
      const { data } = await api.patch("/subtasks/" + id + "/toggle");
      setLocalTask((t) => ({ ...t, subtasks: t.subtasks.map((s) => (s.id === id ? data : s)) }));
    } catch { show("Failed", "error"); }
  };

  const deleteSubtask = async (id) => {
    try {
      await api.delete("/subtasks/" + id);
      setLocalTask((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== id) }));
      show("Subtask deleted", "success");
    } catch { show("Failed", "error"); }
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taskId", task.id);
    try {
      const { data } = await api.post("/attachments", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setLocalTask((t) => ({ ...t, attachments: [...(t.attachments || []), data] }));
      show("File uploaded! 📎", "success");
    } catch (err) {
      show(err.response?.data?.error || "Upload failed", "error");
    } finally { setUploading(false); e.target.value = ""; }
  };

  const del = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.delete("/tasks/" + task.id);
      onDeleted(task.id); onClose();
      show("Task deleted", "success");
    } catch { show("Failed", "error"); }
  };

  const completedSubtasks = (localTask.subtasks || []).filter((s) => s.completed).length;
  const totalSubtasks = (localTask.subtasks || []).length;
  const subtaskPct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks * 100) : 0;
  const attachedLabelIds = (localTask.labels || []).map((tl) => tl.label.id);

  return (
    <Modal open onClose={onClose} width="max-w-3xl">
      {preview && <ImagePreview url={preview.url} filename={preview.filename} onClose={() => setPreview(null)} />}

      <div className="flex items-start justify-between gap-3 mb-4">
        <input
          className="text-xl font-bold w-full bg-transparent border-0 focus:outline-none"
          value={localTask.title}
          onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
          onBlur={() => update({ title: localTask.title })}
          disabled={!canEdit}
          style={{ color: "var(--text-primary)" }}
        />
        <button onClick={onClose} className="text-2xl leading-none hover:opacity-60">×</button>
      </div>

      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
      <textarea
        className="input mb-4"
        rows="3"
        placeholder="Add more details..."
        value={localTask.description || ""}
        onChange={(e) => setLocalTask({ ...localTask, description: e.target.value })}
        onBlur={() => update({ description: localTask.description })}
        disabled={!canEdit}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Status</label>
          <select className="input text-sm" value={localTask.status} onChange={(e) => update({ status: e.target.value })} disabled={!canEdit}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Priority</label>
          <select className="input text-sm" value={localTask.priority} onChange={(e) => update({ priority: e.target.value })} disabled={!canEdit}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Assignee</label>
          <select className="input text-sm" value={localTask.assigneeId || ""} onChange={(e) => update({ assigneeId: e.target.value || null })} disabled={!canEdit}>
            <option value="">Unassigned</option>
            {members?.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Due Date</label>
          <input type="date" className="input text-sm"
            value={localTask.dueDate ? new Date(localTask.dueDate).toISOString().split("T")[0] : ""}
            onChange={(e) => update({ dueDate: e.target.value })}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>🏷️ Labels</label>
        <div className="flex flex-wrap gap-2 items-center">
          {(localTask.labels || []).map((tl) => (
            <button key={tl.id}
              onClick={() => toggleLabel(tl.label.id, true)}
              disabled={!canEdit}
              className="text-xs px-2 py-1 rounded-full font-medium hover:opacity-70 transition"
              style={{ background: tl.label.color + "30", color: tl.label.color }}
              title="Click to remove"
            >
              {tl.label.name} ✕
            </button>
          ))}
          <div className="flex flex-wrap gap-1">
            {(labels || []).filter((l) => !attachedLabelIds.includes(l.id)).map((l) => (
              <button key={l.id}
                onClick={() => toggleLabel(l.id, false)}
                disabled={!canEdit}
                className="text-xs px-2 py-1 rounded-full border opacity-60 hover:opacity-100 transition"
                style={{ borderColor: l.color, color: l.color }}
              >
                + {l.name}
              </button>
            ))}
          </div>
          {canEdit && <LabelPicker projectId={projectId} labels={labels || []} onChanged={onLabelsChanged} />}
        </div>
      </div>

      {/* SUBTASKS with visible progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            ✅ Subtasks {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
          </label>
          {totalSubtasks > 0 && (
            <span className="text-xs font-semibold" style={{ color: subtaskPct === 100 ? "#10b981" : "var(--accent-primary)" }}>
              {Math.round(subtaskPct)}%
            </span>
          )}
        </div>

        {totalSubtasks > 0 && (
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: subtaskPct + "%",
                background: subtaskPct === 100
                  ? "linear-gradient(90deg, #10b981, #14b8a6)"
                  : "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
              }}
            />
          </div>
        )}

        <div className="space-y-1.5 mb-2">
          {(localTask.subtasks || []).map((s) => (
            <div key={s.id} className="flex items-center gap-2 group p-1.5 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60">
              <input type="checkbox" checked={s.completed} onChange={() => toggleSubtask(s.id)}
                disabled={!canEdit}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer" />
              <span className={"flex-1 text-sm " + (s.completed ? "line-through opacity-60" : "")}>{s.title}</span>
              {canEdit && (
                <button onClick={() => deleteSubtask(s.id)} className="text-red-400 opacity-0 group-hover:opacity-100 text-xs px-2" title="Delete">🗑</button>
              )}
            </div>
          ))}
          {totalSubtasks === 0 && (
            <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
              No subtasks yet. Add one below to track progress.
            </p>
          )}
        </div>

        {canEdit && (
          <form onSubmit={addSubtask} className="flex gap-2">
            <input className="input text-sm" placeholder="+ Add subtask and press Enter..." value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} />
            <Button type="submit" className="text-sm !py-2">Add</Button>
          </form>
        )}
      </div>

      {canEdit && <TimeTracking task={localTask} onUpdated={(t) => { setLocalTask(t); onUpdated(t); }} />}

      {/* ATTACHMENTS */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            📎 Attachments ({(localTask.attachments || []).length})
          </label>
          {canEdit && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs text-indigo-600 hover:underline">
                {uploading ? "Uploading..." : "+ Upload file"}
              </button>
              <input ref={fileRef} type="file" hidden onChange={uploadFile} />
            </>
          )}
        </div>
        <div className="space-y-1">
          {(localTask.attachments || []).map((a) => {
            const isImage = a.mimeType?.startsWith("image/");
            const url = "http://localhost:5000" + a.url;
            return (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group">
                {isImage ? (
                  <img src={url} alt={a.filename} className="w-12 h-12 rounded object-cover cursor-pointer border" onClick={() => setPreview({ url, filename: a.filename })} />
                ) : (
                  <div className="w-12 h-12 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl">📄</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.filename}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{(a.size / 1024).toFixed(1)} KB</p>
                </div>
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline px-2">⬇ Download</a>
              </div>
            );
          })}
          {(localTask.attachments || []).length === 0 && (
            <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>No attachments yet</p>
          )}
        </div>
      </div>

      <div className="mb-5">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>
          💬 Comments ({(localTask.comments || []).length})
        </label>
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {(localTask.comments || []).map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
              <Avatar name={c.author?.name} color={c.author?.avatarColor} size={30} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.author?.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">
                  {c.body.split(/(@[\\w]+)/g).map((part, i) =>
                    part.startsWith("@")
                      ? <span key={i} className="text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded">{part}</span>
                      : part
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <MentionInput value={comment} onChange={setComment} onSubmit={postComment} members={members} />
          <Button onClick={postComment}>Post</Button>
        </div>
      </div>

      <div className="flex justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        {canEdit ? (
          <button onClick={del} className="text-red-600 text-sm hover:underline">🗑 Delete task</button>
        ) : <div />}
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
`);

// ============================================================
// Q1, Q2 FIX — Pomodoro visible in TaskModal + sidebar
// ============================================================
w(path.join(C, "src/components/board/PomodoroTimer.jsx"), `
import { useEffect, useState, useRef } from "react";
import { useToast } from "../../context/ToastContext.jsx";

export default function PomodoroTimer({ task }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("work");
  const intervalRef = useRef(null);
  const { show } = useToast();

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            const nextMode = mode === "work" ? "break" : "work";
            show(mode === "work" ? "☕ Break time! 5 minutes" : "💪 Back to work!", "info");
            setMode(nextMode);
            return nextMode === "work" ? 25 * 60 : 5 * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, show]);

  const reset = () => { setRunning(false); setSeconds(mode === "work" ? 25 * 60 : 5 * 60); };
  const toggle = () => setRunning(!running);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = mode === "work" ? 25 * 60 : 5 * 60;
  const percent = ((total - seconds) / total) * 100;
  const r = 35;
  const circ = 2 * Math.PI * r;

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">🍅 Pomodoro Timer</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: mode === "work" ? "#ef444422" : "#10b98122", color: mode === "work" ? "#ef4444" : "#10b981" }}>
          {mode === "work" ? "Focus Time" : "Break"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 80, height: 80 }}>
          <svg width={80} height={80} className="-rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="40" cy="40" r={r} fill="none"
              stroke={mode === "work" ? "#ef4444" : "#10b981"}
              strokeWidth="5"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - percent / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button onClick={toggle} className="btn btn-primary text-xs flex-1">
              {running ? "⏸ Pause" : "▶ Start"}
            </button>
            <button onClick={reset} className="btn btn-ghost text-xs">↻ Reset</button>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {mode === "work" ? "Focus for 25 min, then take a break" : "Relax for 5 min"}
          </p>
        </div>
      </div>

      {task && (
        <p className="text-xs mt-3 truncate" style={{ color: "var(--text-muted)" }}>
          Working on: <strong>{task.title}</strong>
        </p>
      )}
    </div>
  );
}
`);

// Add Pomodoro to TaskModal imports
w(path.join(C, "src/components/board/TaskModal.jsx"), fs.readFileSync(path.join(C, "src/components/board/TaskModal.jsx"), "utf8").replace(
  `import ImagePreview from "./ImagePreview.jsx";`,
  `import ImagePreview from "./ImagePreview.jsx";\nimport PomodoroTimer from "./PomodoroTimer.jsx";`
).replace(
  `{canEdit && <TimeTracking task={localTask} onUpdated={(t) => { setLocalTask(t); onUpdated(t); }} />}`,
  `{canEdit && <TimeTracking task={localTask} onUpdated={(t) => { setLocalTask(t); onUpdated(t); }} />}\n\n      <PomodoroTimer task={localTask} />`
));

// ============================================================
// L2 FIX — Analytics Page null check
// ============================================================
w(path.join(C, "src/pages/AnalyticsPage.jsx"), `
import { useEffect, useState } from "react";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/global")
      .then((r) => setStats(r.data))
      .catch(() => setStats({ totalProjects: 0, totalTasks: 0, doneTasks: 0, completionRate: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="text-center py-12">Loading analytics...</div></Layout>;
  if (!stats) return <Layout><div className="text-center py-12">No data available</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">📊 Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-5">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Projects</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.totalProjects}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Tasks</p>
            <p className="text-3xl font-bold text-purple-600">{stats.totalTasks}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Completed</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.doneTasks}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Progress</p>
            <p className="text-3xl font-bold text-amber-600">{stats.completionRate}%</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4">Overall Progress</h3>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000"
              style={{ width: stats.completionRate + "%", background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))" }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {stats.doneTasks} of {stats.totalTasks} tasks completed ({stats.completionRate}%)
          </p>
        </div>
      </div>
    </Layout>
  );
}
`);

// ============================================================
// O2 FIX — MyTasks overdue filter
// ============================================================
w(path.join(C, "src/pages/MyTasksPage.jsx"), `
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import { formatDate, isOverdue, PRIORITY_COLORS, STATUS_INFO } from "../lib/utils.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/projects").then(async (r) => {
      const allTasks = [];
      for (const p of r.data) {
        const detail = await api.get("/projects/" + p.id);
        detail.data.tasks.forEach((t) => {
          if (t.assigneeId === user.id) {
            allTasks.push({ ...t, project: { id: p.id, name: p.name, color: p.color, icon: p.icon } });
          }
        });
      }
      setTasks(allTasks);
      setLoading(false);
    });
  }, [user.id]);

  const now = new Date();
  const todayStr = now.toDateString();

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "overdue") {
      return t.dueDate && new Date(t.dueDate) < now && t.status !== "done";
    }
    if (filter === "today") {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === todayStr;
    }
    return t.status === filter;
  });

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done").length,
    today: tasks.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === todayStr).length,
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">📋 My Tasks</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Tasks assigned to you across all projects</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "all", label: "All", icon: "📋" },
            { id: "todo", label: "To Do", icon: "📝" },
            { id: "in_progress", label: "In Progress", icon: "⚡" },
            { id: "review", label: "Review", icon: "👀" },
            { id: "done", label: "Done", icon: "✅" },
            { id: "today", label: "Today", icon: "📅" },
            { id: "overdue", label: "Overdue", icon: "⚠️" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition"
              style={filter === f.id
                ? { background: "var(--accent-primary)", color: "white" }
                : { background: "var(--bg-hover)", color: "var(--text-secondary)" }}
            >
              {f.icon} {f.label} <span className="opacity-70 ml-1">{counts[f.id] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-3">🎉</div>
            <h3 className="text-lg font-semibold">No tasks here</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const pc = PRIORITY_COLORS[t.priority];
              const overdue = t.dueDate && new Date(t.dueDate) < now && t.status !== "done";
              return (
                <Link key={t.id} to={"/projects/" + t.project.id} className="card p-4 hover:shadow-md transition flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: t.project.color + "22", border: "2px solid " + t.project.color + "55" }}>
                    {t.project.icon || "📁"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {t.project.name} · {STATUS_INFO[t.status]?.emoji} {STATUS_INFO[t.status]?.label}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: pc + "22", color: pc }}>
                    {t.priority}
                  </span>
                  {t.dueDate && (
                    <span className={"text-xs px-2 py-0.5 rounded " + (overdue ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "")}
                      style={!overdue ? { color: "var(--text-muted)" } : {}}>
                      {overdue ? "⚠️ " : "📅 "}{formatDate(t.dueDate)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
`);

// ============================================================
// P9 FIX — Add 'n' key works in ProjectPage
// ============================================================
w(path.join(C, "src/pages/ProjectPage.jsx"), `
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import Board from "../components/board/Board.jsx";
import TaskModal from "../components/board/TaskModal.jsx";
import AnalyticsPanel from "../components/analytics/AnalyticsPanel.jsx";
import ActivityFeed from "../components/analytics/ActivityFeed.jsx";
import FilterBar from "../components/board/FilterBar.jsx";
import MembersPanel from "../components/board/MembersPanel.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";
import { exportTasksToCsv } from "../lib/exportCsv.js";

const TABS = [
  { id: "board", label: "Board", icon: "📋" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "activity", label: "Activity", icon: "📰" },
];

export default function ProjectPage() {
  const { id } = useParams();
  const socket = useSocket();
  const { user } = useAuth();
  const { show } = useToast();

  const [project, setProject] = useState(null);
  const [labels, setLabels] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [tab, setTab] = useState("board");
  const [filters, setFilters] = useState({ search: "", priority: "", assigneeId: "", labelId: "" });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const load = useCallback(() => {
    api.get("/projects/" + id).then((r) => setProject(r.data));
    api.get("/labels/" + id).then((r) => setLabels(r.data));
  }, [id]);

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
    s.on("task:deleted", ({ id: tid }) => setProject((p) => p ? { ...p, tasks: p.tasks.filter((t) => t.id !== tid) } : p));
    s.on("comment:created", (c) => setProject((p) => {
      if (!p) return p;
      return { ...p, tasks: p.tasks.map((t) => t.id === c.taskId ? { ...t, comments: [...(t.comments || []), c] } : t) };
    }));
    s.on("member:added", () => load());
    s.on("member:roleChanged", () => load());

    return () => {
      s.emit("project:leave", id);
      s.off("task:created"); s.off("task:updated"); s.off("task:deleted");
      s.off("comment:created"); s.off("member:added"); s.off("member:roleChanged");
    };
  }, [id, load, socket]);

  const myMembership = project?.members.find((m) => m.user.id === user?.id);
  const canEdit = myMembership && ["owner", "admin", "member"].includes(myMembership.role);
  const isOwner = myMembership?.role === "owner";
  const isAdmin = myMembership?.role === "admin";

  const filteredTasks = useMemo(() => {
    if (!project) return [];
    return project.tasks.filter((t) => {
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.assigneeId && t.assigneeId !== filters.assigneeId) return false;
      if (filters.labelId && !(t.labels || []).some((tl) => tl.label.id === filters.labelId)) return false;
      return true;
    });
  }, [project, filters]);

  useKeyboardShortcuts({
    escape: () => { setActiveTaskId(null); setShowQuickAdd(false); },
    n: () => { if (canEdit) setShowQuickAdd(true); },
  }, [canEdit]);

  if (!project) return <Layout><div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div></Layout>;

  const createTask = async (status, title) => {
    if (!canEdit) { show("Viewers can't create tasks", "error"); return; }
    try {
      await api.post("/tasks", { projectId: id, title, status });
      show("Task created", "success");
    } catch (err) { show(err.response?.data?.error || "Failed", "error"); }
  };

  const quickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;
    await createTask("todo", quickAddTitle);
    setQuickAddTitle("");
    setShowQuickAdd(false);
  };

  const changeStatus = async (taskId, newStatus) => {
    if (!canEdit) { show("Viewers can't move tasks", "error"); return; }
    // Optimistic update
    setProject((p) => ({ ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t) }));
    try {
      await api.patch("/tasks/" + taskId, { status: newStatus });
    } catch { show("Failed", "error"); load(); }
  };

  const invite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (!isOwner && !isAdmin) { show("Only owner/admin can invite", "error"); return; }
    try {
      await api.post("/projects/" + id + "/members", { email: inviteEmail });
      setInviteEmail("");
      load();
      show("Member invited! 📬", "success");
    } catch (err) { show(err.response?.data?.error || "Failed", "error"); }
  };

  const activeTask = activeTaskId ? project.tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-5">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back</Link>
          <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: project.color }}>
                {project.icon || "📁"} {project.name}
              </h1>
              {project.description && <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{project.description}</p>}
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {project.members.map((m) => m.user.name).join(", ")}
                {myMembership && <span className="ml-2 text-indigo-600 font-medium">· You are {myMembership.role}</span>}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <MembersPanel project={project} onReload={load} />
              <button onClick={() => exportTasksToCsv(project, project.tasks)} className="btn btn-ghost text-sm" title="Export CSV">📤 Export</button>
              {(isOwner || isAdmin) && (
                <form onSubmit={invite} className="flex gap-2">
                  <Input placeholder="Invite by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="!w-48" />
                  <Button type="submit">Invite</Button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-2 text-sm font-medium transition border-b-2 -mb-px"
              style={tab === t.id ? { borderColor: "var(--accent-primary)", color: "var(--accent-primary)" } : { borderColor: "transparent", color: "var(--text-secondary)" }}>
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tab === "board" && (
          <>
            <FilterBar filters={filters} setFilters={setFilters} members={project.members} labels={labels}
              onClear={() => setFilters({ search: "", priority: "", assigneeId: "", labelId: "" })} />
            {!canEdit && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                👀 You have <strong>viewer</strong> access. You can browse but cannot edit.
              </div>
            )}
            <div className="mt-4">
              <Board tasks={filteredTasks} onCreate={createTask} onOpen={setActiveTaskId} onStatusChange={changeStatus} />
            </div>
          </>
        )}

        {tab === "analytics" && <AnalyticsPanel projectId={id} />}
        {tab === "activity" && (
          <div className="card p-5">
            <h3 className="font-semibold mb-4">📰 Recent Activity</h3>
            <ActivityFeed projectId={id} />
          </div>
        )}

        {/* Quick Add Modal */}
        {showQuickAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32 animate-fade-in" onClick={() => setShowQuickAdd(false)}>
            <div className="glass rounded-2xl shadow-2xl w-full max-w-lg p-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">➕</span>
                <p className="font-semibold">Quick Add Task</p>
              </div>
              <form onSubmit={quickAdd}>
                <input autoFocus className="input text-base mb-2" placeholder="Task title..." value={quickAddTitle} onChange={(e) => setQuickAddTitle(e.target.value)} />
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Press Enter to create</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTask && (
          <TaskModal task={activeTask} members={project.members} labels={labels} projectId={id} socket={socket}
            onClose={() => setActiveTaskId(null)}
            onUpdated={(t) => setProject((p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? t : x)) }))}
            onDeleted={(tid) => setProject((p) => ({ ...p, tasks: p.tasks.filter((x) => x.id !== tid) }))}
            onLabelsChanged={async () => { const r = await api.get("/labels/" + id); setLabels(r.data); }}
          />
        )}

        {canEdit && (
          <div className="fixed bottom-4 right-4 glass px-3 py-2 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="font-medium">Shortcuts:</span>{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/30">N</kbd> new task ·{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/30">Esc</kbd> close ·{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/30">⌘K</kbd> search
          </div>
        )}
      </div>
    </Layout>
  );
}
`);

// ============================================================
// P1 FIX — GlobalSearch escape works
// ============================================================
w(path.join(C, "src/components/common/GlobalSearch.jsx"), `
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [results, setResults] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    api.get("/projects").then(async (r) => {
      setProjects(r.data);
      const tasks = [];
      for (const p of r.data) {
        try {
          const detail = await api.get("/projects/" + p.id);
          detail.data.tasks.forEach((t) => tasks.push({ ...t, projectId: p.id, projectName: p.name, projectIcon: p.icon }));
        } catch {}
      }
      setAllTasks(tasks);
    });
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const matches = [];
    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({ type: "project", id: p.id, name: p.name, icon: p.icon, color: p.color, subtitle: "Project" });
      }
    });
    allTasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q)) {
        matches.push({ type: "task", id: t.id, projectId: t.projectId, name: t.title, icon: t.projectIcon, color: "#6366f1", subtitle: "Task in " + t.projectName });
      }
    });
    setResults(matches.slice(0, 15));
  }, [query, projects, allTasks]);

  if (!open) return null;

  const go = (r) => {
    if (r.type === "project") nav("/projects/" + r.id);
    else if (r.type === "task") nav("/projects/" + r.projectId);
    onClose();
    setQuery("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-xl">🔍</span>
          <input
            autoFocus
            className="flex-1 bg-transparent border-0 focus:outline-none text-base"
            placeholder="Search projects, tasks... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-xs px-2 py-1 rounded border hover:bg-slate-100 dark:hover:bg-slate-700" style={{ borderColor: "var(--border)" }}>
            Esc
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query === "" && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Search across all your projects and tasks
            </div>
          )}
          {query !== "" && results.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No results for "{query}"</div>
          )}
          {results.map((r) => (
            <button key={r.type + r.id} onClick={() => go(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition text-left border-b"
              style={{ borderColor: "var(--border)" }}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: r.color + "22", color: r.color }}>
                {r.icon || "📁"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.subtitle}</p>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>↵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
`);

console.log("\n✅ ALL FIXES APPLIED!\n");
console.log("Next: restart servers");
console.log("");