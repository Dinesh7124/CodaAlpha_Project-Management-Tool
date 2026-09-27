import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import NotificationPanel from "../components/notifications/NotificationPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PRIORITY_COLORS } from "../lib/utils.js";

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    api.get("/projects").then(async (r) => {
      const all = [];
      for (const p of r.data) {
        const detail = await api.get("/projects/" + p.id);
        detail.data.tasks.forEach((t) => {
          if (t.dueDate && t.assigneeId === user.id) {
            all.push({ ...t, project: { id: p.id, name: p.name, color: p.color, icon: p.icon } });
          }
        });
      }
      setTasks(all);
    });
  }, [user.id]);

  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const tasksByDay = {};
  tasks.forEach((t) => {
    const d = new Date(t.dueDate);
    if (d.getMonth() === monthIdx && d.getFullYear() === year) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(t);
    }
  });

  const today = new Date();
  const prev = () => setMonth(new Date(year, monthIdx - 1, 1));
  const next = () => setMonth(new Date(year, monthIdx + 1, 1));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">📅 Calendar</h1>

        <div className="card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="btn btn-ghost text-lg">←</button>
            <h2 className="text-xl font-semibold">
              {month.toLocaleString("default", { month: "long" })} {year}
            </h2>
            <button onClick={next} className="btn btn-ghost text-lg">→</button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium py-2" style={{ color: "var(--text-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={"empty" + i} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = tasksByDay[day] || [];
              const isToday = today.getDate() === day && today.getMonth() === monthIdx && today.getFullYear() === year;
              return (
                <div
                  key={day}
                  className={"min-h-[80px] p-1.5 rounded-lg border transition " + (isToday ? "ring-2 ring-indigo-500" : "")}
                  style={{ borderColor: "var(--border)", background: isToday ? "#6366f108" : "var(--bg-hover)" }}
                >
                  <div className={"text-xs font-medium mb-1 " + (isToday ? "text-indigo-600" : "")}>{day}</div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map((t) => (
                      <Link
                        key={t.id}
                        to={"/projects/" + t.project.id}
                        className="block text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80"
                        style={{ background: PRIORITY_COLORS[t.priority] + "22", color: PRIORITY_COLORS[t.priority] }}
                        title={t.title}
                      >
                        {t.title}
                      </Link>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{dayTasks.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12 mt-6">
            <div className="text-6xl mb-3">📅</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tasks with due dates assigned to you</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
