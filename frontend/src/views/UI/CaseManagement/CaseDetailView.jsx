"use client";

import { API_BASE_URL } from "@/utils/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Scale,
  User,
  Building2,
  FileText,
  Phone,
  Mail,
  Hash,
  Gavel,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  EyeOff,
  Eye,
  Download,
  BookOpen,
  Search,
  Sparkles,
  Copy,
  Save,
  Bot,
  RefreshCw,
  FileCheck,
  Check,
  History,
} from "lucide-react";
import { usePermissions } from "@/utils/usePermissions";
import { getLoggedInUser } from "@/utils/auth";
import { isSensitiveCase } from "@/utils/caseSensitivity";
import SimilarCasesClient from "@/app/case-management/similar-cases/[id]/SimilarCasesClient";
import OCRPanel from "./OCRPanel";
import DocumentViewerModal from "@/components/common/DocumentViewerModal";

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

// Status badge helper
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

// Info row helper
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

export default function CaseDetailView({ id }) {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const loggedInUser = getLoggedInUser();
  const isJuniorAdvocate =
    loggedInUser &&
    loggedInUser.role &&
    loggedInUser.role.toLowerCase().includes("junior");

  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "documents"
  const [advocates, setAdvocates] = useState([]);
  const [assignedAdvocate, setAssignedAdvocate] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [showPasswordIdx, setShowPasswordIdx] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [viewBriefModal, setViewBriefModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  // Advocates already assigned to this specific case (via Lawfirm Management)
  const [caseAssignedAdvocates, setCaseAssignedAdvocates] = useState([]);
  // Per-document assignment state
  const [docAssignAdvocate, setDocAssignAdvocate] = useState("");
  const [docAssignLoading, setDocAssignLoading] = useState(false);
  const [docAssignedSet, setDocAssignedSet] = useState(new Set());
  const [docAssignModal, setDocAssignModal] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  const handleSaveOcrToCaseDocuments = async (extractedText, originalFilename, detectedDocType, digitizedHtml) => {
    if (!selectedCase || (!extractedText && !digitizedHtml)) return;
    try {
      const cleanName = (originalFilename || "Document").replace(/\.[^/.]+$/, "");
      let docName = "";
      let textBase64 = "";

      if (typeof extractedText === "string" && extractedText.startsWith("data:")) {
        const isPdf = extractedText.includes("pdf");
        const ext = isPdf ? "pdf" : "png";
        docName = `Scanned_${cleanName.replace(/[^a-zA-Z0-9_]/g, "_")}.${ext}`;
        textBase64 = extractedText;
      } else {
        const contentToSave = digitizedHtml || extractedText;
        const ext = digitizedHtml ? "html" : "txt";
        const mime = digitizedHtml ? "text/html" : "text/plain";
        docName = `OCR_${cleanName.replace(/[^a-zA-Z0-9_]/g, "_")}.${ext}`;
        textBase64 = `data:${mime};charset=utf-8;base64,${btoa(unescape(encodeURIComponent(contentToSave)))}`;
      }

      const newDocObj = {
        documentType: detectedDocType || "Scanned Document",
        advocate: getLoggedInUser()?.username || selectedCase.selected_advocate || "Advocate",
        file: docName,
        url: textBase64,
        password: ""
      };

      const updatedDocuments = [...(selectedCase.documents || []), newDocObj];

      const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCase.case_id,
          cnrNumber: selectedCase.cnr_number,
          caseTitle: selectedCase.case_title,
          caseNo: selectedCase.case_no,
          caseType: selectedCase.case_type,
          caseDes: selectedCase.case_description,
          clientName: selectedCase.client_name,
          contactNumber: selectedCase.contact_number,
          emailId: selectedCase.email_id,
          courtName: selectedCase.court_name,
          courtType: selectedCase.court_type,
          status: selectedCase.status,
          selectedAdvocate: selectedCase.selected_advocate,
          documents: updatedDocuments,
          nextHearingDate: selectedCase.next_hearing_date
        })
      });

      if (!res.ok) throw new Error("Failed to save OCR document to case files.");

      setSelectedCase(prev => ({
        ...prev,
        documents: updatedDocuments
      }));
    } catch (err) {
      console.error("Save OCR Document error:", err);
      alert(err.message || "Failed to save OCR document.");
    }
  };

  const handleDeleteCaseDocument = async (docIndex) => {
    if (!selectedCase || !selectedCase.documents) return;
    const docToDelete = selectedCase.documents[docIndex];
    if (!window.confirm(`Are you sure you want to delete "${docToDelete?.file || "this document"}"?`)) return;

    try {
      const updatedDocuments = selectedCase.documents.filter((_, i) => i !== docIndex);

      const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCase.case_id,
          cnrNumber: selectedCase.cnr_number,
          caseTitle: selectedCase.case_title,
          caseNo: selectedCase.case_no,
          caseType: selectedCase.case_type,
          caseDes: selectedCase.case_description,
          clientName: selectedCase.client_name,
          contactNumber: selectedCase.contact_number,
          emailId: selectedCase.email_id,
          courtName: selectedCase.court_name,
          courtType: selectedCase.court_type,
          status: selectedCase.status,
          selectedAdvocate: selectedCase.selected_advocate,
          documents: updatedDocuments,
          nextHearingDate: selectedCase.next_hearing_date
        })
      });

      if (!res.ok) throw new Error("Failed to delete document from case files.");

      setSelectedCase(prev => ({
        ...prev,
        documents: updatedDocuments
      }));
    } catch (err) {
      console.error("Delete Case Document error:", err);
      alert(err.message || "Failed to delete document.");
    }
  };

  // eCourts State
  const [ecourtsData, setEcourtsData] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // Advocate Notes & Tasks State
  const [caseNotes, setCaseNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("Action Item");
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  // Case Fee & Billing State — real data from Finance Management
  const [caseInvoices, setCaseInvoices] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);

  // Document Generation Tab State
  const [docGenPrompt, setDocGenPrompt] = useState("");
  const [docGenLoading, setDocGenLoading] = useState(false);
  const [docGenError, setDocGenError] = useState(null);
  const [generatedDocContent, setGeneratedDocContent] = useState("");
  const [docGenEditMode, setDocGenEditMode] = useState(false);
  const [docGenEditedContent, setDocGenEditedContent] = useState("");
  const [docGenTitle, setDocGenTitle] = useState("Bail Application");
  const [docGenHistory, setDocGenHistory] = useState([]);
  const [docGenHistoryLoading, setDocGenHistoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveCaseDocLoading, setSaveCaseDocLoading] = useState(false);
  const [saveCaseDocSuccess, setSaveCaseDocSuccess] = useState(false);
  const [activeDocHistoryId, setActiveDocHistoryId] = useState(null);
  const [savingDocEdit, setSavingDocEdit] = useState(false);
  const [saveEditSuccess, setSaveEditSuccess] = useState(false);

  const fetchCaseDocHistory = async (caseId) => {
    if (!caseId) return;
    setDocGenHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/ai-documents/history?case_id=${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setDocGenHistory(data);
      }
    } catch (err) {
      console.error("Error fetching case doc history:", err);
    } finally {
      setDocGenHistoryLoading(false);
    }
  };

  const handleSaveDocEdit = async () => {
    setGeneratedDocContent(docGenEditedContent);

    if (activeDocHistoryId) {
      setSavingDocEdit(true);
      try {
        const res = await fetch(`${API_BASE_URL}/case-management/ai-documents/history/${activeDocHistoryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: docGenEditedContent })
        });

        if (res.ok) {
          const updatedItem = await res.json();
          setDocGenHistory(prev =>
            prev.map(item => (item.id === activeDocHistoryId ? { ...item, content: updatedItem.content || docGenEditedContent } : item))
          );
        }
      } catch (err) {
        console.error("Error saving document edit to backend:", err);
      } finally {
        setSavingDocEdit(false);
      }
    }

    setDocGenEditMode(false);
    setSaveEditSuccess(true);
    setTimeout(() => setSaveEditSuccess(false), 2500);
  };

  const [deleteDocHistoryId, setDeleteDocHistoryId] = useState(null);
  const [deleteDocHistoryLoading, setDeleteDocHistoryLoading] = useState(false);

  const confirmDeleteDocHistory = async () => {
    if (!deleteDocHistoryId) return;
    setDeleteDocHistoryLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/case-management/ai-documents/history/${deleteDocHistoryId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setDocGenHistory(prev => prev.filter(item => item.id !== deleteDocHistoryId));
        setDeleteDocHistoryId(null);
      } else {
        alert("Failed to delete document history item.");
      }
    } catch (err) {
      console.error("Delete document history error:", err);
      alert("Error deleting document history item.");
    } finally {
      setDeleteDocHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "generate_doc" && selectedCase?.id) {
      fetchCaseDocHistory(selectedCase.id);
    }
  }, [activeTab, selectedCase?.id]);

  const handleGenerateCaseDocument = async (customPrompt = null, docTypeLabel = null) => {
    const promptToUse = customPrompt || docGenPrompt;
    if (!selectedCase || !promptToUse || !promptToUse.trim()) {
      setDocGenError("Please enter prompt instructions or click a template.");
      return;
    }
    if (docTypeLabel) setDocGenTitle(docTypeLabel);
    setDocGenLoading(true);
    setDocGenError(null);
    setSaveCaseDocSuccess(false);

    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}/generate-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToUse })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate legal document.");
      }

      const data = await res.json();
      setGeneratedDocContent(data.document || "");
      setDocGenEditedContent(data.document || "");
      setActiveDocHistoryId(data.id || null);
      setDocGenEditMode(false);
      fetchCaseDocHistory(selectedCase.id);
    } catch (err) {
      setDocGenError(err.message);
    } finally {
      setDocGenLoading(false);
    }
  };

  const handleSaveToCaseDocuments = async () => {
    const contentToSave = docGenEditMode ? docGenEditedContent : generatedDocContent;
    if (!selectedCase || !contentToSave) return;
    setSaveCaseDocLoading(true);

    try {
      const safeCaseNo = (selectedCase.case_no || "").replace(/[^a-zA-Z0-9_]/g, "_");
      const cleanDocTitle = (docGenTitle || "Generated_Document").replace(/[^a-zA-Z0-9_]/g, "_");
      const docName = `${cleanDocTitle}_${safeCaseNo}.txt`;
      const textBase64 = `data:text/plain;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(contentToSave)))}`;

      const newDocObj = {
        documentType: docGenTitle || "AI Legal Document",
        advocate: getLoggedInUser()?.username || selectedCase.selected_advocate || "Advocate",
        file: docName,
        url: textBase64,
        password: ""
      };

      const updatedDocuments = [...(selectedCase.documents || []), newDocObj];

      const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCase.case_id,
          cnrNumber: selectedCase.cnr_number,
          caseTitle: selectedCase.case_title,
          caseNo: selectedCase.case_no,
          caseType: selectedCase.case_type,
          caseDes: selectedCase.case_description,
          clientName: selectedCase.client_name,
          contactNumber: selectedCase.contact_number,
          emailId: selectedCase.email_id,
          courtName: selectedCase.court_name,
          courtType: selectedCase.court_type,
          status: selectedCase.status,
          selectedAdvocate: selectedCase.selected_advocate,
          documents: updatedDocuments,
          nextHearingDate: selectedCase.next_hearing_date
        })
      });

      if (!res.ok) throw new Error("Failed to save document to case files.");

      setSelectedCase(prev => ({
        ...prev,
        documents: updatedDocuments
      }));
      setSaveCaseDocSuccess(true);
      setTimeout(() => setSaveCaseDocSuccess(false), 3000);
    } catch (err) {
      console.error("Save to Case Documents error:", err);
      alert(err.message || "Failed to save document to case files.");
    } finally {
      setSaveCaseDocLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const content = docGenEditMode ? docGenEditedContent : generatedDocContent;
    if (!content || !selectedCase) return;

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text((docGenTitle || "Generated Document").toUpperCase(), margin, 20);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Case Title: ${selectedCase.case_title}`, margin, 27);
      doc.text(`Case No: ${selectedCase.case_no} | CNR: ${selectedCase.cnr_number || "N/A"} | Court: ${selectedCase.court_name || "N/A"}`, margin, 33);
      doc.text(`Client: ${selectedCase.client_name} | Date: ${new Date().toLocaleDateString("en-IN")}`, margin, 39);

      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 43, margin + pageWidth, 43);

      doc.setFontSize(10);
      const cleanContent = content.replace(/[#*`_~]/g, "");
      const splitLines = doc.splitTextToSize(cleanContent, pageWidth);

      let cursorY = 51;
      splitLines.forEach((line) => {
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(line, margin, cursorY);
        cursorY += 5.5;
      });

      const fileName = `${(docGenTitle || "Doc").replace(/[^a-zA-Z0-9]/g, "_")}_Case_${selectedCase.case_no}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Error generating PDF document.");
    }
  };

  const handleDownloadTxt = () => {
    const content = docGenEditMode ? docGenEditedContent : generatedDocContent;
    if (!content || !selectedCase) return;
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${(docGenTitle || "Doc").replace(/[^a-zA-Z0-9]/g, "_")}_Case_${selectedCase.case_no}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyContent = () => {
    const content = docGenEditMode ? docGenEditedContent : generatedDocContent;
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchCaseInvoices = async (caseNo, clientEmail) => {
    if (!caseNo && !clientEmail) return;
    setFeeLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/finance/invoices`);
      if (res.ok) {
        const data = await res.json();
        const searchNo = (caseNo || "").trim().toLowerCase();
        const searchEmail = (clientEmail || "").trim().toLowerCase();

        const matched = data.filter((inv) => {
          const invCase = (inv.case_number || "").trim().toLowerCase();
          const invEmail = (inv.email || "").trim().toLowerCase();

          // Match by exact case number (if invoice has a case number)
          const caseMatch = searchNo && invCase !== "" && invCase === searchNo;
          // Match by exact client email (if both sides have an email and no case number on invoice)
          const emailMatch = searchEmail && invEmail !== "" && invEmail === searchEmail;

          return caseMatch || emailMatch;
        });
        setCaseInvoices(matched);
      }
    } catch (e) {
      console.error("Failed to fetch case invoices:", e);
    } finally {
      setFeeLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCase?.id) {
      const caseNo = selectedCase.case_no || selectedCase.case_id || "";
      const clientEmail = selectedCase.email_id || "";
      fetchCaseInvoices(caseNo, clientEmail);
    }
  }, [selectedCase?.id]);

  // Auto-computed fee summary from real invoices
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

  // ── Case Notes: fetch from backend ──────────────────────────────────────
  const fetchCaseNotes = async (caseId) => {
    if (!caseId) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${caseId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setCaseNotes(data);
      }
    } catch (e) {
      console.error("Failed to fetch case notes:", e);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCase?.id) fetchCaseNotes(selectedCase.id);
  }, [selectedCase?.id]);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNoteText.trim(),
          category: newNoteCategory,
          author: loggedInUser?.fullName || loggedInUser?.username || "Advocate",
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
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCaseNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  };

  const fetchECourtsData = async (cnrNo) => {
    try {
      const cnr = cnrNo || selectedCase?.cnr_number || `KLER0100${String(id).padStart(6, "0")}2026`;
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
      console.error("eCourts detail fetch error:", err);
    }
  };

  const handleSyncWithECourts = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ecourts/sync/${id}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.details) {
          setEcourtsData(data.details);
        }
        fetchCaseDetails();
        alert(`✨ Case synchronized with eCourts successfully!\n\nUpdated Next Hearing: ${data.details?.nextHearingDate || "Updated"}`);
      } else {
        alert("⚠️ Failed to sync with eCourts.");
      }
    } catch (err) {
      alert("❌ Sync error.");
    } finally {
      setSyncLoading(false);
    }
  };

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      // 1. Fetch case details
      const response = await fetch(`${API_BASE_URL}/case-management/${id}`);
      if (!response.ok) {
        throw new Error("Case not found");
      }
      const rawCase = await response.json();

      // 2. Fetch assigned cases for live status mapping
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
      // Prefer matching by numeric case_id (unique), fall back to case_number only when needed
      const assigned = assignedCases.find(ac => {
        if (rawCase.id && ac.case_id) {
          return String(ac.case_id) === String(rawCase.id);
        }
        // Fallback: match by case_number only if no numeric id on either side
        return (
          ac.case_number &&
          rawCase.case_no &&
          String(ac.case_number).trim().toLowerCase() ===
          String(rawCase.case_no).trim().toLowerCase()
        );
      });
      const resolvedStatus = assigned ? assigned.status : rawCase.status;

      // 4. Collect all advocates assigned to this specific case
      // Use case_id-first matching to avoid cross-case pollution from duplicate case numbers
      const caseAssignments = assignedCases.filter(ac => {
        if (rawCase.id && ac.case_id) {
          // Both have numeric IDs — must match exactly
          return String(ac.case_id) === String(rawCase.id);
        }
        // Fallback: only use case_number match when neither side has a case_id
        if (!rawCase.id || !ac.case_id) {
          return (
            ac.case_number &&
            rawCase.case_no &&
            String(ac.case_number).trim().toLowerCase() ===
            String(rawCase.case_no || "").trim().toLowerCase()
          );
        }
        return false;
      });
      const assignedAdvNames = caseAssignments
        .flatMap(ac => [ac.advocate_name, ac.secondary_advocate_name || ac.secondaryAdvocateName])
        .filter(Boolean);
      setCaseAssignedAdvocates(assignedAdvNames);


      // 5. Build set of already-assigned document filenames
      const assignedDocFiles = new Set();
      caseAssignments.forEach(ac => {
        const docs = Array.isArray(ac.assigned_documents) ? ac.assigned_documents : [];
        docs.forEach(d => {
          if (d && d.file) assignedDocFiles.add(d.file);
        });
      });
      setDocAssignedSet(assignedDocFiles);

      setSelectedCase({
        ...rawCase,
        status: resolvedStatus || rawCase.status || "Active"
      });
      fetchECourtsData(rawCase.cnr_number);
    } catch (error) {
      console.error("Error loading case details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvocates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/lawfirm-management/`);
      const data = await res.json();
      setAdvocates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading advocates:", e);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCaseDetails();
      fetchAdvocates();
    }
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await fetch(`${API_BASE_URL}/case-management/${id}`, {
        method: "DELETE",
      });
      setDeleteConfirm(false);
      router.push("/case-management");
    } catch (error) {
      console.error(error);
      alert("Failed to delete the case. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignDocument = async () => {
    if (!assignedAdvocate || !selectedCase) return;
    setAssignLoading(true);
    try {
      await fetch(`${API_BASE_URL}/lawfirm-management/assign-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: selectedCase.id,
          case_name: selectedCase.case_title,
          case_number: selectedCase.case_no,
          case_title: selectedCase.case_title,
          advocate_name: assignedAdvocate,
          practice_area: selectedCase.case_type || "",
          priority: "Normal",
          due_date: selectedCase.next_hearing_date || "",
          assignment_notes: `Assigned from Case Management - Case #${selectedCase.case_no}`,
          status: "Active",
          assigned_documents: selectedCase.documents || [],
          client_name: selectedCase.client_name || ""
        }),
      });

      await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCase.case_id,
          cnrNumber: selectedCase.cnr_number,
          caseTitle: selectedCase.case_title,
          caseNo: selectedCase.case_no,
          caseType: selectedCase.case_type,
          caseDes: selectedCase.case_description,
          clientName: selectedCase.client_name,
          contactNumber: selectedCase.contact_number,
          emailId: selectedCase.email_id,
          courtName: selectedCase.court_name,
          courtType: selectedCase.court_type,
          status: selectedCase.status,
          selectedAdvocate: assignedAdvocate,
          documents: selectedCase.documents || [],
          nextHearingDate: selectedCase.next_hearing_date
        })
      });

      setSelectedCase(prev => ({
        ...prev,
        selected_advocate: assignedAdvocate
      }));
      // Mark all docs as assigned in the set
      const allFileNames = (selectedCase.documents || []).map(d => d.file).filter(Boolean);
      setDocAssignedSet(prev => {
        const next = new Set(prev);
        allFileNames.forEach(f => next.add(f));
        return next;
      });
      setAssignSuccess(true);
      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to assign advocate.");
    } finally {
      setAssignLoading(false);
    }
  };

  // Assign a single document to a chosen advocate
  const handleAssignSingleDoc = async () => {
    if (docAssignModal === null || !docAssignAdvocate || !selectedCase) return;
    setDocAssignLoading(true);
    const doc = selectedCase.documents[docAssignModal];
    try {
      const res = await fetch(`${API_BASE_URL}/lawfirm-management/assign-case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: selectedCase.id,
          case_name: selectedCase.case_title,
          case_number: selectedCase.case_no,
          case_title: selectedCase.case_title,
          advocate_name: docAssignAdvocate,
          priority: "Normal",
          due_date: selectedCase.next_hearing_date || "",
          assignment_notes: `Document '${doc.file}' assigned from Case Management - Case #${selectedCase.case_no}`,
          status: "Active",
          assigned_documents: [doc],
          client_name: selectedCase.client_name || ""
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to assign document.");
        return;
      }
      // Mark this specific document as assigned
      setDocAssignedSet(prev => {
        const next = new Set(prev);
        if (doc.file) next.add(doc.file);
        return next;
      });
      setDocAssignModal(null);
      setDocAssignAdvocate("");
    } catch (e) {
      console.error(e);
      alert("Failed to assign document.");
    } finally {
      setDocAssignLoading(false);
    }
  };

  const handleDocPasswordChange = async (docIndex, newPassword) => {
    if (!selectedCase) return;

    const updatedDocs = selectedCase.documents.map((doc, idx) => {
      if (idx === docIndex) {
        return {
          ...doc,
          password: newPassword
        };
      }
      return doc;
    });

    setSelectedCase(prev => ({
      ...prev,
      documents: updatedDocs
    }));

    // Only update backend if password is empty or exactly 6 digits
    if (newPassword.length !== 0 && newPassword.length !== 6) {
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          caseId: selectedCase.case_id,
          cnrNumber: selectedCase.cnr_number,
          caseTitle: selectedCase.case_title,
          caseNo: selectedCase.case_no,
          caseType: selectedCase.case_type,
          caseDes: selectedCase.case_description,
          clientName: selectedCase.client_name,
          contactNumber: selectedCase.contact_number,
          emailId: selectedCase.email_id,
          courtName: selectedCase.court_name,
          courtType: selectedCase.court_type,
          status: selectedCase.status,
          selectedAdvocate: selectedCase.selected_advocate,
          documents: updatedDocs.map(d => ({
            documentType: d.documentType,
            advocate: d.advocate || "",
            file: d.file,
            url: d.url || "",
            password: d.password || ""
          })),
          nextHearingDate: selectedCase.next_hearing_date
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748B] font-medium">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!selectedCase) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <Scale className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Case Not Found</h2>
        <p className="text-[#64748B] text-sm mb-6">The requested case could not be loaded or does not exist.</p>
        <button
          onClick={() => router.push("/case-management")}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
        >
          Back to Case Management
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Page Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-4 sm:p-5 md:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 w-full">
          <button
            onClick={() => router.push("/case-management")}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center shrink-0"
            title="Back to Case List"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl md:text-2xl font-black text-[#0F172A] tracking-tight leading-snug break-words">
              {selectedCase.case_title}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 font-mono uppercase tracking-wider">
              Case #{selectedCase.case_no}
            </p>
          </div>
        </div>

        {/* Action Buttons Bar - 100% Fluid & Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
          {/* AI Strategic Tools Group */}
          <button
            id="btn-view-summary-header"
            onClick={() => {
              try {
                const saved = JSON.parse(localStorage.getItem(`saved_briefs_${selectedCase.id}`) || "[]");
                if (saved && saved.length > 0) {
                  setViewBriefModal(saved[0]);
                } else {
                  router.push(`/case-management/similar-cases/${selectedCase.id}`);
                }
              } catch (e) {
                router.push(`/case-management/similar-cases/${selectedCase.id}`);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow active:scale-95 cursor-pointer text-center min-w-0"
          >
            <Eye size={14} className="shrink-0" />
            <span className="truncate">View Summary</span>
          </button>

          <button
            id="btn-similar-cases-header"
            onClick={() => router.push(`/case-management/similar-cases/${selectedCase.id}`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white text-xs font-extrabold transition shadow-xs hover:shadow active:scale-95 cursor-pointer text-center min-w-0"
          >
            <Search size={14} className="shrink-0" />
            <span className="truncate">View Similar Cases</span>
          </button>



          <button
            onClick={() => router.push(`/lawfirm-management/assign-advocate?directCaseId=${selectedCase.id}`)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs hover:shadow active:scale-95 cursor-pointer text-center min-w-0"
          >
            <UserCheck size={14} className="shrink-0" />
            <span className="truncate">Direct Assign</span>
          </button>

          {/* Management Tools Group */}
          {hasPermission("Case Management", "edit") && (
            <button
              onClick={() => router.push(`/case-management/edit/${selectedCase.id}`)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs text-center min-w-0"
            >
              <Pencil size={13} className="text-slate-500 shrink-0" /> Edit
            </button>
          )}

          {hasPermission("Case Management", "delete") && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer shadow-2xs text-center min-w-0"
            >
              <Trash2 size={13} className="shrink-0" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] overflow-hidden flex flex-col min-h-[500px]">
        {/* Tabs Section (Mobile Dropdown Select + Desktop Horizontal Tabs) */}
        <div className="border-b border-[#F1F5F9] bg-[#F8FAFC] p-2.5 sm:p-3">
          {/* Mobile View: Dropdown Select Menu (< 640px) */}
          <div className="block sm:hidden">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider block mb-1">
              Select View Section:
            </label>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-black text-[#0F172A] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
            >
              {[
                { key: "overview", label: "📋 Case Overview" },
                { key: "documents", label: "📁 Case Documents" },
                { key: "hearings", label: "⚖️ eCourts Hearings" },
                { key: "notes", label: "📝 Advocate Notes" },
                { key: "fees", label: "💳 Billing" },
                { key: "generate_doc", label: "✨ Generate Document" },
              ].map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop/Tablet View: Horizontal Tab Bar (>= 640px) */}
          <div className="hidden sm:flex overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 scroll-smooth">
            {[
              { key: "overview", label: "Case Overview" },
              { key: "documents", label: "Case Documents" },
              { key: "hearings", label: "eCourts Hearings" },
              { key: "notes", label: "Advocate Notes" },
              { key: "fees", label: "Billing" },
              { key: "generate_doc", label: "✨ Generate Document" },
            ].map((tabObj) => (
              <button
                key={tabObj.key}
                onClick={() => setActiveTab(tabObj.key)}
                className={`px-3.5 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer rounded-xl whitespace-nowrap shrink-0 ${activeTab === tabObj.key
                    ? "text-[#2563EB] bg-white shadow-sm font-extrabold border border-slate-200"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100/50"
                  }`}
              >
                {tabObj.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Status row with editable dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={selectedCase.status} />
                  <span className="text-xs text-[#94A3B8] font-semibold tracking-wide uppercase">
                    {selectedCase.case_type && selectedCase.case_type.includes(": ")
                      ? selectedCase.case_type.replace(": ", " · ")
                      : selectedCase.case_type} · {selectedCase.court_type}
                  </span>
                </div>
                {/* Inline status change */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Update Status:</label>
                  <select
                    value={selectedCase.status || "Active"}
                    disabled={statusUpdating}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      setStatusUpdating(true);
                      try {
                        const res = await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: newStatus }),
                        });
                        if (res.ok) {
                          setSelectedCase((prev) => ({ ...prev, status: newStatus }));
                        }
                      } catch (err) {
                        console.error("Status update failed:", err);
                      } finally {
                        setStatusUpdating(false);
                      }
                    }}
                    className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {(() => {
                      const fixedStatuses = [
                        "Active", "Client Consulting", "Client Detail Collection",
                        "Document Data Collection", "Document Pending", "Document Verified",
                        "Advocate Assigned", "Under Review", "Case Preparation",
                        "Court File", "In Progress", "Hearing Scheduled",
                        "Hearing Completed", "Awaiting Judgment", "Judgment Delivered",
                        "Won", "Lost", "On Hold", "Closed", "Disposed",
                      ];
                      const currentStatus = selectedCase.status || "Active";
                      const allStatuses = fixedStatuses.includes(currentStatus)
                        ? fixedStatuses
                        : [currentStatus, ...fixedStatuses];
                      return allStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ));
                    })()}
                  </select>
                  {statusUpdating && <span className="text-[11px] text-blue-500 font-bold animate-pulse">Saving…</span>}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Case Details</h4>
                  <InfoRow icon={<Hash size={14} />} label="CNR Number" value={selectedCase.cnr_number} />
                  <InfoRow icon={<Hash size={14} />} label="Case ID" value={selectedCase.case_id} />
                  <InfoRow
                    icon={<Scale size={14} />}
                    label="Case Type"
                    value={
                      selectedCase.case_type && selectedCase.case_type.includes(": ")
                        ? selectedCase.case_type.replace(": ", " · ")
                        : selectedCase.case_type
                    }
                  />
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Court Information</h4>
                  <InfoRow icon={<Building2 size={14} />} label="Court Name" value={selectedCase.court_name} />
                  <InfoRow icon={<Gavel size={14} />} label="Court Type" value={selectedCase.court_type} />
                </div>
                <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#F1F5F9] space-y-4 md:col-span-2">
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Client Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoRow icon={<User size={14} />} label="Client Name" value={isJuniorAdvocate && isSensitiveCase(selectedCase) ? "Confidential (Restricted)" : selectedCase.client_name} />
                    <InfoRow icon={<Phone size={14} />} label="Contact Number" value={isJuniorAdvocate && isSensitiveCase(selectedCase) ? "Confidential (Restricted)" : selectedCase.contact_number} />
                    <InfoRow icon={<Mail size={14} />} label="Email Address" value={isJuniorAdvocate && isSensitiveCase(selectedCase) ? "Confidential (Restricted)" : selectedCase.email_id} />
                  </div>
                </div>
              </div>

              {/* Facts & Issues */}
              {selectedCase.case_description && (() => {
                let facts = "";
                let issues = "";
                const desc = selectedCase.case_description;
                if (desc && desc.startsWith("Facts:\n")) {
                  const parts = desc.split("\n\nIssues:\n");
                  facts = parts[0].replace("Facts:\n", "");
                  issues = parts[1] || "";
                } else {
                  facts = desc || "";
                }
                return (
                  <div className="space-y-4 mt-6">
                    {facts && (
                      <div className="bg-[#FFFBEB] border border-amber-100 rounded-2xl p-4 sm:p-5">
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText size={13} /> Facts
                        </h4>
                        <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                          {facts}
                        </p>
                      </div>
                    )}

                    {issues && (
                      <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 sm:p-5">
                        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText size={13} /> Issues
                        </h4>
                        <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                          {issues}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Parties & Legal Representatives Section */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                  <div>
                    <h3 className="font-extrabold text-lg text-[#0F172A]">Parties & Legal Representatives</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">Comprehensive overview of petitioner, respondent, opposing counsel, and bench officer.</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 self-start sm:self-auto shrink-0">
                    CNR: {selectedCase.cnr_number || "N/A"}
                  </span>
                </div>

                {/* VS Layout Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Petitioner Side Card */}
                  <div className="bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] rounded-2xl p-5 sm:p-6 border border-[#BAE6FD] space-y-4 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#0284C7] text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                      Petitioner Side
                    </div>
                    <div className="flex items-center gap-3 mb-2 pr-24">
                      <div className="w-10 h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center font-bold shrink-0">
                        <User size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wider">Client / Petitioner</p>
                        <h4 className="text-base font-extrabold text-[#0F172A] truncate">
                          {selectedCase.client_name || ecourtsData?.petitioner || "Petitioner"}
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[#B9E6FE]">
                      <div className="bg-white/80 rounded-xl p-3.5 border border-sky-100">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Petitioner Role</p>
                        <p className="text-xs font-bold text-[#0F172A] mt-0.5">{selectedCase.client_role || "Petitioner / Complainant"}</p>
                      </div>
                      <div className="bg-white/80 rounded-xl p-3.5 border border-sky-100">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Petitioner Advocate / Legal Counsel</p>
                        <p className="text-xs font-bold text-[#0284C7] mt-0.5">
                          {ecourtsData?.petitionerAdvocate || selectedCase.selected_advocate || "Advocate (On Record)"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Respondent Side Card */}
                  <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] rounded-2xl p-5 sm:p-6 border border-[#FDBA74] space-y-4 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#EA580C] text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                      Respondent Side
                    </div>
                    <div className="flex items-center gap-3 mb-2 pr-24">
                      <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-bold shrink-0">
                        <User size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-[#C2410C] uppercase tracking-wider">Respondent / Opposing Party</p>
                        <h4 className="text-base font-extrabold text-[#0F172A] truncate">
                          {ecourtsData?.respondent || (selectedCase.case_title ? selectedCase.case_title.split(/ vs\.? | v\.? /i)[1] : "") || "State / Respondent"}
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[#FED7AA]">
                      <div className="bg-white/80 rounded-xl p-3.5 border border-orange-100">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Respondent Role</p>
                        <p className="text-xs font-bold text-[#0F172A] mt-0.5">Respondent / Accused Party</p>
                      </div>
                      <div className="bg-white/80 rounded-xl p-3.5 border border-orange-100">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Respondent Advocate / Opposing Counsel</p>
                        <p className="text-xs font-bold text-[#C2410C] mt-0.5">
                          {ecourtsData?.respondentAdvocate || "Government Pleader / Opposing Counsel"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Presiding Judicial Officer Card */}
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                      <Gavel size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Presiding Judicial Officer</p>
                      <h5 className="text-sm font-extrabold text-[#0F172A]">
                        {ecourtsData?.presidingJudge || "Hon'ble Presiding Judge"}
                      </h5>
                      <p className="text-xs text-[#64748B] mt-0.5">{selectedCase.court_name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Previous Similar Case History ──────────────────── */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50/50 to-violet-50/30 border border-indigo-200 rounded-2xl p-5 sm:p-6 shadow-sm mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-indigo-900 text-sm">Previous Similar Case History</h4>
                      <p className="text-xs text-indigo-600 mt-0.5">
                        View real comparable cases from our firm &amp; live eCourts database — with AI-powered win/loss analysis, loopholes, and key sections.
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-similar-cases"
                    onClick={() => router.push(`/case-management/similar-cases/${selectedCase.id}`)}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white text-xs font-extrabold transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer w-full sm:w-auto shrink-0"
                  >
                    <Search size={14} />
                    View Similar Cases
                  </button>
                </div>

                {/* Quick stats preview */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-indigo-200/60">
                  {[
                    { label: "Case Type", value: selectedCase.case_type || "—", color: "text-indigo-800" },
                    { label: "Court", value: selectedCase.court_name || "—", color: "text-purple-800" },
                    { label: "Status", value: selectedCase.status || "Active", color: "text-violet-800" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/70 rounded-xl p-3 border border-indigo-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className={`text-xs font-extrabold mt-0.5 ${item.color} truncate`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Saved / Downloaded Strategic Briefs Section */}
                {(() => {
                  if (typeof window === "undefined") return null;
                  try {
                    const savedBriefs = JSON.parse(localStorage.getItem(`saved_briefs_${selectedCase.id}`) || "[]");
                    if (!savedBriefs || savedBriefs.length === 0) return null;

                    return (
                      <div className="pt-4 border-t border-indigo-200/80 space-y-3">
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
                          {savedBriefs.slice(0, 3).map((brief, bIdx) => (
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
                                  <Download size={13} /> Download File
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
            </div>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              {/* Case summary strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4 border-b border-[#F1F5F9]">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wide">Case Title</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">{selectedCase.case_title}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wide">Case ID</p>
                  <p className="text-sm font-bold text-[#7C3AED] mt-0.5 font-mono truncate">{selectedCase.case_id || selectedCase.case_no}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wide">Court</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">{selectedCase.court_name}</p>
                </div>
                <div className="flex items-center sm:justify-end bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
                  <StatusBadge status={selectedCase.status} />
                </div>
              </div>

              {/* Assign to Junior Advocate */}
              <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
                    <UserCheck size={15} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1E40AF] text-sm">Assign to Junior Advocate</h4>
                    <p className="text-xs text-[#3B82F6]">This case will appear on the junior advocate&apos;s assigned cases page</p>
                  </div>
                </div>

                {selectedCase.selected_advocate ? (
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {selectedCase.selected_advocate.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider leading-none">Assigned Junior Advocate</p>
                        <p className="text-sm font-bold text-[#1E40AF] mt-0.5 truncate">{selectedCase.selected_advocate}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`${API_BASE_URL}/case-management/${selectedCase.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              caseId: selectedCase.case_id,
                              cnrNumber: selectedCase.cnr_number,
                              caseTitle: selectedCase.case_title,
                              caseNo: selectedCase.case_no,
                              caseType: selectedCase.case_type,
                              caseDes: selectedCase.case_description,
                              clientName: selectedCase.client_name,
                              contactNumber: selectedCase.contact_number,
                              emailId: selectedCase.email_id,
                              courtName: selectedCase.court_name,
                              courtType: selectedCase.court_type,
                              status: selectedCase.status,
                              selectedAdvocate: "",
                              documents: selectedCase.documents || [],
                              nextHearingDate: selectedCase.next_hearing_date
                            })
                          });
                          setSelectedCase(prev => ({
                            ...prev,
                            selected_advocate: ""
                          }));
                          setAssignedAdvocate("");
                        } catch (e) {
                          console.error("Failed to unassign advocate:", e);
                        }
                      }}
                      className="text-xs font-bold text-[#2563EB] hover:text-[#1d4ed8] bg-white border border-[#BFDBFE] px-3 py-1.5 rounded-lg hover:shadow-xs transition cursor-pointer self-start sm:self-auto"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={assignedAdvocate}
                      onChange={(e) => setAssignedAdvocate(e.target.value)}
                      className="flex-1 rounded-xl border border-[#BFDBFE] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition w-full"
                    >
                      <option value="">— Select Junior Advocate —</option>
                      {caseAssignedAdvocates.length === 0 ? (
                        <option value="" disabled>
                          No advocates assigned to this case
                        </option>
                      ) : (
                        advocates
                          .filter((adv) => {
                            const advName = (adv.advocateName || adv.advocate_name || "").toLowerCase().trim();
                            return caseAssignedAdvocates.some(
                              (name) => name.toLowerCase().trim() === advName
                            );
                          })
                          .map((adv) => (
                            <option key={adv.id} value={adv.advocateName || adv.advocate_name}>
                              {adv.advocateName || adv.advocate_name}
                            </option>
                          ))
                      )}
                    </select>
                    <button
                      onClick={handleAssignDocument}
                      disabled={!assignedAdvocate || assignLoading}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition cursor-pointer w-full sm:w-auto shrink-0"
                    >
                      <Send size={14} />
                      {assignLoading ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                )}
              </div>

              {/* OCR Extract Text from Document */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
                <OCRPanel caseId={selectedCase?.id} onSaveToDocuments={handleSaveOcrToCaseDocuments} />
              </div>

              {/* Documents list table */}
              {selectedCase.documents && selectedCase.documents.length > 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
                  <table className="w-full min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-5 text-left">Case Documents</th>
                        <th className="py-3.5 px-5 text-left">Doc Type</th>
                        <th className="py-3.5 px-5 text-left">Document Password</th>
                        <th className="py-3.5 px-5 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-sm">
                      {selectedCase.documents.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5 font-semibold text-slate-700">
                            <button
                              type="button"
                              onClick={() => setViewingDocument(doc)}
                              className="flex items-center gap-2 text-left font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors cursor-pointer group"
                              title="Click to view document content"
                            >
                              <FileText size={15} className="text-[#94A3B8] group-hover:text-[#2563EB] shrink-0" />
                              <span className="underline decoration-slate-200 underline-offset-4 group-hover:decoration-[#2563EB]">
                                {doc.file || "Unnamed File"}
                              </span>
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              {doc.documentType && doc.documentType.includes(": ")
                                ? doc.documentType.split(": ")[1]
                                : doc.documentType || "Other"}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1 min-w-[180px]">
                                  <input
                                    type={showPasswordIdx === idx ? "text" : "password"}
                                    placeholder="Enter 6-digit PIN"
                                    value={doc.password || ""}
                                    maxLength={6}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, "");
                                      handleDocPasswordChange(idx, val);
                                    }}
                                    className={`w-full rounded-xl border px-3.5 py-2 pr-9 text-xs sm:text-sm font-mono tracking-[0.3em] text-[#0F172A] placeholder:font-sans placeholder:tracking-normal placeholder:text-xs focus:outline-none focus:ring-2 transition ${doc.password && doc.password.length > 0 && doc.password.length < 6
                                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                        : "border-[#E2E8F0] focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                                      }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswordIdx(showPasswordIdx === idx ? null : idx)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer flex items-center justify-center"
                                    title={showPasswordIdx === idx ? "Hide PIN" : "Show PIN"}
                                  >
                                    {showPasswordIdx === idx ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </div>
                                {doc.password && doc.password.length === 6 ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                      Set
                                    </span>
                                    <button
                                      onClick={() => handleDocPasswordChange(idx, "")}
                                      className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded-full transition cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              {doc.password && doc.password.length > 0 && doc.password.length < 6 && (
                                <p className="text-red-500 text-[10px] font-medium ml-1">
                                  PIN must be exactly 6 digits
                                </p>
                              )}
                            </div>
                          </td>
                          {/* Action column */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              {/* View Button */}
                              <button
                                type="button"
                                onClick={() => setViewingDocument(doc)}
                                title="View document content"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition cursor-pointer"
                              >
                                <Eye size={13} />
                                View
                              </button>

                              {/* Assign Button */}
                              {docAssignedSet.has(doc.file) && doc.password && doc.password.trim().length === 6 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default select-none">
                                  <CheckCircle size={12} />
                                  Assigned
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setDocAssignModal(idx);
                                    setDocAssignAdvocate("");
                                  }}
                                  disabled={caseAssignedAdvocates.length === 0}
                                  title={caseAssignedAdvocates.length === 0 ? "No advocates assigned to this case yet" : "Assign this document to a junior advocate"}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#2563EB] hover:bg-[#1d4ed8] text-white transition shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Send size={11} />
                                  Assign
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCaseDocument(idx)}
                                title="Delete document from case"
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <FileText size={24} className="text-[#94A3B8]" />
                  </div>
                  <h4 className="font-bold text-[#0F172A] text-sm mb-1">
                    No Documents Found
                  </h4>
                  <p className="text-[#64748B] text-xs max-w-xs mx-auto">
                    This case has no uploaded documents.
                  </p>
                </div>
              )}
            </div>
          )}



          {/* TAB: ECOURTS HEARINGS & TIMELINE */}
          {activeTab === "hearings" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div>
                  <h4 className="text-sm font-bold text-blue-900">Official eCourts Timeline</h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    CNR: {selectedCase.cnr_number || "KLER010045212026"} • Next Hearing: {selectedCase.next_hearing_date || "To be scheduled"}
                  </p>
                </div>
                <button
                  onClick={handleSyncWithECourts}
                  disabled={syncLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto shrink-0"
                >
                  {syncLoading ? "Syncing..." : "Sync eCourts Now"}
                </button>
              </div>

              {/* Timeline Items */}
              {ecourtsData?.timeline && ecourtsData.timeline.length > 0 ? (
                <div className="relative pl-7 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {ecourtsData.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-[27px] sm:-left-[29px] top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center text-xs font-bold ${item.status === "Completed" ? "border-emerald-500 text-emerald-600" : "border-blue-500 text-blue-600 animate-pulse"}`}>
                        {idx + 1}
                      </span>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 self-start">
                            {item.eventStage}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{item.eventDate}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900 mt-2">{item.title}</h5>
                        <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-2">Bench: {item.benchName} ({item.courtHall})</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
                  No live eCourts timeline milestones available yet for CNR Number {selectedCase.cnr_number || "this case"}.
                </div>
              )}
            </div>
          )}





          {/* TAB: ADVOCATE NOTES & TASKS */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="font-extrabold text-lg text-[#0F172A]">Advocate Notes & Internal Tasks</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Private internal case notes and action items for advocates and firm team.</p>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 self-start sm:self-auto shrink-0">
                  {caseNotes.length} Note{caseNotes.length !== 1 ? "s" : ""} Recorded
                </span>
              </div>

              {/* New Note Form Card */}
              <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] space-y-4">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                  <Pencil size={14} className="text-[#2563EB]" /> Add Internal Case Note
                </h4>
                <textarea
                  placeholder="Type internal case instructions, task details, or hearing preparation notes..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition resize-y min-h-[90px]"
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
                    className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-sm w-full sm:w-auto shrink-0"
                  >
                    <Send size={13} /> {noteSaving ? "Saving..." : "Save Note"}
                  </button>
                </div>
              </div>

              {/* Notes Feed */}
              <div className="space-y-3">
                {notesLoading ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium animate-pulse">
                    Loading advocate notes…
                  </div>
                ) : caseNotes.length > 0 ? (
                  caseNotes.map((note) => {
                    const formattedDate = note.created_at
                      ? new Date(note.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : note.date || "—";
                    return (
                      <div key={note.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs space-y-2 relative group hover:border-blue-200 transition">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${note.category === "Action Item"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : note.category === "Hearing Prep"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : note.category === "Client Call"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                            >
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
                        <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        <p className="text-[11px] text-[#64748B] font-medium pt-1 border-t border-slate-100 flex items-center gap-1">
                          <User size={11} /> Logged by: <span className="font-bold text-[#0F172A]">{note.author || "Advocate"}</span>
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
                    No internal advocate notes logged yet for this case. Use the box above to record task notes!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: FEE & BILLING */}
          {activeTab === "fees" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="font-extrabold text-lg text-[#0F172A]">Fee & Billing Overview</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Real billing data from Finance Management — invoices matched for case <span className="font-bold text-[#0F172A]">{selectedCase.case_no || selectedCase.case_id}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide border ${paymentStatus === "Fully Paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : paymentStatus === "Partially Paid"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : paymentStatus === "No Invoices"
                            ? "bg-slate-50 text-slate-500 border-slate-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                  >
                    {paymentStatus === "Fully Paid" && "🟢 "}
                    {paymentStatus === "Partially Paid" && "🟡 "}
                    {paymentStatus === "Payment Due" && "🔴 "}
                    {paymentStatus === "No Invoices" && "⚪ "}
                    {paymentStatus}
                  </span>
                  <button
                    onClick={() => router.push("/finance-management")}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    + Add Invoice
                  </button>
                  <button
                    onClick={() => {
                      const caseNo = selectedCase.case_no || selectedCase.case_id || "";
                      const clientEmail = selectedCase.email_id || "";
                      fetchCaseInvoices(caseNo, clientEmail);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                    title="Refresh"
                  >
                    {feeLoading ? "Refreshing..." : "↻ Refresh"}
                  </button>
                </div>
              </div>

              {feeLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">Loading billing data…</div>
              ) : (
                <>
                  {/* 3 Summary Financial Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                    {/* Total Invoiced */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Total Invoiced</p>
                      <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-900">
                        ₹{totalBilled.toLocaleString("en-IN")}
                      </h4>
                      <p className="text-[11px] text-blue-600/80 font-medium mt-2">
                        {caseInvoices.length} invoice{caseInvoices.length !== 1 ? "s" : ""} raised for this case
                      </p>
                    </div>

                    {/* Total Paid */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Amount Received</p>
                      <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-900">
                        ₹{totalPaid.toLocaleString("en-IN")}
                      </h4>
                      <p className="text-[11px] text-emerald-600/80 font-medium mt-2">
                        {caseInvoices.filter((inv) => inv.status === "Paid").length} paid invoice{caseInvoices.filter((inv) => inv.status === "Paid").length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Pending Balance */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs sm:col-span-2 md:col-span-1">
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">Pending / Due</p>
                      <h4 className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-900">
                        ₹{totalPending.toLocaleString("en-IN")}
                      </h4>
                      <p className="text-[11px] text-amber-600/80 font-medium mt-2">
                        {caseInvoices.filter((inv) => inv.status !== "Paid").length} outstanding invoice{caseInvoices.filter((inv) => inv.status !== "Paid").length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Invoice Records Table */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Invoice Records from Billing</h4>
                      <span className="text-xs font-bold text-slate-500">{caseInvoices.length} Invoice{caseInvoices.length !== 1 ? "s" : ""}</span>
                    </div>
                    {caseInvoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="px-5 py-3">Invoice #</th>
                              <th className="px-5 py-3">Date</th>
                              <th className="px-5 py-3">Client</th>
                              <th className="px-5 py-3">Payment Mode</th>
                              <th className="px-5 py-3">Advocate Fee</th>
                              <th className="px-5 py-3 text-right">Grand Total (₹)</th>
                              <th className="px-5 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {caseInvoices.map((inv) => {
                              const createdDate = inv.created_at
                                ? new Date(inv.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                : "—";
                              const statusColor =
                                inv.status === "Paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : inv.status === "Overdue"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : inv.status === "Sent"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200";
                              return (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                                  <td className="px-5 py-3.5 font-bold text-blue-600">INV-{String(inv.id).padStart(4, "0")}</td>
                                  <td className="px-5 py-3.5 text-slate-600 font-medium">{createdDate}</td>
                                  <td className="px-5 py-3.5 text-slate-800 font-semibold">{inv.client_name || "—"}</td>
                                  <td className="px-5 py-3.5 text-slate-600">{inv.payment_method || "—"}</td>
                                  <td className="px-5 py-3.5 text-slate-700 font-semibold">
                                    {inv.advocate_fee_amount > 0 ? `₹${Number(inv.advocate_fee_amount).toLocaleString("en-IN")}` : "—"}
                                  </td>
                                  <td className="px-5 py-3.5 text-right font-black text-slate-800">
                                    ₹{Number(inv.grand_total || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusColor}`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 sm:p-10 text-center bg-slate-50">
                        <p className="text-slate-500 text-sm font-semibold mb-2">No billing invoices found for this case</p>
                        <p className="text-slate-400 text-xs mb-4">
                          Go to Finance Management → Billing and create an invoice with case number <span className="font-bold text-slate-600">{selectedCase.case_no || selectedCase.case_id}</span> to see it here.
                        </p>
                        <button
                          onClick={() => router.push("/finance-management")}
                          className="px-5 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
                        >
                          Go to Finance & Billing →
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: SIMILAR PRECEDENTS */}
          {activeTab === "similar_cases" && selectedCase && (
            <div className="space-y-6">
              <SimilarCasesClient caseId={selectedCase.id} />
            </div>
          )}

          {/* TAB: GENERATE DOCUMENT FOR THIS CASE */}
          {activeTab === "generate_doc" && selectedCase && (
            <div className="space-y-6">
              {/* Header Context Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#0F172A] text-base">
                      AI Legal Document Generator
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Generating document specifically for <span className="font-bold text-[#0F172A]">{selectedCase.case_title}</span> (Case #{selectedCase.case_no})
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-slate-200">
                  <span className="px-2 py-1 bg-slate-100 rounded-md">CNR: {selectedCase.cnr_number || "N/A"}</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">Court: {selectedCase.court_name || "N/A"}</span>
                  <span className="px-2 py-1 bg-slate-100 rounded-md">Client: {selectedCase.client_name || "N/A"}</span>
                </div>
              </div>

              {/* Document Generation Input Box & Presets */}
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                    Select Template / Document Type Quick Presets:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "📜 Bail Application", prompt: `Draft an urgent Bail Application for case #${selectedCase.case_no} (${selectedCase.case_title}) pending before ${selectedCase.court_name}.` },
                      { label: "⚖️ Written Statement", prompt: `Draft a Written Statement / Reply for case #${selectedCase.case_no} (${selectedCase.case_title}) on behalf of client ${selectedCase.client_name}.` },
                      { label: "📢 Legal Notice", prompt: `Draft a Legal Notice for case #${selectedCase.case_no} (${selectedCase.case_title}) concerning ${selectedCase.case_description || "legal dispute"}.` },
                      { label: "📄 Affidavit", prompt: `Draft a sworn Affidavit for client ${selectedCase.client_name} in case #${selectedCase.case_no} (${selectedCase.case_title}) before ${selectedCase.court_name}.` },
                      { label: "🏛️ Writ Petition", prompt: `Draft a Writ Petition for case #${selectedCase.case_no} (${selectedCase.case_title}) under appropriate constitutional / legal jurisdiction.` },
                      { label: "📝 Case Summary & Arguments", prompt: `Generate a comprehensive Case Summary and Legal Arguments overview for case #${selectedCase.case_no} (${selectedCase.case_title}).` }
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => {
                          setDocGenPrompt(preset.prompt);
                          handleGenerateCaseDocument(preset.prompt, preset.label.replace(/^[^a-zA-Z0-9]+/, "").trim());
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/50 text-xs font-bold text-[#0F172A] transition cursor-pointer shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5">
                    Custom Prompt Instructions for Case #{selectedCase.case_no}:
                  </label>
                  <textarea
                    rows={3}
                    value={docGenPrompt}
                    onChange={(e) => setDocGenPrompt(e.target.value)}
                    placeholder={`Enter specific instructions to generate document for ${selectedCase.case_title}...`}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {docGenError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                    {docGenError}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    AI models will automatically inject case facts, CNR, court name & client details.
                  </span>
                  <button
                    onClick={() => handleGenerateCaseDocument()}
                    disabled={docGenLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                  >
                    {docGenLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Generating Document...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Generate Document
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Document Display Section */}
              {(generatedDocContent || docGenLoading) && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden space-y-0">
                  {/* Top Bar / Toolbar */}
                  <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-[#2563EB] shrink-0" />
                      <h4 className="font-extrabold text-[#0F172A] text-sm truncate">
                        {docGenTitle || "Generated Legal Document"} — Case #{selectedCase.case_no}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Download PDF */}
                      <button
                        onClick={handleDownloadPDF}
                        disabled={!generatedDocContent}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                        title="Download as formatted PDF"
                      >
                        <Download size={13} /> PDF
                      </button>

                      {/* Download TXT */}
                      <button
                        onClick={handleDownloadTxt}
                        disabled={!generatedDocContent}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                        title="Download text file"
                      >
                        <FileText size={13} /> TXT
                      </button>

                      {/* Save to Case Documents */}
                      <button
                        onClick={handleSaveToCaseDocuments}
                        disabled={saveCaseDocLoading || !generatedDocContent}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${saveCaseDocSuccess
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                          }`}
                        title="Save directly into Case Documents folder for this case"
                      >
                        {saveCaseDocSuccess ? (
                          <>
                            <Check size={13} /> Saved to Case!
                          </>
                        ) : saveCaseDocLoading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save size={13} /> Save to Case
                          </>
                        )}
                      </button>

                      {/* Copy */}
                      <button
                        onClick={handleCopyContent}
                        disabled={!generatedDocContent}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>

                      {/* Toggle Edit / Save Edit Mode */}
                      {docGenEditMode ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleSaveDocEdit}
                            disabled={savingDocEdit}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                            title="Save edits permanently to document and history"
                          >
                            <Check size={13} /> {savingDocEdit ? "Saving..." : "Save Edit"}
                          </button>
                          <button
                            onClick={() => {
                              setDocGenEditedContent(generatedDocContent);
                              setDocGenEditMode(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {saveEditSuccess && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 animate-in fade-in duration-200">
                              ✓ Edit Saved!
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setDocGenEditedContent(generatedDocContent);
                              setDocGenEditMode(true);
                            }}
                            disabled={!generatedDocContent}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                          >
                            <Pencil size={13} /> Edit Document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    {docGenLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-600">Generating legal document using case context...</p>
                      </div>
                    ) : docGenEditMode ? (
                      <textarea
                        rows={16}
                        value={docGenEditedContent}
                        onChange={(e) => setDocGenEditedContent(e.target.value)}
                        className="w-full p-4 font-mono text-xs text-[#0F172A] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    ) : (
                      <div className="prose prose-slate max-w-none text-xs font-sans whitespace-pre-wrap leading-relaxed text-[#0F172A] bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {generatedDocContent}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Case-specific History Section */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-[#2563EB]" />
                    <h4 className="font-extrabold text-[#0F172A] text-sm">
                      Generated Documents History for Case #{selectedCase.case_no}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {docGenHistory.length} saved
                  </span>
                </div>

                {docGenHistoryLoading ? (
                  <p className="text-xs text-slate-500 text-center py-4">Loading history for this case...</p>
                ) : docGenHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No generated documents saved for this case yet. Click "Generate Document" above to create one.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {docGenHistory.map((hItem) => (
                      <div
                        key={hItem.id}
                        onClick={() => {
                          setGeneratedDocContent(hItem.content || "");
                          setDocGenEditedContent(hItem.content || "");
                          setActiveDocHistoryId(hItem.id || null);
                          setDocGenTitle(hItem.prompt ? hItem.prompt.substring(0, 30) : "Generated Document");
                          setDocGenEditMode(false);
                        }}
                        className="group relative p-3.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl transition cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-[#0F172A] truncate flex-1 min-w-0">
                            {hItem.prompt || "Generated Legal Document"}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {hItem.created_at ? new Date(hItem.created_at).toLocaleDateString("en-IN") : ""}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDocHistoryId(hItem.id);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete this history item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {hItem.content ? hItem.content.replace(/[#*`_~]/g, "").substring(0, 120) + "..." : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Per-document assign modal */}
      {docAssignModal !== null && selectedCase && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setDocAssignModal(null); setDocAssignAdvocate(""); }}
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Send size={16} className="text-[#2563EB]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#0F172A]">Assign Document</h3>
                <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-[260px]">
                  {selectedCase.documents[docAssignModal]?.file || "Document"}
                </p>
              </div>
              <button
                onClick={() => { setDocAssignModal(null); setDocAssignAdvocate(""); }}
                className="ml-auto w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Advocate picker */}
            <label className="block text-xs font-bold text-[#0F172A] mb-2">
              Select Junior Advocate
            </label>
            {caseAssignedAdvocates.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 font-semibold mb-5">
                No advocates are assigned to this case yet. Please assign an advocate from Lawfirm Management first.
              </div>
            ) : (
              <select
                value={docAssignAdvocate}
                onChange={(e) => setDocAssignAdvocate(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition mb-5"
              >
                <option value="">— Select Junior Advocate —</option>
                {advocates
                  .filter((adv) => {
                    const advName = (adv.advocateName || adv.advocate_name || "").toLowerCase().trim();
                    return caseAssignedAdvocates.some(
                      (name) => name.toLowerCase().trim() === advName
                    );
                  })
                  .map((adv) => (
                    <option key={adv.id} value={adv.advocateName || adv.advocate_name}>
                      {adv.advocateName || adv.advocate_name}
                    </option>
                  ))}
              </select>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setDocAssignModal(null); setDocAssignAdvocate(""); }}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSingleDoc}
                disabled={!docAssignAdvocate || docAssignLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Send size={13} />
                {docAssignLoading ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl z-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-1">Delete Case?</h3>
            <p className="text-sm text-[#64748B] mb-6">Are you sure you want to delete this case? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-70 cursor-pointer"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {viewBriefModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewBriefModal(null)} />

          <div className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                    Saved Strategic Brief
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
                    Saved Strategic Brief
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

      {/* Delete AI Document History Modal (Full-Screen Portal covering sidebar & navbar) */}
      {deleteDocHistoryId !== null && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop covering sidebar & navbar */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteDocHistoryId(null)}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600 shadow-xs">
              <Trash2 size={26} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#0F172A]">Delete History Item</h3>
              <p className="text-xs text-[#64748B] font-medium leading-relaxed">
                Are you sure you want to delete this generated document history item? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteDocHistoryId(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-bold text-xs hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDocHistory}
                disabled={deleteDocHistoryLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteDocHistoryLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Delete Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          fileUrl={viewingDocument.url}
          title={viewingDocument.file}
          badge={viewingDocument.documentType}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
