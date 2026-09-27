import { useState, useEffect, useRef } from "react";
import api from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function FilterBar({ filters, setFilters, members, labels, projectId }) {
  const [views, setViews] = useState([]);
  const [showSave, setShowSave] = useState(false);
  const [viewName, setViewName] = useState("");
  const [showViews, setShowViews] = useState(false);
  const { show } = useToast();
  const ref = useRef(null);

  const hasFilters = filters.search || filters.priority || filters.assigneeId || filters.labelId;

  const loadViews = () => {
    if (!projectId) return;
    api.get("/views/" + projectId).then((r) => setViews(r.data));
  };

  useEffect(() => { loadViews(); }, [projectId]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowViews(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveView = async (e) => {
    e.preventDefault();
    if (!viewName.trim()) return;
    try {
      await api.post("/views", { projectId, name: viewName, filters });
      setViewName("");
      setShowSave(false);
      loadViews();
      show("View saved! 💾", "success");
    } catch {
      show("Failed to save", "error");
    }
  };

  const applyView = (view) => {
    setFilters(view.filters);
    setShowViews(false);
    show("View applied: " + view.name, "success");
  };

  const deleteView = async (id, name) => {
    if (!confirm("Delete view '" + name + "'?")) return;
    await api.delete("/views/" + id);
    loadViews();
    show("View deleted", "success");
  };

  return (
    <div className="glass rounded-xl p-3 space-y-3" ref={ref}>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
          <input
            className="input pl-9 text-sm !py-2"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <select className="input text-sm !py-2 !w-auto" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🟠 High</option>
          <option value="urgent">🔴 Urgent</option>
        </select>

        <select className="input text-sm !py-2 !w-auto" value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}>
          <option value="">All Assignees</option>
          {members?.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
        </select>

        {labels?.length > 0 && (
          <select className="input text-sm !py-2 !w-auto" value={filters.labelId} onChange={(e) => setFilters({ ...filters, labelId: e.target.value })}>
            <option value="">All Labels</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => setFilters({ search: "", priority: "", assigneeId: "", labelId: "" })}
            className="text-xs text-red-600 hover:underline px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowViews(!showViews)} className="btn btn-ghost text-xs">
          📋 Saved Views ({views.length})
        </button>

        {hasFilters && !showSave && (
          <button onClick={() => setShowSave(true)} className="btn btn-primary text-xs">
            💾 Save this view
          </button>
        )}

        {showSave && (
          <form onSubmit={saveView} className="flex gap-2">
            <input
              autoFocus
              className="input text-xs !py-1 !w-40"
              placeholder="View name (e.g. Urgent)"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary text-xs">Save</button>
            <button type="button" onClick={() => setShowSave(false)} className="btn btn-ghost text-xs">Cancel</button>
          </form>
        )}

        {showViews && views.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {views.map((v) => (
              <div key={v.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: "var(--bg-hover)" }}>
                <button onClick={() => applyView(v)} className="hover:text-indigo-600 font-medium">{v.name}</button>
                <button onClick={() => deleteView(v.id, v.name)} className="text-red-400 hover:text-red-600 ml-1" title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}

        {showViews && views.length === 0 && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No saved views yet. Apply filters then save them.
          </span>
        )}
      </div>
    </div>
  );
}
