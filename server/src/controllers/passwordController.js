import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import {
  sendEmail,
  otpEmailTemplate,
  passwordResetSuccessEmailTemplate,
} from "../utils/email.js";

// ============================================================
// SEND OTP
// ============================================================
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });

    // Security: don't reveal if email exists
    if (!user) {
      console.log("🔐 Forgot-password attempt for non-existent email: " + email);
      return res.json({ success: true, message: "If that email exists, an OTP has been sent." });
    }

    // Rate limit: don't send more than once per 60 seconds
    if (user.resetOtpExpiry && new Date(user.resetOtpExpiry) > new Date(Date.now() + 9 * 60 * 1000)) {
      return res.status(429).json({
        error: "OTP already sent. Please wait before requesting again.",
      });
    }

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtp: otp, resetOtpExpiry: expiry },
    });

    // Send email
    const tmpl = otpEmailTemplate(otp, user.name);
    await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });

    console.log("🔐 OTP sent to " + email);

    res.json({
      success: true,
      message: "OTP sent to your email. Check inbox/spam.",
    });
  } catch (err) { next(err); }
}

// ============================================================
// VERIFY OTP
// ============================================================
export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid request" });

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (!user.resetOtpExpiry || new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: "OTP has expired. Request a new one." });
    }

    // Generate temporary reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: "TOKEN:" + resetToken,
        resetOtpExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 min
      },
    });

    res.json({ success: true, resetToken });
  } catch (err) { next(err); }
}

// ============================================================
// RESET PASSWORD + SEND CONFIRMATION EMAIL
// ============================================================
export async function resetPassword(req, res, next) {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: "Email, token, and new password required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid request" });

    if (user.resetOtp !== "TOKEN:" + resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    if (!user.resetOtpExpiry || new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: "Reset token expired. Start over." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetOtp: null, resetOtpExpiry: null },
    });

    // ============ SEND SECURITY NOTIFICATION EMAIL ============
    try {
      const tmpl = passwordResetSuccessEmailTemplate(user.name);
      await sendEmail({
        to: email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
      console.log("📧 Password reset confirmation email sent to " + email);
    } catch (emailErr) {
      console.error("⚠️  Confirmation email failed:", emailErr.message);
      // Don't fail the request if email fails
    }

    res.json({ success: true, message: "Password reset successful! Please login." });
  } catch (err) { next(err); }
}