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
