import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  select: { id: true, email: true, name: true, createdAt: true },
  orderBy: { createdAt: "asc" },
});

console.log("\n👥 All users in database:\n");
users.forEach((u, i) => {
  console.log((i + 1) + ". " + u.name + " <" + u.email + ">");
  console.log("   Created: " + new Date(u.createdAt).toLocaleString());
});

await prisma.$disconnect();