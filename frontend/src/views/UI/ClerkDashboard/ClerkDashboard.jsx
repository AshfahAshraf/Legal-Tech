"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar as CalendarIcon, 
  Building2, 
  FolderCheck, 
  Globe, 
  FileText, 
  Send, 
  ClipboardList, 
  User, 
  CheckSquare, 
  Plus, 
  Trash2, 
  AlertCircle,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Folder,
  ChevronRight,
  ChevronDown,
  Scale,
  Briefcase,
  FileSpreadsheet
} from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";

export default function ClerkDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [courtVisits, setCourtVisits] = useState([]);
  const [physicalFiles, setPhysicalFiles] = useState([]);
  const [stats, setStats] = useState({
    templates: 0,
    cabinets: 0,
    court_visits: 0,
    physical_filings: 0,
    efilings: 0,
    orders_awaiting: 0,
    next_postings: 0,
    assigned_tasks: 0,
    urgent_tasks: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("to_attend"); // "to_attend", "visited", "all"

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/dashboard/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data || []);
      }
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/dashboard/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const fetchCourtVisits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/court-visit`);
      if (response.ok) {
        const data = await response.json();
        setCourtVisits(data || []);
      }
    } catch (e) {
      console.error("Failed to load court visits:", e);
    }
  };

  const fetchPhysicalFiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/format-physical-file/`);
      if (response.ok) {
        const data = await response.json();
        setPhysicalFiles(data || []);
      }
    } catch (e) {
      console.error("Failed to load physical files:", e);
    }
  };

  useEffect(() => {
    const loggedIn = getLoggedInUser();
    if (!loggedIn) {
      router.push("/login");
    } else {
      setUser(loggedIn);
      setIsLoading(true);
      Promise.all([fetchTasks(), fetchStats(), fetchCourtVisits(), fetchPhysicalFiles()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [router]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/dashboard/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTaskText.trim(), completed: false })
      });
      if (response.ok) {
        const newTask = await response.json();
        setTasks((prev) => [...prev, newTask]);
        setNewTaskText("");
      }
    } catch (e) {
      console.error("Failed to add task:", e);
    }
  };

  const toggleTask = async (id, currentCompleted) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/dashboard/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
      }
    } catch (e) {
      console.error("Failed to toggle task:", e);
    }
  };

  const deleteTask = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/dashboard/tasks/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete task:", e);
    }
  };

  if (!user) {
    return (
      <div className="w-full h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 text-sm animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const localTodayStr = new Date().toLocaleDateString("en-CA");

  const isToday = (visit) => {
    const rawDate = visit.visit_date || (visit.created_at ? String(visit.created_at).split("T")[0] : null);
    if (!rawDate) return true;
    return rawDate === todayStr || rawDate === localTodayStr;
  };

  const isVisited = (visit) => {
    const s = (visit.visit_status || visit.status || "").toLowerCase();
    return s.includes("completed") || s.includes("visited") || s.includes("attended") || s.includes("done");
  };

  const todayVisits = courtVisits.filter(isToday);
  const visitedCourtVisits = todayVisits.filter(isVisited);
  const toAttendCourtVisits = todayVisits.filter((v) => !isVisited(v));

  const toAttendCount = courtVisits.length > 0 ? toAttendCourtVisits.length : (stats.court_visits || 0);
  const visitedCount = visitedCourtVisits.length;

  const displayedCourtVisits = todayVisits.filter((visit) => {
    if (activeTab === "to_attend") return !isVisited(visit);
    if (activeTab === "visited") return isVisited(visit);
    return true;
  });

  const pendingTasksCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-3 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            🏛️ Clerk Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A]">
            Welcome back, <span className="capitalize text-[#2563EB]">{user.firstName || user.username || "Clerk"}</span>
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm font-medium">
            Manage daily court visits, physical file formatting, tasks, and leave applications.
          </p>
        </div>
      </div>

      {/* Stats Summary Grid - Responsive 3-Card Grid across Desktop, Tablet & Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Card 1: To Attend Court Today */}
        <div 
          onClick={() => setActiveTab("to_attend")}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">To Attend Court Today</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {toAttendCount} <span className="text-lg font-bold text-slate-600">Halls</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">Scheduled for attendance today</p>
          </div>
        </div>

        {/* Card 2: Courts Visited Today */}
        <div 
          onClick={() => setActiveTab("visited")}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
        >
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Courts Visited Today</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {visitedCount} <span className="text-lg font-bold text-slate-600">Visited</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">Completed & logged visits today</p>
          </div>
        </div>

        {/* Card 3: Active Pending Tasks */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Pending Tasks</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {pendingTasksCount} <span className="text-lg font-bold text-slate-600">Tasks</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">To-do list items pending</p>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 sm:space-y-8">
        
        {/* Clerk Tasks Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <CheckSquare size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Clerk Action Checklist</h2>
                <p className="text-xs text-slate-500 hidden sm:block">Track daily filing tasks, certified copies, and court room errands</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full shrink-0">
              {pendingTasksCount} Pending
            </span>
          </div>

          {/* Form to add task */}
          <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task (e.g. File bundle in Hall 3, Collect certified copy)..."
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition shadow-sm shrink-0"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </form>

          {/* Task list */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle2 size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No tasks added yet</p>
                <p className="text-xs text-slate-400 mt-1">Add your daily errands and filing tasks above to keep track.</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                    task.completed ? "bg-slate-50 border-slate-200 opacity-75" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <button
                      onClick={() => toggleTask(task.id, task.completed)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                        task.completed
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 hover:border-blue-500 bg-white"
                      }`}
                    >
                      {task.completed && <CheckSquare size={14} />}
                    </button>
                    <span
                      className={`text-sm truncate font-medium ${
                        task.completed ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {task.text || task.title}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50 shrink-0"
                    title="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Court Visits & Cause List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <Building2 size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Today's Court Visits</h2>
                <p className="text-xs text-slate-500">Real-time status of assigned court halls & hearing progress</p>
              </div>
            </div>

            {/* Filter Dropdown Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Show:</span>
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-sm"
                >
                  <option value="to_attend">To Attend ({toAttendCount})</option>
                  <option value="visited">Visited ({visitedCount})</option>
                  <option value="all">All ({courtVisits.length})</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid / Empty State */}
          {displayedCourtVisits.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {activeTab === "to_attend" && "No pending court visits to attend today"}
                {activeTab === "visited" && "No completed court visits recorded yet today"}
                {activeTab === "all" && "No court visits recorded for today"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Log court hall attendance and cause list items via Court Visit section.</p>
              <button
                onClick={() => router.push("/clerk/court-visit")}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
              >
                <Plus size={14} /> Log New Court Visit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCourtVisits.map((visit, index) => {
                const visited = isVisited(visit);
                return (
                  <div key={visit.id || index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 hover:border-blue-300 transition flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate">
                          {visit.court_name || visit.courtName || "Court Hall"}
                        </span>
                        <span className={`shrink-0 px-2 py-0.5 text-[11px] font-bold rounded-md ${
                          visited ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {visit.visit_status || visit.status || (visited ? "Visited" : "Pending")}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {visit.case_title || visit.caseTitle || `Item #${visit.item_number || visit.itemNo || index + 1}`}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                      <span className="truncate">Advocate: {visit.advocate_name || visit.advocateName || "Assigned"}</span>
                      <span className="shrink-0 ml-1">Item #{visit.item_number || visit.itemNo || "N/A"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {displayedCourtVisits.length} of {courtVisits.length} court visits
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}


