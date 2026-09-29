import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";
import { logActivity } from "./activityController.js";
import {
  sendEmail,
  taskCreatedEmailTemplate,
  taskAssignedEmailTemplate,
  taskCompletedEmailTemplate,
  taskUpdatedEmailTemplate,
} from "../utils/email.js";

// ============================================================
// HELPER — Notify all project members (except actor)
// ============================================================
async function notifyProjectMembers(projectId, actorId, emailTemplateFn, io) {
  try {
    // Fetch project with all members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!project) return;

    // Fetch actor (person who made the change)
    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    if (!actor) return;

    // Filter out the actor (don't email yourself)
    const recipients = project.members.filter((m) => m.user.id !== actorId);

    if (recipients.length === 0) return;

    console.log(`📧 Notifying ${recipients.length} member(s) about project "${project.name}"`);

    // Send emails in parallel (background)
    await Promise.all(
      recipients.map(async (member) => {
        try {
          const tmpl = emailTemplateFn(project, actor, member.user);
          if (tmpl) {
            await sendEmail({
              to: member.user.email,
              subject: tmpl.subject,
              html: tmpl.html,
              text: tmpl.text,
            });
          }
        } catch (err) {
          console.error(`Email to ${member.user.email} failed:`, err.message);
        }
      })
    );
  } catch (err) {
    console.error("notifyProjectMembers error:", err.message);
  }
}

// ============================================================
// HELPER — Assert project access
// ============================================================
async function assertProjectAccess(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  if (!project) {
    const e = new Error("Project not found or access denied");
    e.status = 404;
    throw e;
  }
  return project;
}

// ============================================================
// CREATE TASK
// ============================================================
export async function createTask(req, res, next) {
  try {
    const {
      projectId, title, description, status, priority,
      assigneeId, dueDate, startDate, estimatedHrs, labelIds,
    } = req.body;

    requireFields(req.body, ["projectId", "title"]);

    const project = await assertProjectAccess(projectId, req.user.id);

    // Create task
    const task = await prisma.task.create({
      data: {
        projectId,
        title,
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
        comments: true,
        subtasks: true,
        attachments: true,
        labels: { include: { label: true } },
      },
    });

    // Attach labels if any
    if (labelIds?.length) {
      await prisma.taskLabel.createMany({
        data: labelIds.map((labelId) => ({ taskId: task.id, labelId })),
      });
      task.labels = await prisma.taskLabel.findMany({
        where: { taskId: task.id },
        include: { label: true },
      });
    }

    // Real-time notification
    req.io.to(`project:${projectId}`).emit("task:created", task);

    // Activity log
    await logActivity(req.user.id, projectId, "created_task", {
      taskId: task.id,
      title,
    });

    // ============================================================
    // SEND EMAILS — Assignee + All Project Members
    // ============================================================
    const actor = await prisma.user.findUnique({ where: { id: req.user.id } });

    // 1. If assignee exists and different from actor → send "assigned to you" email
    if (assigneeId && assigneeId !== req.user.id) {
      try {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (assignee) {
          const tmpl = taskAssignedEmailTemplate(task, project, actor, assignee);
          await sendEmail({
            to: assignee.email,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
          });

          // In-app notification
          const notification = await prisma.notification.create({
            data: {
              userId: assigneeId,
              type: "task_assigned",
              message: `You were assigned to "${title}" in ${project.name}`,
              link: `/projects/${projectId}`,
            },
          });
          req.io.to(`user:${assigneeId}`).emit("notification", notification);
        }
      } catch (err) {
        console.error("Assignee notification failed:", err.message);
      }
    }

    // 2. Notify OTHER project members (excluding actor AND assignee)
    //    So they don't get 2 emails
    setTimeout(() => {
      notifyOtherMembers(projectId, req.user.id, assigneeId, task, actor, req.io);
    }, 100);

    res.status(201).json(task);
  } catch (err) { next(err); }
}

// ============================================================
// Notify other members (excluding actor + assignee)
// ============================================================
async function notifyOtherMembers(projectId, actorId, assigneeId, task, actor, io) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) return;

    // Recipients: all members except actor and assignee
    const recipients = project.members.filter(
      (m) => m.user.id !== actorId && m.user.id !== assigneeId
    );

    if (recipients.length === 0) return;

    console.log(`📧 Sending task-created emails to ${recipients.length} other member(s)`);

    await Promise.all(
      recipients.map(async (member) => {
        try {
          const tmpl = taskCreatedEmailTemplate(task, project, actor, member.user);
          if (tmpl) {
            await sendEmail({
              to: member.user.email,
              subject: tmpl.subject,
              html: tmpl.html,
              text: tmpl.text,
            });

            // In-app notification
            const notification = await prisma.notification.create({
              data: {
                userId: member.user.id,
                type: "info",
                message: `New task "${task.title}" created in ${project.name}`,
                link: `/projects/${projectId}`,
              },
            });
            io.to(`user:${member.user.id}`).emit("notification", notification);
          }
        } catch (err) {
          console.error(`Email to ${member.user.email} failed:`, err.message);
        }
      })
    );
  } catch (err) {
    console.error("notifyOtherMembers error:", err.message);
  }
}

// ============================================================
// UPDATE TASK
// ============================================================
export async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      const e = new Error("Task not found");
      e.status = 404;
      throw e;
    }

    await assertProjectAccess(existing.projectId, req.user.id);

    // Build update data
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.estimatedHrs !== undefined) updateData.estimatedHrs = data.estimatedHrs;
    if (data.loggedHrs !== undefined) updateData.loggedHrs = data.loggedHrs;
    if (data.order !== undefined) updateData.order = data.order;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatarColor: true } } },
          orderBy: { createdAt: "asc" },
        },
        subtasks: { orderBy: { order: "asc" } },
        attachments: true,
        labels: { include: { label: true } },
      },
    });

    req.io.to(`project:${task.projectId}`).emit("task:updated", task);

    // Activity log
    if (data.status !== undefined && data.status !== existing.status) {
      await logActivity(req.user.id, task.projectId, "moved_task", {
        taskId: task.id,
        title: task.title,
        from: existing.status,
        to: data.status,
      });
    } else {
      await logActivity(req.user.id, task.projectId, "updated_task", {
        taskId: task.id,
        title: task.title,
      });
    }

    // ============================================================
    // NOTIFICATIONS
    // ============================================================
    const actor = await prisma.user.findUnique({ where: { id: req.user.id } });
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { members: { include: { user: true } } },
    });

    // 1. Task completed → email task creator (project owner) + assignee
    if (data.status === "done" && existing.status !== "done") {
      try {
        const owner = project.members.find((m) => m.role === "owner")?.user;
        if (owner && owner.id !== req.user.id) {
          const tmpl = taskCompletedEmailTemplate(task, project, actor, owner);
          await sendEmail({
            to: owner.email,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
          });
        }

        if (task.assigneeId && task.assigneeId !== req.user.id && task.assigneeId !== owner?.id) {
          const assigneeUser = await prisma.user.findUnique({ where: { id: task.assigneeId } });
          if (assigneeUser) {
            const tmpl = taskCompletedEmailTemplate(task, project, actor, assigneeUser);
            await sendEmail({
              to: assigneeUser.email,
              subject: tmpl.subject,
              html: tmpl.html,
              text: tmpl.text,
            });
          }
        }
      } catch (err) {
        console.error("Task completion email failed:", err.message);
      }
    }

    // 2. Status changed (not to done) → notify owner + assignee
    if (data.status !== undefined && data.status !== existing.status && data.status !== "done") {
      try {
        const owner = project.members.find((m) => m.role === "owner")?.user;
        const recipients = new Set();

        if (owner && owner.id !== req.user.id) recipients.add(owner.id);
        if (task.assigneeId && task.assigneeId !== req.user.id) recipients.add(task.assigneeId);

        for (const userId of recipients) {
          const u = await prisma.user.findUnique({ where: { id: userId } });
          if (u) {
            const tmpl = taskUpdatedEmailTemplate(task, project, actor, u);
            await sendEmail({
              to: u.email,
              subject: tmpl.subject,
              html: tmpl.html,
              text: tmpl.text,
            });

            const notification = await prisma.notification.create({
              data: {
                userId: u.id,
                type: "info",
                message: `Task "${task.title}" moved to ${data.status.replace("_", " ")}`,
                link: `/projects/${task.projectId}`,
              },
            });
            req.io.to(`user:${u.id}`).emit("notification", notification);
          }
        }
      } catch (err) {
        console.error("Task update email failed:", err.message);
      }
    }

    // 3. New assignee (task re-assigned) → email new assignee
    if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== req.user.id) {
      try {
        const newAssignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
        if (newAssignee) {
          const tmpl = taskAssignedEmailTemplate(task, project, actor, newAssignee);
          await sendEmail({
            to: newAssignee.email,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
          });

          const notification = await prisma.notification.create({
            data: {
              userId: newAssignee.id,
              type: "task_assigned",
              message: `You were assigned to "${task.title}"`,
              link: `/projects/${task.projectId}`,
            },
          });
          req.io.to(`user:${newAssignee.id}`).emit("notification", notification);
        }
      } catch (err) {
        console.error("Reassignment email failed:", err.message);
      }
    }

    res.json(task);
  } catch (err) { next(err); }
}

// ============================================================
// DELETE TASK
// ============================================================
export async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      const e = new Error("Task not found");
      e.status = 404;
      throw e;
    }

    await assertProjectAccess(existing.projectId, req.user.id);

    await prisma.task.delete({ where: { id } });

    req.io.to(`project:${existing.projectId}`).emit("task:deleted", { id });

    await logActivity(req.user.id, existing.projectId, "deleted_task", {
      title: existing.title,
    });

    res.json({ success: true });
  } catch (err) { next(err); }
}