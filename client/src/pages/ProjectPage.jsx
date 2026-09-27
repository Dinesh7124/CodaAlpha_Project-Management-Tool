import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api.js";
import { exportTasksToCsv } from "../lib/exportCsv.js";
import Layout from "../components/layout/Layout.jsx";
import Board from "../components/board/Board.jsx";
import TaskModal from "../components/board/TaskModal.jsx";
import AnalyticsPanel from "../components/analytics/AnalyticsPanel.jsx";
import ActivityFeed from "../components/analytics/ActivityFeed.jsx";
import FilterBar from "../components/board/FilterBar.jsx";
import MembersPanel from "../components/board/MembersPanel.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { exportProjectToPdf } from "../lib/exportPdf.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";

const TABS = [
  { id: "board", label: "Board", icon: "📋" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "activity", label: "Activity", icon: "📰" },
];

export default function ProjectPage() {
  const { id } = useParams();
  const socket = useSocket();
  const { user } = useAuth();
  const { show } = useToast();

  const [project, setProject] = useState(null);
  const [labels, setLabels] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [tab, setTab] = useState("board");
  const [filters, setFilters] = useState({ search: "", priority: "", assigneeId: "", labelId: "" });

  const load = useCallback(() => {
    api.get("/projects/" + id).then((r) => setProject(r.data));
    api.get("/labels/" + id).then((r) => setLabels(r.data));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    s.emit("project:join", id);

    const upsert = (task) => setProject((p) => {
      if (!p) return p;
      const tasks = p.tasks.some((t) => t.id === task.id)
        ? p.tasks.map((t) => (t.id === task.id ? task : t))
        : [...p.tasks, task];
      return { ...p, tasks };
    });

    s.on("task:created", upsert);
    s.on("task:updated", upsert);
    s.on("task:deleted", ({ id: tid }) => setProject((p) =>
      p ? { ...p, tasks: p.tasks.filter((t) => t.id !== tid) } : p));
    s.on("comment:created", (c) => setProject((p) => {
      if (!p) return p;
      return {
        ...p,
        tasks: p.tasks.map((t) => t.id === c.taskId ? { ...t, comments: [...(t.comments || []), c] } : t),
      };
    }));
    s.on("member:added", () => load());
    s.on("member:roleChanged", () => load());

    return () => {
      s.emit("project:leave", id);
      s.off("task:created"); s.off("task:updated"); s.off("task:deleted");
      s.off("comment:created"); s.off("member:added"); s.off("member:roleChanged");
    };
  }, [id, load, socket]);

  const myMembership = project?.members.find((m) => m.user.id === user?.id);
  const canEdit = myMembership && ["owner", "admin", "member"].includes(myMembership.role);
  const isOwner = myMembership?.role === "owner";

  const filteredTasks = useMemo(() => {
    if (!project) return [];
    return project.tasks.filter((t) => {
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.assigneeId && t.assigneeId !== filters.assigneeId) return false;
      if (filters.labelId && !(t.labels || []).some((tl) => tl.label.id === filters.labelId)) return false;
      return true;
    });
  }, [project, filters]);

  useKeyboardShortcuts({
    escape: () => setActiveTaskId(null),
    n: () => {
      if (canEdit) {
        const title = prompt("New task title:");
        if (title?.trim()) createTask("todo", title);
      }
    },
  });

  if (!project) return <Layout><div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div></Layout>;

  const createTask = async (status, title) => {
    if (!canEdit) { show("You don't have permission", "error"); return; }
    await api.post("/tasks", { projectId: id, title, status });
  };

  const changeStatus = async (taskId, newStatus) => {
    if (!canEdit) { show("Viewers can't move tasks", "error"); return; }
    try {
      await api.patch("/tasks/" + taskId, { status: newStatus });
      show("Task moved", "success");
    } catch { show("Failed", "error"); }
  };

  const invite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (!isOwner && myMembership?.role !== "admin") { show("Only owner/admin can invite", "error"); return; }
    try {
      await api.post("/projects/" + id + "/members", { email: inviteEmail });
      setInviteEmail("");
      load();
      show("Member invited", "success");
    } catch (err) { show(err.response?.data?.error || "Failed", "error"); }
  };

  const activeTask = activeTaskId ? project.tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-5">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back</Link>
          <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: project.color }}>{project.name}</h1>
              {project.description && (
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{project.description}</p>
              )}
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {project.members.map((m) => m.user.name).join(", ")}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <MembersPanel project={project} onReload={load} />
<button
  onClick={() => exportTasksToCsv(project, project.tasks)}
  className="btn btn-ghost text-sm"
  title="Export CSV"
>
  📤 CSV
</button>
<button
  onClick={() => exportProjectToPdf(project, project.tasks)}
  className="btn btn-ghost text-sm"
  title="Export PDF"
>
  📄 PDF
</button>
              <form onSubmit={invite} className="flex gap-2">
                <Input
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="!w-48"
                />
                <Button type="submit" disabled={!isOwner && myMembership?.role !== "admin"}>Invite</Button>
              </form>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b" style={{ borderColor: "var(--border)" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-medium transition border-b-2 -mb-px"
              style={tab === t.id ? {
                borderColor: "#6366f1",
                color: "#6366f1",
              } : {
                borderColor: "transparent",
                color: "var(--text-secondary)",
              }}
            >
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "board" && (
          <>
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              members={project.members}
              labels={labels}
              projectId={id}
              onClear={() => setFilters({ search: "", priority: "", assigneeId: "", labelId: "" })}
            />
            <div className="mt-4">
              <Board
                tasks={filteredTasks}
                onCreate={createTask}
                onOpen={setActiveTaskId}
                onStatusChange={changeStatus}
              />
            </div>
          </>
        )}

        {tab === "analytics" && <AnalyticsPanel projectId={id} />}

        {tab === "activity" && (
          <div className="card p-5">
            <h3 className="font-semibold mb-4">📰 Recent Activity</h3>
            <ActivityFeed projectId={id} />
          </div>
        )}

        {/* Task modal */}
        {activeTask && (
          <TaskModal
            task={activeTask}
            members={project.members}
            labels={labels}
            projectId={id}
            socket={socket}
            onClose={() => setActiveTaskId(null)}
            onUpdated={(t) => setProject((p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? t : x)) }))}
            onDeleted={(tid) => setProject((p) => ({ ...p, tasks: p.tasks.filter((x) => x.id !== tid) }))}
            onLabelsChanged={() => api.get("/labels/" + id).then((r) => setLabels(r.data))}
          />
        )}

        {/* Keyboard hint */}
        <div className="fixed bottom-4 right-4 glass px-3 py-2 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="font-medium">Shortcuts:</span> <kbd className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/30">N</kbd> new · <kbd className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/30">Esc</kbd> close
        </div>
      </div>
    </Layout>
  );
}