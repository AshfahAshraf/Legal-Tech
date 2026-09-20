"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Eye,
  Briefcase,
  CheckCircle,
  ArrowLeft,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Users,
  Building,
  Search
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import DocumentViewerModal from "@/components/common/DocumentViewerModal";

// ---------- status colour helper ----------
function statusBadge(status) {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "in progress")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("pending") || s.includes("review") || s.includes("consulting"))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "closed" || s === "won" || s === "lost")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

const STATUS_OPTIONS = [
  "Active",
  "Client Consulting",
  "Client Detail Collection",
  "Document Data Collection",
  "Document Pending",
  "Document Verified",
  "Advocate Assigned",
  "Under Review",
  "Case Preparation",
  "Court File",
  "In Progress",
  "Hearing Scheduled",
  "Hearing Completed",
  "Awaiting Judgment",
  "Judgment Delivered",
  "Won",
  "Lost",
  "On Hold",
  "Closed",
];

export default function CaseTracking() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  // which client card is expanded (shows the inline cases table)
  const [expandedClient, setExpandedClient] = useState(null);

  // which case is open in the detail modal
  const [selectedCase, setSelectedCase] = useState(null);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ── load cases ──────────────────────────────────────────────
  async function loadCases() {
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/`);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error("Error fetching cases:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
    setMounted(true);
  }, []);

  // ── group cases by client_name ───────────────────────────────
  const clients = useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      const name = (c.client_name || "Unknown Client").trim();
      if (!map[name]) {
        map[name] = {
          id: `CL-${name.replace(/\s+/g, "").substring(0, 5).toUpperCase()}-${c.contact_number || "000"}`,
          name,
          contact: c.contact_number || "N/A",
          email: c.email_id || "N/A",
          cases: [],
        };
      }
      map[name].cases.push({
        id: c.case_id || `C-${c.id}`,
        dbId: c.id,
        name: c.case_title,
        status: c.status,
        court: c.court_name,
        hearing: c.next_hearing_date || "N/A",
        selected_advocate: c.selected_advocate,
        case_no: c.case_no,
        documents: c.documents || [],
      });
    });
    return Object.values(map);
  }, [cases]);

  // ── auto-select targeted case when navigating via "Track Case" ──
  useEffect(() => {
    if (!clients || clients.length === 0) return;

    let targetParam = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      targetParam = params.get("case_id");
    }

    let storedData = null;
    try {
      const raw = localStorage.getItem("trackCaseData");
      if (raw) storedData = JSON.parse(raw);
    } catch (e) {}

    const searchTarget = (
      targetParam ||
      storedData?.case_id ||
      storedData?.case_no ||
      storedData?.dbId ||
      ""
    )
      .toString()
      .trim()
      .toLowerCase();

    if (searchTarget) {
      for (const cl of clients) {
        const match = cl.cases.find((cItem) => {
          const idStr = (cItem.id || "").toString().toLowerCase();
          const dbIdStr = (cItem.dbId || "").toString().toLowerCase();
          const caseNoStr = (cItem.case_no || "").toString().toLowerCase();
          const nameStr = (cItem.name || "").toString().toLowerCase();
          return (
            idStr === searchTarget ||
            dbIdStr === searchTarget ||
            caseNoStr === searchTarget ||
            (searchTarget.length > 3 && nameStr.includes(searchTarget))
          );
        });

        if (match) {
          setExpandedClient(cl.id);
          setSelectedCase(match);
          if (storedData) localStorage.removeItem("trackCaseData");
          break;
        }
      }
    }
  }, [clients]);

  // ── search filter — matches on client name or case title/id ──
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const q = searchTerm.toLowerCase();
    return clients.filter((cl) => {
      const matchesName = cl.name.toLowerCase().includes(q) || cl.id.toLowerCase().includes(q);
      const matchesCases = cl.cases.some(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.court && c.court.toLowerCase().includes(q))
      );
      return matchesName || matchesCases;
    });
  }, [clients, searchTerm]);

  // ── status update ────────────────────────────────────────────
  async function handleStatusChange(caseDbId, newStatus) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${caseDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCases((prev) =>
          prev.map((c) =>
            c.id === caseDbId ? { ...c, status: newStatus } : c
          )
        );
        if (selectedCase && selectedCase.dbId === caseDbId) {
          setSelectedCase((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        alert("Failed to update status. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while updating status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ── loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-white rounded-xl border border-[#E2E8F0]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B] font-medium">Loading cases…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-6 md:space-y-8 pb-16 md:pb-10">
      {/* ── Header & Search Toolbar (Responsive) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/client-management"
            className="flex items-center justify-center w-9 h-9 bg-white border border-[#E2E8F0] rounded-xl shadow-xs text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors shrink-0 cursor-pointer"
            title="Back to Client Management"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight truncate">
              Case Tracking
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 truncate">
              Monitor litigation milestones, document trails, and schedules.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search Client / Case…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Client Accordion List ── */}
      {filteredClients.length === 0 ? (
        <div className="text-center bg-white py-16 px-4 rounded-2xl border border-[#E2E8F0] text-sm text-[#64748B] shadow-xs">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">No matching client or case found.</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const isExpanded = expandedClient === client.id;
            return (
              <div
                key={client.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Accordion Header */}
                <button
                  onClick={() =>
                    setExpandedClient(isExpanded ? null : client.id)
                  }
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 select-none">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-sm sm:text-base text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate">
                        {client.name}
                      </h2>
                      <span className="text-[11px] text-[#64748B] font-mono block mt-0.5 truncate">
                        ID: {client.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {/* Case Count Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-[#2563EB] border border-indigo-100 shadow-2xs">
                      <Briefcase size={12} />
                      <span>{client.cases.length}</span>
                      <span className="hidden sm:inline">{client.cases.length === 1 ? "Case" : "Cases"}</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp
                        size={18}
                        className="text-[#64748B] shrink-0"
                      />
                    ) : (
                      <ChevronDown
                        size={18}
                        className="text-[#64748B] shrink-0"
                      />
                    )}
                  </div>
                </button>

                {/* Inline cases content — Desktop Table vs Mobile Cards */}
                {isExpanded && (
                  <div className="border-t border-[#F1F5F9] bg-[#F8FAFC]/50">
                    {/* Desktop Table View (>= md screens) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] border-b border-[#E2E8F0]">
                            <th className="px-5 py-3">#</th>
                            <th className="px-5 py-3">Case ID</th>
                            <th className="px-5 py-3">Case Title</th>
                            <th className="px-5 py-3">Court</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] bg-white">
                          {client.cases.map((item, idx) => (
                            <tr
                              key={item.dbId || `${item.id}-${idx}`}
                              className="hover:bg-[#F8FAFC] transition-colors"
                            >
                              <td className="px-5 py-3.5 text-xs text-[#94A3B8] font-bold">
                                {idx + 1}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-mono font-semibold text-[#1E293B]">
                                {item.id}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-[#1E293B] max-w-[220px]">
                                <span className="font-semibold block leading-tight">{item.name}</span>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-[#64748B]">
                                {item.court || "—"}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge(
                                    item.status
                                  )}`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => setSelectedCase(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                                >
                                  <Eye size={13} />
                                  <span>View</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile & Tablet Card View (< md screens) */}
                    <div className="block md:hidden p-3.5 space-y-3">
                      {client.cases.map((item, idx) => (
                        <div
                          key={item.dbId || `${item.id}-${idx}`}
                          className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="text-xs font-mono font-bold text-slate-800">
                              #{idx + 1} &bull; {item.id}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                              {item.name}
                            </h4>
                            {item.court && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                <Building size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{item.court}</span>
                              </p>
                            )}
                          </div>

                          <div className="pt-1 border-t border-slate-100">
                            <button
                              onClick={() => setSelectedCase(item)}
                              className="w-full py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Eye size={13} />
                              <span>View Details</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Case Detail Modal (portal) ── */}
      {mounted && selectedCase && typeof document !== "undefined"
        ? createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-6 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
                    Case Details Log
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                    {selectedCase.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-full p-2 transition-colors cursor-pointer shadow-xs"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  {/* Left — case info */}
                  <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 space-y-2.5 shadow-2xs">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 pb-2 mb-3">
                      Case Parameters
                    </h3>
                    {[
                      ["Case ID", selectedCase.id],
                      ["Case Title", selectedCase.name],
                      ["Case No.", selectedCase.case_no || "N/A"],
                      ["Advocate", selectedCase.selected_advocate || "N/A"],
                      ["Court", selectedCase.court],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        className="grid grid-cols-3 gap-2 border-b border-slate-200/40 pb-2 last:border-0 items-center text-xs"
                      >
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                          {label}
                        </span>
                        <span className="col-span-2 text-[#0F172A] font-semibold text-xs sm:text-sm break-words">
                          {val}
                        </span>
                      </div>
                    ))}

                    {/* Status row */}
                    <div className="grid grid-cols-3 gap-2 pt-1 items-center">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        Status
                      </span>
                      <span className="col-span-2">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusBadge(
                            selectedCase.status
                          )}`}
                        >
                          {selectedCase.status}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right — docs */}
                  <div className="space-y-4">
                    {/* Documents Box with Scrollbar for >4 items */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 shadow-2xs flex flex-col">
                      <div className="flex items-center justify-between gap-2 font-bold text-sm text-[#0F172A] mb-3 pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <Briefcase size={16} className="text-[#2563EB]" />
                          <span>Documents</span>
                        </div>
                        <span className="text-[11px] text-[#2563EB] font-bold bg-white px-2.5 py-0.5 rounded-full border border-indigo-100 shadow-2xs">
                          {selectedCase.documents ? selectedCase.documents.length : 0} Files
                        </span>
                      </div>

                      {/* Scroll container if > 4 docs */}
                      <div className="max-h-[210px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-300">
                        {selectedCase.documents &&
                          selectedCase.documents.length > 0 ? (
                          selectedCase.documents.map((doc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-200 shadow-2xs transition-colors gap-2"
                            >
                              <span className="text-slate-800 flex items-center gap-2 font-semibold text-xs truncate min-w-0 flex-1">
                                <FileText
                                  size={15}
                                  className="text-indigo-500 shrink-0"
                                />
                                <span className="truncate" title={doc.file}>
                                  {doc.file || "Unnamed Document"}
                                </span>
                              </span>
                              {doc.file && (
                                <button
                                  onClick={() =>
                                    setSelectedDoc({
                                      fileUrl: doc.url || null,
                                      title: doc.file,
                                      badge:
                                        doc.documentType || "Document",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:text-white bg-indigo-50 hover:bg-[#2563EB] border border-indigo-200/80 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 shadow-2xs"
                                >
                                  <Eye size={12} />
                                  <span>View</span>
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-slate-400 italic text-xs">
                            No documents uploaded for this case
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Update Status ── */}
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Update Case Status
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <CheckCircle
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer bg-white shadow-2xs disabled:opacity-60"
                        value={selectedCase.status || ""}
                        disabled={updatingStatus}
                        onChange={(e) =>
                          handleStatusChange(
                            selectedCase.dbId,
                            e.target.value
                          )
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {updatingStatus && (
                      <span className="text-xs text-indigo-600 font-semibold animate-pulse">
                        Saving status…
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
        : null}

      {/* ── Document Viewer ── */}
      {selectedDoc && (
        <DocumentViewerModal
          fileUrl={selectedDoc.fileUrl}
          title={selectedDoc.title}
          badge={selectedDoc.badge}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}