import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportProjectToPdf(project, tasks) {
  const doc = new jsPDF();
  const primary = project.color || "#6366f1";

  doc.setFillColor(primary);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("TaskFlow Pro", 14, 14);
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(project.name, 14, 22);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text("Generated: " + new Date().toLocaleString("en-IN"), 14, 38);
  doc.text("Total Tasks: " + tasks.length, 14, 44);
  doc.text("Members: " + project.members.length, 14, 50);

  const statusCounts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.text("Summary", 14, 62);

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  let y = 70;
  Object.entries(statusCounts).forEach(([status, count]) => {
    doc.text(status.replace("_", " ").toUpperCase() + ": " + count, 20, y);
    y += 6;
  });

  const tableData = tasks.map((t) => [
    t.title,
    (t.status || "").replace("_", " "),
    t.priority,
    t.assignee?.name || "—",
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
  ]);

  autoTable(doc, {
    startY: y + 10,
    head: [["Title", "Status", "Priority", "Assignee", "Due Date"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: primary, fontSize: 10, fontStyle: "bold" },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("TaskFlow Pro · Page " + i + " of " + pageCount, 105, 290, { align: "center" });
  }

  doc.save(project.name.replace(/[^a-z0-9]/gi, "_") + "_" + Date.now() + ".pdf");
}

export function exportTaskListToPdf(tasks, title = "My Tasks") {
  const doc = new jsPDF();

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("TaskFlow Pro", 14, 16);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(title, 14, 35);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Generated: " + new Date().toLocaleString("en-IN"), 14, 42);

  const tableData = tasks.map((t) => [
    t.title,
    t.project?.name || "—",
    (t.status || "").replace("_", " "),
    t.priority,
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—",
  ]);

  autoTable(doc, {
    startY: 50,
    head: [["Task", "Project", "Status", "Priority", "Due Date"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241] },
  });

  doc.save(title.replace(/s+/g, "_") + "_" + Date.now() + ".pdf");
}
