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
    console.log("\n📧 EMAIL (dev mode — SMTP not configured)");
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
// SECURITY ALERT — Password Changed
// ============================================================
export function passwordChangedEmailTemplate(name, meta = {}) {
  const { when, ip, method } = meta;
  const timeStr = when ? new Date(when).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  }) : new Date().toLocaleString("en-IN");

  return {
    subject: "🔒 Your TaskFlow Pro password was changed",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center">
            <div style="font-size:48px">🔒</div>
            <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Security Alert</h1>
          </div>
          <div style="padding:32px">
            <p style="color:#0f172a;font-size:16px;margin-top:0">Hi <strong>${name}</strong>,</p>
            <p style="color:#475569;font-size:15px;line-height:1.6">
              Your TaskFlow Pro password was <strong>successfully changed</strong>.
            </p>

            <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#92400e;font-size:14px"><strong>Details:</strong></p>
              <div style="margin-top:8px;font-size:13px;color:#78350f;line-height:1.8">
                <div><strong>When:</strong> ${timeStr}</div>
                ${method ? `<div><strong>Method:</strong> ${method}</div>` : ""}
                ${ip ? `<div><strong>IP Address:</strong> ${ip}</div>` : ""}
              </div>
            </div>

            <div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#991b1b;font-size:14px">
                <strong>⚠️ Didn't change your password?</strong><br/>
                If this wasn't you, your account may be compromised. Please
                <strong>reset your password immediately</strong> and contact support.
              </p>
            </div>

            <a href="${process.env.CLIENT_URL}/forgot-password" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">
              Reset Password Now
            </a>

            <p style="color:#94a3b8;font-size:12px;margin-top:32px">
              This is an automated security notification. Please do not reply.
            </p>
          </div>
          <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b">
            © 2026 TaskFlow Pro · Built with ❤️
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your TaskFlow Pro password was changed on ${timeStr}. If this wasn't you, reset your password immediately at ${process.env.CLIENT_URL}/forgot-password`,
  };
}

// ============================================================
// SECURITY ALERT — Password Reset Confirmation
// ============================================================
export function passwordResetSuccessEmailTemplate(name) {
  const timeStr = new Date().toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return {
    subject: "✅ Your TaskFlow Pro password was reset",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05)">
          <div style="background:linear-gradient(135deg,#10b981,#14b8a6);padding:32px;text-align:center">
            <div style="font-size:48px">✅</div>
            <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Password Reset Successful</h1>
          </div>
          <div style="padding:32px">
            <p style="color:#0f172a;font-size:16px;margin-top:0">Hi <strong>${name}</strong>,</p>
            <p style="color:#475569;font-size:15px;line-height:1.6">
              Your password was reset successfully on <strong>${timeStr}</strong>.
            </p>

            <div style="background:#d1fae5;border-left:4px solid #10b981;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#065f46;font-size:14px">
                You can now log in with your new password.
              </p>
            </div>

            <div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#991b1b;font-size:14px">
                <strong>⚠️ Didn't reset your password?</strong><br/>
                Someone else may have access to your account. Contact support immediately.
              </p>
            </div>

            <a href="${process.env.CLIENT_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">
              Login Now
            </a>

            <p style="color:#94a3b8;font-size:12px;margin-top:32px">
              This is an automated security notification.
            </p>
          </div>
          <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b">
            © 2026 TaskFlow Pro
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your TaskFlow Pro password was reset successfully on ${timeStr}. If this wasn't you, contact support immediately.`,
  };
}

// ============================================================
// EMAIL CHANGE OTP
// ============================================================
export function emailChangeOtpTemplate(otp, name, newEmail) {
  return {
    subject: "🔐 Confirm your new email — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px;text-align:center">
          <div style="font-size:48px">📧</div>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Email Change Request</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:16px;margin-top:0">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:15px;line-height:1.6">
            You requested to change your TaskFlow Pro email to:
          </p>
          <div style="background:#dbeafe;border-radius:8px;padding:12px;margin:16px 0;text-align:center">
            <strong style="color:#1e40af">${newEmail}</strong>
          </div>
          <p style="color:#475569;font-size:15px">Use this OTP to confirm:</p>
          <div style="background:#f1f5f9;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#3b82f6;font-family:monospace">${otp}</div>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px">Valid for 10 minutes</p>
          </div>
          <div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#991b1b;font-size:14px">
              <strong>⚠️ Didn't request this?</strong> Ignore this email. Your email won't be changed.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `Your email change OTP: ${otp} (valid 10 min). If you didn't request this, ignore this email.`,
  };
}

// ============================================================
// DELETE ACCOUNT OTP
// ============================================================
export function deleteAccountOtpTemplate(otp, name) {
  return {
    subject: "⚠️ Confirm Account Deletion — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center">
          <div style="font-size:48px">⚠️</div>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px">Delete Account?</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:16px;margin-top:0">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:15px;line-height:1.6">
            You requested to <strong>permanently delete</strong> your TaskFlow Pro account. This action <strong>cannot be undone</strong>.
          </p>
          <div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#991b1b;font-size:14px">
              <strong>What will be deleted:</strong>
            </p>
            <ul style="color:#7f1d1d;font-size:13px;margin:8px 0 0;padding-left:20px">
              <li>Your account and profile</li>
              <li>All projects you own</li>
              <li>All tasks, comments, and attachments</li>
              <li>All notifications and activity history</li>
            </ul>
          </div>
          <p style="color:#475569;font-size:15px">Enter this OTP to confirm deletion:</p>
          <div style="background:#f1f5f9;border:2px dashed #ef4444;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ef4444;font-family:monospace">${otp}</div>
            <p style="margin:8px 0 0;color:#64748b;font-size:12px">Valid for 10 minutes</p>
          </div>
          <p style="color:#475569;font-size:14px">
            If you didn't request this, <strong>ignore this email</strong> and consider changing your password immediately.
          </p>
        </div>
      </div>
    `,
    text: `Delete account OTP: ${otp}. If you didn't request this, ignore this email.`,
  };
}

// ============================================================
// ACCOUNT DELETED CONFIRMATION
// ============================================================
export function accountDeletedTemplate(name, email) {
  return {
    subject: "Account Deleted — TaskFlow Pro",
    html: `
      <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#64748b,#475569);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Goodbye 👋</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#0f172a;font-size:16px">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:15px;line-height:1.6">
            Your TaskFlow Pro account (${email}) has been <strong>permanently deleted</strong>.
          </p>
          <p style="color:#475569;font-size:15px">
            All your projects, tasks, and data have been removed. We're sad to see you go.
          </p>
          <p style="color:#475569;font-size:15px">
            If you didn't request this, please contact support immediately.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">— TaskFlow Pro Team</p>
        </div>
      </div>
    `,
    text: `Your TaskFlow Pro account (${email}) has been deleted. If you didn't request this, contact support.`,
  };
}