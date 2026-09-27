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
