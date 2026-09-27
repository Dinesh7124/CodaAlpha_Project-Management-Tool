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
