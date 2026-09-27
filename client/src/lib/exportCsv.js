export function exportTasksToCsv(project, tasks) {
  const headers = ["Title", "Description", "Status", "Priority", "Assignee", "Due Date", "Created"];
  const rows = tasks.map((t) => [
    '"' + (t.title || "").replace(/"/g, '""') + '"',
    '"' + (t.description || "").replace(/"/g, '""') + '"',
    t.status || "",
    t.priority || "",
    t.assignee?.name || "Unassigned",
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
    new Date(t.createdAt).toLocaleDateString(),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = project.name.replace(/[^a-z0-9]/gi, "_") + "_tasks_" + Date.now() + ".csv";
  link.click();
  URL.revokeObjectURL(url);
}
