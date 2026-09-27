// setup-ui-v3.js — Complete Frontend Rebuild
const fs = require("fs");
const path = require("path");

const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  ✓ " + path.relative(__dirname, p));
}

console.log("\n🎨 Rebuilding frontend...\n");

// ============================================================
// CONTEXT — Theme
// ============================================================
w(path.join(C, "src/context/ThemeContext.jsx"), `
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
`);

// ============================================================
// CONTEXT — Toast (lightweight)
// ============================================================
w(path.join(C, "src/context/ToastContext.jsx"), `
import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#6366f1",
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass px-4 py-3 rounded-xl shadow-lg border animate-slide-up min-w-[240px]"
            style={{ borderLeft: "4px solid " + colors[t.type] }}
          >
            <p className="text-sm font-medium">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
`);

// ============================================================
// MAIN
// ============================================================
w(path.join(C, "src/main.jsx"), `
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </BrowserRouter>
);
`);

// ============================================================
// CSS — Enhanced design system
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

/* Animated gradient background */
.bg-animated {
  background: linear-gradient(-45deg, #6366f1, #8b5cf6, #ec4899, #06b6d4);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* Glass */
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

.surface {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply text-white;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
  }
  .btn-primary:hover:not(:disabled) {
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }

  .btn-ghost {
    color: var(--text-secondary);
  }
  .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }

  .btn-danger { @apply bg-red-500 text-white; }
  .btn-danger:hover { @apply bg-red-600; }

  .input {
    @apply w-full px-3 py-2 rounded-lg transition;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
  }
  .input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    @apply rounded-xl transition;
    box-shadow: var(--shadow);
  }
  .card:hover { box-shadow: var(--shadow-lg); }
}

/* Animations */
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

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

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
// ui/Button
// ============================================================
w(path.join(C, "src/components/ui/Button.jsx"), `
export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = { primary: "btn-primary", ghost: "btn-ghost", danger: "btn-danger" }[variant] || "";
  return (
    <button className={"btn " + base + " " + className} {...props}>
      {children}
    </button>
  );
}
`);

// ============================================================
// ui/Input
// ============================================================
w(path.join(C, "src/components/ui/Input.jsx"), `
export default function Input({ className = "", ...props }) {
  return <input className={"input " + className} {...props} />;
}
`);

// ============================================================
// ui/Avatar
// ============================================================
w(path.join(C, "src/components/ui/Avatar.jsx"), `
function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Avatar({ name, color = "#6366f1", size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
`);

// ============================================================
// ui/Modal
// ============================================================
w(path.join(C, "src/components/ui/Modal.jsx"), `
export default function Modal({ open, onClose, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={"glass w-full " + width + " max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl animate-slide-up"}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
`);

// ============================================================
// ui/Badge
// ============================================================
w(path.join(C, "src/components/ui/Badge.jsx"), `
export default function Badge({ children, color = "#6366f1" }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center"
      style={{ background: color + "22", color }}
    >
      {children}
    </span>
  );
}
`);

// ============================================================
// ui/Spinner
// ============================================================
w(path.join(C, "src/components/ui/Spinner.jsx"), `
export default function Spinner({ size = 24 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-indigo-600"
      style={{ width: size, height: size }}
    />
  );
}
`);

// ============================================================
// ui/ThemeToggle — FIXED
// ============================================================
w(path.join(C, "src/components/ui/ThemeToggle.jsx"), `
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg transition text-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
`);

// ============================================================
// LAYOUT — Sidebar
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
    { to: "/profile", label: "Profile", icon: "👤" },
  ];

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r transition-colors hidden md:flex"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <Link to="/" className="block px-6 py-5">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          TaskFlow Pro
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>v3.0</p>
      </Link>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to;
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
// LAYOUT — Topbar — FIXED with theme toggle
// ============================================================
w(path.join(C, "src/components/layout/Topbar.jsx"), `
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";

export default function Topbar({ children }) {
  const { user } = useAuth();
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">{children}</div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: "var(--border)" }}>
          <Avatar name={user?.name} color={user?.avatarColor} size={30} />
          <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
`);

// ============================================================
// LAYOUT — Layout
// ============================================================
w(path.join(C, "src/components/layout/Layout.jsx"), `
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function Layout({ children, topbar }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar>{topbar}</Topbar>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
`);

// ============================================================
// LOGIN PAGE — Beautiful redesign
// ============================================================
w(path.join(C, "src/pages/Login.jsx"), `
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { show } = useToast();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/" + mode, form);
      login(data.token, data.user);
      show("Welcome, " + data.user.name + "! 🎉", "success");
      nav("/");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
      show(err.response?.data?.error || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-animated relative overflow-hidden">
      {/* Floating decorative blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/40 animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
              <span className="text-3xl">🚀</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              TaskFlow Pro
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              {mode === "login" ? "Welcome back — sign in to continue" : "Create your account to get started"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Full Name
                </label>
                <Input
                  placeholder="Dinesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                ⚠️ {error}
              </div>
            )}

            <Button type="submit" className="w-full !py-3" disabled={loading}>
              {loading ? "Please wait..." : (mode === "login" ? "Sign In →" : "Create Account →")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
            >
              {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/80 mt-6">
          © 2026 TaskFlow Pro · Built with ❤️ using MERN stack
        </p>
      </div>
    </div>
  );
}
`);

// ============================================================
// APP — Routes
// ============================================================
w(path.join(C, "src/App.jsx"), `
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/projects/:id" element={<Private><ProjectPage /></Private>} />
      <Route path="/profile" element={<Private><ProfilePage /></Private>} />
    </Routes>
  );
}
`);

// ============================================================
// BOARD — 4 columns with drag&drop support
// ============================================================
w(path.join(C, "src/components/board/Column.jsx"), `
import { useState } from "react";
import TaskCard from "./TaskCard.jsx";

export default function Column({ column, tasks, onCreate, onOpen }) {
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
      className="rounded-2xl p-3 min-h-[420px] flex flex-col transition-colors"
      style={{ background: "var(--bg-hover)" }}
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
          <TaskCard key={t.id} task={t} onClick={() => onOpen(t.id)} />
        ))}
      </div>

      {adding ? (
        <form onSubmit={submit} className="mt-2">
          <input
            autoFocus
            className="input text-sm"
            placeholder="Task title... (Enter to save)"
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

w(path.join(C, "src/components/board/Board.jsx"), `
import Column from "./Column.jsx";

const COLUMNS = [
  { id: "todo", title: "To Do", emoji: "📝", color: "#94a3b8" },
  { id: "in_progress", title: "In Progress", emoji: "⚡", color: "#3b82f6" },
  { id: "review", title: "Review", emoji: "👀", color: "#8b5cf6" },
  { id: "done", title: "Done", emoji: "✅", color: "#10b981" },
];

export default function Board({ tasks, onCreate, onOpen }) {
  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => (
        <Column
          key={col.id}
          column={col}
          tasks={tasksByStatus(col.id)}
          onCreate={onCreate}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
`);

w(path.join(C, "src/components/board/TaskCard.jsx"), `
import Avatar from "../ui/Avatar.jsx";
import { formatDate, isOverdue, PRIORITY_COLORS } from "../../lib/utils.js";

export default function TaskCard({ task, onClick }) {
  const pc = PRIORITY_COLORS[task.priority] || "#64748b";
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "done";

  return (
    <div
      onClick={onClick}
      className="surface p-3 cursor-pointer rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 animate-slide-up"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: pc + "22", color: pc }}
        >
          {task.priority}
        </span>
        {task.dueDate && (
          <span
            className={"text-xs px-1.5 py-0.5 rounded " + (overdue ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "")}
            style={!overdue ? { color: "var(--text-muted)" } : {}}
          >
            {overdue ? "⚠️ " : "📅 "}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

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
// TASK MODAL — Advanced with all features
// ============================================================
w(path.join(C, "src/components/board/TaskModal.jsx"), `
import { useEffect, useState, useRef } from "react";
import api from "../../lib/api.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Avatar from "../ui/Avatar.jsx";
import { timeAgo, PRIORITY_COLORS } from "../../lib/utils.js";
import { useToast } from "../../context/ToastContext.jsx";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = [
  { id: "todo", label: "📝 To Do" },
  { id: "in_progress", label: "⚡ In Progress" },
  { id: "review", label: "👀 Review" },
  { id: "done", label: "✅ Done" },
];

export default function TaskModal({ task, members, socket, onClose, onUpdated, onDeleted }) {
  const [localTask, setLocalTask] = useState(task);
  const [comment, setComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { show } = useToast();

  useEffect(() => { setLocalTask(task); }, [task]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onComment = (c) => {
      if (c.taskId === task.id) setLocalTask((t) => ({ ...t, comments: [...(t.comments || []), c] }));
    };
    s.on("comment:created", onComment);
    return () => s.off("comment:created", onComment);
  }, [socket, task.id]);

  const update = async (patch) => {
    try {
      const { data } = await api.patch("/tasks/" + task.id, patch);
      setLocalTask(data);
      onUpdated(data);
      show("Task updated", "success");
    } catch (e) {
      show("Update failed", "error");
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post("/comments", { taskId: task.id, body: comment });
    setComment("");
    show("Comment posted", "success");
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const { data } = await api.post("/subtasks", { taskId: task.id, title: newSubtask });
    setLocalTask((t) => ({ ...t, subtasks: [...(t.subtasks || []), data] }));
    setNewSubtask("");
  };

  const toggleSubtask = async (id) => {
    const { data } = await api.patch("/subtasks/" + id + "/toggle");
    setLocalTask((t) => ({
      ...t,
      subtasks: t.subtasks.map((s) => (s.id === id ? data : s)),
    }));
  };

  const deleteSubtask = async (id) => {
    await api.delete("/subtasks/" + id);
    setLocalTask((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== id) }));
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taskId", task.id);
    try {
      const { data } = await api.post("/attachments", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLocalTask((t) => ({ ...t, attachments: [...(t.attachments || []), data] }));
      show("File uploaded", "success");
    } catch {
      show("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this task?")) return;
    await api.delete("/tasks/" + task.id);
    onDeleted(task.id);
    onClose();
    show("Task deleted", "success");
  };

  const completedSubtasks = (localTask.subtasks || []).filter((s) => s.completed).length;
  const totalSubtasks = (localTask.subtasks || []).length;

  return (
    <Modal open onClose={onClose} width="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <input
          className="text-xl font-bold w-full bg-transparent border-0 focus:outline-none"
          value={localTask.title}
          onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
          onBlur={() => update({ title: localTask.title })}
          style={{ color: "var(--text-primary)" }}
        />
        <button onClick={onClose} className="text-2xl leading-none hover:opacity-60">×</button>
      </div>

      {/* Description */}
      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
        Description
      </label>
      <textarea
        className="input mb-4"
        rows="3"
        placeholder="Add more details..."
        value={localTask.description || ""}
        onChange={(e) => setLocalTask({ ...localTask, description: e.target.value })}
        onBlur={() => update({ description: localTask.description })}
      />

      {/* Properties grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Status</label>
          <select className="input text-sm" value={localTask.status} onChange={(e) => update({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Priority</label>
          <select className="input text-sm" value={localTask.priority} onChange={(e) => update({ priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Assignee</label>
          <select className="input text-sm" value={localTask.assigneeId || ""} onChange={(e) => update({ assigneeId: e.target.value || null })}>
            <option value="">Unassigned</option>
            {members?.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Due Date</label>
          <input
            type="date"
            className="input text-sm"
            value={localTask.dueDate ? new Date(localTask.dueDate).toISOString().split("T")[0] : ""}
            onChange={(e) => update({ dueDate: e.target.value })}
          />
        </div>
      </div>

      {/* Subtasks */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            ✅ Subtasks {totalSubtasks > 0 && <span>({completedSubtasks}/{totalSubtasks})</span>}
          </label>
        </div>
        {totalSubtasks > 0 && (
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
              style={{ width: (completedSubtasks / totalSubtasks * 100) + "%" }}
            />
          </div>
        )}
        <div className="space-y-1.5 mb-2">
          {(localTask.subtasks || []).map((s) => (
            <div key={s.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={s.completed}
                onChange={() => toggleSubtask(s.id)}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
              />
              <span className={"flex-1 text-sm " + (s.completed ? "line-through opacity-60" : "")}>{s.title}</span>
              <button onClick={() => deleteSubtask(s.id)} className="text-red-400 opacity-0 group-hover:opacity-100 text-xs">✕</button>
            </div>
          ))}
        </div>
        <form onSubmit={addSubtask} className="flex gap-2">
          <input
            className="input text-sm"
            placeholder="Add subtask..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
          />
          <Button type="submit" className="text-sm !py-2">Add</Button>
        </form>
      </div>

      {/* Attachments */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>📎 Attachments</label>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-600 hover:underline">
            + Upload file
          </button>
          <input ref={fileRef} type="file" hidden onChange={uploadFile} />
        </div>
        {uploading && <p className="text-xs text-indigo-600 mb-2">Uploading...</p>}
        <div className="space-y-1">
          {(localTask.attachments || []).map((a) => (
            <a
              key={a.id}
              href={"http://localhost:5000" + a.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span>📄</span>
              <span className="flex-1 truncate">{a.filename}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(a.size / 1024).toFixed(1)} KB
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="mb-5">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>
          💬 Comments ({(localTask.comments || []).length})
        </label>
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {(localTask.comments || []).map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
              <Avatar name={c.author?.name} color={c.author?.avatarColor} size={30} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.author?.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm mt-0.5">{c.body}</p>
              </div>
            </div>
          ))}
          {(localTask.comments || []).length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
              No comments yet. Be the first!
            </p>
          )}
        </div>
        <form onSubmit={postComment} className="flex gap-2">
          <input
            className="input"
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit">Post</Button>
        </form>
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button onClick={del} className="text-red-600 text-sm hover:underline">🗑 Delete task</button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
`);

console.log("\n✅ ALL FILES WRITTEN!\n");
console.log("Next steps:");
console.log("  1. cd /d C:\\Projects\\ProjectManagementTool\\client");
console.log("  2. npm install");
console.log("  3. cd ..");
console.log("  4. npm run dev");
console.log("");