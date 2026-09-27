import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard.jsx";

export default function Column({ column, tasks, onCreate, onOpen }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  // Make this column a droppable zone
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate(column.id, title);
    setTitle("");
    setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={"rounded-2xl p-3 min-h-[420px] flex flex-col transition-all duration-200 " + (isOver ? "ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/50 dark:bg-indigo-900/20" : "")}
      style={{ background: isOver ? undefined : "var(--bg-hover)" }}
    >
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{column.emoji}</span>
          <h2 className="font-semibold text-sm">{column.title}</h2>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: column.color + "30", color: column.color }}
        >
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onClick={() => onOpen(t.id)} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <form onSubmit={submit} className="mt-2">
          <input
            autoFocus
            className="input text-sm"
            placeholder="Task title... (Enter)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !title && setAdding(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-left text-sm mt-3 px-3 py-2 rounded-lg transition hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
        >
          + Add task
        </button>
      )}
    </div>
  );
}