import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  SMTP not configured. Emails will be logged only.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log("\n📧 EMAIL (dev mode)");
    console.log("   To: " + to);
    console.log("   Subject: " + subject);
    console.log("");
    return { dev: true };
  }

  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || "TaskFlow Pro <noreply@taskflow.com>",
      to, subject, text, html,
    });
    console.log("📧 Email sent to " + to + " (" + info.messageId + ")");
    return info;
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    return { error: err.message };
  }
}

// ============================================================
// OTP (password reset)
// ============================================================
export function otpEmailTemplate(otp, name) {
  return {
    subject: "🔐 Password Reset OTP — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">🚀 TaskFlow Pro</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0f172a">Password Reset</h2>
          <p style="color:#475569">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569">Use this OTP to reset your password:</p>
          <div style="background:#f1f5f9;border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6366f1;font-family:monospace">${otp}</div>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px">Valid 10 minutes</p>
          </div>
        </div>
      </div>
    `,
    text: "Your TaskFlow Pro OTP: " + otp + " (valid 10 min)",
  };
}

// ============================================================
// PASSWORD CHANGED ALERT
// ============================================================
export function passwordChangedEmailTemplate(name, meta = {}) {
  const { when, ip, method } = meta;
  const timeStr = when ? new Date(when).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");

  return {
    subject: "🔒 Your TaskFlow Pro password was changed",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center">
          <div style="font-size:48px">🔒</div>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Security Alert</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569">Your password was <strong>successfully changed</strong>.</p>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">
            <div style="font-size:13px;color:#78350f">
              <div><strong>When:</strong> ${timeStr}</div>
              ${method ? `<div><strong>Method:</strong> ${method}</div>` : ""}
              ${ip ? `<div><strong>IP:</strong> ${ip}</div>` : ""}
            </div>
          </div>
          <div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#991b1b;font-size:14px">
              <strong>Didn't change it?</strong> Reset your password immediately.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `Password changed on ${timeStr}. If not you, reset immediately.`,
  };
}

// ============================================================
// PASSWORD RESET SUCCESS
// ============================================================
export function passwordResetSuccessEmailTemplate(name) {
  const timeStr = new Date().toLocaleString("en-IN");
  return {
    subject: "✅ Your TaskFlow Pro password was reset",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#10b981,#14b8a6);padding:32px;text-align:center">
          <div style="font-size:48px">✅</div>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Password Reset Successful</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569">Your password was reset successfully on <strong>${timeStr}</strong>.</p>
          <p style="color:#475569">You can now log in with your new password.</p>
        </div>
      </div>
    `,
    text: `Password reset on ${timeStr}.`,
  };
}

// ============================================================
// EMAIL CHANGE OTP
// ============================================================
export function emailChangeOtpTemplate(otp, name, newEmail) {
  return {
    subject: "🔐 Confirm your new email — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px;text-align:center">
          <div style="font-size:48px">📧</div>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Email Change Request</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569">You requested to change your email to:</p>
          <div style="background:#dbeafe;border-radius:8px;padding:12px;margin:16px 0;text-align:center">
            <strong style="color:#1e40af">${newEmail}</strong>
          </div>
          <p style="color:#475569">Use this OTP to confirm:</p>
          <div style="background:#f1f5f9;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#3b82f6;font-family:monospace">${otp}</div>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px">Valid 10 minutes</p>
          </div>
        </div>
      </div>
    `,
    text: `Email change OTP: ${otp}`,
  };
}

// ============================================================
// DELETE ACCOUNT OTP
// ============================================================
export function deleteAccountOtpTemplate(otp, name) {
  return {
    subject: "⚠️ Confirm Account Deletion — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center">
          <div style="font-size:48px">⚠️</div>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Delete Account?</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569">You requested to <strong>permanently delete</strong> your account.</p>
          <div style="background:#f1f5f9;border:2px dashed #ef4444;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ef4444;font-family:monospace">${otp}</div>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px">Valid 10 minutes</p>
          </div>
        </div>
      </div>
    `,
    text: `Delete account OTP: ${otp}`,
  };
}

// ============================================================
// ACCOUNT DELETED CONFIRMATION
// ============================================================
export function accountDeletedTemplate(name, email) {
  return {
    subject: "Account Deleted — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#64748b,#475569);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Goodbye 👋</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569">Your account (${email}) has been <strong>permanently deleted</strong>.</p>
        </div>
      </div>
    `,
    text: `Account deleted: ${email}`,
  };
}

// ============================================================
// TASK ASSIGNED
// ============================================================
export function taskAssignedEmailTemplate(task, project, assigner, assignee) {
  return {
    subject: "📋 New Task Assigned: " + task.title,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">🚀 TaskFlow Pro</h1>
          </div>
          <div style="padding:32px">
            <p style="color:#475569;font-size:15px">Hi <strong>${assignee.name}</strong>,</p>
            <p style="color:#475569;font-size:15px"><strong>${assigner.name}</strong> assigned you a task in <strong>${project.name}</strong>:</p>
            <div style="background:#f1f5f9;border-left:4px solid #6366f1;border-radius:8px;padding:16px;margin:20px 0">
              <h3 style="margin:0 0 8px;color:#0f172a">${task.title}</h3>
              ${task.description ? '<p style="margin:0;color:#64748b;font-size:14px">' + task.description + '</p>' : ''}
              <div style="margin-top:12px;font-size:13px;color:#64748b">
                <div>Priority: <strong>${task.priority}</strong></div>
                ${task.dueDate ? '<div style="margin-top:6px">Due: ' + new Date(task.dueDate).toLocaleDateString() + '</div>' : ''}
              </div>
            </div>
            <a href="${process.env.CLIENT_URL}/projects/${project.id}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">
              View Task
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px">— TaskFlow Pro Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${assigner.name} assigned you "${task.title}" in ${project.name}`,
  };
}

// ============================================================
// TASK CREATED (notify other members)
// ============================================================
export function taskCreatedEmailTemplate(task, project, creator, recipient) {
  return {
    subject: "🆕 New Task in " + project.name + ": " + task.title,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">🚀 TaskFlow Pro</h1>
          </div>
          <div style="padding:32px">
            <p style="color:#475569;font-size:15px">Hi <strong>${recipient.name}</strong>,</p>
            <p style="color:#475569;font-size:15px"><strong>${creator.name}</strong> created a new task in <strong>${project.name}</strong>:</p>
            <div style="background:#f1f5f9;border-left:4px solid #6366f1;border-radius:8px;padding:16px;margin:20px 0">
              <h3 style="margin:0 0 8px;color:#0f172a">${task.title}</h3>
              ${task.description ? '<p style="margin:0;color:#64748b;font-size:14px">' + task.description + '</p>' : ''}
            </div>
            <a href="${process.env.CLIENT_URL}/projects/${project.id}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">
              View Board
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px">— TaskFlow Pro Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${creator.name} created "${task.title}" in ${project.name}`,
  };
}

// ============================================================
// TASK COMPLETED
// ============================================================
export function taskCompletedEmailTemplate(task, project, completer, creator) {
  return {
    subject: "✅ Task Completed: " + task.title,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#10b981,#14b8a6);padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">🚀 TaskFlow Pro</h1>
          </div>
          <div style="padding:32px">
            <div style="text-align:center;margin-bottom:20px">
              <div style="font-size:48px">🎉</div>
              <h2 style="color:#10b981;margin:8px 0">Task Completed!</h2>
            </div>
            <p style="color:#475569;font-size:15px">Hi <strong>${creator.name}</strong>,</p>
            <p style="color:#475569;font-size:15px">The task you created has been completed:</p>
            <div style="background:#d1fae5;border-left:4px solid #10b981;border-radius:8px;padding:16px;margin:20px 0">
              <h3 style="margin:0;color:#065f46;text-decoration:line-through">${task.title}</h3>
              <p style="margin:8px 0 0;color:#047857;font-size:13px">Completed by <strong>${completer.name}</strong></p>
            </div>
            <p style="color:#475569;font-size:15px">Project: <strong>${project.name}</strong></p>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px">— TaskFlow Pro Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${completer.name} completed "${task.title}" in ${project.name}`,
  };
}

// ============================================================
// TASK UPDATED (status change)
// ============================================================
export function taskUpdatedEmailTemplate(task, project, actor, recipient) {
  const statusLabels = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
  };

  return {
    subject: `🔄 Task Updated: ${task.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;text-align:center">
            <div style="font-size:48px">🔄</div>
            <h1 style="color:#fff;margin:8px 0 0;font-size:20px">Task Updated</h1>
          </div>
          <div style="padding:32px">
            <p style="color:#475569;font-size:15px">Hi <strong>${recipient.name}</strong>,</p>
            <p style="color:#475569;font-size:15px"><strong>${actor.name}</strong> updated a task in <strong>${project.name}</strong>:</p>
            <div style="background:#f1f5f9;border-left:4px solid #3b82f6;border-radius:8px;padding:16px;margin:20px 0">
              <h3 style="margin:0 0 8px;color:#0f172a">${task.title}</h3>
              <div style="font-size:13px;color:#64748b">
                <div>New Status: <strong>${statusLabels[task.status] || task.status}</strong></div>
                <div style="margin-top:6px">Priority: ${task.priority}</div>
              </div>
            </div>
            <a href="${process.env.CLIENT_URL}/projects/${project.id}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">
              View Task
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px">— TaskFlow Pro Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${actor.name} updated "${task.title}" in ${project.name} — new status: ${task.status}`,
  };
}