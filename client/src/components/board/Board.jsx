import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import Column from "./Column.jsx";
import TaskCard from "./TaskCard.jsx";

const COLUMNS = [
  { id: "todo", title: "To Do", emoji: "📝", color: "#94a3b8" },
  { id: "in_progress", title: "In Progress", emoji: "⚡", color: "#3b82f6" },
  { id: "review", title: "Review", emoji: "👀", color: "#8b5cf6" },
  { id: "done", title: "Done", emoji: "✅", color: "#10b981" },
];

export default function Board({ tasks, onCreate, onOpen, onStatusChange }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find where the task started
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine the target column
    let targetColumnId;
    if (COLUMNS.some((c) => c.id === overId)) {
      // Dropped directly on a column
      targetColumnId = overId;
    } else {
      // Dropped on another task
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetColumnId = overTask.status;
    }

    // Only trigger change if status actually changed
    if (activeTask.status !== targetColumnId) {
      onStatusChange(activeId, targetColumnId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={tasksByStatus(col.id)}
            onCreate={onCreate}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}