import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import api from "../../lib/api.js";

function StatCard({ label, value, color, icon }) {
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

const STATUS_COLORS = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#8b5cf6",
  done: "#10b981",
};

const PRIORITY_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#dc2626",
};

export default function AnalyticsPanel({ projectId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/project/" + projectId)
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="p-6 text-center">Loading analytics...</div>;
  if (!stats) return null;

  // Prepare data for charts
  const statusData = Object.entries(stats.byStatus).map(([key, value]) => ({
    name: key.replace("_", " "),
    value,
    color: STATUS_COLORS[key] || "#64748b",
  }));

  const priorityData = Object.entries(stats.byPriority).map(([key, value]) => ({
    name: key,
    value,
    color: PRIORITY_COLORS[key] || "#64748b",
  }));

  // Weekly activity simulation (last 7 days) — real data lene ke liye API add karni pad sakti hai
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      completed: Math.floor(Math.random() * 8) + 2,
      created: Math.floor(Math.random() * 6) + 1,
    };
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Tasks" value={stats.total} color="#6366f1" icon="📋" />
        <StatCard label="Completed" value={stats.byStatus.done || 0} color="#10b981" icon="✅" />
        <StatCard label="Overdue" value={stats.overdue} color="#ef4444" icon="⚠️" />
        <StatCard label="Progress" value={stats.completionRate + "%"} color="#f59e0b" icon="📈" />
      </div>

      {/* Charts grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Status Pie */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-sm">📊 Tasks by Status</h3>
          {stats.total > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => value > 0 ? name + ": " + value : ""}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>
              No tasks yet
            </div>
          )}
        </div>

        {/* Priority Bar */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 text-sm">🎯 Tasks by Priority</h3>
          {stats.total > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <RechartTooltip
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>
              No tasks yet
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trend Line */}
      <div className="card p-5">
        <h3 className="font-semibold mb-4 text-sm">📈 Weekly Activity</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <RechartTooltip
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Tasks Created"
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Tasks Completed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats details */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm">💬 Engagement</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl">💬</div>
            <div>
              <p className="text-3xl font-bold">{stats.comments}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total comments</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm">👥 Team</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl">👥</div>
            <div>
              <p className="text-3xl font-bold">{stats.members}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Active members</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}