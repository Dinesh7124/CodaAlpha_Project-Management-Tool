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
