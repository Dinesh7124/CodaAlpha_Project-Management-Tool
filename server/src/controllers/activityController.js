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
