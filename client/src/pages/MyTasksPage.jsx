import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import { formatDate, isOverdue, PRIORITY_COLORS, STATUS_INFO } from "../lib/utils.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/projects").then(async (r) => {
      const allTasks = [];
      for (const p of r.data) {
        const detail = await api.get("/projects/" + p.id);
        detail.data.tasks.forEach((t) => {
          if (t.assigneeId === user.id) {
            allTasks.push({ ...t, project: { id: p.id, name: p.name, color: p.color, icon: p.icon } });
          }
        });
      }
      setTasks(allTasks);
      setLoading(false);
    });
  }, [user.id]);

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "overdue") return t.dueDate && isOverdue(t.dueDate) && t.status !== "done";
    if (filter === "today") {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === new Date().toDateString();
    }
    return t.status === filter;
  });

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "done").length,
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">📋 My Tasks</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Tasks assigned to you across all projects
        </p>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "all", label: "All", icon: "📋" },
            { id: "todo", label: "To Do", icon: "📝" },
            { id: "in_progress", label: "In Progress", icon: "⚡" },
            { id: "done", label: "Done", icon: "✅" },
            { id: "overdue", label: "Overdue", icon: "⚠️" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition"
              style={filter === f.id
                ? { background: "#6366f1", color: "white" }
                : { background: "var(--bg-hover)", color: "var(--text-secondary)" }}
            >
              {f.icon} {f.label} <span className="opacity-70 ml-1">{counts[f.id] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-3">🎉</div>
            <h3 className="text-lg font-semibold">No tasks here</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const pc = PRIORITY_COLORS[t.priority];
              const overdue = t.dueDate && isOverdue(t.dueDate) && t.status !== "done";
              return (
                <Link
                  key={t.id}
                  to={"/projects/" + t.project.id}
                  className="card p-4 hover:shadow-md transition flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: t.project.color + "22", border: "2px solid " + t.project.color + "55" }}
                  >
                    {t.project.icon || "📁"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {t.project.name} · {STATUS_INFO[t.status]?.emoji} {STATUS_INFO[t.status]?.label}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: pc + "22", color: pc }}>
                    {t.priority}
                  </span>
                  {t.dueDate && (
                    <span className={"text-xs px-2 py-0.5 rounded " + (overdue ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "")} style={!overdue ? { color: "var(--text-muted)" } : {}}>
                      {overdue ? "⚠️ " : "📅 "}{formatDate(t.dueDate)}
                    </span>
                  )}
                  <span className="text-xl opacity-40">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
