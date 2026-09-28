import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer,
  LineChart, Line, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar,
} from "recharts";
import api from "../../lib/api.js";

// ============================================================
// STAT CARD with gradient
// ============================================================
function StatCard({ label, value, icon, gradient, subtitle }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -mr-8 -mt-8"
        style={{ background: gradient }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
          <span className="text-2xl">{icon}</span>
        </div>
        <p className="text-3xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: gradient }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HEATMAP — GitHub style contributions
// ============================================================
function ActivityHeatmap({ tasks }) {
  // Build last 70 days grid (10 weeks × 7 days)
  const days = [];
  const today = new Date();
  for (let i = 69; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const counts = days.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    return tasks.filter((t) => {
      const created = new Date(t.createdAt);
      return created >= day && created < nextDay;
    }).length;
  });

  const max = Math.max(...counts, 1);

  const getColor = (count) => {
    if (count === 0) return "var(--bg-hover)";
    const intensity = count / max;
    if (intensity < 0.25) return "#c7d2fe";
    if (intensity < 0.5) return "#a5b4fc";
    if (intensity < 0.75) return "#818cf8";
    return "#6366f1";
  };

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {days.map((d, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm transition-all hover:scale-150 cursor-pointer"
            style={{ background: getColor(counts[i]) }}
            title={`${d.toDateString()}: ${counts[i]} tasks`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm" style={{ background: "var(--bg-hover)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "#c7d2fe" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "#a5b4fc" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "#818cf8" }} />
        <div className="w-3 h-3 rounded-sm" style={{ background: "#6366f1" }} />
        <span>More</span>
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS RING
// ============================================================
function ProgressRing({ percent, size = 120 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#gradient)"
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{percent}%</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Complete</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AnalyticsPanel({ projectId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = projectId
      ? "/analytics/project/" + projectId
      : "/analytics/global";
    api.get(url)
      .then((r) => setStats(r.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>Loading analytics...</p>
      </div>
    );
  }

  if (!stats) return <div className="text-center py-12">No data available</div>;

  const isProject = !!projectId;

  // Chart data
  const statusData = isProject
    ? Object.entries(stats.byStatus).map(([k, v]) => ({
        name: k.replace("_", " "),
        value: v,
        color: { todo: "#94a3b8", in_progress: "#3b82f6", review: "#8b5cf6", done: "#10b981" }[k],
      }))
    : null;

  const priorityData = isProject
    ? Object.entries(stats.byPriority).map(([k, v]) => ({
        name: k,
        value: v,
        color: { low: "#10b981", medium: "#f59e0b", high: "#ef4444", urgent: "#dc2626" }[k],
      }))
    : null;

  const weeklyData = isProject ? stats.last7Days : null;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ============================================ */}
      {/* STAT CARDS */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isProject ? (
          <>
            <StatCard label="Total Tasks" value={stats.total} icon="📋" gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />
            <StatCard label="Completed" value={stats.byStatus.done} icon="✅" gradient="linear-gradient(135deg, #10b981, #14b8a6)" subtitle={`${stats.completionRate}% done`} />
            <StatCard label="In Progress" value={stats.byStatus.in_progress} icon="⚡" gradient="linear-gradient(135deg, #3b82f6, #06b6d4)" />
            <StatCard label="Overdue" value={stats.overdue} icon="⚠️" gradient="linear-gradient(135deg, #ef4444, #dc2626)" />
          </>
        ) : (
          <>
            <StatCard label="Projects" value={stats.totalProjects} icon="📁" gradient="linear-gradient(135deg, #6366f1, #8b5cf6)" />
            <StatCard label="Total Tasks" value={stats.totalTasks} icon="📋" gradient="linear-gradient(135deg, #3b82f6, #06b6d4)" />
            <StatCard label="Completed" value={stats.doneTasks} icon="✅" gradient="linear-gradient(135deg, #10b981, #14b8a6)" subtitle={`${stats.completionRate}% done`} />
            <StatCard label="Overdue" value={stats.overdueTasks} icon="⚠️" gradient="linear-gradient(135deg, #ef4444, #dc2626)" />
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* PROGRESS + BREAKDOWN */}
      {/* ============================================ */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold mb-4">Overall Progress</h3>
          <ProgressRing percent={stats.completionRate} />
          <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
            {isProject ? `${stats.byStatus.done} of ${stats.total}` : `${stats.doneTasks} of ${stats.totalTasks}`} tasks completed
          </p>
        </div>

        {isProject && statusData && (
          <div className="card p-6 md:col-span-2">
            <h3 className="text-sm font-semibold mb-4">📊 Tasks by Status</h3>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                No tasks yet
              </div>
            )}
          </div>
        )}

        {!isProject && (
          <div className="card p-6 md:col-span-2">
            <h3 className="text-sm font-semibold mb-4">🎯 Quick Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Urgent Tasks</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgentTasks || 0}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Due This Week</p>
                <p className="text-2xl font-bold text-amber-600">{stats.dueSoonTasks || 0}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Team Members</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.totalMembers || 0}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Comments</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalComments || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* PRIORITY + WEEKLY TREND */}
      {/* ============================================ */}
      {isProject && priorityData && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-4">🎯 Tasks by Priority</h3>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priorityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={70} />
                  <RechartTooltip
                    contentStyle={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                No tasks yet
              </div>
            )}
          </div>

          {weeklyData && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold mb-4">📈 Weekly Activity</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} fill="url(#colorCreated)" name="Created" />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#colorCompleted)" name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TEAM PERFORMANCE */}
      {/* ============================================ */}
      {isProject && stats.teamPerf && stats.teamPerf.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-4">🏆 Team Performance</h3>
          <div className="space-y-3">
            {stats.teamPerf.map((member, i) => {
              const percent = member.total > 0 ? (member.done / member.total) * 100 : 0;
              return (
                <div key={member.user.id} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                    #{i + 1}
                  </span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{ background: member.user.avatarColor }}
                  >
                    {member.user.avatarUrl ? (
                      <img
                        src={"http://localhost:5000" + member.user.avatarUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.user.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{member.user.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {member.done}/{member.total} done
                      </p>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: percent + "%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ACTIVITY HEATMAP */}
      {/* ============================================ */}
      {isProject && weeklyData && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-4">🔥 Task Creation Activity (Last 70 days)</h3>
          <ActivityHeatmap tasks={[]} />
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Each square = 1 day. Darker = more tasks created that day.
          </p>
        </div>
      )}

      {/* ============================================ */}
      {/* SUBTASK + TIME TRACKING */}
      {/* ============================================ */}
      {isProject && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">✓</span>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Subtasks Completed</p>
                <p className="text-2xl font-bold">
                  {stats.completedSubtasks || 0}/{stats.totalSubtasks || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">⏱</span>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Hours Logged</p>
                <p className="text-2xl font-bold">{stats.totalLoggedHrs || 0}h</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">💬</span>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Comments</p>
                <p className="text-2xl font-bold">{stats.comments || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}