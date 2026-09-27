// reset-password.js — Reset any user's password
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============ CHANGE THESE 2 LINES ============
const EMAIL = process.argv[2] || "support10@idsolutionsindia.com";
const NEW_PASSWORD = process.argv[3] || "newpassword123";
// ================================================

async function reset() {
  console.log("\n🔍 Looking for user: " + EMAIL);

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.log("❌ No user found with email: " + EMAIL);
    console.log("\n💡 Available users in database:");
    const allUsers = await prisma.user.findMany({ select: { email: true, name: true } });
    allUsers.forEach((u) => console.log("   - " + u.email + " (" + u.name + ")"));
    await prisma.$disconnect();
    return;
  }

  console.log("✅ Found user: " + user.name);

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  });

  console.log("\n🔐 Password reset successfully!");
  console.log("   Email:    " + EMAIL);
  console.log("   Password: " + NEW_PASSWORD);
  console.log("\n📱 Now login with these credentials.\n");

  await prisma.$disconnect();
}

reset().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});