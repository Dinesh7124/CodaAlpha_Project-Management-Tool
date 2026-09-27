import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function listViews(req, res, next) {
  try {
    const { projectId } = req.params;
    const views = await prisma.savedView.findMany({
      where: { projectId, userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(views.map((v) => ({
      ...v,
      filters: JSON.parse(v.filters),
    })));
  } catch (err) { next(err); }
}

export async function createView(req, res, next) {
  try {
    const { projectId, name, filters } = req.body;
    requireFields(req.body, ["projectId", "name", "filters"]);

    const view = await prisma.savedView.create({
      data: {
        projectId,
        name,
        filters: JSON.stringify(filters),
        userId: req.user.id,
      },
    });
    res.status(201).json({ ...view, filters });
  } catch (err) { next(err); }
}

export async function deleteView(req, res, next) {
  try {
    const view = await prisma.savedView.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!view) return res.status(404).json({ error: "View not found" });
    await prisma.savedView.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
