import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { signToken } from "../middleware/auth.js";
import { requireFields, isValidEmail, pickAvatarColor } from "../utils/validate.js";

export async function register(req, res, next) {
  try {
    const { email, name, password } = req.body;
    requireFields(req.body, ["email", "name", "password"]);
    if (!isValidEmail(email)) { const e = new Error("Invalid email"); e.status = 400; throw e; }
    if (password.length < 6) { const e = new Error("Password min 6 chars"); e.status = 400; throw e; }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { const e = new Error("Email already registered"); e.status = 409; throw e; }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hash, avatarColor: pickAvatarColor(name) },
    });
    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    requireFields(req.body, ["email", "password"]);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }
    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitize(user));
  } catch (err) { next(err); }
}

function sanitize(u) {
  return { id: u.id, email: u.email, name: u.name, avatarColor: u.avatarColor };
}
