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

export async function updateMemberRole(req, res, next) {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!["admin", "member", "viewer"].includes(role)) {
      const e = new Error("Invalid role");
      e.status = 400;
      throw e;
    }

    const project = await prisma.project.findFirst({
      where: { id, ownerId: req.user.id },
    });
    if (!project) {
      const e = new Error("Only owner can change roles");
      e.status = 403;
      throw e;
    }
    if (userId === project.ownerId) {
      const e = new Error("Cannot change owner's role");
      e.status = 400;
      throw e;
    }

    await prisma.member.updateMany({
      where: { projectId: id, userId },
      data: { role },
    });

    req.io.to("project:" + id).emit("member:roleChanged", { userId, role });
    res.json({ success: true });
  } catch (err) { next(err); }
}