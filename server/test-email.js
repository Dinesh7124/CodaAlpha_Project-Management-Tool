import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("\n=== SMTP CONFIGURATION TEST ===\n");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("User:", process.env.SMTP_USER);
console.log("Pass:", process.env.SMTP_PASS ? "***" + process.env.SMTP_PASS.slice(-4) : "NOT SET");
console.log("From:", process.env.EMAIL_FROM);
console.log("");

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log("❌ SMTP_USER or SMTP_PASS missing in .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log("Verifying connection...\n");

try {
  await transporter.verify();
  console.log("✅ SMTP connection OK!");

  console.log("\nSending test email to:", process.env.SMTP_USER);
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.SMTP_USER,
    subject: "🧪 TaskFlow Pro Test Email",
    text: "If you see this, your SMTP is working!",
    html: "<h2>Test Email</h2><p>If you see this, your SMTP is working!</p>",
  });
  console.log("✅ Email sent!");
  console.log("Message ID:", info.messageId);
  console.log("\n➡️  Check your inbox & spam folder.\n");
} catch (err) {
  console.log("❌ SMTP FAILED\n");
  console.log("Error:", err.message);
  console.log("Code:", err.code);
  console.log("");
  console.log("Common causes:");
  console.log("  - Wrong App Password (must be 16 chars, no spaces)");
  console.log("  - 2FA not enabled on Gmail");
  console.log("  - Using regular password instead of App Password");
  console.log("  - Gmail account blocked less-secure apps");
}