import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import ThemePicker from "../ui/ThemePicker.jsx";
import NotificationPanel from "../notifications/NotificationPanel.jsx";
import GlobalSearch from "../common/GlobalSearch.jsx";

export default function Topbar({ children }) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b relative z-20"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", minWidth: "200px" }}
          >
            🔍 <span>Search...</span>
            <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>Ctrl+K</kbd>
          </button>
          {children}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <NotificationPanel />
          
          <ThemePicker />
          <ThemeToggle />
          <div className="flex items-center gap-2 pl-3 ml-1 border-l" style={{ borderColor: "var(--border)" }}>
            <Avatar name={user?.name} color={user?.avatarColor} size={30} />
            <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
          </div>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
