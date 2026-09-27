import { useEffect, useState, useRef } from "react";
import api from "../../lib/api.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Avatar from "../ui/Avatar.jsx";
import { timeAgo, PRIORITY_COLORS } from "../../lib/utils.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import LabelPicker from "./LabelPicker.jsx";
import TimeTracking from "./TimeTracking.jsx";
import MentionInput from "./MentionInput.jsx";

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = [
  { id: "todo", label: "📝 To Do" },
  { id: "in_progress", label: "⚡ In Progress" },
  { id: "review", label: "👀 Review" },
  { id: "done", label: "✅ Done" },
];

export default function TaskModal({ task, members, labels, projectId, socket, onClose, onUpdated, onDeleted, onLabelsChanged }) {
  const [localTask, setLocalTask] = useState(task);
  const [comment, setComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { show } = useToast();
  const { user } = useAuth();

  useEffect(() => { setLocalTask(task); }, [task]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const onComment = (c) => {
      if (c.taskId === task.id) setLocalTask((t) => ({ ...t, comments: [...(t.comments || []), c] }));
    };
    s.on("comment:created", onComment);
    return () => s.off("comment:created", onComment);
  }, [socket, task.id]);

  const update = async (patch) => {
    try {
      const { data } = await api.patch("/tasks/" + task.id, patch);
      setLocalTask(data);
      onUpdated(data);
    } catch {
      show("Update failed", "error");
    }
  };

  const toggleLabel = async (labelId, isAttached) => {
    try {
      if (isAttached) {
        await api.delete("/labels/task/" + task.id + "/" + labelId);
      } else {
        await api.post("/labels/task/add", { taskId: task.id, labelId });
      }
      // Refresh from server
      const { data } = await api.patch("/tasks/" + task.id, {});
      setLocalTask(data);
      onUpdated(data);
    } catch {}
  };

  const postComment = async (e) => {
    if (e) e.preventDefault();
    if (!comment.trim()) return;
    await api.post("/comments", { taskId: task.id, body: comment });
    setComment("");
    show("Comment posted", "success");
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const { data } = await api.post("/subtasks", { taskId: task.id, title: newSubtask });
    setLocalTask((t) => ({ ...t, subtasks: [...(t.subtasks || []), data] }));
    setNewSubtask("");
  };

  const toggleSubtask = async (id) => {
    const { data } = await api.patch("/subtasks/" + id + "/toggle");
    setLocalTask((t) => ({ ...t, subtasks: t.subtasks.map((s) => (s.id === id ? data : s)) }));
  };

  const deleteSubtask = async (id) => {
    await api.delete("/subtasks/" + id);
    setLocalTask((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== id) }));
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taskId", task.id);
    try {
      const { data } = await api.post("/attachments", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setLocalTask((t) => ({ ...t, attachments: [...(t.attachments || []), data] }));
      show("File uploaded", "success");
    } catch { show("Upload failed", "error"); }
    finally { setUploading(false); }
  };

  const del = async () => {
    if (!confirm("Delete this task?")) return;
    await api.delete("/tasks/" + task.id);
    onDeleted(task.id);
    onClose();
    show("Task deleted", "success");
  };

  const completedSubtasks = (localTask.subtasks || []).filter((s) => s.completed).length;
  const totalSubtasks = (localTask.subtasks || []).length;
  const attachedLabelIds = (localTask.labels || []).map((tl) => tl.label.id);

  return (
    <Modal open onClose={onClose} width="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <input
          className="text-xl font-bold w-full bg-transparent border-0 focus:outline-none"
          value={localTask.title}
          onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
          onBlur={() => update({ title: localTask.title })}
          style={{ color: "var(--text-primary)" }}
        />
        <button onClick={onClose} className="text-2xl leading-none hover:opacity-60">×</button>
      </div>

      {/* Description */}
      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
      <textarea
        className="input mb-4"
        rows="3"
        placeholder="Add more details..."
        value={localTask.description || ""}
        onChange={(e) => setLocalTask({ ...localTask, description: e.target.value })}
        onBlur={() => update({ description: localTask.description })}
      />

      {/* Properties */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Status</label>
          <select className="input text-sm" value={localTask.status} onChange={(e) => update({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Priority</label>
          <select className="input text-sm" value={localTask.priority} onChange={(e) => update({ priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Assignee</label>
          <select className="input text-sm" value={localTask.assigneeId || ""} onChange={(e) => update({ assigneeId: e.target.value || null })}>
            <option value="">Unassigned</option>
            {members?.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Due Date</label>
          <input
            type="date"
            className="input text-sm"
            value={localTask.dueDate ? new Date(localTask.dueDate).toISOString().split("T")[0] : ""}
            onChange={(e) => update({ dueDate: e.target.value })}
          />
        </div>
      </div>

      {/* Labels */}
      <div className="mb-4">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>🏷️ Labels</label>
        <div className="flex flex-wrap gap-2 items-center">
          {(localTask.labels || []).map((tl) => (
            <button
              key={tl.id}
              onClick={() => toggleLabel(tl.label.id, true)}
              className="text-xs px-2 py-1 rounded-full font-medium hover:opacity-70 transition"
              style={{ background: tl.label.color + "30", color: tl.label.color }}
              title="Click to remove"
            >
              {tl.label.name} ✕
            </button>
          ))}
          <div className="flex flex-wrap gap-1">
            {(labels || []).filter((l) => !attachedLabelIds.includes(l.id)).map((l) => (
              <button
                key={l.id}
                onClick={() => toggleLabel(l.id, false)}
                className="text-xs px-2 py-1 rounded-full border opacity-50 hover:opacity-100 transition"
                style={{ borderColor: l.color, color: l.color }}
              >
                + {l.name}
              </button>
            ))}
          </div>
          <LabelPicker projectId={projectId} labels={labels || []} onChanged={onLabelsChanged} />
        </div>
      </div>

      {/* Subtasks */}
      <div className="mb-4">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>
          ✅ Subtasks {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
        </label>
        {totalSubtasks > 0 && (
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
              style={{ width: (completedSubtasks / totalSubtasks * 100) + "%" }}
            />
          </div>
        )}
        <div className="space-y-1.5 mb-2">
          {(localTask.subtasks || []).map((s) => (
            <div key={s.id} className="flex items-center gap-2 group">
              <input type="checkbox" checked={s.completed} onChange={() => toggleSubtask(s.id)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
              <span className={"flex-1 text-sm " + (s.completed ? "line-through opacity-60" : "")}>{s.title}</span>
              <button onClick={() => deleteSubtask(s.id)} className="text-red-400 opacity-0 group-hover:opacity-100 text-xs">✕</button>
            </div>
          ))}
        </div>
        <form onSubmit={addSubtask} className="flex gap-2">
          <input className="input text-sm" placeholder="Add subtask..." value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} />
          <Button type="submit" className="text-sm !py-2">Add</Button>
        </form>
      </div>

      {/* Time Tracking */}
      <TimeTracking task={localTask} onUpdated={(t) => { setLocalTask(t); onUpdated(t); }} />

      {/* Attachments */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>📎 Attachments</label>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-600 hover:underline">+ Upload</button>
          <input ref={fileRef} type="file" hidden onChange={uploadFile} />
        </div>
        {uploading && <p className="text-xs text-indigo-600 mb-2">Uploading...</p>}
        <div className="space-y-1">
          {(localTask.attachments || []).map((a) => (
            <a key={a.id} href={"http://localhost:5000" + a.url} target="_blank" rel="noreferrer"
               className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <span>📄</span>
              <span className="flex-1 truncate">{a.filename}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{(a.size / 1024).toFixed(1)} KB</span>
            </a>
          ))}
        </div>
      </div>

      {/* Comments with mentions */}
      <div className="mb-5">
        <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>
          💬 Comments ({(localTask.comments || []).length})
        </label>
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {(localTask.comments || []).map((c) => (
            <div key={c.id} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--bg-hover)" }}>
              <Avatar name={c.author?.name} color={c.author?.avatarColor} size={30} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.author?.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">
                  {c.body.split(/(@\w+)/g).map((part, i) =>
                    part.startsWith("@")
                      ? <span key={i} className="text-indigo-600 font-medium">{part}</span>
                      : part
                  )}
                </p>
              </div>
            </div>
          ))}
          {(localTask.comments || []).length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No comments yet. Be the first!</p>
          )}
        </div>
        <div className="flex gap-2">
          <MentionInput value={comment} onChange={setComment} onSubmit={postComment} members={members} />
          <Button onClick={postComment}>Post</Button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button onClick={del} className="text-red-600 text-sm hover:underline">🗑 Delete task</button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}