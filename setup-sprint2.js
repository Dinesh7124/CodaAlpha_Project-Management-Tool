// setup-sprint2.js — Sprint 2 files
const fs = require("fs");
const path = require("path");

const S = path.join(__dirname, "server");
const C = path.join(__dirname, "client");

function w(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""), "utf8");
  console.log("  OK  " + path.relative(__dirname, p));
}

console.log("\n🚀 Sprint 2 files...\n");

// ============================================================
// SERVER — View Controller
// ============================================================
w(path.join(S, "src/controllers/viewController.js"), `
import { prisma } from "../config/prisma.js";
import { requireFields } from "../utils/validate.js";

export async function listViews(req, res, next) {
  try {
    const { projectId } = req.params;
    const views = await prisma.savedView.findMany({
      where: { projectId, userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(views.map((v) => ({
      ...v,
      filters: JSON.parse(v.filters),
    })));
  } catch (err) { next(err); }
}

export async function createView(req, res, next) {
  try {
    const { projectId, name, filters } = req.body;
    requireFields(req.body, ["projectId", "name", "filters"]);

    const view = await prisma.savedView.create({
      data: {
        projectId,
        name,
        filters: JSON.stringify(filters),
        userId: req.user.id,
      },
    });
    res.status(201).json({ ...view, filters });
  } catch (err) { next(err); }
}

export async function deleteView(req, res, next) {
  try {
    const view = await prisma.savedView.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!view) return res.status(404).json({ error: "View not found" });
    await prisma.savedView.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
`);

// ============================================================
// SERVER — View Routes
// ============================================================
w(path.join(S, "src/routes/viewRoutes.js"), `
import { Router } from "express";
import { listViews, createView, deleteView } from "../controllers/viewController.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);
router.get("/:projectId", listViews);
router.post("/", createView);
router.delete("/:id", deleteView);

export default router;
`);

// ============================================================
// CLIENT — PDF Export Utility
// ============================================================
w(path.join(C, "src/lib/exportPdf.js"), `
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

  doc.save(title.replace(/\s+/g, "_") + "_" + Date.now() + ".pdf");
}
`);

// ============================================================
// CLIENT — i18n
// ============================================================
w(path.join(C, "src/lib/i18n.js"), `
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      welcome: "Welcome back",
      dashboard: "Dashboard",
      my_tasks: "My Tasks",
      calendar: "Calendar",
      analytics: "Analytics",
      profile: "Profile",
      logout: "Logout",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      create: "Create",
      search: "Search",
      loading: "Loading...",
      sign_in: "Sign In",
      sign_up: "Sign Up",
      email: "Email",
      password: "Password",
      name: "Full Name",
      forgot_password: "Forgot password?",
      create_account: "Create account",
      your_projects: "Your Projects",
      new_project: "New project name...",
      add_task: "Add task",
      priority: "Priority",
      assignee: "Assignee",
      due_date: "Due Date",
      status: "Status",
      comments: "Comments",
      subtasks: "Subtasks",
      attachments: "Attachments",
      labels: "Labels",
      low: "Low",
      medium: "Medium",
      high: "High",
      urgent: "Urgent",
      todo: "To Do",
      in_progress: "In Progress",
      review: "Review",
      done: "Done",
    },
  },
  hi: {
    translation: {
      welcome: "वापसी पर स्वागत है",
      dashboard: "डैशबोर्ड",
      my_tasks: "मेरे कार्य",
      calendar: "कैलेंडर",
      analytics: "विश्लेषण",
      profile: "प्रोफ़ाइल",
      logout: "लॉग आउट",
      save: "सहेजें",
      cancel: "रद्द करें",
      delete: "हटाएं",
      create: "बनाएं",
      search: "खोजें",
      loading: "लोड हो रहा है...",
      sign_in: "साइन इन",
      sign_up: "साइन अप",
      email: "ईमेल",
      password: "पासवर्ड",
      name: "पूरा नाम",
      forgot_password: "पासवर्ड भूल गए?",
      create_account: "खाता बनाएं",
      your_projects: "आपकी परियोजनाएं",
      new_project: "नई परियोजना का नाम...",
      add_task: "कार्य जोड़ें",
      priority: "प्राथमिकता",
      assignee: "सौंपा गया",
      due_date: "नियत तिथि",
      status: "स्थिति",
      comments: "टिप्पणियाँ",
      subtasks: "उप-कार्य",
      attachments: "संलग्नक",
      labels: "लेबल",
      low: "कम",
      medium: "मध्यम",
      high: "उच्च",
      urgent: "अत्यावश्यक",
      todo: "करना है",
      in_progress: "प्रगति में",
      review: "समीक्षा",
      done: "पूर्ण",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
`);

// ============================================================
// CLIENT — Language Switcher
// ============================================================
w(path.join(C, "src/components/ui/LanguageSwitcher.jsx"), `
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition text-lg"
        title="Change language"
      >
        {current.flag}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 glass rounded-xl shadow-xl p-2 z-50 w-40 animate-slide-up">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={"flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition " + (i18n.language === lang.code ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600" : "hover:bg-slate-100 dark:hover:bg-slate-700")}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
              {i18n.language === lang.code && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
`);

// ============================================================
// CLIENT — Enhanced FilterBar (Saved Views)
// ============================================================
w(path.join(C, "src/components/board/FilterBar.jsx"), `
import { useState, useEffect, useRef } from "react";
import api from "../../lib/api.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function FilterBar({ filters, setFilters, members, labels, projectId }) {
  const [views, setViews] = useState([]);
  const [showSave, setShowSave] = useState(false);
  const [viewName, setViewName] = useState("");
  const [showViews, setShowViews] = useState(false);
  const { show } = useToast();
  const ref = useRef(null);

  const hasFilters = filters.search || filters.priority || filters.assigneeId || filters.labelId;

  const loadViews = () => {
    if (!projectId) return;
    api.get("/views/" + projectId).then((r) => setViews(r.data));
  };

  useEffect(() => { loadViews(); }, [projectId]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowViews(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveView = async (e) => {
    e.preventDefault();
    if (!viewName.trim()) return;
    try {
      await api.post("/views", { projectId, name: viewName, filters });
      setViewName("");
      setShowSave(false);
      loadViews();
      show("View saved! 💾", "success");
    } catch {
      show("Failed to save", "error");
    }
  };

  const applyView = (view) => {
    setFilters(view.filters);
    setShowViews(false);
    show("View applied: " + view.name, "success");
  };

  const deleteView = async (id, name) => {
    if (!confirm("Delete view '" + name + "'?")) return;
    await api.delete("/views/" + id);
    loadViews();
    show("View deleted", "success");
  };

  return (
    <div className="glass rounded-xl p-3 space-y-3" ref={ref}>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
          <input
            className="input pl-9 text-sm !py-2"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <select className="input text-sm !py-2 !w-auto" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🟠 High</option>
          <option value="urgent">🔴 Urgent</option>
        </select>

        <select className="input text-sm !py-2 !w-auto" value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}>
          <option value="">All Assignees</option>
          {members?.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
        </select>

        {labels?.length > 0 && (
          <select className="input text-sm !py-2 !w-auto" value={filters.labelId} onChange={(e) => setFilters({ ...filters, labelId: e.target.value })}>
            <option value="">All Labels</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => setFilters({ search: "", priority: "", assigneeId: "", labelId: "" })}
            className="text-xs text-red-600 hover:underline px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowViews(!showViews)} className="btn btn-ghost text-xs">
          📋 Saved Views ({views.length})
        </button>

        {hasFilters && !showSave && (
          <button onClick={() => setShowSave(true)} className="btn btn-primary text-xs">
            💾 Save this view
          </button>
        )}

        {showSave && (
          <form onSubmit={saveView} className="flex gap-2">
            <input
              autoFocus
              className="input text-xs !py-1 !w-40"
              placeholder="View name (e.g. Urgent)"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary text-xs">Save</button>
            <button type="button" onClick={() => setShowSave(false)} className="btn btn-ghost text-xs">Cancel</button>
          </form>
        )}

        {showViews && views.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {views.map((v) => (
              <div key={v.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: "var(--bg-hover)" }}>
                <button onClick={() => applyView(v)} className="hover:text-indigo-600 font-medium">{v.name}</button>
                <button onClick={() => deleteView(v.id, v.name)} className="text-red-400 hover:text-red-600 ml-1" title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}

        {showViews && views.length === 0 && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No saved views yet. Apply filters then save them.
          </span>
        )}
      </div>
    </div>
  );
}
`);

console.log("\n✅ Sprint 2 files created!");
console.log("\nNext steps:");
console.log("  1. Install packages:");
console.log("     cd client");
console.log("     npm install jspdf jspdf-autotable i18next react-i18next i18next-browser-languagedetector");
console.log("     npm install -D vite-plugin-pwa");
console.log("");
console.log("  2. Update server.js (add viewRoutes)");
console.log("  3. Update main.jsx (import i18n)");
console.log("  4. Update Topbar.jsx (add LanguageSwitcher)");
console.log("  5. Update ProjectPage.jsx (add PDF button + projectId to FilterBar)");
console.log("");