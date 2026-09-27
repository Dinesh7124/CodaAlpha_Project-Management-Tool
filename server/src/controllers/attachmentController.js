import { prisma } from "../config/prisma.js";

export async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId required" });

    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.originalname,
        url: "/uploads/" + req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
        taskId,
        uploaderId: req.user.id,
      },
    });
    res.status(201).json(attachment);
  } catch (err) { next(err); }
}

export async function listTaskAttachments(req, res, next) {
  try {
    const files = await prisma.attachment.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { createdAt: "desc" },
    });
    res.json(files);
  } catch (err) { next(err); }
}

export async function deleteAttachment(req, res, next) {
  try {
    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
