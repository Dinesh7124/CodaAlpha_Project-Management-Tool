import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const name = process.argv[2] || "Test User";
const email = process.argv[3] || "test@test.com";
const password = process.argv[4] || "password123";

const hash = await bcrypt.hash(password, 10);

const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];
const color = colors[Math.floor(Math.random() * colors.length)];

try {
  const user = await prisma.user.create({
    data: { name, email, password: hash, avatarColor: color },
  });
  console.log("\n✅ User created!");
  console.log("   Name:     " + user.name);
  console.log("   Email:    " + user.email);
  console.log("   Password: " + password);
  console.log("");
} catch (e) {
  console.log("\n❌ Error: " + e.message);
  console.log("   (Email might already exist)\n");
}

await prisma.$disconnect();