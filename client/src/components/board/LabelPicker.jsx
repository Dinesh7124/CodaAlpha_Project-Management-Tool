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
