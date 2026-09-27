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
