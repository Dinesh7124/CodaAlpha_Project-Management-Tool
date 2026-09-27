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
