"use client";

import React, { useRef, useState } from "react";
import {
  Calendar,
  AlertCircle,
  Briefcase,
  Clock,
  Pin,
} from "lucide-react";

const COLUMNS = [
  {
    key: "todo",
    label: "To Do",
    color: "#64748B",
    bg: "rgba(100,116,139,0.06)",
    border: "#CBD5E1",
    dot: "#94A3B8",
    headerBg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
  },
  {
    key: "progress",
    label: "In Progress",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.05)",
    border: "#BFDBFE",
    dot: "#3B82F6",
    headerBg: "linear-gradient(135deg,#eff6ff,#dbeafe)",
  },
  {
    key: "review",
    label: "Under Review",
    color: "#D97706",
    bg: "rgba(217,119,6,0.05)",
    border: "#FDE68A",
    dot: "#F59E0B",
    headerBg: "linear-gradient(135deg,#fffbeb,#fef3c7)",
  },
  {
    key: "completed",
    label: "Completed",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.05)",
    border: "#BBF7D0",
    dot: "#22C55E",
    headerBg: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
  },
];

const PRIORITY_CONFIG = {
  Urgent: { color: "#DC2626", bg: "#FEF2F2", label: "Urgent" },
  High: { color: "#D97706", bg: "#FFFBEB", label: "High" },
  Medium: { color: "#2563EB", bg: "#EFF6FF", label: "Medium" },
  Low: { color: "#16A34A", bg: "#F0FDF4", label: "Low" },
};

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return { formatted, diffDays, overdue: diffDays < 0 };
  } catch {
    return { formatted: dateStr, diffDays: 0, overdue: false };
  }
}

function TaskCard({ task, onOpen, colKey, perms, onPinToggle }) {
  const dragRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const due = formatDueDate(task.due_date);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;

  const handleDragStart = (e) => {
    if (!perms || !perms.edit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("taskId", String(task.id));
    e.dataTransfer.setData("fromCol", colKey);
    e.currentTarget.style.opacity = "0.5";
  };
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
  };

  return (
    <div
      ref={dragRef}
      draggable={!!perms?.edit}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onOpen(task)}
      className={`bg-white rounded-2xl p-3.5 sm:p-4 mb-3 cursor-pointer shadow-xs transition-all duration-200 border relative overflow-hidden group ${
        task.is_pinned
          ? "border-amber-400 bg-amber-50/10 shadow-amber-100/50"
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <span
          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0"
          style={{ background: priority.bg, color: priority.color, borderColor: `${priority.color}30` }}
        >
          {priority.label}
        </span>
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {(task.is_pinned || (hovered && perms?.edit)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPinToggle(task.id, task.is_pinned);
              }}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                task.is_pinned ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
              }`}
              title={task.is_pinned ? "Unpin task" : "Pin task"}
            >
              <Pin size={13} className={task.is_pinned ? "-rotate-45 fill-amber-500" : ""} />
            </button>
          )}
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            #{task.id}
          </span>
        </div>
      </div>

      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 mb-1.5 leading-snug break-words">
        {task.title}
      </h4>

      {task.case_title && (
        <div className="flex items-center gap-1.5 text-[#0284C7] text-[11px] font-bold mb-2.5 min-w-0">
          <Briefcase size={12} className="shrink-0" />
          <span className="truncate">{task.case_title}</span>
        </div>
      )}

      <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 text-[#2563EB] text-[9px] font-black flex items-center justify-center shrink-0">
            {(task.junior_name || "JA").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <span className="text-[11px] font-semibold text-slate-600 truncate">
            {task.junior_name || "Junior Advocate"}
          </span>
        </div>

        {due && (
          <div
            className={`flex items-center gap-1 text-[10.5px] font-semibold shrink-0 ${
              due.overdue ? "text-rose-600" : due.diffDays <= 3 ? "text-amber-600" : "text-slate-500"
            }`}
          >
            {due.overdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
            <span>{due.overdue ? `Overdue · ${due.formatted}` : due.formatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks = [], onOpenTask, onStatusChange, currentUserId, isSenior, perms, onPinToggle }) {
  const [mobileColFilter, setMobileColFilter] = useState("all");

  const tasksByCol = {};
  COLUMNS.forEach((c) => { tasksByCol[c.key] = []; });
  tasks.forEach((t) => {
    const col = t.status in tasksByCol ? t.status : "todo";
    tasksByCol[col].push(t);
  });

  // Sort within columns: pinned tasks first, then by id desc
  COLUMNS.forEach((c) => {
    tasksByCol[c.key].sort((a, b) => {
      const pinA = a.is_pinned ? 1 : 0;
      const pinB = b.is_pinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return b.id - a.id;
    });
  });

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = (e, targetColKey) => {
    e.preventDefault();
    if (!perms || !perms.edit) return;
    const taskId = parseInt(e.dataTransfer.getData("taskId"), 10);
    const fromCol = e.dataTransfer.getData("fromCol");
    if (!taskId || fromCol === targetColKey) return;
    onStatusChange(taskId, targetColKey);
  };

  const visibleColumns = mobileColFilter === "all"
    ? COLUMNS
    : COLUMNS.filter((c) => c.key === mobileColFilter);

  return (
    <div className="w-full max-w-full min-w-0 space-y-3">

      {/* Mobile Column View Switcher (< 640px) */}
      <div className="block sm:hidden w-full min-w-0 bg-white p-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setMobileColFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              mobileColFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            All Columns ({tasks.length})
          </button>
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => setMobileColFilter(col.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                mobileColFilter === col.key
                  ? "bg-[#2563EB] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: col.dot }} />
              <span>{col.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">
                {tasksByCol[col.key].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full max-w-full min-w-0">
        {visibleColumns.map((col) => (
          <div
            key={col.key}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
            className="rounded-2xl border flex flex-col min-h-[260px] w-full max-w-full min-w-0 overflow-hidden shadow-2xs"
            style={{ borderColor: col.border, background: col.bg }}
          >
            {/* Column Header */}
            <div
              className="p-3.5 border-b flex items-center justify-between"
              style={{ background: col.headerBg, borderColor: col.border }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ background: col.dot }}
                />
                <span className="font-extrabold text-xs sm:text-sm tracking-wide" style={{ color: col.color }}>
                  {col.label}
                </span>
              </div>
              <span
                className="text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs"
                style={{ background: "#FFFFFF", color: col.color, borderColor: col.border }}
              >
                {tasksByCol[col.key].length}
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="p-3 flex-1 overflow-y-auto">
              {tasksByCol[col.key].length === 0 ? (
                <div
                  className="text-center py-8 px-3 text-slate-400 text-xs font-semibold border-2 border-dashed rounded-xl mt-1 space-y-1.5"
                  style={{ borderColor: col.border }}
                >
                  <Clock size={22} className="mx-auto text-slate-300" />
                  <p>Drop tasks here</p>
                </div>
              ) : (
                tasksByCol[col.key].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    colKey={col.key}
                    onOpen={onOpenTask}
                    onStatusChange={onStatusChange}
                    currentUserId={currentUserId}
                    isSenior={isSenior}
                    perms={perms}
                    onPinToggle={onPinToggle}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
