"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  ClipboardList,
  Loader2,
  CheckCircle2,
  Clock,
  Eye,
  Tag,
  Kanban,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";
import useModulePermission from "@/utils/useModulePermission";
import KanbanBoard from "./KanbanBoard";
import TaskFormModal from "./TaskFormModal";
import TaskDetailsModal from "./TaskDetailsModal";

const STATS_CONFIG = [
  { key: "todo", label: "To Do", color: "#64748B", bg: "#F1F5F9", border: "#E2E8F0", icon: Tag },
  { key: "progress", label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: Clock },
  { key: "review", label: "Under Review", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: Eye },
  { key: "completed", label: "Completed", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: CheckCircle2 },
];

const PRIORITY_FILTERS = ["All", "Urgent", "High", "Medium", "Low"];

export default function AssignedTasksView({ isJuniorView = false }) {
  const { perms, loading: permsLoading } = useModulePermission(
    isJuniorView ? "Junior Assigned Tasks" : "Assigned Tasks"
  );
  const user = getLoggedInUser();
  const role = (user?.role || "").toLowerCase();
  const isSenior = !role.includes("junior");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async (silent = false) => {
    const token = localStorage.getItem("token");
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/advocate/tasks/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError("Could not load tasks. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (perms?.view) {
      fetchTasks();
    }
  }, [fetchTasks, perms?.view]);

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.junior_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.case_title || "").toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  // Stats
  const stats = STATS_CONFIG.map((s) => ({
    ...s,
    count: tasks.filter((t) => t.status === s.key).length,
  }));

  const handleTaskSaved = (savedTask, isEdit) => {
    if (isEdit && !perms.edit) return;
    if (!isEdit && !perms.add) return;
    if (isEdit) {
      setTasks((prev) => prev.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else {
      setTasks((prev) => [savedTask, ...prev]);
    }
    setShowForm(false);
    setEditingTask(null);
  };

  const handleStatusChange = async (taskId, newStatus, skipPersist = false) => {
    if (!perms.edit) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => ({ ...prev, status: newStatus }));
    }

    if (!skipPersist) {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE_URL}/advocate/tasks/${taskId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          console.warn("Failed to persist task status change in backend, reverting...");
          fetchTasks(true);
        }
      } catch (err) {
        console.error("Error persisting task status change:", err);
        fetchTasks(true);
      }
    }
  };

  const handleEditTask = (task) => {
    if (!perms.edit) return;
    setSelectedTask(null);
    setEditingTask(task);
    setShowForm(true);
  };

  const handlePinToggle = async (taskId, currentPinStatus) => {
    if (!perms.edit) return;
    const newPinStatus = !currentPinStatus;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_pinned: newPinStatus } : t))
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => ({ ...prev, is_pinned: newPinStatus }));
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/advocate/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: newPinStatus }),
      });
      if (!res.ok) {
        console.warn("Failed to persist task pin status change in backend, reverting...");
        fetchTasks(true);
      }
    } catch (err) {
      console.error("Error persisting task pin status change:", err);
      fetchTasks(true);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!perms.delete) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/advocate/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setSelectedTask(null);
      } else {
        alert("Failed to delete task.");
      }
    } catch (e) {
      console.error("Error deleting task:", e);
      alert("Error deleting task.");
    }
  };

  if (permsLoading || (perms?.view && loading)) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center gap-3.5 bg-gradient-to-br from-[#F0F4FF] via-[#F8FAFC] to-[#EFF6FF] p-4">
        <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-2xl p-4 shadow-xl">
          <Loader2 size={28} className="text-white animate-spin" />
        </div>
        <p className="text-slate-500 text-sm font-medium">Loading task board...</p>
      </div>
    );
  }

  if (!permsLoading && !perms?.view) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F4FF] via-[#F8FAFC] to-[#EFF6FF] p-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 leading-relaxed">You do not have permission to view Assigned Tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-5 md:p-8 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* ─── Hero / Page Header ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 md:p-7 relative overflow-hidden shadow-xs mb-4 sm:mb-6 w-full max-w-full min-w-0">
        {/* Decorative background accent */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-blue-600/5 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-[#EFF6FF] rounded-xl p-2.5 sm:p-3 text-[#2563EB] shrink-0 border border-blue-100 shadow-xs">
                <Kanban size={22} className="sm:w-[24px] sm:h-[24px]" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-slate-900 font-extrabold text-lg sm:text-xl md:text-2xl tracking-tight truncate">
                  Assigned Tasks
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5 truncate">
                  {isSenior && !isJuniorView
                    ? "Manage and track tasks assigned to your team"
                    : "Your assigned tasks — stay on top of your work"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button
              onClick={() => fetchTasks(true)}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            {!isJuniorView && perms.add && (
              <button
                onClick={() => { setEditingTask(null); setShowForm(true); }}
                className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-md cursor-pointer flex-1 sm:flex-none"
              >
                <Plus size={16} />
                <span>Assign New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 sm:mt-6 w-full max-w-full min-w-0">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="rounded-xl p-3 sm:p-4 border border-slate-200/80 bg-slate-50/80 shadow-2xs flex items-center gap-3 min-w-0"
                style={{ borderColor: s.border }}
              >
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{ background: s.bg, borderColor: s.border }}
                >
                  <Icon size={16} style={{ color: s.color }} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{s.label}</p>
                  <p className="text-lg sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">{s.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Unified Task Board Container ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden w-full max-w-full min-w-0">
        {/* Filters Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F8FAFC]/60">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task, case, or advocate..."
              className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Priority filter & Count */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 min-w-0">
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <Filter size={14} />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Priority:</span>
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs cursor-pointer min-w-[130px]"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 shrink-0">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Board Body */}
        <div className="p-3.5 sm:p-5 md:p-6 w-full max-w-full min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] rounded-2xl p-4 shadow-xl">
                <Loader2 size={28} className="text-white animate-spin" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Loading task board...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-red-600 bg-red-50/50 rounded-2xl border border-red-200 p-6">
              <AlertCircle size={32} />
              <p className="text-xs sm:text-sm font-semibold">{error}</p>
              <button
                onClick={() => fetchTasks()}
                className="px-4 py-2 rounded-xl border border-red-600 bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : filteredTasks.length === 0 && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center space-y-3 w-full max-w-full min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-400">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">No Tasks Yet</h3>
              <p className="text-slate-500 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                {isSenior && !isJuniorView
                  ? "Get started by assigning your first task to a junior advocate."
                  : "You have no assigned tasks yet. Check back later."}
              </p>
              {!isJuniorView && isSenior && perms.add && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Assign First Task</span>
                </button>
              )}
            </div>
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onOpenTask={setSelectedTask}
              onStatusChange={handleStatusChange}
              currentUserId={user?.id}
              isSenior={isSenior}
              perms={perms}
              onPinToggle={handlePinToggle}
            />
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      {showForm && (
        <TaskFormModal
          onClose={() => { setShowForm(false); setEditingTask(null); }}
          onSaved={handleTaskSaved}
          editTask={editingTask}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
          isSenior={isSenior}
          onEdit={handleEditTask}
          perms={perms}
          onDelete={handleDeleteTask}
          onPinToggle={handlePinToggle}
        />
      )}
    </div>
  );
}
