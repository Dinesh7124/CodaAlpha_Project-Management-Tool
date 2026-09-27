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
