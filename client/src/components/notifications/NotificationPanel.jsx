import { useEffect, useState, useRef } from "react";
import api from "../../lib/api.js";
import { timeAgo } from "../../lib/utils.js";
import { useSocket } from "../../context/SocketContext.jsx";

export default function NotificationPanel() {
  const socket = useSocket();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => api.get("/notifications").then((r) => setItems(r.data.notifications));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onN = (n) => setItems((prev) => [n, ...prev]);
    s.on("notification", onN);
    return () => s.off("notification", onN);
  }, [socket]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (err) { console.error(err); }
  };

  const markOne = async (id) => {
    await api.patch("/notifications/" + id + "/read");
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const handleBellClick = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && unread > 0) {
      setTimeout(() => markAllRead(), 1500);
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear all notifications?")) return;
    await api.patch("/notifications/read-all");
    setItems([]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute glass rounded-2xl shadow-2xl border overflow-hidden z-[100] animate-slide-up"
          style={{
            top: "calc(100% + 8px)",
            right: 0,
            width: "380px",
            maxWidth: "calc(100vw - 24px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    ✓ Read all
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🔕</div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No notifications
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markOne(n.id)}
                  className={
                    "px-4 py-3 border-b cursor-pointer transition hover:bg-slate-100/50 dark:hover:bg-slate-800/50 " +
                    (n.read ? "opacity-60" : "")
                  }
                  style={{
                    borderColor: "var(--border)",
                    background: !n.read ? "linear-gradient(90deg, #6366f110, transparent)" : "transparent",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0 " +
                        (n.read ? "bg-transparent" : "bg-indigo-500")
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}