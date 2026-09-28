import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";
import {
  sendEmail,
  passwordChangedEmailTemplate,
  emailChangeOtpTemplate,
  deleteAccountOtpTemplate,
  accountDeletedTemplate,
} from "../utils/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// HELPER — Log security event
// ============================================================
async function logSecurity(userId, event, req, meta = {}) {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "Unknown";
    await prisma.securityLog.create({
      data: {
        userId,
        event,
        ip: ip.replace("::ffff:", ""),
        userAgent: req.headers["user-agent"] || "Unknown",
        meta: JSON.stringify(meta),
      },
    });
  } catch (e) {
    console.error("Security log failed:", e.message);
  }
}

// ============================================================
// UPDATE PROFILE (name, bio, theme, avatarColor)
// ============================================================
export async function updateProfile(req, res, next) {
  try {
    const { name, bio, theme, avatarColor } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio;
    if (theme !== undefined) data.theme = theme;
    if (avatarColor !== undefined) data.avatarColor = avatarColor;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      theme: user.theme,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) { next(err); }
}

// ============================================================
// UPLOAD AVATAR
// ============================================================
export async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Delete old avatar file
    if (user.avatarUrl) {
      const oldPath = path.join(__dirname, "../../", user.avatarUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = "/uploads/" + req.file.filename;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    await logSecurity(req.user.id, "avatar_changed", req);

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      avatarColor: updated.avatarColor,
    });
  } catch (err) { next(err); }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================
export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hash },
    });

    await logSecurity(req.user.id, "password_changed", req);

    // Send security email
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
      const tmpl = passwordChangedEmailTemplate(user.name, {
        when: new Date(),
        ip: ip.replace("::ffff:", ""),
        method: "Profile page",
      });
      await sendEmail({
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    } catch (e) {
      console.error("Alert email failed:", e.message);
    }

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) { next(err); }
}

// ============================================================
// REQUEST EMAIL CHANGE (Step 1 — send OTP to NEW email)
// ============================================================
export async function requestEmailChange(req, res, next) {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: "New email and password required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Incorrect password" });

    // Check if new email is already taken
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      return res.status(409).json({ error: "This email is already registered" });
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        pendingEmail: newEmail,
        emailChangeOtp: otp,
        emailChangeExpiry: expiry,
      },
    });

    // Send OTP to new email
    const tmpl = emailChangeOtpTemplate(otp, user.name, newEmail);
    await sendEmail({
      to: newEmail,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });

    await logSecurity(req.user.id, "email_change_requested", req, { newEmail });

    console.log("📧 Email change OTP sent to " + newEmail);

    res.json({
      success: true,
      message: "OTP sent to your new email. Check inbox/spam.",
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    });
  } catch (err) { next(err); }
}

// ============================================================
// VERIFY EMAIL CHANGE (Step 2 — confirm OTP)
// ============================================================
export async function verifyEmailChange(req, res, next) {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: "OTP required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.pendingEmail || !user.emailChangeOtp) {
      return res.status(400).json({ error: "No pending email change" });
    }
    if (user.emailChangeOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (!user.emailChangeExpiry || new Date() > user.emailChangeExpiry) {
      return res.status(400).json({ error: "OTP expired. Request again." });
    }

    const oldEmail = user.email;
    const newEmail = user.pendingEmail;

    // Update email
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailChangeOtp: null,
        emailChangeExpiry: null,
      },
    });

    await logSecurity(req.user.id, "email_changed", req, { oldEmail, newEmail });

    res.json({
      success: true,
      message: "Email changed successfully",
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatarColor: updated.avatarColor,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (err) { next(err); }
}

// ============================================================
// REQUEST ACCOUNT DELETION (Step 1 — send OTP)
// ============================================================
export async function requestAccountDeletion(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Incorrect password" });

    const otp = String(crypto.randomInt(100000, 999999));
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { deleteOtp: otp, deleteOtpExpiry: expiry },
    });

    const tmpl = deleteAccountOtpTemplate(otp, user.name);
    await sendEmail({
      to: user.email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });

    console.log("📧 Account deletion OTP sent to " + user.email);

    res.json({
      success: true,
      message: "Confirmation OTP sent to your email.",
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    });
  } catch (err) { next(err); }
}

// ============================================================
// CONFIRM ACCOUNT DELETION (Step 2 — delete with OTP)
// ============================================================
export async function confirmAccountDeletion(req, res, next) {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: "OTP required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.deleteOtp || user.deleteOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (!user.deleteOtpExpiry || new Date() > user.deleteOtpExpiry) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Send goodbye email BEFORE deleting (in background)
    try {
      const tmpl = accountDeletedTemplate(user.name, user.email);
      await sendEmail({
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    } catch (e) {
      console.error("Goodbye email failed:", e.message);
    }

    // Delete user (cascade deletes everything)
    await prisma.user.delete({ where: { id: user.id } });

    console.log("🗑️  Account deleted: " + user.email);

    res.json({ success: true, message: "Account deleted permanently" });
  } catch (err) { next(err); }
}

// ============================================================
// GET SECURITY LOG
// ============================================================
export async function getSecurityLog(req, res, next) {
  try {
    const logs = await prisma.securityLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch (err) { next(err); }
}

// ============================================================
// GET ACTIVE SESSIONS
// ============================================================
export async function getSessions(req, res, next) {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id, revoked: false },
      orderBy: { lastActiveAt: "desc" },
    });
    res.json(sessions);
  } catch (err) { next(err); }
}

// ============================================================
// LOGOUT ALL SESSIONS
// ============================================================
export async function logoutAllSessions(req, res, next) {
  try {
    await prisma.session.updateMany({
      where: { userId: req.user.id },
      data: { revoked: true },
    });
    await logSecurity(req.user.id, "all_sessions_revoked", req);
    res.json({ success: true, message: "All sessions logged out" });
  } catch (err) { next(err); }
}

// ============================================================
// SEARCH USERS (existing)
// ============================================================
export async function searchUsers(req, res, next) {
  try {
    const q = req.query.q || "";
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.id } },
          q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {},
        ],
      },
      select: { id: true, name: true, email: true, avatarColor: true, avatarUrl: true },
      take: 20,
    });
    res.json(users);
  } catch (err) { next(err); }
}