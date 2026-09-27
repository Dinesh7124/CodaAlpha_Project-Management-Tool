import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Avatar from "../ui/Avatar.jsx";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/my-tasks", label: "My Tasks", icon: "📋" },
    { to: "/calendar", label: "Calendar", icon: "📅" },
    { to: "/analytics", label: "Analytics", icon: "📊" },
    { to: "/profile", label: "Profile", icon: "👤" },
  ];

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <aside
      className="w-60 flex-shrink-0 flex-col border-r transition-colors hidden md:flex"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <Link to="/" className="block px-6 py-5">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          TaskFlow Pro
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>v4.0</p>
      </Link>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
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
