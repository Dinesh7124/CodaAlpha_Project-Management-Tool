import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NEW_PASSWORD = "password123";
const hash = await bcrypt.hash(NEW_PASSWORD, 10);

const result = await prisma.user.updateMany({
  data: { password: hash },
});

console.log("\n🔐 Reset password for " + result.count + " users");
console.log("   All users can now login with: " + NEW_PASSWORD + "\n");

await prisma.$disconnect();