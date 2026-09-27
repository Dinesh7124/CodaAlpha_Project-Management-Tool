export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return new Date(date).toLocaleDateString();
}

export function isOverdue(date) {
  return date && new Date(date) < new Date();
}

export function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const PRIORITY_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#dc2626",
};

export const STATUS_INFO = {
  todo: { label: "To Do", color: "#94a3b8", emoji: "📝" },
  in_progress: { label: "In Progress", color: "#3b82f6", emoji: "⚡" },
  review: { label: "Review", color: "#8b5cf6", emoji: "👀" },
  done: { label: "Done", color: "#10b981", emoji: "✅" },
};

export const PROJECT_ICONS = ["📁", "🚀", "🎯", "💡", "🔥", "⭐", "🏆", "💼", "📊", "🛠️", "🎨", "📱", "🌐", "💰", "🏗️", "📚"];
export const PROJECT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#a855f7"];
