import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Avatar from "../ui/Avatar.jsx";
import { formatDate, isOverdue, PRIORITY_COLORS } from "../../lib/utils.js";

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  const pc = PRIORITY_COLORS[task.priority] || "#64748b";
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="surface p-3 rounded-xl hover:shadow-lg transition-all duration-200 animate-slide-up touch-none"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ background: pc + "22", color: pc }}
        >
          {task.priority}
        </span>
        {task.dueDate && (
          <span
            className={"text-xs px-1.5 py-0.5 rounded " + (overdue ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "")}
            style={!overdue ? { color: "var(--text-muted)" } : {}}
          >
            {overdue ? "⚠️ " : "📅 "}{formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {(task.labels || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((tl) => (
            <span
              key={tl.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: tl.label.color + "30", color: tl.label.color }}
            >
              {tl.label.name}
            </span>
          ))}
        </div>
      )}

      <p className="font-medium text-sm leading-tight">{task.title}</p>

      {task.description && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {task.comments?.length > 0 && <span>💬 {task.comments.length}</span>}
          {task.subtasks?.length > 0 && (
            <span>✓ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}</span>
          )}
          {task.attachments?.length > 0 && <span>📎 {task.attachments.length}</span>}
          {task.loggedHrs > 0 && <span>⏱ {task.loggedHrs}h</span>}
        </div>
        {task.assignee && (
          <Avatar name={task.assignee.name} color={task.assignee.avatarColor} size={22} />
        )}
      </div>
    </div>
  );
}