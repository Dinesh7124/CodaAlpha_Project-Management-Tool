// setup-v5.js — 6 new features
const fs = require("fs");
const path = require("path");

const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  ✓ " + path.relative(__dirname, p));
}

console.log("\n🎁 Adding 6 new features...\n");

// ============================================================
// 1. THEME CONTEXT with presets
// ============================================================
w(path.join(C, "src/context/ThemeContext.jsx"), `
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const THEMES = {
  indigo: { name: "Indigo", primary: "#6366f1", secondary: "#8b5cf6", accent: "#a855f7" },
  blue: { name: "Ocean", primary: "#3b82f6", secondary: "#06b6d4", accent: "#0ea5e9" },
  emerald: { name: "Forest", primary: "#10b981", secondary: "#14b8a6", accent: "#22c55e" },
  rose: { name: "Rose", primary: "#f43f5e", secondary: "#ec4899", accent: "#d946ef" },
  amber: { name: "Sunset", primary: "#f59e0b", secondary: "#f97316", accent: "#ef4444" },
  slate: { name: "Mono", primary: "#475569", secondary: "#64748b", accent: "#0f172a" },
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
    document.documentElement.style.setProperty("--accent-accent", t.accent);
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
// 2. ThemePicker component
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
// 3. GLOBAL SEARCH MODAL
// ============================================================
w(path.join(C, "src/components/common/GlobalSearch.jsx"), `
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [results, setResults] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    api.get("/projects").then((r) => setProjects(r.data));
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const matches = [];
    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({ type: "project", id: p.id, name: p.name, icon: p.icon, color: p.color });
      }
    });
    setResults(matches.slice(0, 10));
  }, [query, projects]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // Parent handles this
      }
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const go = (r) => {
    if (r.type === "project") nav("/projects/" + r.id);
    onClose();
    setQuery("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-xl">🔍</span>
          <input
            autoFocus
            className="flex-1 bg-transparent border-0 focus:outline-none text-base"
            placeholder="Search projects, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-xs px-2 py-1 rounded border" style={{ borderColor: "var(--border)" }}>Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query === "" && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Type to search across all your projects
            </div>
          )}
          {query !== "" && results.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No results for "{query}"
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.type + r.id}
              onClick={() => go(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition text-left border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: r.color + "22", color: r.color }}
              >
                {r.icon || "📁"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Project</p>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>↵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
`);

// ============================================================
// 4. POMODORO TIMER
// ============================================================
w(path.join(C, "src/components/board/PomodoroTimer.jsx"), `
import { useEffect, useState, useRef } from "react";
import { useToast } from "../../context/ToastContext.jsx";

export default function PomodoroTimer({ task }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("work"); // work | break
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
            show(mode === "work" ? "Break time! ☕" : "Back to work! 💪", "info");
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
  const percent = mode === "work"
    ? ((25 * 60 - seconds) / (25 * 60)) * 100
    : ((5 * 60 - seconds) / (5 * 60)) * 100;

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">🍅 Pomodoro Timer</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: mode === "work" ? "#ef444422" : "#10b98122", color: mode === "work" ? "#ef4444" : "#10b981" }}>
          {mode === "work" ? "Focus" : "Break"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="35" fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle cx="40" cy="40" r="35" fill="none" stroke={mode === "work" ? "#ef4444" : "#10b981"} strokeWidth="5"
              strokeDasharray={2 * Math.PI * 35} strokeDashoffset={2 * Math.PI * 35 * (1 - percent / 100)}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex-1 flex gap-2">
          <button onClick={toggle} className="btn btn-primary text-xs flex-1">
            {running ? "⏸ Pause" : "▶ Start"}
          </button>
          <button onClick={reset} className="btn btn-ghost text-xs">↻ Reset</button>
        </div>
      </div>

      {task && (
        <p className="text-xs mt-3 truncate" style={{ color: "var(--text-muted)" }}>
          Working on: <strong>{task.title}</strong>
        </p>
      )}
    </div>
  );
}
`);

// ============================================================
// 5. EXPORT CSV utility
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

// ============================================================
// 6. IMAGE PREVIEW component
// ============================================================
w(path.join(C, "src/components/board/ImagePreview.jsx"), `
export default function ImagePreview({ url, filename, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-8 animate-fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-full">
        <img
          src={url}
          alt={filename}
          className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <a
            href={url}
            download={filename}
            className="glass px-3 py-1.5 rounded-lg text-white text-xs hover:bg-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            ⬇ Download
          </a>
          <button
            onClick={onClose}
            className="glass px-3 py-1.5 rounded-lg text-white text-xs hover:bg-white/20"
          >
            ✕ Close
          </button>
        </div>
        <p className="text-white/80 text-xs text-center mt-3">{filename}</p>
      </div>
    </div>
  );
}
`);

console.log("\n✅ 6 new features written!");
console.log("");