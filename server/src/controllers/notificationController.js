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
