import { useState } from "react";
import api from "../../lib/api.js";
import Avatar from "../ui/Avatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const ROLES = ["owner", "admin", "member", "viewer"];

const ROLE_INFO = {
  owner: { label: "Owner", color: "#8b5cf6", desc: "Full control" },
  admin: { label: "Admin", color: "#3b82f6", desc: "Manage everything" },
  member: { label: "Member", color: "#10b981", desc: "Edit tasks" },
  viewer: { label: "Viewer", color: "#64748b", desc: "Read-only" },
};

export default function MembersPanel({ project, onReload }) {
  const { user } = useAuth();
  const { show } = useToast();
  const [open, setOpen] = useState(false);

  const myMembership = project.members.find((m) => m.user.id === user.id);
  const isOwner = myMembership?.role === "owner";
  const isAdmin = myMembership?.role === "admin";

  const changeRole = async (userId, role) => {
    try {
      await api.patch("/projects/" + project.id + "/members/" + userId + "/role", { role });
      show("Role updated", "success");
      onReload();
    } catch {
      show("Failed to update role", "error");
    }
  };

  const removeMember = async (userId) => {
    if (!confirm("Remove this member?")) return;
    await api.delete("/projects/" + project.id + "/members/" + userId);
    show("Member removed", "success");
    onReload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost text-sm"
      >
        👥 {project.members.length} members
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 glass rounded-xl p-4 w-80 z-30 shadow-2xl animate-slide-up">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Team Members</h3>
            <button onClick={() => setOpen(false)} className="text-lg">×</button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {project.members.map((m) => {
              const roleInfo = ROLE_INFO[m.role] || ROLE_INFO.member;
              const isMe = m.user.id === user.id;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.user.name} color={m.user.avatarColor} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.user.name} {isMe && <span className="text-xs opacity-60">(you)</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.user.email}</p>
                  </div>

                  {isOwner && !isMe && m.role !== "owner" ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="text-xs px-2 py-1 rounded border"
                        value={m.role}
                        onChange={(e) => changeRole(m.user.id, e.target.value)}
                        style={{
                          background: roleInfo.color + "22",
                          color: roleInfo.color,
                          borderColor: roleInfo.color + "44",
                        }}
                      >
                        {["admin", "member", "viewer"].map((r) => (
                          <option key={r} value={r}>{ROLE_INFO[r].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMember(m.user.id)}
                        className="text-red-500 text-xs px-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: roleInfo.color + "22", color: roleInfo.color }}
                    >
                      {roleInfo.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t text-xs space-y-1" style={{ borderColor: "var(--border)" }}>
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
                <span className="font-medium">{info.label}:</span>
                <span style={{ color: "var(--text-muted)" }}>{info.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
