"use client";

import { API_BASE_URL } from "@/utils/api";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import {
  Eye,
  Search,
  FileText,
  Calendar,
  X,
  User,
  Building2,
  Briefcase,
  Gavel,
  Lock,
  Upload,
  CheckCircle,
  ArrowLeft,
  Plus,
  Clock,
  Scale,
  Pencil,
  Trash2,
  Hash,
  Send,
  AlertCircle,
} from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { isSensitiveCase } from "@/utils/caseSensitivity";
import DocumentViewerModal from "@/components/common/DocumentViewerModal";

// ─── Status helpers ────────────────────────────────────────────────────────────
function getStatusBadgeStyle(status) {
  const s = String(status || "").trim();
  const lower = s.toLowerCase();
  if (lower.includes("won") || lower === "completed" || lower === "judgment delivered") {
    return { className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold", icon: <CheckCircle size={11} /> };
  }
  if (lower.includes("lost") || lower === "closed" || lower.includes("reject")) {
    return { className: "bg-rose-50 text-rose-700 border border-rose-200 font-extrabold", icon: <AlertCircle size={11} /> };
  }
  if (
    lower === "in progress" || lower === "hearing scheduled" || lower === "hearing completed" ||
    lower === "case preparation" || lower === "advocate assigned"
  ) {
    return { className: "bg-blue-50 text-blue-700 border border-blue-200 font-bold", icon: <Clock size={11} /> };
  }
  if (lower === "active" || lower === "document verified") {
    return { className: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold", icon: <CheckCircle size={11} /> };
  }
  if (
    lower === "under review" || lower === "awaiting judgment" || lower === "on hold" ||
    lower === "document pending" || lower === "client consulting" || lower === "client detail collection" ||
    lower === "document data collection" || lower === "court file" || lower === "pending"
  ) {
    return { className: "bg-amber-50 text-amber-700 border border-amber-200 font-bold", icon: <Clock size={11} /> };
  }
  return { className: "bg-slate-100 text-slate-700 border border-slate-200 font-bold", icon: <Clock size={11} /> };
}

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

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 w-full">
      <div className="mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-[#0F172A] mt-0.5 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Tab definitions (Parties merged into Overview) ───────────────────────────
const TABS = [
  { key: "overview", label: "Case Overview" },
  { key: "documents", label: "Case Documents" },
  { key: "hearings", label: "eCourts Hearings" },
  { key: "orders", label: "Orders & Judgments" },
  { key: "notes", label: "Advocate Notes" },
  { key: "billing", label: "Billing" },
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AssignedCaseDetailView({

  selectedCase,
  setSelectedCase,
  onClose,
  perms,
  getStatusSelectClass,
  getStatusBadgeClass,
  handleStatusChange,
  setCases,
}) {
  const router = useRouter();
  const [viewBriefModal, setViewBriefModal] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Document password/lock states
  const [docPasswordModal, setDocPasswordModal] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Appearance Modal state
  const [appearanceModal, setAppearanceModal] = useState(false);
  const [editingAppearanceIdx, setEditingAppearanceIdx] = useState(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);
  const [appearanceForm, setAppearanceForm] = useState({
    appearanceDate: new Date().toISOString().split("T")[0],
    advocateName: "",
    courtBench: "",
    stage: "Hearing / Arguments",
    summary: "",
    nextDate: "",
  });

  // eCourts state
  const [ecourtsData, setEcourtsData] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // Notes state
  const [caseNotes, setCaseNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("Action Item");
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  // Billing state
  const [caseInvoices, setCaseInvoices] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);

  const loggedInUser = getLoggedInUser();
  const isJuniorAdvocate =
    loggedInUser && loggedInUser.role && loggedInUser.role.toLowerCase().includes("junior");

  // Resolve case title reliably
  const caseDisplayTitle =
    selectedCase?.title ||
    selectedCase?.caseTitle ||
    selectedCase?.case_title ||
    (selectedCase?.caseNo ? `Case #${selectedCase.caseNo}` : "Assigned Case");

  // ─── eCourts fetch ────────────────────────────────────────────────────────────
  const fetchECourtsData = async () => {
    try {
      const cnr = selectedCase?.cnr_number || selectedCase?.caseNo;
      if (!cnr) return;
      setSyncLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/ecourts/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnrNumber: cnr }),
      });
      if (res.ok) {
        const data = await res.json();
        setEcourtsData(data);
      }
    } catch (err) {
      console.error("eCourts fetch error:", err);
    } finally {
      setSyncLoading(false);
    }
  };

  // ─── Notes fetch/CRUD ─────────────────────────────────────────────────────────
  const fetchCaseNotes = async () => {
    const caseId = selectedCase?.case_id || selectedCase?.caseId;
    if (!caseId) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${caseId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setCaseNotes(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch case notes:", e);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    const caseId = selectedCase?.case_id || selectedCase?.caseId;
    if (!caseId) {
      alert("Cannot save note: parent case ID not available for this assignment.");
      return;
    }
    setNoteSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNoteText.trim(),
          category: newNoteCategory,
          author: loggedInUser?.fullName || loggedInUser?.full_name || loggedInUser?.username || "Junior Advocate",
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCaseNotes((prev) => [saved, ...prev]);
        setNewNoteText("");
      }
    } catch (e) {
      console.error("Failed to save note:", e);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    const caseId = selectedCase?.case_id || selectedCase?.caseId;
    if (!caseId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${caseId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCaseNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  };

  // ─── Billing fetch ────────────────────────────────────────────────────────────
  const fetchCaseInvoices = async () => {
    const caseNo = (selectedCase?.caseNo || "").trim().toLowerCase();
    if (!caseNo) return;
    setFeeLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finance/invoices`);
      if (res.ok) {
        const data = await res.json();
        const matched = (Array.isArray(data) ? data : []).filter((inv) => {
          const invCase = (inv.case_number || "").trim().toLowerCase();
          return invCase !== "" && invCase === caseNo;
        });
        setCaseInvoices(matched);
      }
    } catch (e) {
      console.error("Failed to fetch invoices:", e);
    } finally {
      setFeeLoading(false);
    }
  };

  // ─── Initial data load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCase?.id) {
      fetchECourtsData();
      fetchCaseNotes();
      fetchCaseInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCase?.id]);

  // ─── Billing computed ─────────────────────────────────────────────────────────
  const totalBilled = caseInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const totalPaid = caseInvoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const totalPending = caseInvoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const paymentStatus =
    caseInvoices.length === 0
      ? "No Invoices"
      : totalPending === 0
        ? "Fully Paid"
        : totalPaid > 0
          ? "Partially Paid"
          : "Payment Due";

  // ─── Document helpers ─────────────────────────────────────────────────────────
  const getVisibleDocs = (docs = []) => {
    if (!isJuniorAdvocate) return docs;
    return docs.filter((d) => d.password && d.password.trim().length > 0);
  };
  const visibleDocs = getVisibleDocs(selectedCase?.documents || []);

  const caseAllowsUpload = (caseItem) => {
    if (!caseItem || !caseItem.documents) return false;
    return caseItem.documents.some((d) => d.upload === true);
  };

  const handleViewDocument = (doc) => {
    let rawUrl = doc.fileUrl || doc.file_url || doc.url || "";
    let fileTitle = doc.file || doc.documentType || "Assigned Document";
    if (rawUrl.startsWith("data:") || rawUrl.length > 500) {
      try {
        const parts = rawUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        const blob = new Blob([u8arr], { type: mimeType });
        setSelectedDoc({ fileUrl: URL.createObjectURL(blob), title: fileTitle, badge: doc.documentType || "Document" });
        return;
      } catch (e) { console.error("Failed to parse base64 for preview:", e); }
    }
    let normalized = rawUrl;
    if (typeof window !== "undefined") {
      if (window.location.hostname === "127.0.0.1") {
        normalized = rawUrl.replace("localhost:8000", "127.0.0.1:8000");
      } else {
        normalized = rawUrl.replace("127.0.0.1:8000", "localhost:8000");
      }
    }
    setSelectedDoc({ fileUrl: normalized, title: fileTitle, badge: doc.documentType || "Document" });
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedCase) return;
    setUploadLoading(true);
    setUploadSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases/upload-document`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload document file");
      const uploadData = await uploadRes.json();
      const newDocObj = { file: file.name, documentType: "Uploaded File", upload: true, fileUrl: uploadData.file_url };
      const updatedDocs = [...(selectedCase.documents || []), newDocObj];
      const saveRes = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_documents: updatedDocs }),
      });
      if (!saveRes.ok) throw new Error("Failed to save document to assigned case");
      setSelectedCase((prev) => ({ ...prev, documents: updatedDocs }));
      setCases((prevCases) => prevCases.map((c) => c.id === selectedCase.id ? { ...c, documents: updatedDocs } : c));
      setUploadSuccess(true);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading document. Please try again.");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Appearance handlers ──────────────────────────────────────────────────────
  const handleOpenCreateAppearance = () => {
    const user = getLoggedInUser();
    setEditingAppearanceIdx(null);
    setAppearanceForm({
      appearanceDate: new Date().toISOString().split("T")[0],
      advocateName: user?.full_name || user?.username || selectedCase?.advocate_name || "",
      courtBench: selectedCase?.court || "",
      stage: "Hearing / Arguments",
      summary: "",
      nextDate: "",
    });
    setAppearanceModal(true);
  };

  const handleOpenEditAppearance = (app, idx) => {
    setEditingAppearanceIdx(idx);
    setAppearanceForm({
      appearanceDate: app.appearanceDate || new Date().toISOString().split("T")[0],
      advocateName: app.advocateName || "",
      courtBench: app.courtBench || "",
      stage: app.stage || "Hearing / Arguments",
      summary: app.summary || "",
      nextDate: app.nextDate || "",
    });
    setAppearanceModal(true);
  };

  const handleSaveAppearance = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    setAppearanceLoading(true);
    const isEdit = editingAppearanceIdx !== null;
    const endpoint = isEdit
      ? `${API_BASE_URL}/lawfirm-management/assigned-cases/${selectedCase.id}/appearances/${editingAppearanceIdx}`
      : `${API_BASE_URL}/lawfirm-management/assigned-cases/${selectedCase.id}/appearances`;
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(appearanceForm) });
      if (!res.ok) throw new Error("Failed to save court appearance");
      const updatedCase = await res.json();
      const newAppearances = updatedCase.appearances || [];
      const updatedHearing = updatedCase.due_date || selectedCase.hearing;
      setSelectedCase((prev) => ({ ...prev, appearances: newAppearances, hearing: updatedHearing }));
      setCases((prevCases) =>
        prevCases.map((c) => c.id === selectedCase.id ? { ...c, appearances: newAppearances, hearing: updatedHearing } : c)
      );
      setAppearanceModal(false);
      setEditingAppearanceIdx(null);
    } catch (err) {
      console.error("Error saving appearance:", err);
      alert("Error saving court appearance.");
    } finally {
      setAppearanceLoading(false);
    }
  };

  const handleDeleteAppearance = async (idx) => {
    if (!selectedCase || !window.confirm("Are you sure you want to delete this appearance entry?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/lawfirm-management/assigned-cases/${selectedCase.id}/appearances/${idx}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete appearance entry");
      const updatedCase = await res.json();
      const newAppearances = updatedCase.appearances || [];
      setSelectedCase((prev) => ({ ...prev, appearances: newAppearances }));
      setCases((prevCases) =>
        prevCases.map((c) => c.id === selectedCase.id ? { ...c, appearances: newAppearances } : c)
      );
    } catch (err) {
      console.error("Error deleting appearance:", err);
      alert("Failed to delete court appearance entry.");
    }
  };

  if (!selectedCase) return null;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-full min-w-0 mx-auto pb-6 sm:pb-10 animate-in fade-in duration-200 overflow-hidden">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden w-full max-w-full min-w-0">

        {/* ── Case Header ──────────────────────────────────────────────────────── */}
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white w-full max-w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 w-full">
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded-xl font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer text-xs sm:text-sm shadow-xs shrink-0"
              title="Back to Assigned Cases"
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>Back</span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="bg-blue-50 text-[#2563EB] p-1.5 sm:p-2 rounded-xl border border-blue-100 shadow-xs shrink-0">
                  <Gavel size={18} className="sm:w-[20px] sm:h-[20px]" />
                </span>
                <h1 className="text-[#0F172A] font-extrabold text-base sm:text-xl md:text-2xl tracking-tight break-words min-w-0">
                  {caseDisplayTitle}
                </h1>
              </div>
              <div className="text-[11px] sm:text-xs text-[#64748B] font-semibold uppercase tracking-wider mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="bg-slate-100 text-slate-700 px-2 sm:px-2.5 py-0.5 rounded-md">
                  Case #{selectedCase.caseNo || selectedCase.case_no || "N/A"}
                </span>
                <span>•</span>
                <span className="bg-blue-50 text-blue-700 px-2 sm:px-2.5 py-0.5 rounded-md font-mono">
                  ID: #{selectedCase.id}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Bar - View Summary & View Similar Cases */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
            <button
              id="btn-view-summary-assigned"
              onClick={() => {
                try {
                  const targetId = selectedCase.caseId || selectedCase.case_id || selectedCase.id;
                  const saved = JSON.parse(localStorage.getItem(`saved_briefs_${targetId}`) || "[]");
                  if (saved && saved.length > 0) {
                    setViewBriefModal(saved[0]);
                  } else {
                    router.push(`/case-management/similar-cases/${targetId}`);
                  }
                } catch (e) {
                  const targetId = selectedCase.caseId || selectedCase.case_id || selectedCase.id;
                  router.push(`/case-management/similar-cases/${targetId}`);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow active:scale-95 cursor-pointer text-center min-w-0"
            >
              <Eye size={14} className="shrink-0" />
              <span className="truncate">View Summary</span>
            </button>

            <button
              id="btn-similar-cases-assigned"
              onClick={() => {
                const targetId = selectedCase.caseId || selectedCase.case_id || selectedCase.id;
                router.push(`/case-management/similar-cases/${targetId}`);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white text-xs font-extrabold transition shadow-xs hover:shadow active:scale-95 cursor-pointer text-center min-w-0"
            >
              <Search size={14} className="shrink-0" />
              <span className="truncate">View Similar Cases</span>
            </button>
          </div>
        </div>

        {/* ── Tab Bar Navigation ────────────────────────────────────────────────── */}
        <div className="border-b border-[#F1F5F9] bg-[#F8FAFC] p-3 sm:p-4 w-full max-w-full min-w-0">

          {/* Mobile & Tablet Dropdown Selector (Visible on < 1024px) */}
          <div className="block lg:hidden w-full min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Active Section ({TABS.findIndex(t => t.key === activeTab) + 1}/6):
              </label>
              <span className="text-[11px] font-extrabold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 truncate">
                {TABS.find(t => t.key === activeTab)?.label}
              </span>
            </div>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-xs cursor-pointer"
            >
              <option value="overview"> Case Overview</option>
              <option value="documents"> Case Documents ({visibleDocs.length})</option>
              <option value="hearings"> eCourts Hearings</option>
              <option value="orders"> Orders &amp; Judgments</option>
              <option value="notes">Advocate Notes ({caseNotes.length})</option>
              <option value="billing"> Fee &amp; Billing</option>
            </select>
          </div>

          {/* Desktop & Large Screen Tab Pills Strip (Visible on >= 1024px) */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto scroll-smooth w-full min-w-0 pb-1 scrollbar-thin scrollbar-thumb-slate-200">
            {TABS.map((tabObj) => (
              <button
                key={tabObj.key}
                onClick={() => setActiveTab(tabObj.key)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer rounded-xl whitespace-nowrap shrink-0 ${activeTab === tabObj.key
                    ? "text-[#2563EB] bg-white shadow-xs font-extrabold border border-slate-300"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/60"
                  }`}
              >
                {tabObj.label}
                {tabObj.key === "documents" && visibleDocs.length > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-black inline-block ${activeTab === "documents" ? "bg-blue-100 text-[#2563EB]" : "bg-slate-200 text-slate-600"}`}>
                    {visibleDocs.length}
                  </span>
                )}
                {tabObj.key === "notes" && caseNotes.length > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-black inline-block ${activeTab === "notes" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"}`}>
                    {caseNotes.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────────────── */}
        <div className="p-3.5 sm:p-5 md:p-8 w-full max-w-full min-w-0">

          {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0">

              {/* Standby advocate alert */}
              {(() => {
                const normUser = (loggedInUser?.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const normSec = (selectedCase.secondaryAdvocate || selectedCase.secondary_advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                const isStandby = normSec && (normSec === normUser || normUser.includes(normSec) || normSec.includes(normUser));
                if (!isStandby) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-amber-900 shadow-xs w-full max-w-full min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-lg sm:text-xl font-bold">🛡️</div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">You are assigned as Standby / Backup Advocate</h4>
                      <p className="text-xs text-amber-800 font-medium mt-0.5 leading-snug">
                        Primary Counsel: <span className="font-bold">{selectedCase.primaryAdvocate || selectedCase.advocate_name || "N/A"}</span>. Full proxy access to manage hearings, log appearances, and view records.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Status row + update dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                  <StatusBadge status={selectedCase.status} />
                  <span className="text-xs text-[#94A3B8] font-semibold tracking-wide uppercase">
                    {selectedCase.court || ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Update Status:</label>
                  <select
                    value={selectedCase.status || "Active"}
                    onChange={(e) => {
                      if (handleStatusChange && selectedCase.id) {
                        handleStatusChange(selectedCase.id, e.target.value);
                      }
                    }}
                    className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition cursor-pointer shadow-xs max-w-[200px] sm:max-w-none"
                  >
                    {[
                      "Active", "Client Consulting", "Client Detail Collection", "Document Data Collection",
                      "Document Pending", "Document Verified", "Advocate Assigned", "Under Review", "Case Preparation",
                      "Court File", "In Progress", "Hearing Scheduled", "Hearing Completed", "Awaiting Judgment",
                      "Judgment Delivered", "Won", "Lost", "On Hold", "Closed", "Disposed",
                    ].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full min-w-0">
                {/* Case Details */}
                <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4 min-w-0 w-full">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Case Details</h4>
                  <InfoRow icon={<Hash size={14} />} label="Case Number" value={selectedCase.caseNo} />
                  <InfoRow icon={<Hash size={14} />} label="Assignment ID" value={`#${selectedCase.id}`} />
                  <InfoRow icon={<Scale size={14} />} label="Practice Area" value={selectedCase.practiceArea || selectedCase.practice_area} />
                </div>

                {/* Court Information */}
                <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4 min-w-0 w-full">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Court Information</h4>
                  <InfoRow icon={<Building2 size={14} />} label="Court / Forum" value={selectedCase.court} />
                  <InfoRow icon={<Calendar size={14} />} label="Next Hearing Date" value={selectedCase.hearing || "To be scheduled"} />
                </div>
              </div>

              {/* Parties & Legal Representatives (Integrated directly into Case Overview) */}
              <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4 w-full max-w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-[#0F172A]">Parties &amp; Legal Representatives</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">Petitioner, respondent, opposing counsel, and bench officer.</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 self-start sm:self-auto shrink-0">
                    Case #{selectedCase.caseNo || selectedCase.case_no || "N/A"}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full max-w-full min-w-0">
                  {/* Petitioner Side */}
                  <div className="bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] rounded-2xl p-4 sm:p-5 border border-[#BAE6FD] space-y-3.5 shadow-xs relative overflow-hidden w-full max-w-full min-w-0">
                    <div className="absolute top-0 right-0 bg-[#0284C7] text-white text-[9px] sm:text-[10px] font-black uppercase px-2.5 sm:px-3 py-1 rounded-bl-xl tracking-wider">
                      Petitioner Side
                    </div>
                    <div className="flex items-center gap-3 mb-1 pr-20 sm:pr-24 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center font-bold shrink-0">
                        <User size={18} className="sm:w-[20px] sm:h-[20px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wider">Client / Petitioner</p>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                          {isJuniorAdvocate && isSensitiveCase(selectedCase) ? "Confidential" : (selectedCase.client || ecourtsData?.petitioner || "Petitioner")}
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-2.5 pt-2.5 border-t border-[#B9E6FE]">
                      <div className="bg-white/80 rounded-xl p-3 border border-sky-100">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Petitioner Advocate / Legal Counsel</p>
                        <p className="text-xs font-bold text-[#0284C7] mt-0.5 break-words">
                          {ecourtsData?.petitionerAdvocate || selectedCase.primaryAdvocate || selectedCase.advocate_name || "Advocate (On Record)"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Respondent Side */}
                  <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] rounded-2xl p-4 sm:p-5 border border-[#FDBA74] space-y-3.5 shadow-xs relative overflow-hidden w-full max-w-full min-w-0">
                    <div className="absolute top-0 right-0 bg-[#EA580C] text-white text-[9px] sm:text-[10px] font-black uppercase px-2.5 sm:px-3 py-1 rounded-bl-xl tracking-wider">
                      Respondent Side
                    </div>
                    <div className="flex items-center gap-3 mb-1 pr-20 sm:pr-24 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-bold shrink-0">
                        <User size={18} className="sm:w-[20px] sm:h-[20px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[#C2410C] uppercase tracking-wider">Respondent / Opposing Party</p>
                        <h4 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                          {ecourtsData?.respondent || (selectedCase.title ? selectedCase.title.split(/ vs\.? | v\.? /i)[1] : "") || "State / Respondent"}
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-2.5 pt-2.5 border-t border-[#FED7AA]">
                      <div className="bg-white/80 rounded-xl p-3 border border-orange-100">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Respondent Advocate / Opposing Counsel</p>
                        <p className="text-xs font-bold text-[#C2410C] mt-0.5 break-words">
                          {ecourtsData?.respondentAdvocate || "Government Pleader / Opposing Counsel"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Presiding Judicial Officer */}
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                      <Gavel size={18} className="sm:w-[20px] sm:h-[20px]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Presiding Judicial Officer</p>
                      <h5 className="text-xs sm:text-sm font-extrabold text-[#0F172A]">
                        {ecourtsData?.presidingJudge || "Hon'ble Presiding Judge"}
                      </h5>
                      <p className="text-xs text-[#64748B] mt-0.5">{selectedCase.court}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client & Counsel Summary */}
              <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4 w-full max-w-full min-w-0">
                <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Assigned Advocates Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
                  <InfoRow
                    icon={<User size={14} />}
                    label="Client Name"
                    value={isJuniorAdvocate && isSensitiveCase(selectedCase) ? "Confidential (Restricted)" : selectedCase.client}
                  />
                  <InfoRow
                    icon={<Briefcase size={14} />}
                    label="Primary Advocate"
                    value={selectedCase.primaryAdvocate || selectedCase.advocate_name}
                  />
                  <InfoRow
                    icon={<Briefcase size={14} />}
                    label="Standby Advocate"
                    value={selectedCase.secondaryAdvocate || selectedCase.secondary_advocate_name || "None"}
                  />
                </div>
              </div>

              {/* Assignment / Strategy Notes */}
              {selectedCase.notes && (
                <div className="border-l-4 border-amber-400 bg-amber-50/50 p-4 sm:p-5 rounded-r-2xl border-y border-r border-amber-200/60 shadow-xs w-full max-w-full min-w-0">
                  <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText size={13} /> Case Strategy &amp; Advocate Notes
                  </h4>
                  <p className="text-[#334155] text-xs sm:text-sm font-medium leading-relaxed italic break-words w-full">
                    &quot;{selectedCase.notes}&quot;
                  </p>
                </div>
              )}

              {/* ── Saved AI Strategic Briefs History ──────────────────── */}
              {(() => {
                try {
                  const targetId = selectedCase.caseId || selectedCase.case_id || selectedCase.id;
                  const savedBriefs = JSON.parse(localStorage.getItem(`saved_briefs_${targetId}`) || "[]");
                  if (!savedBriefs || savedBriefs.length === 0) return null;

                  return (
                    <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/70 to-blue-50/70 rounded-2xl p-4 sm:p-5 border border-indigo-200/80 space-y-3 w-full max-w-full min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={14} className="text-indigo-600" />
                          Downloaded AI Strategic Briefs ({savedBriefs.length})
                        </h5>
                        <span className="text-[10px] font-bold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                          Saved in History
                        </span>
                      </div>
                      <div className="space-y-2">
                        {savedBriefs.slice(0, 5).map((brief, bIdx) => (
                          <div key={bIdx} className="bg-white rounded-xl p-3.5 border border-indigo-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 truncate">📜 {brief.fileName}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Downloaded: <span className="font-semibold text-slate-700">{brief.downloadedAt}</span> · Win Likelihood: <span className="font-extrabold text-emerald-600">{brief.winProbability}%</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => setViewBriefModal(brief)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye size={13} /> View Summary
                              </button>
                              <button
                                onClick={() => {
                                  const element = document.createElement("a");
                                  const file = new Blob([brief.fileContent], { type: "text/plain;charset=utf-8" });
                                  element.href = URL.createObjectURL(file);
                                  element.download = brief.fileName;
                                  document.body.appendChild(element);
                                  element.click();
                                  document.body.removeChild(element);
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Upload size={13} /> Download File
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })()}
            </div>
          )}

          {/* ══ DOCUMENTS ══════════════════════════════════════════════════════ */}
          {activeTab === "documents" && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 w-full max-w-full min-w-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A]">Assigned Documents</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">View or upload documents shared for this case.</p>
                </div>
                {caseAllowsUpload(selectedCase) && (
                  <div className="shrink-0 self-start sm:self-auto">
                    <input ref={fileInputRef} type="file" className="hidden" id="doc-upload-input" onChange={handleUploadFile} />
                    <label
                      htmlFor="doc-upload-input"
                      className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs ${uploadLoading ? "bg-[#E2E8F0] text-[#94A3B8]" : "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                        }`}
                    >
                      <Upload size={14} />
                      {uploadLoading ? "Uploading..." : "Upload Document"}
                    </label>
                  </div>
                )}
              </div>

              {uploadSuccess && (
                <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 w-full max-w-full min-w-0">
                  <CheckCircle size={18} className="text-green-600 shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-green-800">Document uploaded successfully!</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full max-w-full min-w-0">
                {visibleDocs.length === 0 ? (
                  <div className="col-span-full text-center py-10 sm:py-14 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3 w-full max-w-full min-w-0">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <FileText size={24} />
                    </div>
                    <div className="w-full max-w-full min-w-0 px-2">
                      <p className="text-slate-700 font-bold text-sm">No documents found</p>
                      <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-full mx-auto break-words leading-relaxed">
                        {isJuniorAdvocate
                          ? "No PIN-protected documents have been shared with you yet."
                          : "No documents attached to this case assignment."}
                      </p>
                    </div>
                  </div>
                ) : (
                  visibleDocs.map((doc, idx) => {
                    const isSelected = selectedDocument?.file === doc.file;
                    const isLocked = doc.password && doc.password.trim().length > 0;
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 sm:gap-4 w-full max-w-full min-w-0 ${isLocked
                            ? "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                            : isSelected
                              ? "bg-blue-50/60 border-blue-200 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {isLocked ? (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0 shadow-xs">
                              <Lock size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </div>
                          ) : (
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${isSelected ? "bg-blue-100 border-blue-200 text-[#2563EB]" : "bg-slate-100 border-slate-200 text-[#64748B]"}`}>
                              <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold truncate text-[#0F172A]">{doc.file}</p>
                            <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5 truncate">{doc.documentType}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (isLocked) {
                              setDocPasswordModal({ doc, callback: () => handleViewDocument(doc) });
                              setPasswordInput("");
                              setPasswordError("");
                            } else {
                              handleViewDocument(doc);
                            }
                          }}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${isLocked
                              ? "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE]"
                              : isSelected
                                ? "bg-[#2563EB] text-white shadow-xs hover:bg-blue-700"
                                : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                            }`}
                        >
                          {isLocked ? "Unlock & View" : "View"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ══ ECOURTS HEARINGS ════════════════════════════════════════════════ */}
          {activeTab === "hearings" && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-full min-w-0">
              {/* Header banner with action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full max-w-full min-w-0">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-blue-900">eCourts Hearing Timeline</h4>
                  <p className="text-[11px] sm:text-xs text-blue-700 mt-0.5 truncate">
                    Case #{selectedCase.caseNo || selectedCase.case_no} • Next Hearing: {selectedCase.hearing || "To be scheduled"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                  <button
                    onClick={fetchECourtsData}
                    disabled={syncLoading}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex-1 sm:flex-none text-center"
                  >
                    {syncLoading ? "Syncing..." : "Sync eCourts"}
                  </button>
                  <button
                    onClick={handleOpenCreateAppearance}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex-1 sm:flex-none"
                  >
                    <Plus size={14} />
                    <span>Log Appearance</span>
                  </button>
                </div>
              </div>

              {/* Logged appearances as timeline */}
              {(selectedCase.appearances || []).length > 0 ? (
                <div className="relative pl-6 sm:pl-8 space-y-4 sm:space-y-6 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 w-full max-w-full min-w-0">
                  {(selectedCase.appearances || []).map((item, idx) => (
                    <div key={idx} className="relative w-full max-w-full min-w-0">
                      <span className="absolute -left-[23px] sm:-left-[29px] top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center text-[10px] sm:text-xs font-bold text-blue-600">
                        {idx + 1}
                      </span>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs w-full max-w-full min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 self-start">
                            {item.stage || "Hearing"}
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold text-slate-500">{item.appearanceDate}</span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900">{item.courtBench || selectedCase.court}</h5>
                        {item.summary && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words w-full">&quot;{item.summary}&quot;</p>
                        )}
                        {item.nextDate && (
                          <p className="text-[11px] font-semibold text-blue-600 mt-2 flex items-center gap-1">
                            <Clock size={11} /> Next Hearing Date Fixed: {item.nextDate}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <User size={11} /> {item.advocateName || "Advocate"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ecourtsData?.timeline && ecourtsData.timeline.length > 0 ? (
                <div className="relative pl-6 sm:pl-8 space-y-4 sm:space-y-6 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 w-full max-w-full min-w-0">
                  {ecourtsData.timeline.map((item, idx) => (
                    <div key={idx} className="relative w-full max-w-full min-w-0">
                      <span className={`absolute -left-[23px] sm:-left-[29px] top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 bg-white flex items-center justify-center text-[10px] sm:text-xs font-bold ${item.status === "Completed" ? "border-emerald-500 text-emerald-600" : "border-blue-500 text-blue-600 animate-pulse"}`}>
                        {idx + 1}
                      </span>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs w-full max-w-full min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 self-start">{item.eventStage}</span>
                          <span className="text-[11px] sm:text-xs font-bold text-slate-500">{item.eventDate}</span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 mt-2">{item.title}</h5>
                        <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                        {item.benchName && <p className="text-[11px] font-semibold text-slate-400 mt-2">Bench: {item.benchName} ({item.courtHall})</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3 w-full max-w-full min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-400">
                    <Scale size={20} className="sm:w-[22px] sm:h-[22px]" />
                  </div>
                  <p className="text-slate-500 text-xs font-medium">
                    No hearing timeline data yet. Log court appearances to build the timeline, or sync with eCourts.
                  </p>
                </div>
              )}

              {/* Quick log footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 w-full max-w-full min-w-0">
                <p className="text-xs text-slate-500 font-medium">
                  {(selectedCase.appearances || []).length} court appearance{(selectedCase.appearances || []).length !== 1 ? "s" : ""} logged
                </p>
                <button
                  onClick={handleOpenCreateAppearance}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Plus size={13} /> Log Appearance
                </button>
              </div>
            </div>
          )}

          {/* ══ ORDERS & JUDGMENTS ══════════════════════════════════════════════ */}
          {activeTab === "orders" && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-full min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                Official Court Orders &amp; Judgment Documents
              </h4>
              {ecourtsData?.orders && ecourtsData.orders.length > 0 ? (
                <div className="w-full max-w-full overflow-x-auto min-w-0 border border-slate-200 rounded-xl">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Order Date</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Presiding Judge</th>
                        <th className="py-3 px-4">Order Summary</th>
                        <th className="py-3 px-4 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {ecourtsData.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{ord.orderDate}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">{ord.orderType}</span>
                          </td>
                          <td className="py-3 px-4">{ord.judgeName}</td>
                          <td className="py-3 px-4">{ord.summary}</td>
                          <td className="py-3 px-4 text-right">
                            {ord.fileUrl ? (
                              <a href={ord.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 transition cursor-pointer">
                                PDF ({ord.fileSize})
                              </a>
                            ) : (
                              <span className="text-slate-400 font-semibold">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 sm:p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3 w-full max-w-full min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto">
                    <Gavel size={22} className="text-purple-400" />
                  </div>
                  <p className="text-slate-500 text-xs sm:text-sm font-semibold">No court orders available yet</p>
                  <p className="text-slate-400 text-xs">Sync with eCourts to fetch official orders and judgments.</p>
                </div>
              )}
            </div>
          )}

          {/* ══ ADVOCATE NOTES ══════════════════════════════════════════════════ */}
          {activeTab === "notes" && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9] w-full max-w-full min-w-0">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A]">Advocate Notes &amp; Internal Tasks</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Private internal case notes and action items for advocates.</p>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 self-start sm:self-auto shrink-0">
                  {caseNotes.length} Note{caseNotes.length !== 1 ? "s" : ""} Recorded
                </span>
              </div>

              {/* Add note form */}
              <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] space-y-3.5 sm:space-y-4 w-full max-w-full min-w-0">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                  <Pencil size={14} className="text-[#2563EB]" /> Add Internal Case Note
                </h4>
                <textarea
                  placeholder="Type internal case instructions, task details, or hearing preparation notes..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full max-w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-3.5 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition resize-y min-h-[85px]"
                />
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold text-[#64748B] shrink-0">Priority / Tag:</label>
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value)}
                      className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] flex-1 sm:flex-none"
                    >
                      <option value="Action Item">🔴 Urgent / Action Item</option>
                      <option value="Hearing Prep">🟡 Hearing Prep</option>
                      <option value="Client Call">🟢 Client Call</option>
                      <option value="General Note">🔵 General Note</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteText.trim() || noteSaving}
                    className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs w-full sm:w-auto shrink-0"
                  >
                    <Send size={13} /> {noteSaving ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>

              {/* Notes feed */}
              <div className="space-y-3 w-full max-w-full min-w-0">
                {notesLoading ? (
                  <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium animate-pulse">
                    Loading advocate notes…
                  </div>
                ) : caseNotes.length > 0 ? (
                  caseNotes.map((note) => {
                    const formattedDate = note.created_at
                      ? new Date(note.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : note.date || "—";
                    return (
                      <div key={note.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs space-y-2 relative group hover:border-blue-200 transition w-full max-w-full min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${note.category === "Action Item" ? "bg-rose-50 text-rose-700 border-rose-200"
                                : note.category === "Hearing Prep" ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : note.category === "Client Call" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                              {note.category}
                            </span>
                            <span className="text-[11px] text-[#94A3B8] font-semibold">{formattedDate}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-slate-400 hover:text-red-600 transition cursor-pointer p-1 rounded-lg hover:bg-red-50 shrink-0"
                            title="Delete note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-[#334155] leading-relaxed whitespace-pre-wrap break-words w-full max-w-full">{note.text}</p>
                        <p className="text-[11px] text-[#64748B] font-medium pt-1 border-t border-slate-100 flex items-center gap-1">
                          <User size={11} /> Logged by: <span className="font-bold text-[#0F172A]">{note.author || "Advocate"}</span>
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium w-full max-w-full min-w-0">
                    No advocate notes logged yet for this case. Use the box above to record task notes!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ BILLING ══════════════════════════════════════════════════════════ */}
          {activeTab === "billing" && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-full min-w-0">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9] w-full max-w-full min-w-0">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A]">Fee &amp; Billing Overview</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Billing data from Finance Management — invoices matched for case{" "}
                    <span className="font-bold text-[#0F172A]">{selectedCase.caseNo || selectedCase.case_no}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide border ${paymentStatus === "Fully Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : paymentStatus === "Partially Paid" ? "bg-amber-50 text-amber-700 border-amber-200"
                        : paymentStatus === "No Invoices" ? "bg-slate-50 text-slate-500 border-slate-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                    {paymentStatus === "Fully Paid" && "🟢 "}
                    {paymentStatus === "Partially Paid" && "🟡 "}
                    {paymentStatus === "Payment Due" && "🔴 "}
                    {paymentStatus === "No Invoices" && "⚪ "}
                    {paymentStatus}
                  </span>
                  <button
                    onClick={fetchCaseInvoices}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    {feeLoading ? "Refreshing..." : "↻ Refresh"}
                  </button>
                </div>
              </div>

              {feeLoading ? (
                <div className="p-8 sm:p-12 text-center text-slate-400 text-sm font-medium animate-pulse">Loading billing data…</div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5 w-full max-w-full min-w-0">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0">
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 sm:mb-2">Total Invoiced</p>
                      <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-900">₹{totalBilled.toLocaleString("en-IN")}</h4>
                      <p className="text-[11px] text-blue-600/80 font-medium mt-1.5 sm:mt-2">{caseInvoices.length} invoice{caseInvoices.length !== 1 ? "s" : ""} raised</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs min-w-0">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5 sm:mb-2">Amount Received</p>
                      <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-900">₹{totalPaid.toLocaleString("en-IN")}</h4>
                      <p className="text-[11px] text-emerald-600/80 font-medium mt-1.5 sm:mt-2">{caseInvoices.filter((inv) => inv.status === "Paid").length} paid invoice{caseInvoices.filter((inv) => inv.status === "Paid").length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs sm:col-span-2 md:col-span-1 min-w-0">
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5 sm:mb-2">Pending / Due</p>
                      <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-900">₹{totalPending.toLocaleString("en-IN")}</h4>
                      <p className="text-[11px] text-amber-600/80 font-medium mt-1.5 sm:mt-2">{caseInvoices.filter((inv) => inv.status !== "Paid").length} outstanding invoice{caseInvoices.filter((inv) => inv.status !== "Paid").length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  {/* Invoice table */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden w-full max-w-full min-w-0">
                    <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Invoice Records from Billing</h4>
                      <span className="text-xs font-bold text-slate-500">{caseInvoices.length} Invoice{caseInvoices.length !== 1 ? "s" : ""}</span>
                    </div>
                    {caseInvoices.length > 0 ? (
                      <div className="w-full max-w-full overflow-x-auto min-w-0">
                        <table className="w-full min-w-[650px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="px-4 sm:px-5 py-3">Invoice #</th>
                              <th className="px-4 sm:px-5 py-3">Date</th>
                              <th className="px-4 sm:px-5 py-3">Client</th>
                              <th className="px-4 sm:px-5 py-3">Payment Mode</th>
                              <th className="px-4 sm:px-5 py-3">Advocate Fee</th>
                              <th className="px-4 sm:px-5 py-3 text-right">Grand Total (₹)</th>
                              <th className="px-4 sm:px-5 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {caseInvoices.map((inv) => {
                              const createdDate = inv.created_at
                                ? new Date(inv.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                : "—";
                              const statusColor =
                                inv.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : inv.status === "Overdue" ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : inv.status === "Sent" ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200";
                              return (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                                  <td className="px-4 sm:px-5 py-3.5 font-bold text-blue-600">INV-{String(inv.id).padStart(4, "0")}</td>
                                  <td className="px-4 sm:px-5 py-3.5 text-slate-600 font-medium">{createdDate}</td>
                                  <td className="px-4 sm:px-5 py-3.5 text-slate-800 font-semibold">{inv.client_name || "—"}</td>
                                  <td className="px-4 sm:px-5 py-3.5 text-slate-600">{inv.payment_method || "—"}</td>
                                  <td className="px-4 sm:px-5 py-3.5 text-slate-700 font-semibold">
                                    {inv.advocate_fee_amount > 0 ? `₹${Number(inv.advocate_fee_amount).toLocaleString("en-IN")}` : "—"}
                                  </td>
                                  <td className="px-4 sm:px-5 py-3.5 text-right font-black text-slate-800">₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}</td>
                                  <td className="px-4 sm:px-5 py-3.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusColor}`}>{inv.status}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 sm:p-10 text-center bg-slate-50 w-full max-w-full min-w-0">
                        <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-1">No billing invoices found for this case</p>
                        <p className="text-slate-400 text-xs break-words">
                          Invoices with case number{" "}
                          <span className="font-bold text-slate-600">{selectedCase.caseNo || selectedCase.case_no}</span>{" "}
                          will appear here once created in Finance Management.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ─── Document Viewer Modal ─────────────────────────────────────────────── */}
      {selectedDoc && (
        <DocumentViewerModal
          fileUrl={selectedDoc.fileUrl}
          title={selectedDoc.title}
          badge={selectedDoc.badge}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* ─── Document PIN Prompt Modal ─────────────────────────────────────────── */}
      {docPasswordModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDocPasswordModal(null)} />
          <div className="relative bg-white rounded-2xl p-5 sm:p-6 max-w-xs sm:max-w-sm w-full shadow-2xl z-10 text-center space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto shadow-xs">
              <Lock size={22} className="text-[#2563EB] sm:w-[24px] sm:h-[24px]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">Enter Document PIN</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Please enter the 6-digit PIN set by the senior advocate to view this file.
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                value={passwordInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPasswordInput(val);
                  setPasswordError("");
                }}
                className="w-32 mx-auto rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-center text-base sm:text-lg font-mono tracking-[0.75em] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition block"
                autoFocus
              />
              {passwordError && <p className="text-xs text-red-500 font-semibold">{passwordError}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDocPasswordModal(null)}
                className="flex-1 py-2 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-xs hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (passwordInput === docPasswordModal.doc.password) {
                    docPasswordModal.callback();
                    setDocPasswordModal(null);
                  } else {
                    setPasswordError("Incorrect 6-digit PIN");
                  }
                }}
                disabled={passwordInput.length !== 6}
                className="flex-1 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Log Court Appearance Modal ───────────────────────────────────────── */}
      {appearanceModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAppearanceModal(false)} />
          <div className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <Scale size={18} className="sm:w-[20px] sm:h-[20px]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">
                    {editingAppearanceIdx !== null ? "Edit Court Appearance" : "Log Court Appearance"}
                  </h3>
                  <p className="text-xs text-[#64748B]">Record hearing details &amp; proceedings summary</p>
                </div>
              </div>
              <button
                onClick={() => setAppearanceModal(false)}
                className="p-1.5 text-[#64748B] hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAppearance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Appearance Date *</label>
                  <CustomDatePicker
                    selected={appearanceForm.appearanceDate}
                    onChange={(dateStr) => setAppearanceForm({ ...appearanceForm, appearanceDate: dateStr })}
                    minDate={new Date()}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Appeared Advocate *</label>
                  <input
                    type="text"
                    required
                    placeholder="Advocate Name"
                    value={appearanceForm.advocateName}
                    onChange={(e) => setAppearanceForm({ ...appearanceForm, advocateName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Court / Bench</label>
                  <input
                    type="text"
                    placeholder="e.g. High Court / Sub Court"
                    value={appearanceForm.courtBench}
                    onChange={(e) => setAppearanceForm({ ...appearanceForm, courtBench: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Stage of Proceeding</label>
                  <select
                    value={appearanceForm.stage}
                    onChange={(e) => setAppearanceForm({ ...appearanceForm, stage: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white cursor-pointer"
                  >
                    <option value="Hearing / Arguments">Hearing / Arguments</option>
                    <option value="Counter Affidavit">Counter Affidavit Filing</option>
                    <option value="Witness Examination">Witness Examination</option>
                    <option value="Motion / Interim Order">Motion / Interim Order</option>
                    <option value="Bail Application">Bail Application</option>
                    <option value="Final Hearing">Final Hearing / Judgment</option>
                    <option value="Adjourned">Adjourned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Proceedings Summary / Advocate Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter summary of proceedings, court orders, or instructions..."
                  value={appearanceForm.summary}
                  onChange={(e) => setAppearanceForm({ ...appearanceForm, summary: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Next Hearing Date (Updates Case Hearing)</label>
                <CustomDatePicker
                  selected={appearanceForm.nextDate}
                  onChange={(dateStr) => setAppearanceForm({ ...appearanceForm, nextDate: dateStr })}
                  minDate={appearanceForm.appearanceDate ? new Date(appearanceForm.appearanceDate + "T00:00:00") : new Date()}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAppearanceModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={appearanceLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {appearanceLoading ? "Saving..." : editingAppearanceIdx !== null ? "Update Appearance" : "Save Appearance"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── SAVED BRIEF READER MODAL PORTAL ──────────────── */}
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
                {viewBriefModal.fileContent || (
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-2">Winning Strategy Formula</h4>
                    <p className="mb-4 text-slate-700 font-sans">{viewBriefModal.winningFormula}</p>

                    <h4 className="font-extrabold text-amber-900 text-sm mb-2">Key Loopholes</h4>
                    <ul className="list-disc pl-5 mb-4 text-amber-800 font-sans">
                      {(viewBriefModal.keyLoopholes || []).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>

                    <h4 className="font-extrabold text-blue-900 text-sm mb-2">Main Statutory Arguments</h4>
                    <ul className="list-disc pl-5 mb-4 text-blue-800 font-sans">
                      {(viewBriefModal.mainArguments || []).map((a, i) => <li key={i}>{a}</li>)}
                    </ul>

                    <h4 className="font-extrabold text-emerald-900 text-sm mb-2">Important Acts & Sections</h4>
                    <p className="mb-4 text-slate-700 font-sans">{(viewBriefModal.importantActs || []).join(", ")}</p>

                    <h4 className="font-extrabold text-purple-900 text-sm mb-2">Senior Advocate Recommendation</h4>
                    <p className="text-slate-700 font-sans">{viewBriefModal.advocateRecommendation}</p>
                  </div>
                )}
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
          {/* ── SAVED BRIEF READER MODAL PORTAL ──────────────── */}
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
                {viewBriefModal.fileContent || (
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm mb-2">Winning Strategy Formula</h4>
                    <p className="mb-4 text-slate-700 font-sans">{viewBriefModal.winningFormula}</p>

                    <h4 className="font-extrabold text-amber-900 text-sm mb-2">Key Loopholes</h4>
                    <ul className="list-disc pl-5 mb-4 text-amber-800 font-sans">
                      {(viewBriefModal.keyLoopholes || []).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>

                    <h4 className="font-extrabold text-blue-900 text-sm mb-2">Main Statutory Arguments</h4>
                    <ul className="list-disc pl-5 mb-4 text-blue-800 font-sans">
                      {(viewBriefModal.mainArguments || []).map((a, i) => <li key={i}>{a}</li>)}
                    </ul>

                    <h4 className="font-extrabold text-emerald-900 text-sm mb-2">Important Acts & Sections</h4>
                    <p className="mb-4 text-slate-700 font-sans font-medium">{(viewBriefModal.importantActs || []).join(", ")}</p>

                    <h4 className="font-extrabold text-purple-900 text-sm mb-2">Senior Advocate Recommendation</h4>
                    <p className="text-slate-700 font-sans">{viewBriefModal.advocateRecommendation}</p>
                  </div>
                )}
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
    </div>
  );
}