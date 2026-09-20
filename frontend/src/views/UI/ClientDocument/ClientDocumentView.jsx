"use client";

import { useState, useEffect } from "react";
import { Upload, Eye, Trash, FileText, Download, ExternalLink, X, ClipboardList } from "lucide-react";
import useModulePermission from "@/utils/useModulePermission";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";
import { createPortal } from "react-dom";
import DocumentViewerModal from "@/components/common/DocumentViewerModal";
import DocumentFormatGenerateView from "./ClientDocumentFormatGenerateView";

const documentCategories = {
  "Pleadings": [
    "Petition", "Plaint", "Written Statement", "Counter Affidavit", "Reply Statement",
    "Objection", "Rejoinder", "Replication", "Appeal Memorandum", "Revision Petition", "Review Petition"
  ],
  "Affidavits": [
    "Affidavit", "Supporting Affidavit", "Counter Affidavit", "Proof Affidavit", "Additional Affidavit"
  ],
  "Applications": [
    "Interlocutory Application (IA)", "Miscellaneous Application", "Bail Application",
    "Anticipatory Bail Application", "Stay Petition", "Delay Condonation Petition",
    "Restoration Petition", "Amendment Petition", "Impleading Petition", "Execution Petition"
  ],
  "Evidence/Documents": [
    "Sale Deed", "Title Deed", "Agreement", "Will", "Power of Attorney", "Legal Notice",
    "Reply Notice", "FIR", "Charge Sheet", "Final Report", "Medical Certificate",
    "Postmortem Report", "Accident Report", "Insurance Policy", "Tax Receipt",
    "Property Tax Receipt", "Encumbrance Certificate (EC)", "Possession Certificate",
    "Birth Certificate", "Death Certificate", "Marriage Certificate", "Aadhaar Card",
    "PAN Card", "Passport", "Driving Licence", "Ration Card", "Voter ID", "Photographs",
    "Bank Statement", "Passbook Copy", "Bills/Invoices", "Receipts", "Email/Chat Printouts",
    "Call Records", "CCTV Images", "Audio Recording Transcript", "Video Recording Transcript"
  ],
  "Court Documents": [
    "Summons", "Notice", "Warrant", "Court Order", "Interim Order", "Judgment", "Decree",
    "Commission Report", "Advocate Commission Report", "Court Fee Receipt", "Filing Receipt",
    "Certified Copy", "Cause List"
  ],
  "Advocate Documents": [
    "Vakalatnama", "Memo of Appearance", "Memo", "Case Diary", "Case Notes", "Brief Notes",
    "Written Arguments", "Synopsis", "List of Witnesses", "List of Documents"
  ],
  "Witness Documents": [
    "Witness Statement", "Chief Examination", "Cross Examination", "Re-Examination", "Expert Opinion"
  ]
};

const AccessDenied = ({ action }) => (
  <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
    <span>🔒</span>
    <span>{action} not permitted</span>
  </div>
);

export default function ClientDocuments() {
  const { perms, loading, user } = useModulePermission("Documents");
  const [activeTab, setActiveTab] = useState("my-documents"); // "my-documents" | "document-format"

  const [documentCategory, setDocumentCategory] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [matchedCases, setMatchedCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [filterCaseTitle, setFilterCaseTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [successToast, setSuccessToast] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchClientDocs = async () => {
    try {
      const userEmail = (user?.email || "").trim().toLowerCase();
      if (!userEmail) {
        setLoadingDocs(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/case-management/`);
      if (res.ok) {
        const casesData = await res.json();
        // Filter cases matching client email (reliable — same email used at case creation and login)
        const casesArray = Array.isArray(casesData)
          ? casesData
          : Array.isArray(casesData.results)
          ? casesData.results
          : Array.isArray(casesData.data)
          ? casesData.data
          : [];

        const filtered = casesArray.filter(item => {
          const itemEmail = (item.email_id || "").trim().toLowerCase();
          return itemEmail === userEmail;
        });

        setMatchedCases(filtered);

        // Pre-select the first case if not set already
        if (filtered.length > 0 && !selectedCaseId) {
          setSelectedCaseId(filtered[0].id.toString());
        }

        // Extract documents from matched cases
        const docItems = [];
        filtered.forEach(item => {
          const docs = Array.isArray(item.documents) ? item.documents : [];
          docs.forEach((doc, idx) => {
            if (!doc.file && !doc.url) return; // skip empty entries
            docItems.push({
              id: `db-doc-${item.id}-${idx}`,
              caseTitle: item.case_title || "Untitled Case",
              name: doc.documentType || "Document",
              type: doc.documentType || "Document",
              fileName: doc.file || "File",
              fileUrl: doc.url || null,
              date: (() => {
                // Use the document's own upload date; fall back to today if not stored
                const raw = doc.uploadedAt || doc.uploaded_at || null;
                const d = raw ? new Date(raw) : new Date();
                return isNaN(d.getTime())
                  ? new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              })(),
              status: "Submitted",
            });
          });
        });
        setDocuments(docItems);
      }
    } catch (err) {
      console.error("Failed to fetch client documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!loading && perms.view) {
      fetchClientDocs();
    }
  }, [loading, perms.view, user]);

  const handleUpload = async () => {
    if (!perms.add) {
      alert("You do not have permission to upload documents.");
      return;
    }
    const finalDocType = documentType || documentCategory;
    if (!finalDocType || !file || !selectedCaseId) {
      alert("Please select a case, document category, document type and choose a file");
      return;
    }

    const targetCase = matchedCases.find(c => c.id.toString() === selectedCaseId.toString());
    if (!targetCase) {
      alert("Selected case not found.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file directly via multipart/form-data to support files up to 5GB
      const formDataObj = new FormData();
      formDataObj.append("file", file);

      const uploadRes = await fetch(`${API_BASE_URL}/case-management/upload`, {
        method: "POST",
        body: formDataObj,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage server");
      }

      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData.url;

      // 2. Put the metadata payload with the file URL into case management
      const newDoc = {
        documentType: finalDocType,
        advocate: targetCase.selected_advocate || "",
        file: file.name,
        url: uploadedUrl,
        uploadedAt: new Date().toISOString(), // capture exact upload date/time
        uploaded_at: new Date().toISOString(),
        view: true,
        upload: true,
        edit: true,
        delete: true,
      };

      const existingDocs = Array.isArray(targetCase.documents) ? targetCase.documents : [];
      const updatedDocs = [...existingDocs, newDoc];

      const payload = {
        caseId: targetCase.case_id,
        cnrNumber: targetCase.cnr_number,
        caseTitle: targetCase.case_title,
        caseNo: targetCase.case_no,
        caseType: targetCase.case_type,
        caseDes: targetCase.case_description,
        clientName: targetCase.client_name,
        contactNumber: targetCase.contact_number,
        emailId: targetCase.email_id,
        courtName: targetCase.court_name,
        courtType: targetCase.court_type,
        status: targetCase.status,
        selectedAdvocate: targetCase.selected_advocate,
        documents: updatedDocs.map(d => ({
          documentType: d.documentType,
          advocate: d.advocate || "",
          file: d.file,
          url: d.url || null,
          uploadedAt: d.uploadedAt || d.uploaded_at || null,
          uploaded_at: d.uploadedAt || d.uploaded_at || null,
          view: d.view !== undefined ? d.view : true,
          upload: d.upload !== undefined ? d.upload : true,
          edit: d.edit !== undefined ? d.edit : true,
          delete: d.delete !== undefined ? d.delete : true,
        })),
        nextHearingDate: targetCase.next_hearing_date,
      };

      const response = await fetch(`${API_BASE_URL}/case-management/${targetCase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setUploadSuccess(true);
        setDocumentCategory("");
        setDocumentType("");
        setFile(null);
        fetchClientDocs();
      } else {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to update case with document metadata");
      }
    } catch (err) {
      console.error("Upload document failed:", err);
      alert(err.message || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Step 1: Show confirm modal
  const handleDelete = (docId) => {
    if (!perms.delete) return;
    setConfirmDeleteId(docId);
  };

  // Step 2: Actually perform deletion after confirmation
  const confirmDeleteAction = async () => {
    const docId = confirmDeleteId;
    setConfirmDeleteId(null);

    if (typeof docId === "string" && docId.startsWith("db-doc-")) {
      const parts = docId.split("-");
      const caseIdStr = parts[2];
      const docIndex = parseInt(parts[3], 10);

      const targetCase = matchedCases.find(c => c.id.toString() === caseIdStr);
      if (!targetCase) return;

      const existingDocs = Array.isArray(targetCase.documents) ? targetCase.documents : [];
      const updatedDocs = existingDocs.filter((_, idx) => idx !== docIndex);

      const payload = {
        caseId: targetCase.case_id,
        cnrNumber: targetCase.cnr_number,
        caseTitle: targetCase.case_title,
        caseNo: targetCase.case_no,
        caseType: targetCase.case_type,
        caseDes: targetCase.case_description,
        clientName: targetCase.client_name,
        contactNumber: targetCase.contact_number,
        emailId: targetCase.email_id,
        courtName: targetCase.court_name,
        courtType: targetCase.court_type,
        status: targetCase.status,
        selectedAdvocate: targetCase.selected_advocate,
        documents: updatedDocs.map(d => ({
          documentType: d.documentType,
          advocate: d.advocate || "",
          file: d.file,
          url: d.url || null,
          uploadedAt: d.uploadedAt || d.uploaded_at || null,
          uploaded_at: d.uploadedAt || d.uploaded_at || null,
          view: d.view !== undefined ? d.view : true,
          upload: d.upload !== undefined ? d.upload : true,
          edit: d.edit !== undefined ? d.edit : true,
          delete: d.delete !== undefined ? d.delete : true,
        })),
        nextHearingDate: targetCase.next_hearing_date,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/case-management/${targetCase.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          fetchClientDocs();
          setSuccessToast("Document deleted successfully!");
          setTimeout(() => setSuccessToast(""), 3000);
        } else {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to delete document");
        }
      } catch (err) {
        console.error("Delete document failed:", err);
      }
    } else {
      setDocuments(documents.filter((doc) => doc.id !== docId));
      setSuccessToast("Document deleted successfully!");
      setTimeout(() => setSuccessToast(""), 3000);
    }
  };

  // No view access → show access denied page
  if (!loading && !perms.view) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 max-w-sm text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 text-sm mt-2">
            You do not have permission to view Documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-200 overflow-hidden">

      {/* ── Page Header & Tab Bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-full min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold shrink-0 border border-blue-100 shadow-xs">
              <FileText size={18} className="sm:w-[20px] sm:h-[20px]" />
            </div>
            <h1 className="text-[#0F172A] font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight truncate">
              Client Documents
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed break-words">
            Upload, track, and verify case documents and required format checklists
          </p>
        </div>

        {/* Mobile Dropdown Tab Selector (Visible on < 768px) */}
        <div className="block md:hidden w-full min-w-0">
          <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
            Active Section:
          </label>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-xs cursor-pointer"
          >
            <option value="my-documents">My Documents</option>
            <option value="document-format">Document Format & Checklist</option>
          </select>
        </div>

        {/* Desktop & Tablet Tab Pills Strip (Visible on >= 768px) */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0] shrink-0">
          <button
            onClick={() => setActiveTab("my-documents")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
              activeTab === "my-documents"
                ? "bg-white text-[#2563EB] shadow-xs border border-[#CBD5E1]"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <FileText size={14} className="shrink-0" />
            <span>My Documents</span>
          </button>
          <button
            onClick={() => setActiveTab("document-format")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
              activeTab === "document-format"
                ? "bg-white text-[#2563EB] shadow-xs border border-[#CBD5E1]"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <ClipboardList size={14} className="shrink-0" />
            <span>Document Format & Checklist</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: MY DOCUMENTS ── */}
      {activeTab === "my-documents" && (
        <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-200 w-full max-w-full min-w-0">
          
          {/* Upload Section — only shown if add is allowed */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-xs space-y-4 w-full max-w-full min-w-0">
            <div className="pb-2 border-b border-[#F1F5F9]">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-[#0F172A]">Upload New Document</h2>
            </div>

            {perms.add ? (
              <div className="space-y-4 w-full max-w-full min-w-0">
                {/* Associated Case Select */}
                <div className="w-full min-w-0">
                  <label className="block text-[11px] sm:text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-1.5">
                    Associated Case <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition cursor-pointer shadow-xs"
                  >
                    <option value="">Select Associated Case</option>
                    {matchedCases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.case_title} ({item.case_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start w-full max-w-full min-w-0">
                  {/* Document Category Select */}
                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Document Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={documentCategory}
                      onChange={(e) => {
                        setDocumentCategory(e.target.value);
                        setDocumentType("");
                      }}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition cursor-pointer shadow-xs"
                    >
                      <option value="">Select Category</option>
                      {Object.keys(documentCategories).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Document Type Select */}
                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-1.5 truncate">
                      {documentCategory === "Affidavits" ? "Affidavit Type" : "Document Type"} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={!documentCategory}
                      className={`w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition cursor-pointer shadow-xs ${
                        !documentCategory ? "bg-slate-50 cursor-not-allowed text-slate-400 opacity-60" : ""
                      }`}
                    >
                      <option value="">
                        {documentCategory === "Affidavits" ? "Select Affidavit Type" : "Select Document Type"}
                      </option>
                      {documentCategory &&
                        documentCategories[documentCategory]?.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* File Upload Field */}
                  <div className="w-full min-w-0 sm:col-span-2 lg:col-span-1">
                    <label className="block text-[11px] sm:text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Upload File <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                      className="w-full max-w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#2563EB] hover:file:bg-blue-100 cursor-pointer shadow-xs transition truncate"
                    />
                  </div>
                </div>

                {matchedCases.length === 0 && (
                  <p className="text-xs text-red-500 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100">
                    ⚠️ No cases found linked to your account. Please contact your advocate to create a case for you.
                  </p>
                )}

                <div className="pt-2 flex justify-start">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className={`w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-6 py-2.5 sm:py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xs ${
                      uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Upload Document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <AccessDenied action="Uploading" />
            )}
          </div>

          {/* Uploaded Documents Section */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-xs space-y-4 w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9] w-full">
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-[#0F172A]">Uploaded Documents</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Documents uploaded for your advocate to review.</p>
              </div>

              {/* Filter by Case Title */}
              {documents.length > 0 && (
                <div className="w-full sm:w-auto min-w-[200px]">
                  <select
                    value={filterCaseTitle}
                    onChange={(e) => setFilterCaseTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none cursor-pointer shadow-xs"
                  >
                    <option value="">All Cases ({documents.length})</option>
                    {[...new Set(documents.map((d) => d.caseTitle))].map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loadingDocs ? (
              <div className="py-10 text-center text-slate-500 font-semibold text-xs sm:text-sm">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="py-10 sm:py-14 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <FileText size={20} />
                </div>
                <p className="text-slate-700 font-bold text-xs sm:text-sm">No documents found</p>
                <p className="text-slate-400 text-xs">Upload a document above to share it with your legal counsel.</p>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table View (Visible on >= 768px) */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-[#E2E8F0] w-full">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                        <th className="p-3.5">Case Title</th>
                        <th className="p-3.5">File Name</th>
                        <th className="p-3.5">Uploaded Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-medium text-slate-700">
                      {documents
                        .filter((doc) => !filterCaseTitle || doc.caseTitle === filterCaseTitle)
                        .map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-bold text-[#0F172A]">{doc.caseTitle}</td>
                            <td className="p-3.5 font-mono text-xs text-slate-600 truncate max-w-[200px]" title={doc.fileName}>{doc.fileName}</td>
                            <td className="p-3.5 text-slate-500 font-semibold">{doc.date}</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                                {doc.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {perms.view && (
                                  <button
                                    onClick={() => setSelectedDoc({ fileUrl: doc.fileUrl, title: doc.fileName || doc.name, badge: doc.type })}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#2563EB] rounded-lg transition cursor-pointer border border-blue-100"
                                    title="View Document"
                                  >
                                    <Eye size={16} />
                                  </button>
                                )}
                                {perms.delete ? (
                                  <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer border border-rose-100"
                                    title="Delete Document"
                                  >
                                    <Trash size={16} />
                                  </button>
                                ) : (
                                  <span className="p-1.5 text-slate-300">
                                    <Trash size={16} />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards Stack View (Visible on < 768px) */}
                <div className="block md:hidden space-y-3 w-full max-w-full min-w-0">
                  {documents
                    .filter((doc) => !filterCaseTitle || doc.caseTitle === filterCaseTitle)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-[#F1F5F9] pb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-xs text-[#0F172A] truncate">{doc.caseTitle}</h4>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{doc.fileName}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 shrink-0">
                            {doc.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="font-semibold">Uploaded: {doc.date}</span>
                          <div className="flex items-center gap-2">
                            {perms.view && (
                              <button
                                onClick={() => setSelectedDoc({ fileUrl: doc.fileUrl, title: doc.fileName || doc.name, badge: doc.type })}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold rounded-lg text-xs flex items-center gap-1 border border-blue-100 cursor-pointer"
                              >
                                <Eye size={12} /> View
                              </button>
                            )}
                            {perms.delete && (
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs border border-rose-100 cursor-pointer"
                              >
                                <Trash size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: DOCUMENT FORMAT & CHECKLIST ── */}
      {activeTab === "document-format" && (
        <div className="animate-in fade-in duration-200 w-full max-w-full min-w-0">
          <DocumentFormatGenerateView hideHeader={true} />
        </div>
      )}

      {selectedDoc && (
        <DocumentViewerModal
          fileUrl={selectedDoc.fileUrl}
          title={selectedDoc.title}
          badge={selectedDoc.badge}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* ── Confirm Delete Modal (portal → covers sidebar + navbar) ── */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash size={26} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Document?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-slate-600 font-medium text-sm hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Success Toast (portal → always on top) ── */}
      {successToast && createPortal(
        <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-lg">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-semibold">{successToast}</span>
        </div>,
        document.body
      )}
      {/* ── Upload Success Modal (portal → covers sidebar + navbar) ── */}
      {uploadSuccess && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Uploaded Successfully!</h3>
            <p className="text-sm text-slate-500 mb-6">
              Your document has been uploaded successfully.
            </p>
            <button
              onClick={() => setUploadSuccess(false)}
              className="px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium text-sm transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}