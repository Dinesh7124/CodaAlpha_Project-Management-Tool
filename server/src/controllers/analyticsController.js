import { prisma } from "../config/prisma.js";

// ============================================================
// GLOBAL ANALYTICS (Dashboard)
// ============================================================
export async function globalAnalytics(req, res, next) {
  try {
    const userId = req.user.id;

    // Get user's projects
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        tasks: true,
        members: { include: { user: true } },
      },
    });

    const allTasks = projects.flatMap((p) => p.tasks);
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.status === "done").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
    const todoTasks = allTasks.filter((t) => t.status === "todo").length;
    const reviewTasks = allTasks.filter((t) => t.status === "review").length;

    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
    ).length;

    const urgentTasks = allTasks.filter(
      (t) => t.priority === "urgent" && t.status !== "done"
    ).length;

    const dueSoonTasks = allTasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      const diff = new Date(t.dueDate) - new Date();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // next 7 days
    }).length;

    // Total members across projects (unique)
    const memberSet = new Set();
    projects.forEach((p) => p.members.forEach((m) => memberSet.add(m.userId)));

    // Total comments
    const totalComments = await prisma.comment.count({
      where: { task: { projectId: { in: projects.map((p) => p.id) } } },
    });

    // Time logged
    const timeLogs = await prisma.timeLog.aggregate({
      where: { task: { projectId: { in: projects.map((p) => p.id) } } },
      _sum: { hours: true },
    });

    res.json({
      totalProjects: projects.length,
      totalTasks,
      doneTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      overdueTasks,
      urgentTasks,
      dueSoonTasks,
      totalMembers: memberSet.size,
      totalComments,
      totalHoursLogged: timeLogs._sum.hours || 0,
      completionRate: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    });
  } catch (err) { next(err); }
}

// ============================================================
// PROJECT ANALYTICS (Per-project)
// ============================================================
export async function projectAnalytics(req, res, next) {
  try {
    const { projectId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true, avatarUrl: true } },
        comments: true,
        subtasks: true,
        timeLogs: true,
      },
    });

    const byStatus = { todo: 0, in_progress: 0, review: 0, done: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
    let overdue = 0;
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let totalLoggedHrs = 0;

    const now = new Date();

    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.dueDate && new Date(t.dueDate) < now && t.status !== "done") overdue++;
      totalSubtasks += t.subtasks.length;
      completedSubtasks += t.subtasks.filter((s) => s.completed).length;
      totalLoggedHrs += t.timeLogs.reduce((sum, log) => sum + log.hours, 0);
    }

    // Team performance — tasks done per member
    const teamPerf = {};
    for (const t of tasks) {
      if (t.assignee) {
        if (!teamPerf[t.assignee.id]) {
          teamPerf[t.assignee.id] = {
            user: t.assignee,
            total: 0,
            done: 0,
            inProgress: 0,
          };
        }
        teamPerf[t.assignee.id].total++;
        if (t.status === "done") teamPerf[t.assignee.id].done++;
        if (t.status === "in_progress") teamPerf[t.assignee.id].inProgress++;
      }
    }

    const members = await prisma.member.count({ where: { projectId } });
    const comments = await prisma.comment.count({
      where: { task: { projectId } },
    });

    // Last 7 days activity (tasks created per day)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const createdCount = tasks.filter(
        (t) => new Date(t.createdAt) >= d && new Date(t.createdAt) < nextD
      ).length;

      const completedCount = tasks.filter(
        (t) => t.status === "done" && new Date(t.updatedAt) >= d && new Date(t.updatedAt) < nextD
      ).length;

      last7Days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: d.toISOString().split("T")[0],
        created: createdCount,
        completed: completedCount,
      });
    }

    res.json({
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      members,
      comments,
      totalSubtasks,
      completedSubtasks,
      totalLoggedHrs: Math.round(totalLoggedHrs * 10) / 10,
      completionRate: tasks.length
        ? Math.round((byStatus.done / tasks.length) * 100)
        : 0,
      teamPerf: Object.values(teamPerf).sort((a, b) => b.done - a.done),
      last7Days,
    });
  } catch (err) { next(err); }
}