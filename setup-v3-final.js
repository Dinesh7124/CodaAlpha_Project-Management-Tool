// setup-v3-final.js — Complete advanced features
const fs = require("fs");
const path = require("path");

const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  ✓ " + path.relative(__dirname, p));
}

console.log("\n🚀 Writing advanced feature files...\n");

// ============================================================
// HOOKS
// ============================================================
w(path.join(C, "src/hooks/useKeyboardShortcuts.js"), `
import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      for (const [key, fn] of Object.entries(shortcuts)) {
        if (e.key.toLowerCase() === key.toLowerCase() && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
`);

// ============================================================
// LABELS — Picker Component
// ============================================================
w(path.join(C, "src/components/board/LabelPicker.jsx"), `
import { useState } from "react";
import api from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#64748b",
];

export default function LabelPicker({ projectId, labels, onChanged }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const { show } = useToast();

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/labels", { projectId, name, color });
      setName("");
      onChanged();
      show("Label created", "success");
    } catch {
      show("Failed to create", "error");
    }
  };

  const del = async (id) => {
    await api.delete("/labels/" + id);
    onChanged();
    show("Label deleted", "success");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-indigo-600 hover:underline"
      >
        + Manage labels
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 glass rounded-xl p-4 w-64 z-20 shadow-xl">
          <h4 className="text-xs font-semibold mb-2">Create Label</h4>
          <form onSubmit={create} className="space-y-2 mb-3">
            <input
              className="input text-sm"
              placeholder="Label name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={"w-6 h-6 rounded-full transition " + (color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <button className="btn btn-primary w-full text-xs !py-1.5">Create</button>
          </form>
          <div className="border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-xs font-semibold mb-2">Existing</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {labels.map((l) => (
                <div key={l.id} className="flex items-center gap-2 group">
                  <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  <span className="flex-1 text-sm">{l.name}</span>
                  <button
                    onClick={() => del(l.id)}
                    className="text-red-400 text-xs opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {labels.length === 0 && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No labels yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// ANALYTICS — Panel with charts (SVG-based, no library)
// ============================================================
w(path.join(C, "src/components/analytics/AnalyticsPanel.jsx"), `
import { useEffect, useState } from "react";
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

function ProgressRing({ percent, size = 90, color = "#6366f1" }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{percent}%</span>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, colors }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-xs w-20 capitalize" style={{ color: "var(--text-secondary)" }}>{key.replace("_", " ")}</span>
          <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "var(--bg-hover)" }}>
            <div
              className="h-full transition-all duration-700 rounded-md"
              style={{
                width: (val / max * 100) + "%",
                background: colors[key] || "#6366f1",
              }}
            />
          </div>
          <span className="text-xs w-8 text-right font-medium">{val}</span>
        </div>
      ))}
    </div>
  );
}

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

  const statusColors = { todo: "#94a3b8", in_progress: "#3b82f6", review: "#8b5cf6", done: "#10b981" };
  const priorityColors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444", urgent: "#dc2626" };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Tasks" value={stats.total} color="#6366f1" icon="📋" />
        <StatCard label="Completed" value={stats.byStatus.done || 0} color="#10b981" icon="✅" />
        <StatCard label="Overdue" value={stats.overdue} color="#ef4444" icon="⚠️" />
        <StatCard label="Members" value={stats.members} color="#8b5cf6" icon="👥" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Progress ring */}
        <div className="card p-5 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold mb-4">Completion</h3>
          <ProgressRing percent={stats.completionRate} />
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            {stats.byStatus.done || 0} of {stats.total} done
          </p>
        </div>

        {/* Status bars */}
        <div className="card p-5 md:col-span-2">
          <h3 className="text-sm font-semibold mb-4">📊 By Status</h3>
          <BarChart data={stats.byStatus} colors={statusColors} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">🎯 By Priority</h3>
          <BarChart data={stats.byPriority} colors={priorityColors} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">💬 Engagement</h3>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-3xl">💬</div>
            <div>
              <p className="text-2xl font-bold">{stats.comments}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total comments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// ============================================================
// ACTIVITY FEED
// ============================================================
w(path.join(C, "src/components/analytics/ActivityFeed.jsx"), `
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
`);

// ============================================================
// FILTER BAR — Search + filters
// ============================================================
w(path.join(C, "src/components/board/FilterBar.jsx"), `
export default function FilterBar({ filters, setFilters, members, labels, onClear }) {
  const hasFilters = filters.search || filters.priority || filters.assigneeId || filters.labelId;

  return (
    <div className="glass rounded-xl p-3 flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
        <input
          className="input pl-9 text-sm !py-2"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <select
        className="input text-sm !py-2 !w-auto"
        value={filters.priority}
        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
      >
        <option value="">All Priorities</option>
        <option value="low">🟢 Low</option>
        <option value="medium">🟡 Medium</option>
        <option value="high">🟠 High</option>
        <option value="urgent">🔴 Urgent</option>
      </select>

      <select
        className="input text-sm !py-2 !w-auto"
        value={filters.assigneeId}
        onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
      >
        <option value="">All Assignees</option>
        {members?.map((m) => (
          <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
        ))}
      </select>

      {labels?.length > 0 && (
        <select
          className="input text-sm !py-2 !w-auto"
          value={filters.labelId}
          onChange={(e) => setFilters({ ...filters, labelId: e.target.value })}
        >
          <option value="">All Labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={onClear}
          className="text-xs text-red-600 hover:underline px-2"
        >
          Clear
        </button>
      )}
    </div>
  );
}
`);

// ============================================================
// MEMBER MANAGEMENT PANEL
// ============================================================
w(path.join(C, "src/components/board/MembersPanel.jsx"), `
import { useState } from "react";
import api from "../../lib/api.js";
import Avatar from "../ui/Avatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const ROLES = ["owner", "admin", "member", "viewer"];

const ROLE_INFO = {
  owner: { label: "Owner", color: "#8b5cf6", desc: "Full control" },
  admin: { label: "Admin", color: "#3b82f6", desc: "Manage everything" },
  member: { label: "Member", color: "#10b981", desc: "Edit tasks" },
  viewer: { label: "Viewer", color: "#64748b", desc: "Read-only" },
};

export default function MembersPanel({ project, onReload }) {
  const { user } = useAuth();
  const { show } = useToast();
  const [open, setOpen] = useState(false);

  const myMembership = project.members.find((m) => m.user.id === user.id);
  const isOwner = myMembership?.role === "owner";
  const isAdmin = myMembership?.role === "admin";

  const changeRole = async (userId, role) => {
    try {
      await api.patch("/projects/" + project.id + "/members/" + userId + "/role", { role });
      show("Role updated", "success");
      onReload();
    } catch {
      show("Failed to update role", "error");
    }
  };

  const removeMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    await api.delete("/projects/" + project.id + "/members/" + userId);
    show("Member removed", "success");
    onReload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost text-sm"
      >
        👥 {project.members.length} members
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 glass rounded-xl p-4 w-80 z-30 shadow-2xl animate-slide-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Team Members</h3>
            <button onClick={() => setOpen(false)} className="text-lg">×</button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {project.members.map((m) => {
              const roleInfo = ROLE_INFO[m.role] || ROLE_INFO.member;
              const isMe = m.user.id === user.id;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.user.name} color={m.user.avatarColor} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.user.name} {isMe && <span className="text-xs opacity-60">(you)</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.user.email}</p>
                  </div>

                  {isOwner && !isMe && m.role !== "owner" ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="text-xs px-2 py-1 rounded border"
                        value={m.role}
                        onChange={(e) => changeRole(m.user.id, e.target.value)}
                        style={{
                          background: roleInfo.color + "22",
                          color: roleInfo.color,
                          borderColor: roleInfo.color + "44",
                        }}
                      >
                        {["admin", "member", "viewer"].map((r) => (
                          <option key={r} value={r}>{ROLE_INFO[r].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMember(m.user.id)}
                        className="text-red-500 text-xs px-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: roleInfo.color + "22", color: roleInfo.color }}
                    >
                      {roleInfo.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t text-xs space-y-1" style={{ borderColor: "var(--border)" }}>
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
                <span className="font-medium">{info.label}:</span>
                <span style={{ color: "var(--text-muted)" }}>{info.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// TIME TRACKING — inside TaskModal
// ============================================================
w(path.join(C, "src/components/board/TimeTracking.jsx"), `
import { useState } from "react";
import api from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function TimeTracking({ task, onUpdated }) {
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const { show } = useToast();

  const log = async (e) => {
    e.preventDefault();
    if (!hours) return;
    try {
      // Simple approach: increment loggedHrs on the task
      const newTotal = (task.loggedHrs || 0) + parseFloat(hours);
      const { data } = await api.patch("/tasks/" + task.id, { loggedHrs: newTotal });
      onUpdated(data);
      setHours("");
      setNote("");
      show("Time logged", "success");
    } catch {
      show("Failed", "error");
    }
  };

  const est = task.estimatedHrs || 0;
  const logged = task.loggedHrs || 0;
  const percent = est > 0 ? Math.min((logged / est) * 100, 100) : 0;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>⏱️ Time Tracking</label>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {logged.toFixed(1)}h / {est > 0 ? est + "h" : "—"}
        </span>
      </div>

      {est > 0 && (
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <div
            className={"h-full transition-all " + (percent >= 100 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500")}
            style={{ width: percent + "%" }}
          />
        </div>
      )}

      <form onSubmit={log} className="flex gap-2">
        <input
          type="number"
          step="0.5"
          min="0.5"
          className="input text-sm"
          placeholder="Hours"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <input
          className="input text-sm flex-1"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn btn-primary text-xs !py-2">Log</button>
      </form>
    </div>
  );
}
`);

// ============================================================
// @MENTIONS — Comment with suggestions
// ============================================================
w(path.join(C, "src/components/board/MentionInput.jsx"), `
import { useState, useRef, useEffect } from "react";
import Avatar from "../ui/Avatar.jsx";

export default function MentionInput({ value, onChange, onSubmit, placeholder, members }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const lastAt = value.lastIndexOf("@");
    if (lastAt >= 0 && lastAt === value.length - 1 - query.length) {
      const q = value.slice(lastAt + 1);
      setQuery(q);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  const filtered = members?.filter((m) =>
    m.user.name.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const insertMention = (user) => {
    const lastAt = value.lastIndexOf("@");
    const before = value.slice(0, lastAt);
    const newVal = before + "@" + user.name.replace(/\s+/g, "_") + " ";
    onChange(newVal);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder || "Comment... (type @ to mention)"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !showSuggestions) onSubmit(e); }}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 glass rounded-lg p-1 w-64 shadow-xl max-h-40 overflow-y-auto z-30">
          {filtered.slice(0, 6).map((m) => (
            <button
              key={m.user.id}
              onClick={() => insertMention(m.user)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
            >
              <Avatar name={m.user.name} color={m.user.avatarColor} size={24} />
              <span className="text-sm">{m.user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// DRAG & DROP COLUMN
// ============================================================
w(path.join(C, "src/components/board/Column.jsx"), `
import { useState } from "react";
import TaskCard from "./TaskCard.jsx";

export default function Column({ column, tasks, onCreate, onOpen, onDrop, onDragOver, isDragOver }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate(column.id, title);
    setTitle("");
    setAdding(false);
  };

  return (
    <div
      className={"rounded-2xl p-3 min-h-[420px] flex flex-col transition-all duration-200 " + (isDragOver ? "ring-2 ring-indigo-500 ring-offset-2" : "")}
      style={{ background: isDragOver ? "var(--bg-hover)" : "var(--bg-hover)" }}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(column.id); }}
      onDragLeave={() => onDragOver?.(null)}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) onDrop(taskId, column.id);
        onDragOver?.(null);
      }}
    >
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{column.emoji}</span>
          <h2 className="font-semibold text-sm">{column.title}</h2>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: column.color + "30", color: column.color }}
        >
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2 flex-1">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onClick={() => onOpen(t.id)} draggable />
        ))}
      </div>

      {adding ? (
        <form onSubmit={submit} className="mt-2">
          <input
            autoFocus
            className="input text-sm"
            placeholder="Task title... (Enter)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !title && setAdding(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-left text-sm mt-3 px-3 py-2 rounded-lg transition hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
        >
          + Add task
        </button>
      )}
    </div>
  );
}
`);

// ============================================================
// TaskCard with drag support
// ============================================================
w(path.join(C, "src/components/board/TaskCard.jsx"), `
import Avatar from "../ui/Avatar.jsx";
import { formatDate, isOverdue, PRIORITY_COLORS } from "../../lib/utils.js";

export default function TaskCard({ task, onClick, draggable }) {
  const pc = PRIORITY_COLORS[task.priority] || "#64748b";
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "done";

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="surface p-3 cursor-grab active:cursor-grabbing rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 animate-slide-up"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ background: pc + "22", color: pc }}
        >
          {task.priority}
        </span>
        {task.dueDate && (
          <span
            className={"text-xs px-1.5 py-0.5 rounded " + (overdue ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "")}
            style={!overdue ? { color: "var(--text-muted)" } : {}}
          >
            {overdue ? "⚠️ " : "📅 "}{formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {(task.labels || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((tl) => (
            <span
              key={tl.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: tl.label.color + "30", color: tl.label.color }}
            >
              {tl.label.name}
            </span>
          ))}
        </div>
      )}

      <p className="font-medium text-sm leading-tight">{task.title}</p>

      {task.description && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {task.comments?.length > 0 && <span>💬 {task.comments.length}</span>}
          {task.subtasks?.length > 0 && (
            <span>✓ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}</span>
          )}
          {task.attachments?.length > 0 && <span>📎 {task.attachments.length}</span>}
          {task.loggedHrs > 0 && <span>⏱ {task.loggedHrs}h</span>}
        </div>
        {task.assignee && (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size={22} />
        )}
      </div>
    </div>
  );
}
`);

// ============================================================
// Board with drag support
// ============================================================
w(path.join(C, "src/components/board/Board.jsx"), `
import { useState } from "react";
import Column from "./Column.jsx";

const COLUMNS = [
  { id: "todo", title: "To Do", emoji: "📝", color: "#94a3b8" },
  { id: "in_progress", title: "In Progress", emoji: "⚡", color: "#3b82f6" },
  { id: "review", title: "Review", emoji: "👀", color: "#8b5cf6" },
  { id: "done", title: "Done", emoji: "✅", color: "#10b981" },
];

export default function Board({ tasks, onCreate, onOpen, onStatusChange }) {
  const [dragOver, setDragOver] = useState(null);

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  const handleDrop = (taskId, newStatus) => {
    onStatusChange(taskId, newStatus);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => (
        <Column
          key={col.id}
          column={col}
          tasks={tasksByStatus(col.id)}
          onCreate={onCreate}
          onOpen={onOpen}
          onDrop={handleDrop}
          onDragOver={setDragOver}
          isDragOver={dragOver === col.id}
        />
      ))}
    </div>
  );
}
`);

console.log("\n✅ 11 files written!");
console.log("Now update TaskModal, ProjectPage, Dashboard manually (see next message)");
console.log("");