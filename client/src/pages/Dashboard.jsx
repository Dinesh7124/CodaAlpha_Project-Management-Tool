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
    <Layout>
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
