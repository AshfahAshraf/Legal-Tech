"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Eye,
  FileText,
  Trash2,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import useModulePermission from "@/utils/useModulePermission";
import { getLoggedInUser } from "@/utils/auth";
import { isSensitiveCase } from "@/utils/caseSensitivity";
import AssignedCaseDetailView from "./AssignedCaseDetailView";

const getStatusSelectClass = (status) => {
  switch (status) {
    case "Completed":
    case "Judgment Delivered":
    case "Won":
      return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
    case "Closed":
    case "Lost":
      return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
    case "In Progress":
    case "Hearing Scheduled":
    case "Hearing Completed":
    case "Case Preparation":
    case "Advocate Assigned":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "Active":
    case "Document Verified":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "Under Review":
    case "Awaiting Judgment":
    case "On Hold":
    case "Document Pending":
    case "Client Consulting":
    case "Client Detail Collection":
    case "Document Data Collection":
    case "Court File":
      return "bg-amber-100 text-amber-800 border-amber-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "Completed":
    case "Judgment Delivered":
    case "Won":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold";
    case "Closed":
    case "Lost":
      return "bg-rose-50 text-rose-700 border border-rose-200 font-extrabold";
    case "In Progress":
    case "Hearing Scheduled":
    case "Hearing Completed":
    case "Case Preparation":
    case "Advocate Assigned":
      return "bg-blue-50 text-blue-700 border border-blue-200 font-bold";
    case "Active":
    case "Document Verified":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold";
    case "Under Review":
    case "Awaiting Judgment":
    case "On Hold":
    case "Document Pending":
    case "Client Consulting":
    case "Client Detail Collection":
    case "Document Data Collection":
    case "Court File":
      return "bg-amber-100 text-amber-700 border border-amber-200 font-bold";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200 font-bold";
  }
};

export default function AssignedCasesView() {
  const router = useRouter();
  const { perms, loading } = useModulePermission("Assigned Cases");
  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [selectedCase, setSelectedCase] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewBriefModal, setViewBriefModal] = useState(null);

  const user = getLoggedInUser();
  const isJuniorAdvocate =
    user && user.role && user.role.toLowerCase().includes("junior");

  useEffect(() => {
    fetchAssignedCases();
  }, []);

  const fetchAssignedCases = async () => {
    try {
      const user = getLoggedInUser();
      const res = await fetch(
        `${API_BASE_URL}/lawfirm-management/assigned-cases`
      );
      const data = await res.json();

      let casesToShow = data;
      if (user && user.role && user.role.toLowerCase().includes("junior")) {
        casesToShow = data.filter((item) => {
          const primaryName = item.advocate_name || item.advocateName || "";
          const secondaryName = item.secondary_advocate_name || item.secondaryAdvocateName || "";
          const juniorName = item.junior_advocate || item.juniorAdvocate || item.assigned_to || "";

          const normalizedPrimary = primaryName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedSecondary = secondaryName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedJunior = juniorName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedUsername = (user.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedEmail = (user.email || "").toLowerCase().replace(/[^a-z0-9]/g, "");

          const isPrimaryMatch = primaryName && (
            normalizedPrimary === normalizedUsername ||
            normalizedPrimary === normalizedEmail ||
            normalizedUsername.includes(normalizedPrimary) ||
            normalizedPrimary.includes(normalizedUsername)
          );

          const isSecondaryMatch = secondaryName && (
            normalizedSecondary === normalizedUsername ||
            normalizedSecondary === normalizedEmail ||
            normalizedUsername.includes(normalizedSecondary) ||
            normalizedSecondary.includes(normalizedUsername)
          );

          const isJuniorMatch = juniorName && (
            normalizedJunior === normalizedUsername ||
            normalizedJunior === normalizedEmail ||
            normalizedUsername.includes(normalizedJunior) ||
            normalizedJunior.includes(normalizedUsername)
          );

          return isPrimaryMatch || isSecondaryMatch || isJuniorMatch;
        });
      }

      const formattedCases = casesToShow.map((item) => ({
        id: item.id,
        caseId: item.case_id,
        caseIdCode: item.case_id_code || item.case_number || (item.case_id ? `CASE-#${item.case_id}` : `#${item.id}`),
        title: item.case_title || item.title || item.caseTitle || "Assigned Case",
        caseNo: item.case_number || item.caseNo || "N/A",
        client: item.client_name || item.client || "N/A",
        court: item.practice_court || item.practice_area || item.court || "N/A",
        hearing: item.due_date || item.next_hearing_date || "No hearing date",
        status: item.status || "Active",
        documents: item.assigned_documents || item.documents || [],
        appearances: item.appearances || [],
        notes: item.assignment_notes || item.notes || "",
        primaryAdvocate: item.advocate_name || "",
        secondaryAdvocate: item.secondaryAdvocateName || item.secondary_advocate_name || "",
        secondary_advocate_name: item.secondaryAdvocateName || item.secondary_advocate_name || "",
        advocate_name: item.advocate_name || "",
      }));

      setCases(formattedCases);
    } catch (error) {
      console.error("Error fetching assigned cases:", error);
    }
  };

  const closeModal = () => {
    setSelectedCase(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/lawfirm-management/assigned-cases/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update status on server");
      }

      setCases((prevCases) =>
        prevCases.map((c) =>
          c.id === id ? { ...c, status: newStatus } : c
        )
      );

      if (selectedCase && selectedCase.id === id) {
        setSelectedCase((prev) => ({
          ...prev,
          status: newStatus,
        }));
      }
    } catch (error) {
      console.error("Status update error:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCases((prev) => prev.filter((c) => c.id !== id));
        setDeleteConfirm(null);
      } else {
        alert("Failed to delete case.");
      }
    } catch (e) {
      console.error("Error deleting case:", e);
      alert("Error deleting case.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCases = cases.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesStatus;
    }
    const matchesSearch =
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.caseNo && String(item.caseNo).toLowerCase().includes(query)) ||
      (item.caseIdCode && String(item.caseIdCode).toLowerCase().includes(query)) ||
      (item.caseId && String(item.caseId).toLowerCase().includes(query)) ||
      (item.id && String(item.id).toLowerCase().includes(query)) ||
      (item.client && item.client.toLowerCase().includes(query)) ||
      (item.court && item.court.toLowerCase().includes(query));
      
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // No view access
  if (!loading && !perms.view) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-10 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-2">You do not have permission to view Assigned Cases.</p>
        </div>
      </div>
    );
  }

  // ── Render Full Case Details Page if a case is selected ──
  if (selectedCase) {
    return (
      <AssignedCaseDetailView
        selectedCase={selectedCase}
        setSelectedCase={setSelectedCase}
        onClose={closeModal}
        perms={perms}
        getStatusSelectClass={getStatusSelectClass}
        getStatusBadgeClass={getStatusBadgeClass}
        handleStatusChange={handleStatusChange}
        setCases={setCases}
      />
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 md:space-y-8 overflow-hidden">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 md:p-6 w-full max-w-full min-w-0">
        <h1 className="text-[#0F172A] font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight">
          Assigned Cases
        </h1>
        <p className="text-[#64748B] mt-1 text-xs sm:text-sm">
          View and manage your assigned legal cases
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full max-w-full min-w-0">
        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow min-w-0">
          <h3 className="text-[#64748B] text-xs sm:text-sm font-medium">Total Assigned Cases</h3>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1.5">{cases.length}</p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow min-w-0">
          <h3 className="text-[#64748B] text-xs sm:text-sm font-medium">Active Cases</h3>
          <p className="text-2xl sm:text-3xl font-bold text-[#16A34A] mt-1.5">
            {cases.filter((c) => c.status === "Active").length}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow min-w-0 sm:col-span-1">
          <h3 className="text-[#64748B] text-xs sm:text-sm font-medium">Upcoming Hearings</h3>
          <p className="text-2xl sm:text-3xl font-bold text-[#2563EB] mt-1.5">
            {cases.filter((c) => c.hearing !== "No hearing date").length}
          </p>
        </div>
      </div>

      {/* Cases Section (Grid vs List) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden w-full max-w-full min-w-0">
        <div className="p-3.5 sm:p-5 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 w-full max-w-full min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A] whitespace-nowrap">My Assigned Cases</h2>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto border border-[#E2E8F0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-xs sm:text-sm text-[#0F172A] cursor-pointer bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <input
                type="text"
                placeholder="Search title, case no, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 md:w-64 border border-[#E2E8F0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-xs sm:text-sm text-[#0F172A] placeholder:text-[#94A3B8]"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
              {/* View Mode Toggle (Grid vs List) */}
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                    viewMode === "grid"
                      ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="List View"
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                    viewMode === "list"
                      ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <List size={14} />
                  <span>List</span>
                </button>
              </div>

              <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 sm:px-3 py-1.5 rounded-full whitespace-nowrap">
                {filteredCases.length} cases
              </span>
            </div>
          </div>
        </div>

        {/* GRID VIEW */}
        {viewMode === "grid" && (
          <div className="p-3 sm:p-5 bg-[#F8FAFC]/50 w-full min-w-0">
            {filteredCases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
                {filteredCases.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 sm:p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all space-y-3.5 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-extrabold border border-blue-200 inline-block">
                          {item.caseIdCode}
                        </span>
                        <h3 className="font-bold text-[#0F172A] text-xs sm:text-sm mt-1.5 leading-snug break-words">
                          {item.title || item.caseTitle || "Assigned Case"}
                        </h3>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-xs shrink-0 whitespace-nowrap ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status === "Won" ? "🏆 Won" : item.status === "Lost" ? "❌ Lost" : item.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#64748B] bg-[#F8FAFC] p-2.5 sm:p-3 rounded-xl border border-[#E2E8F0]/60 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#94A3B8] shrink-0">Client:</span>
                        <span className="font-bold text-[#0F172A] truncate">
                          {isJuniorAdvocate && isSensitiveCase(item)
                            ? "Confidential (Restricted)"
                            : item.client || "Not Specified"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#94A3B8] shrink-0">Court:</span>
                        <span className="font-semibold text-[#475569] truncate" title={item.court}>
                          {item.court || "Court Not Specified"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#94A3B8] shrink-0">Next Hearing:</span>
                        <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate">
                          {item.hearing || "No hearing date"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                      {(() => {
                        try {
                          const targetId = item.caseId || item.case_id || item.id;
                          const saved = JSON.parse(localStorage.getItem(`saved_briefs_${targetId}`) || "[]");
                          if (saved && saved.length > 0) {
                            return (
                              <button
                                onClick={() => setViewBriefModal(saved[0])}
                                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                                title="View Saved AI Summary"
                              >
                                <Eye size={13} />
                                <span>View Summary</span>
                              </button>
                            );
                          }
                        } catch (e) {}
                        return null;
                      })()}
                      <button
                        onClick={() => setSelectedCase(item)}
                        className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        title="See Case Details"
                      >
                        <Eye size={14} />
                        View Case Details
                      </button>

                      {perms.delete && (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition text-xs font-bold flex items-center justify-center cursor-pointer shrink-0"
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
              <div className="py-14 text-center flex flex-col items-center gap-2">
                <FileText size={32} className="text-[#CBD5E1]" />
                <p className="text-[#64748B] text-sm font-medium">No matching assigned cases found.</p>
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === "list" && (
          <div className="w-full max-w-full min-w-0">
            {/* Mobile Card List (Visible on phones < 640px) */}
            <div className="block sm:hidden divide-y divide-[#F1F5F9] w-full min-w-0">
              {filteredCases.length > 0 ? (
                filteredCases.map((item, index) => (
                  <div key={index} className="p-3.5 space-y-2.5 w-full min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-extrabold border border-blue-200">
                        {item.caseIdCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${getStatusBadgeClass(item.status)}`}>
                        {item.status === "Won" ? "🏆 Won" : item.status === "Lost" ? "❌ Lost" : item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-[#0F172A] text-xs leading-snug break-words">
                      {item.title || "Assigned Case"}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Client</span>
                        <span className="text-slate-800 font-semibold truncate block">
                          {isJuniorAdvocate && isSensitiveCase(item) ? "Confidential" : (item.client || "N/A")}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px]">Court</span>
                        <span className="text-slate-800 font-semibold truncate block">{item.court}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[10px]">Next Hearing:</span>
                        <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[10px]">
                          {item.hearing}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {(() => {
                        try {
                          const targetId = item.caseId || item.case_id || item.id;
                          const saved = JSON.parse(localStorage.getItem(`saved_briefs_${targetId}`) || "[]");
                          if (saved && saved.length > 0) {
                            return (
                              <button
                                onClick={() => setViewBriefModal(saved[0])}
                                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                              >
                                <Eye size={13} />
                                <span>Summary</span>
                              </button>
                            );
                          }
                        } catch (e) {}
                        return null;
                      })()}
                      <button
                        onClick={() => setSelectedCase(item)}
                        className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                      {perms.delete && (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-500 text-xs">
                  No matching assigned cases found.
                </div>
              )}
            </div>

            {/* Desktop / Tablet Table View (Visible on >= 640px) */}
            <div className="hidden sm:block w-full max-w-full overflow-x-auto min-w-0">
              <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">Case ID</th>
                    <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">Client</th>
                    <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">Court</th>
                    <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">Next Hearing</th>
                    <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredCases.length > 0 ? (
                    filteredCases.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 sm:px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-extrabold border border-blue-200 block w-fit mb-1">
                            {item.caseIdCode}
                          </span>
                          <span className="font-bold text-[#0F172A] text-xs leading-snug block max-w-xs truncate">
                            {item.title || "Assigned Case"}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs text-[#475569] font-medium max-w-[150px] truncate">
                          {isJuniorAdvocate && isSensitiveCase(item) ? "Confidential" : item.client}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs text-[#475569] font-medium max-w-[150px] truncate">
                          {item.court}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-xs font-bold text-[#2563EB]">
                          {item.hearing}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs uppercase tracking-wider inline-block ${getStatusBadgeClass(item.status)}`}>
                            {item.status === "Won" ? "🏆 Won" : item.status === "Lost" ? "❌ Lost" : item.status}
                          </span>
                        </td>

                        <td className="px-4 sm:px-5 py-3.5">
                          <div className="flex gap-2 items-center">
                            {(() => {
                              try {
                                const targetId = item.caseId || item.case_id || item.id;
                                const saved = JSON.parse(localStorage.getItem(`saved_briefs_${targetId}`) || "[]");
                                if (saved && saved.length > 0) {
                                  return (
                                    <button
                                      onClick={() => setViewBriefModal(saved[0])}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
                                      title="View Saved Brief Summary"
                                    >
                                      <Eye size={14} />
                                      Summary
                                    </button>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}

                            <button
                              onClick={() => setSelectedCase(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="See Case Details"
                            >
                              <Eye size={14} />
                              View
                            </button>

                            {perms.delete && (
                              <button
                                onClick={() => setDeleteConfirm(item.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                title="Delete Case"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <FileText size={32} className="text-[#CBD5E1]" />
                          <p className="text-[#64748B] text-sm font-medium">No matching assigned cases found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SAVED BRIEF READER MODAL PORTAL */}
      {viewBriefModal && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewBriefModal(null)} />

          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-10">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                    Win Likelihood: {viewBriefModal.winProbability || 75}%
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white truncate max-w-md">📜 {viewBriefModal.fileName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Downloaded: {viewBriefModal.downloadedAt}</p>
                </div>
              </div>
              <button
                onClick={() => setViewBriefModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800">
                {viewBriefModal.fileContent}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  const file = new Blob([viewBriefModal.fileContent], { type: "text/plain;charset=utf-8" });
                  const element = document.createElement("a");
                  element.href = URL.createObjectURL(file);
                  element.download = viewBriefModal.fileName;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                📥 Download File Again
              </button>
              <button
                onClick={() => setViewBriefModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-5 sm:p-6 max-w-xs sm:max-w-sm w-full shadow-2xl z-10 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3.5">
              <Trash2 size={22} className="text-red-500 sm:w-[24px] sm:h-[24px]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A] mb-1.5">Delete Assigned Case?</h3>
            <p className="text-xs sm:text-sm text-[#64748B] mb-5">
              This action cannot be undone. The case assignment will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-xs sm:text-sm hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm transition disabled:opacity-70 cursor-pointer"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
