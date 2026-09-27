import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import Avatar from "../ui/Avatar.jsx";
import { timeAgo } from "../../lib/utils.js";

const ACTION_ICONS = {
  created_task: "➕",
  moved_task: "🔄",
  deleted_task: "🗑️",
  commented: "💬",
  joined: "👥",
};

export default function ActivityFeed({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/activity/" + projectId)
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-center py-6" style={{ color: "var(--text-muted)" }}>Loading activity...</div>;

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        let meta = {};
        try { meta = a.meta ? JSON.parse(a.meta) : {}; } catch {}
        return (
          <div key={a.id} className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition">
            <Avatar name={a.user.name} color={a.user.avatarColor} size={32} />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold">{a.user.name}</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  {a.action === "created_task" && "created task"}
                  {a.action === "moved_task" && "moved task"}
                  {a.action === "deleted_task" && "deleted task"}
                  {a.action === "commented" && "commented on"}
                  {!["created_task","moved_task","deleted_task","commented"].includes(a.action) && a.action}
                </span>{" "}
                <span className="font-medium">{meta.title || ""}</span>
              </p>
              {a.action === "moved_task" && meta.from && meta.to && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {meta.from} → {meta.to}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {timeAgo(a.createdAt)}
              </p>
            </div>
            <span className="text-lg">{ACTION_ICONS[a.action] || "•"}</span>
          </div>
        );
      })}
    </div>
  );
}
