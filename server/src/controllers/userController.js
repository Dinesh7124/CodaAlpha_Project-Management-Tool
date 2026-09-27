import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { sendEmail, passwordChangedEmailTemplate } from "../utils/email.js";

// ... existing updateProfile function ...
export async function updateProfile(req, res, next) {
  try {
    const { name, bio, theme, avatarColor } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, bio, theme, avatarColor },
    });
    res.json({ id: user.id, email: user.email, name: user.name, bio: user.bio, theme: user.theme, avatarColor: user.avatarColor });
  } catch (err) { next(err); }
}

// ============================================================
// CHANGE PASSWORD (from profile page) + SECURITY EMAIL
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
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hash },
    });

    // ============ SEND SECURITY NOTIFICATION EMAIL ============
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
      console.log("📧 Password change alert sent to " + user.email);
    } catch (emailErr) {
      console.error("⚠️  Alert email failed:", emailErr.message);
    }

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) { next(err); }
}

// ... existing searchUsers function ...
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
      select: { id: true, name: true, email: true, avatarColor: true },
      take: 20,
    });
    res.json(users);
  } catch (err) { next(err); }
}