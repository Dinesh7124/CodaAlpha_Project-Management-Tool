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
