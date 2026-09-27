export function requireFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length) {
    const err = new Error("Missing fields: " + missing.join(", "));
    err.status = 400;
    throw err;
  }
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function pickAvatarColor(name) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f59e0b","#10b981","#06b6d4","#3b82f6"];
  const idx = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[idx % colors.length];
}
