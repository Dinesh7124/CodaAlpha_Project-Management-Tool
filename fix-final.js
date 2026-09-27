// fix-final.js — Final targeted fixes
const fs = require("fs");
const path = require("path");

const S = path.join(__dirname, "server");
const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  OK  " + path.relative(__dirname, p));
}

console.log("\nFixing critical files...\n");

// ============================================================
// 1. INDEX.CSS — Accent variables for theme picker
// ============================================================
w(path.join(C, "src/index.css"), `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-hover: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --shadow: 0 1px 3px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
  --accent-primary: #6366f1;
  --accent-secondary: #8b5cf6;
  --accent-accent: #a855f7;
}

.dark {
  --bg-primary: #0b1120;
  --bg-secondary: #1e293b;
  --bg-hover: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border: #334155;
  --border-strong: #475569;
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.4);
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  transition: background 0.3s, color 0.3s;
  -webkit-font-smoothing: antialiased;
}

.bg-animated {
  background: linear-gradient(-45deg, var(--accent-primary), var(--accent-secondary), var(--accent-accent), var(--accent-primary));
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
.dark .glass {
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(71, 85, 105, 0.5);
}

.surface { background: var(--bg-secondary); border: 1px solid var(--border); }

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary { @apply text-white; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); }
  .btn-primary:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); transform: translateY(-1px); }
  .btn-ghost { color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-danger { @apply bg-red-500 text-white; }
  .btn-danger:hover { @apply bg-red-600; }

  .input { @apply w-full px-3 py-2 rounded-lg transition; background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-primary); }
  .input:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }

  .card { background: var(--bg-secondary); border: 1px solid var(--border); @apply rounded-xl transition; box-shadow: var(--shadow); }
  .card:hover { box-shadow: var(--shadow-lg); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slideUp 0.3s ease-out; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in { animation: fadeIn 0.2s ease-out; }

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.animate-float { animation: float 3s ease-in-out infinite; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
`);

// ============================================================
// 2. THEME CONTEXT — with presets
// ============================================================
w(path.join(C, "src/context/ThemeContext.jsx"), `
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const THEMES = {
  indigo: { name: "Indigo", primary: "#6366f1", secondary: "#8b5cf6" },
  blue: { name: "Ocean", primary: "#3b82f6", secondary: "#06b6d4" },
  emerald: { name: "Forest", primary: "#10b981", secondary: "#14b8a6" },
  rose: { name: "Rose", primary: "#f43f5e", secondary: "#ec4899" },
  amber: { name: "Sunset", primary: "#f59e0b", secondary: "#f97316" },
  slate: { name: "Mono", primary: "#475569", secondary: "#64748b" },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [accent, setAccent] = useState(() => localStorage.getItem("accent") || "indigo");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const t = THEMES[accent] || THEMES.indigo;
    document.documentElement.style.setProperty("--accent-primary", t.primary);
    document.documentElement.style.setProperty("--accent-secondary", t.secondary);
    document.documentElement.style.setProperty("--accent-accent", t.secondary);
    localStorage.setItem("accent", accent);
  }, [accent]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, accent, setAccent, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
`);

// ============================================================
// 3. THEME PICKER
// ============================================================
w(path.join(C, "src/components/ui/ThemePicker.jsx"), `
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemePicker() {
  const { accent, setAccent, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
        title="Change accent color"
      >
        🎨
      </button>

      {open && (
        <div className="absolute right-0 mt-2 glass rounded-xl shadow-xl p-3 z-50 w-64 animate-slide-up">
          <p className="text-xs font-semibold mb-3 px-1">Accent Color</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                onClick={() => { setAccent(key); setOpen(false); }}
                className={"p-3 rounded-lg text-xs font-medium transition flex flex-col items-center gap-1 " + (accent === key ? "ring-2 ring-offset-2 ring-slate-400" : "hover:bg-slate-100 dark:hover:bg-slate-700")}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ background: "linear-gradient(135deg, " + t.primary + ", " + t.secondary + ")" }}
                />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// 4. GLOBAL SEARCH — with proper Esc
// ============================================================
w(path.join(C, "src/components/common/GlobalSearch.jsx"), `
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [results, setResults] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    api.get("/projects").then(async (r) => {
      setProjects(r.data);
      const tasks = [];
      for (const p of r.data) {
        try {
          const detail = await api.get("/projects/" + p.id);
          detail.data.tasks.forEach((t) => tasks.push({ ...t, projectId: p.id, projectName: p.name, projectIcon: p.icon }));
        } catch {}
      }
      setAllTasks(tasks);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const matches = [];
    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({ type: "project", id: p.id, name: p.name, icon: p.icon, color: p.color, subtitle: "Project" });
      }
    });
    allTasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q)) {
        matches.push({ type: "task", id: t.id, projectId: t.projectId, name: t.title, icon: t.projectIcon, color: "#6366f1", subtitle: "Task in " + t.projectName });
      }
    });
    setResults(matches.slice(0, 15));
  }, [query, projects, allTasks]);

  if (!open) return null;

  const go = (r) => {
    if (r.type === "project") nav("/projects/" + r.id);
    else if (r.type === "task") nav("/projects/" + r.projectId);
    onClose();
    setQuery("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 animate-fade-in" onClick={onClose}>
      <div className="glass w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-xl">🔍</span>
          <input
            autoFocus
            className="flex-1 bg-transparent border-0 focus:outline-none text-base"
            placeholder="Search projects, tasks... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-xs px-2 py-1 rounded border hover:bg-slate-100 dark:hover:bg-slate-700" style={{ borderColor: "var(--border)" }}>
            Esc
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query === "" && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Search across all your projects and tasks
            </div>
          )}
          {query !== "" && results.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No results for "{query}"</div>
          )}
          {results.map((r) => (
            <button key={r.type + r.id} onClick={() => go(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition text-left border-b"
              style={{ borderColor: "var(--border)" }}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: r.color + "22", color: r.color }}>
                {r.icon || "📁"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.subtitle}</p>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Enter</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
`);

// ============================================================
// 5. TOPBAR — with ThemePicker + GlobalSearch
// ============================================================
w(path.join(C, "src/components/layout/Topbar.jsx"), `
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import ThemePicker from "../ui/ThemePicker.jsx";
import NotificationPanel from "../notifications/NotificationPanel.jsx";
import GlobalSearch from "../common/GlobalSearch.jsx";

export default function Topbar({ children }) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b relative z-20"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", minWidth: "200px" }}
          >
            🔍 <span>Search...</span>
            <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>Ctrl+K</kbd>
          </button>
          {children}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <NotificationPanel />
          <ThemePicker />
          <ThemeToggle />
          <div className="flex items-center gap-2 pl-3 ml-1 border-l" style={{ borderColor: "var(--border)" }}>
            <Avatar name={user?.name} color={user?.avatarColor} size={30} />
            <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
          </div>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
`);

// ============================================================
// 6. KEYBOARD SHORTCUTS hook
// ============================================================
w(path.join(C, "src/hooks/useKeyboardShortcuts.js"), `
import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts, deps = []) {
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toUpperCase();
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;

      for (const [key, fn] of Object.entries(shortcuts)) {
        const keyMatch = e.key.toLowerCase() === key.toLowerCase();
        const isEscape = key.toLowerCase() === "escape";

        if (isEscape && keyMatch) {
          e.preventDefault();
          fn(e);
          return;
        }

        if (!isTyping && keyMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, deps);
}
`);

// ============================================================
// 7. TIME TRACKING component
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
      const newTotal = (task.loggedHrs || 0) + parseFloat(hours);
      const { data } = await api.patch("/tasks/" + task.id, { loggedHrs: newTotal });
      onUpdated(data);
      setHours("");
      setNote("");
      show("Time logged: +" + hours + "h", "success");
    } catch { show("Failed", "error"); }
  };

  const est = task.estimatedHrs || 0;
  const logged = task.loggedHrs || 0;
  const percent = est > 0 ? Math.min((logged / est) * 100, 100) : 0;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Time Tracking</label>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {logged.toFixed(1)}h / {est > 0 ? est + "h" : "not set"}
        </span>
      </div>

      {est > 0 && (
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <div
            className={"h-full transition-all " + (percent >= 100 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500")}
            style={{ width: percent + "%" }}
          />
        </div>
      )}

      <form onSubmit={log} className="flex gap-2">
        <input type="number" step="0.5" min="0.5" className="input text-sm !w-24" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} />
        <input className="input text-sm flex-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn-primary text-xs !py-2">+ Log</button>
      </form>
    </div>
  );
}
`);

// ============================================================
// 8. POMODORO TIMER
// ============================================================
w(path.join(C, "src/components/board/PomodoroTimer.jsx"), `
import { useEffect, useState, useRef } from "react";
import { useToast } from "../../context/ToastContext.jsx";

export default function PomodoroTimer({ task }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("work");
  const intervalRef = useRef(null);
  const { show } = useToast();

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            const nextMode = mode === "work" ? "break" : "work";
            show(mode === "work" ? "Break time! 5 min" : "Back to work!", "info");
            setMode(nextMode);
            return nextMode === "work" ? 25 * 60 : 5 * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, show]);

  const reset = () => { setRunning(false); setSeconds(mode === "work" ? 25 * 60 : 5 * 60); };
  const toggle = () => setRunning(!running);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const total = mode === "work" ? 25 * 60 : 5 * 60;
  const percent = ((total - seconds) / total) * 100;
  const r = 35;
  const circ = 2 * Math.PI * r;

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Pomodoro Timer</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: mode === "work" ? "#ef444422" : "#10b98122", color: mode === "work" ? "#ef4444" : "#10b981" }}>
          {mode === "work" ? "Focus Time" : "Break"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 80, height: 80 }}>
          <svg width={80} height={80} className="-rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle cx="40" cy="40" r={r} fill="none" stroke={mode === "work" ? "#ef4444" : "#10b981"} strokeWidth="5"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - percent / 100)} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button onClick={toggle} className="btn btn-primary text-xs flex-1">
              {running ? "Pause" : "Start"}
            </button>
            <button onClick={reset} className="btn btn-ghost text-xs">Reset</button>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {mode === "work" ? "Focus 25 min, then break" : "Relax 5 min"}
          </p>
        </div>
      </div>

      {task && <p className="text-xs mt-3 truncate" style={{ color: "var(--text-muted)" }}>Working on: <strong>{task.title}</strong></p>}
    </div>
  );
}
`);

// ============================================================
// 9. IMAGE PREVIEW
// ============================================================
w(path.join(C, "src/components/board/ImagePreview.jsx"), `
export default function ImagePreview({ url, filename, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-8 animate-fade-in" onClick={onClose}>
      <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={filename} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
        <div className="absolute top-2 right-2 flex gap-2">
          <a href={url} download={filename} className="glass px-3 py-1.5 rounded-lg text-white text-xs hover:bg-white/20">
            Download
          </a>
          <button onClick={onClose} className="glass px-3 py-1.5 rounded-lg text-white text-xs hover:bg-white/20">
            Close
          </button>
        </div>
        <p className="text-white/80 text-xs text-center mt-3">{filename}</p>
      </div>
    </div>
  );
}
`);

// ============================================================
// 10. EXPORT CSV
// ============================================================
w(path.join(C, "src/lib/exportCsv.js"), `
export function exportTasksToCsv(project, tasks) {
  const headers = ["Title", "Description", "Status", "Priority", "Assignee", "Due Date", "Created"];
  const rows = tasks.map((t) => [
    '"' + (t.title || "").replace(/"/g, '""') + '"',
    '"' + (t.description || "").replace(/"/g, '""') + '"',
    t.status || "",
    t.priority || "",
    t.assignee?.name || "Unassigned",
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
    new Date(t.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = project.name.replace(/[^a-z0-9]/gi, "_") + "_tasks_" + Date.now() + ".csv";
  link.click();
  URL.revokeObjectURL(url);
}
`);

console.log("\nAll critical files fixed!");
console.log("");