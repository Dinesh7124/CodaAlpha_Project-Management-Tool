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
