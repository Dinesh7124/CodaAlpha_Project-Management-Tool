import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function listLabels(req, res, next) {
  try {
    const labels = await prisma.label.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { name: "asc" },
    });
    res.json(labels);
  } catch (err) { next(err); }
}

export async function createLabel(req, res, next) {
  try {
    const { projectId, name, color } = req.body;
    requireFields(req.body, ["projectId", "name"]);
    const label = await prisma.label.create({
      data: { projectId, name, color: color || "#6366f1" },
    });
    req.io.to("project:" + projectId).emit("label:created", label);
    res.status(201).json(label);
  } catch (err) { next(err); }
}

export async function deleteLabel(req, res, next) {
  try {
    await prisma.label.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function addLabelToTask(req, res, next) {
  try {
    const { taskId, labelId } = req.body;
    const tl = await prisma.taskLabel.create({
      data: { taskId, labelId },
      include: { label: true },
    });
    res.status(201).json(tl);
  } catch (err) { next(err); }
}

export async function removeLabelFromTask(req, res, next) {
  try {
    const { taskId, labelId } = req.params;
    await prisma.taskLabel.deleteMany({ where: { taskId, labelId } });
    res.json({ success: true });
  } catch (err) { next(err); }
}