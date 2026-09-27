// setup-v4.js — Features + Notification fix + Better dashboard
const fs = require("fs");
const path = require("path");

const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  ✓ " + path.relative(__dirname, p));
}

console.log("\n🎨 Writing v4 files...\n");

// ============================================================
// NOTIFICATION PANEL — Fixed
// ============================================================
w(path.join(C, "src/components/notifications/NotificationPanel.jsx"), `
import { useEffect, useState, useRef } from "react";
import api from "../../lib/api.js";
import { timeAgo } from "../../lib/utils.js";
import { useSocket } from "../../context/SocketContext.jsx";

export default function NotificationPanel() {
  const socket = useSocket();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => api.get("/notifications").then((r) => setItems(r.data.notifications));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onN = (n) => setItems((prev) => [n, ...prev]);
    s.on("notification", onN);
    return () => s.off("notification", onN);
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markOne = async (id) => {
    await api.patch("/notifications/" + id + "/read");
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const handleBellClick = async () => {
    const newOpen = !open;
    setOpen(newOpen);
    // Auto mark-all-read after dropdown opens for 1.5s
    if (newOpen && unread > 0) {
      setTimeout(() => markAllRead(), 1500);
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear all notifications?")) return;
    // Mark all read first
    await api.patch("/notifications/read-all");
    setItems([]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 glass rounded-2xl shadow-2xl border overflow-hidden z-50 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unread} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <>
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline" title="Mark all as read">
                    ✓ All read
                  </button>
                  <button onClick={clearAll} className="text-xs text-red-500 hover:underline" title="Clear">
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🔕</div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notifications</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>You're all caught up!</p>
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markOne(n.id)}
                  className={"p-4 border-b cursor-pointer transition hover:bg-slate-100/50 dark:hover:bg-slate-800/50 " + (n.read ? "opacity-60" : "")}
                  style={{
                    borderColor: "var(--border)",
                    background: !n.read ? "linear-gradient(90deg, #6366f108, transparent)" : "transparent",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={"w-2 h-2 rounded-full mt-2 flex-shrink-0 " + (n.read ? "bg-transparent" : "bg-indigo-500")} />
                    <div className="flex-1">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// SIDEBAR — Extended with more items
// ============================================================
w(path.join(C, "src/components/layout/Sidebar.jsx"), `
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/my-tasks", label: "My Tasks", icon: "📋" },
    { to: "/calendar", label: "Calendar", icon: "📅" },
    { to: "/analytics", label: "Analytics", icon: "📊" },
    { to: "/profile", label: "Profile", icon: "👤" },
  ];

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <aside
      className="w-60 flex-shrink-0 flex-col border-r transition-colors hidden md:flex"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <Link to="/" className="block px-6 py-5">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          TaskFlow Pro
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>v4.0</p>
      </Link>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
              style={active ? {
                background: "linear-gradient(135deg, #6366f115, #8b5cf615)",
                color: "#6366f1",
              } : { color: "var(--text-secondary)" }}
            >
              <span className="text-base">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.name} color={user?.avatarColor} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost w-full text-sm mt-1">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
`);

// ============================================================
// DASHBOARD — Rich, with analytics + recent
// ============================================================
w(path.join(C, "src/pages/Dashboard.jsx"), `
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/layout/Layout.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { PROJECT_COLORS, PROJECT_ICONS } from "../lib/utils.js";

function MiniStat({ label, value, color, icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.get("/projects").then((r) => setProjects(r.data));
    api.get("/analytics/global").then((r) => setStats(r.data));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    const icon = PROJECT_ICONS[Math.floor(Math.random() * PROJECT_ICONS.length)];
    await api.post("/projects", { name, color, icon });
    setName("");
    setCreating(false);
    load();
  };

  return (
    <Layout topbar={<NotificationPanel />}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 mb-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(" ")[0]}! 👋</h1>
            <p className="text-white/90 mt-1 text-sm">
              You have <strong>{stats?.totalTasks || 0}</strong> tasks across <strong>{stats?.totalProjects || 0}</strong> projects.
            </p>
            <div className="flex gap-3 mt-4">
              <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-white text-sm">
                ✅ {stats?.doneTasks || 0} done
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-white text-sm">
                📈 {stats?.completionRate || 0}% complete
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MiniStat label="Projects" value={stats.totalProjects} color="#6366f1" icon="📁" />
            <MiniStat label="Total Tasks" value={stats.totalTasks} color="#8b5cf6" icon="📋" />
            <MiniStat label="Completed" value={stats.doneTasks} color="#10b981" icon="✅" />
            <MiniStat label="Progress" value={stats.completionRate + "%"} color="#f59e0b" icon="📈" />
          </div>
        )}

        {/* Projects header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Projects</h2>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>{projects.length} total</span>
        </div>

        {/* Create form */}
        <form onSubmit={create} className="flex gap-2 mb-6">
          <Input
            placeholder="New project name... (e.g., Mobile App v2)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "+ Create"}
          </Button>
        </form>

        {/* Projects grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={"/projects/" + p.id}
              className="card p-5 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: p.color + "22", border: "2px solid " + p.color + "55" }}
                >
                  {p.icon || "📁"}
                </div>
                <span className="text-2xl opacity-0 group-hover:opacity-100 transition">→</span>
              </div>
              <h3 className="font-semibold text-lg group-hover:text-indigo-600 transition">{p.name}</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {p.members?.length || 0} member{p.members?.length !== 1 ? "s" : ""} · {p.taskCount || 0} task{p.taskCount !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1 mt-3">
                {p.members?.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 -ml-2 first:ml-0"
                    style={{ background: m.user.avatarColor }}
                    title={m.user.name}
                  />
                ))}
                {(p.members?.length || 0) > 5 && (
                  <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>+{p.members.length - 5}</span>
                )}
              </div>
            </Link>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-3">📁</div>
              <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Create your first project above to get started.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
`);

// ============================================================
// MY TASKS PAGE — All tasks assigned to me
// ============================================================
w(path.join(C, "src/pages/MyTasksPage.jsx"), `
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
    <Layout topbar={<NotificationPanel />}>
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
`);

// ============================================================
// CALENDAR PAGE — Tasks in calendar view
// ============================================================
w(path.join(C, "src/pages/CalendarPage.jsx"), `
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PRIORITY_COLORS } from "../lib/utils.js";

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    api.get("/projects").then(async (r) => {
      const all = [];
      for (const p of r.data) {
        const detail = await api.get("/projects/" + p.id);
        detail.data.tasks.forEach((t) => {
          if (t.dueDate && t.assigneeId === user.id) {
            all.push({ ...t, project: { id: p.id, name: p.name, color: p.color, icon: p.icon } });
          }
        });
      }
      setTasks(all);
    });
  }, [user.id]);

  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const tasksByDay = {};
  tasks.forEach((t) => {
    const d = new Date(t.dueDate);
    if (d.getMonth() === monthIdx && d.getFullYear() === year) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(t);
    }
  });

  const today = new Date();
  const prev = () => setMonth(new Date(year, monthIdx - 1, 1));
  const next = () => setMonth(new Date(year, monthIdx + 1, 1));

  return (
    <Layout topbar={<NotificationPanel />}>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">📅 Calendar</h1>

        <div className="card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="btn btn-ghost text-lg">←</button>
            <h2 className="text-xl font-semibold">
              {month.toLocaleString("default", { month: "long" })} {year}
            </h2>
            <button onClick={next} className="btn btn-ghost text-lg">→</button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium py-2" style={{ color: "var(--text-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={"empty" + i} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = tasksByDay[day] || [];
              const isToday = today.getDate() === day && today.getMonth() === monthIdx && today.getFullYear() === year;
              return (
                <div
                  key={day}
                  className={"min-h-[80px] p-1.5 rounded-lg border transition " + (isToday ? "ring-2 ring-indigo-500" : "")}
                  style={{ borderColor: "var(--border)", background: isToday ? "#6366f108" : "var(--bg-hover)" }}
                >
                  <div className={"text-xs font-medium mb-1 " + (isToday ? "text-indigo-600" : "")}>{day}</div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map((t) => (
                      <Link
                        key={t.id}
                        to={"/projects/" + t.project.id}
                        className="block text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80"
                        style={{ background: PRIORITY_COLORS[t.priority] + "22", color: PRIORITY_COLORS[t.priority] }}
                        title={t.title}
                      >
                        {t.title}
                      </Link>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{dayTasks.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12 mt-6">
            <div className="text-6xl mb-3">📅</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tasks with due dates assigned to you</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
`);

// ============================================================
// GLOBAL ANALYTICS PAGE
// ============================================================
w(path.join(C, "src/pages/AnalyticsPage.jsx"), `
import { useEffect, useState } from "react";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/analytics/global").then((r) => setStats(r.data));
  }, []);

  if (!stats) return <Layout topbar={<NotificationPanel />}><div className="text-center py-12">Loading...</div></Layout>;

  return (
    <Layout topbar={<NotificationPanel />}>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">📊 Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-5"><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Projects</p><p className="text-3xl font-bold text-indigo-600">{stats.totalProjects}</p></div>
          <div className="card p-5"><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Tasks</p><p className="text-3xl font-bold text-purple-600">{stats.totalTasks}</p></div>
          <div className="card p-5"><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Completed</p><p className="text-3xl font-bold text-emerald-600">{stats.doneTasks}</p></div>
          <div className="card p-5"><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Progress</p><p className="text-3xl font-bold text-amber-600">{stats.completionRate}%</p></div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4">Overall Progress</h3>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000"
              style={{ width: stats.completionRate + "%" }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {stats.doneTasks} of {stats.totalTasks} tasks completed
          </p>
        </div>
      </div>
    </Layout>
  );
}
`);

// ============================================================
// APP ROUTES — update
// ============================================================
w(path.join(C, "src/App.jsx"), `
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/my-tasks" element={<Private><MyTasksPage /></Private>} />
        <Route path="/calendar" element={<Private><CalendarPage /></Private>} />
        <Route path="/analytics" element={<Private><AnalyticsPage /></Private>} />
        <Route path="/projects/:id" element={<Private><ProjectPage /></Private>} />
        <Route path="/profile" element={<Private><ProfilePage /></Private>} />
      </Routes>
    </SocketProvider>
  );
}
`);

// ============================================================
// utils — add PROJECT_ICONS
// ============================================================
w(path.join(C, "src/lib/utils.js"), `
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
`);

console.log("\n✅ v4 files written!");
console.log("");