import { prisma } from "../config/prisma.js";

const ROLE_LEVELS = { viewer: 1, member: 2, admin: 3, owner: 4 };

export async function requireProjectRole(projectId, userId, minRole = "member") {
  const member = await prisma.member.findFirst({
    where: { projectId, userId },
  });
  if (!member) {
    const e = new Error("Access denied - not a member");
    e.status = 403;
    throw e;
  }
  if (ROLE_LEVELS[member.role] < ROLE_LEVELS[minRole]) {
    const e = new Error("Insufficient permissions - requires " + minRole);
    e.status = 403;
    throw e;
  }
  return member;
}

export function canEdit(role) {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.member;
}

export function canManage(role) {
  return ROLE_LEVELS[role] >= ROLE_LEVELS.admin;
}

export function isOwner(role) {
  return role === "owner";
}