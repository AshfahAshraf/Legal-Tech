"use client";

import { API_BASE_URL } from "@/utils/api";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Eye,
  Download,
  FileText,
  Pencil,
  Trash2,
  X,
  Scale,
  User,
  Building2,
  Phone,
  Mail,
  Hash,
  Gavel,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Send,
  EyeOff,
  LayoutGrid,
  List,
} from "lucide-react";
import { usePermissions } from "@/utils/usePermissions";

// Helper to get status badge styling and icon
function getStatusBadgeStyle(status) {
  const s = String(status || "").trim();
  const lower = s.toLowerCase();

  if (lower.includes("won") || lower === "completed" || lower === "judgment delivered") {
    return {
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold",
      icon: <CheckCircle size={11} />,
    };
  }
  if (lower.includes("lost") || lower === "closed" || lower.includes("reject")) {
    return {
      className: "bg-rose-50 text-rose-700 border border-rose-200 font-extrabold",
      icon: <AlertCircle size={11} />,
    };
  }
  if (
    lower === "in progress" ||
    lower === "hearing scheduled" ||
    lower === "hearing completed" ||
    lower === "case preparation" ||
    lower === "advocate assigned"
  ) {
    return {
      className: "bg-blue-50 text-blue-700 border border-blue-200 font-bold",
      icon: <Clock size={11} />,
    };
  }
  if (lower === "active" || lower === "document verified") {
    return {
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
      icon: <CheckCircle size={11} />,
    };
  }
  if (
    lower === "under review" ||
    lower === "awaiting judgment" ||
    lower === "on hold" ||
    lower === "document pending" ||
    lower === "client consulting" ||
    lower === "client detail collection" ||
    lower === "document data collection" ||
    lower === "court file" ||
    lower === "pending"
  ) {
    return {
      className: "bg-amber-50 text-amber-700 border border-amber-200 font-bold",
      icon: <Clock size={11} />,
    };
  }
  return {
    className: "bg-slate-100 text-slate-700 border border-slate-200 font-bold",
    icon: <Clock size={11} />,
  };
}

// ─── Status badge helper ───
function StatusBadge({ status }) {
  const rawStatus = status || "Active";
  const displayStatus = rawStatus === "Won" ? "🏆 Case Won" : rawStatus === "Lost" ? "❌ Case Lost" : rawStatus;
  const style = getStatusBadgeStyle(rawStatus);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${style.className}`}>
      {style.icon}
      {displayStatus}
    </span>
  );
}

// ─── Info row ───
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-[#0F172A] mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-2xl p-5 border`}>
      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide">{label}</p>
      <p className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

export default function CaseView() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [casesPage, setCasesPage] = useState(0);
  const [viewMode, setViewMode] = useState("grid");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // holds case id to delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewBriefModal, setViewBriefModal] = useState(null);

  const getSavedBrief = (caseId) => {
    if (typeof window === "undefined") return null;
    try {
      const briefs = JSON.parse(localStorage.getItem(`saved_briefs_${caseId}`) || "[]");
      return briefs && briefs.length > 0 ? briefs[0] : null;
    } catch (e) {
      return null;
    }
  };

  const fetchCases = async () => {
    try {
      // 1. Fetch cases
      const response = await fetch(`${API_BASE_URL}/case-management/`);
      const data = await response.json();
      const rawCases = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : Array.isArray(data.data)
            ? data.data
            : [];

      // 2. Fetch assigned cases to get the live status from AssignedCasesView.jsx
      let assignedCases = [];
      try {
        const assignedRes = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases`);
        if (assignedRes.ok) {
          assignedCases = await assignedRes.json();
        }
      } catch (err) {
        console.error("Error fetching assigned cases status:", err);
      }

      // 3. Map status from Assigned Cases
      const normalizedCases = rawCases.map(c => {
        // Find corresponding assigned case by case number/no, title, or id
        const assigned = assignedCases.find(
          ac => 
            (ac.case_number && c.case_no && String(ac.case_number).trim().toLowerCase() === String(c.case_no).trim().toLowerCase()) ||
            (ac.case_name && c.case_title && String(ac.case_name).trim().toLowerCase() === String(c.case_title).trim().toLowerCase()) ||
            (ac.case_title && c.case_title && String(ac.case_title).trim().toLowerCase() === String(c.case_title).trim().toLowerCase()) ||
            (ac.case_id && (ac.case_id === c.id || String(ac.case_id) === String(c.case_id)))
        );
        const resolvedStatus = (assigned && assigned.status) ? assigned.status : (c.status || "Active");
        return {
          ...c,
          status: resolvedStatus,
          isAssigned: !!assigned,
          assignedTo: assigned ? (assigned.advocate_name || assigned.advocateName || "Advocate") : null,
        };
      });

      // Sort cases by ID descending so recently added cases appear at the top
      const sortedCases = [...normalizedCases].sort((a, b) => {
        const idA = typeof a.id === "number" ? a.id : parseInt(a.id) || 0;
        const idB = typeof b.id === "number" ? b.id : parseInt(b.id) || 0;
        return idB - idA;
      });

      setCases(sortedCases);
    } catch (error) {
      console.warn("CaseView fetchCases network fallback active:", error?.message || error);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await fetch(`${API_BASE_URL}/case-management/${id}`, {
        method: "DELETE",
      });
      await fetchCases();
      setDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete the case. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCases = cases.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.case_title?.toLowerCase().includes(term) ||
      item.case_no?.toLowerCase().includes(term) ||
      item.client_name?.toLowerCase().includes(term) ||
      item.court_name?.toLowerCase().includes(term)
    );
  });

  const totalCases = cases.length;
  const activeCases = cases.filter((c) => {
    const s = (c.status || "").toLowerCase();
    return s === "active" || s === "in progress" || s === "document verified" || s === "advocate assigned";
  }).length;
  const pendingCases = cases.filter((c) => {
    const s = (c.status || "").toLowerCase();
    return s.includes("consult") || s.includes("pending") || s.includes("review") || s.includes("hold") || s.includes("prep") || s.includes("court") || s.includes("detail") || s.includes("data");
  }).length;
  const completedCases = cases.filter((c) => {
    const s = (c.status || "").toLowerCase();
    return s.includes("closed") || s.includes("completed") || s.includes("won") || s.includes("lost") || s.includes("judgment");
  }).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

      {/* ──── HEADER ──── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
            <Scale size={20} className="text-white" />
          </div>
          <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-tight break-words">
            Case Management
          </h1>
        </div>
        <p className="text-sm sm:text-base lg:text-lg text-[#64748B] ml-0 sm:ml-[52px]">
          Track legal cases, hearings and case progress
        </p>
      </div>

      {/* ──── STATS ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cases" value={totalCases} color="text-[#0F172A]" bg="bg-white border-[#E2E8F0]" />
        <StatCard label="Active" value={activeCases} color="text-emerald-600" bg="bg-emerald-50 border-emerald-100" />
        <StatCard label="Pending" value={pendingCases} color="text-amber-600" bg="bg-amber-50 border-amber-100" />
        <StatCard label="Completed" value={completedCases} color="text-red-600" bg="bg-red-50 border-red-100" />
      </div>

      {/* ──── QUICK ACCESS CARDS ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { title: "AI Legal Assistant", desc: "Get intelligent legal answers.", color: "from-[#7C3AED] to-[#6d28d9]", path: "/ai-assistant" },
          { title: "Document Generation", desc: "Generate legal documents with AI.", color: "from-[#D97706] to-[#b45309]", path: "/document-generation" },
        ].map((card) => (
          <button
            key={card.title}
            onClick={() => router.push(card.path)}
            className={`bg-gradient-to-br ${card.color} text-white rounded-2xl p-4 sm:p-5 lg:p-6 text-left hover:scale-[1.02] hover:shadow-lg transition-all duration-200 group`}
          >
            <h3 className="font-bold text-sm mb-1">{card.title}</h3>
            <p className="text-white/75 text-xs">{card.desc}</p>
            <div className="mt-3 flex justify-end">
              <ChevronRight size={16} className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        ))}
      </div>

      {/* ──── CASES TABLE ──── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-[#F1F5F9] flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <h2 className="font-bold text-xl text-[#0F172A]">My Cases</h2>
            <p className="text-sm text-[#64748B] mt-0.5">{filteredCases.length} case{filteredCases.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grid"
                    ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "list"
                    ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCasesPage(0);
                }}
                className="rounded-xl border border-[#E2E8F0] pl-9 pr-4 py-2.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
              />
            </div>
            {hasPermission("Case Management", "add") && (
              <button
                onClick={() => router.push("/case-management/case-add")}
                className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Plus size={16} />
                Add Case
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: GRID VIEW */}
        {viewMode === "grid" ? (
          <div className="p-5 bg-[#F8FAFC]/50">
            {filteredCases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCases.slice(casesPage * 6, (casesPage + 1) * 6).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                            {item.case_id}
                          </span>
                          {item.case_no && (
                            <span className="text-[11px] font-semibold text-[#334155] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {item.case_no}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={item.status} />
                          {item.isAssigned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200" title={`Assigned to ${item.assignedTo || 'Advocate'}`}>
                              <UserCheck size={11} /> Assigned
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-[#0F172A] text-base leading-snug line-clamp-2" title={item.case_title}>
                          {item.case_title}
                        </h3>
                        <p className="text-xs text-[#94A3B8] mt-1 font-medium">
                          {item.case_type && item.case_type.includes(": ")
                            ? item.case_type.replace(": ", " · ")
                            : item.case_type}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Client:</span>
                          <div className="text-right truncate max-w-[160px]">
                            <span className="font-bold text-[#0F172A]">{item.client_name || "—"}</span>
                            {item.client_role && (
                              <span className="ml-1 text-[10px] font-bold text-[#2563EB]">({item.client_role})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Court:</span>
                          <span className="font-semibold text-[#475569] truncate max-w-[160px]" title={item.court_name}>
                            {item.court_name || "Unassigned"}
                          </span>
                        </div>
                        {item.isAssigned && item.assignedTo && (
                          <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0]/40">
                            <span className="text-[11px] font-semibold text-purple-600">Assigned To:</span>
                            <span className="font-bold text-purple-900 truncate max-w-[160px]">{item.assignedTo}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-[#F1F5F9]">
                      <button
                        onClick={() => router.push(`/case-management/view/${item.id}`)}
                        className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} /> View Case
                      </button>
                      {(() => {
                        const brief = getSavedBrief(item.id);
                        if (!brief) return null;
                        return (
                          <button
                            onClick={() => setViewBriefModal(brief)}
                            className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200 shrink-0"
                            title="View Downloaded AI Summary"
                          >
                            <FileText size={13} /> Summary
                          </button>
                        );
                      })()}
                      {hasPermission("Case Management", "delete") && (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition cursor-pointer"
                          title="Delete Case"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                  <Scale size={24} className="text-[#CBD5E1]" />
                </div>
                <p className="text-[#64748B] font-medium">No cases found</p>
                <p className="text-[#94A3B8] text-sm mt-1">Try adding a new case or adjusting your search</p>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: LIST VIEW */
          <>
            {/* Desktop / Tablet Table View (md and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                    {["Case Name", "Case ID", "Client", "Court", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {filteredCases.length > 0 ? (
                    filteredCases.slice(casesPage * 5, (casesPage + 1) * 5).map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F8FAFC] transition-colors duration-150 group"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#0F172A] max-w-[220px] truncate">{item.case_title}</p>
                          <p className="text-xs text-[#94A3B8] mt-0.5">
                            {item.case_type && item.case_type.includes(": ")
                              ? item.case_type.replace(": ", " · ")
                              : item.case_type}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-lg w-fit">
                              {item.case_id}
                            </span>
                            {item.case_no && (
                              <span className="text-xs font-semibold text-[#334155] bg-slate-100 px-2 py-0.5 rounded w-fit border border-slate-200">
                                {item.case_no}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-[#0F172A] font-semibold">{item.client_name}</p>
                          {item.client_role ? (
                            <span className="inline-block mt-1 text-[11px] font-bold text-[#2563EB] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
                              {item.client_role}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#475569]">{item.court_name}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={item.status} />
                            {item.isAssigned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200" title={`Assigned to ${item.assignedTo || 'Advocate'}`}>
                                <UserCheck size={10} /> Assigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/case-management/view/${item.id}`)}
                              title="View Case"
                              className="p-2 rounded-lg bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition cursor-pointer"
                            >
                              <Eye size={15} />
                            </button>
                            {(() => {
                              const brief = getSavedBrief(item.id);
                              if (!brief) return null;
                              return (
                                <button
                                  onClick={() => setViewBriefModal(brief)}
                                  title="View Downloaded AI Summary"
                                  className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200"
                                >
                                  <FileText size={15} />
                                </button>
                              );
                            })()}
                            {hasPermission("Case Management", "delete") && (
                              <button
                                onClick={() => setDeleteConfirm(item.id)}
                                title="Delete Case"
                                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                            <Scale size={24} className="text-[#CBD5E1]" />
                          </div>
                          <p className="text-[#64748B] font-medium">No cases found</p>
                          <p className="text-[#94A3B8] text-sm">Try adding a new case or adjusting your search</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (sm and below) */}
            <div className="block md:hidden divide-y divide-[#F1F5F9]">
              {filteredCases.length > 0 ? (
                filteredCases.slice(casesPage * 5, (casesPage + 1) * 5).map((item) => (
                  <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[#0F172A] line-clamp-1">{item.case_title}</h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          {item.case_type && item.case_type.includes(": ")
                            ? item.case_type.replace(": ", " · ")
                            : item.case_type}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md">
                        {item.case_id}
                      </span>
                      {item.case_no && (
                        <span className="font-semibold text-[#334155] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.case_no}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Client</span>
                        <span className="font-semibold text-[#0F172A]">{item.client_name || "—"}</span>
                        {item.client_role && (
                          <span className="ml-1 text-[10px] font-bold text-[#2563EB]">({item.client_role})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Court</span>
                        <span className="font-medium text-[#475569] line-clamp-1">{item.court_name || "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => router.push(`/case-management/view/${item.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-50 text-[#2563EB] font-semibold text-xs hover:bg-blue-100 transition"
                      >
                        <Eye size={14} /> View Case
                      </button>
                      {(() => {
                        const brief = getSavedBrief(item.id);
                        if (!brief) return null;
                        return (
                          <button
                            onClick={() => setViewBriefModal(brief)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs hover:bg-emerald-100 transition border border-emerald-200"
                          >
                            <FileText size={13} /> Summary
                          </button>
                        );
                      })()}
                      {hasPermission("Case Management", "delete") && (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="py-2 px-3 rounded-lg bg-red-50 text-red-500 font-semibold text-xs hover:bg-red-100 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                    <Scale size={20} className="text-[#CBD5E1]" />
                  </div>
                  <p className="text-[#64748B] font-medium text-sm">No cases found</p>
                  <p className="text-[#94A3B8] text-xs mt-1">Try adding a new case or adjusting your search</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {filteredCases.length > (viewMode === "grid" ? 6 : 5) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1F5F9] bg-[#F8FAFC]/50">
            <span className="text-xs text-[#64748B] font-semibold">
              Page {casesPage + 1} of {Math.ceil(filteredCases.length / (viewMode === "grid" ? 6 : 5))}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCasesPage(p => Math.max(0, p - 1))}
                disabled={casesPage === 0}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer select-none font-bold text-xs"
              >
                &lt;
              </button>
              <button
                onClick={() => setCasesPage(p => Math.min(Math.ceil(filteredCases.length / (viewMode === "grid" ? 6 : 5)) - 1, p + 1))}
                disabled={(casesPage + 1) * (viewMode === "grid" ? 6 : 5) >= filteredCases.length}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 transition cursor-pointer select-none font-bold text-xs"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          DELETE CONFIRM DIALOG
      ══════════════════════════════════════════════ */}
      {deleteConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl z-10 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Delete Case?</h3>
            <p className="text-sm text-[#64748B] mb-6">
              This action cannot be undone. The case and all associated data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-70"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    
      {/* Modal: View Saved AI Strategic Brief */}
      {viewBriefModal && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewBriefModal(null)} />
          
          <div className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                    Downloaded Strategic Brief
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30">
                    Win Likelihood: {viewBriefModal.winProbability || 75}%
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate max-w-md">📜 {viewBriefModal.fileName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Downloaded: {viewBriefModal.downloadedAt}</p>
              </div>
              <button
                onClick={() => setViewBriefModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50 font-mono text-xs text-slate-800">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs whitespace-pre-wrap leading-relaxed">
                {viewBriefModal.fileContent || (
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm mb-2">I. KEY WINNING FORMULA</h4>
                    <p className="mb-4 text-slate-700 font-sans">{viewBriefModal.winningFormula}</p>

                    <h4 className="font-bold text-rose-900 text-sm mb-2">II. CRITICAL LOOPHOLES TO PATCH</h4>
                    <ul className="list-disc pl-5 mb-4 text-slate-700 font-sans">
                      {(viewBriefModal.keyLoopholes || []).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>

                    <h4 className="font-bold text-blue-900 text-sm mb-2">III. MAIN LEGAL ARGUMENTS</h4>
                    <ul className="list-disc pl-5 mb-4 text-slate-700 font-sans">
                      {(viewBriefModal.mainArguments || []).map((a, i) => <li key={i}>{a}</li>)}
                    </ul>

                    <h4 className="font-bold text-slate-900 text-sm mb-2">IV. STATUTORY SECTIONS</h4>
                    <p className="mb-4 text-slate-700 font-sans">{(viewBriefModal.importantActs || []).join(", ")}</p>

                    <h4 className="font-bold text-purple-900 text-sm mb-2">V. TRIAL PLAYBOOK</h4>
                    <p className="text-slate-700 font-sans">{viewBriefModal.advocateRecommendation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const element = document.createElement("a");
                  const file = new Blob([viewBriefModal.fileContent], { type: "text/plain;charset=utf-8" });
                  element.href = URL.createObjectURL(file);
                  element.download = viewBriefModal.fileName;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Download File Again
              </button>
              <button
                onClick={() => setViewBriefModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}