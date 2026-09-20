"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";
import DocumentViewerModal from "@/components/common/DocumentViewerModal";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Upload,
  Eye,
  Filter,
  X,
  UploadCloud,
  ChevronDown
} from "lucide-react";

const BASE_URL = API_BASE_URL || "http://127.0.0.1:8000";

// ─── Comprehensive Indian Court Case Types & Documents ───────────────────────
const CASE_TYPE_DOCUMENTS = {
  "Writ & Appeal": [
    { name: "Certified Copy of Impugned Order", description: "Certified copy of lower court or single-bench order being challenged in appeal.", icon: "🏛️", isCommon: true },
    { name: "Writ Petition / Appeal Memorandum", description: "Full grounds of appeal or writ petition containing facts and question of law.", icon: "📝", isCommon: true },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or any government-issued photo ID.", icon: "🪪", isCommon: true },
    { name: "Lower Court Records & Evidence", description: "Exhibits, evidence documents, and pleadings from the trial court.", icon: "📚", isCommon: false },
    { name: "Vakalatnama", description: "Power of attorney authorising your advocate to represent you in High Court / Supreme Court.", icon: "✍️", isCommon: true },
  ],
  Criminal: [
    { name: "FIR Copy", description: "First Information Report filed with police — the primary complaint document.", icon: "📋", isCommon: true },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or any government-issued photo ID.", icon: "🪪", isCommon: true },
    { name: "Bail Application / Order", description: "Court-issued bail order or application details if bail is sought/granted.", icon: "⚖️", isCommon: true },
    { name: "Charge Sheet", description: "Copy of police charge sheet detailing offences and penal sections charged.", icon: "📄", isCommon: true },
    { name: "Witness Statements", description: "Recorded statements or affidavits from key witnesses.", icon: "🗣️", isCommon: false },
    { name: "Medical / Forensic Reports", description: "Doctor's wound certificate or forensic analysis report.", icon: "🏥", isCommon: false },
    { name: "Vakalatnama", description: "Power of attorney authorising your advocate to represent you in criminal court.", icon: "✍️", isCommon: true },
  ],
  Civil: [
    { name: "Plaint / Written Statement", description: "The main pleading document setting out your claim or written defence.", icon: "📝", isCommon: true },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or any government-issued photo ID.", icon: "🪪", isCommon: true },
    { name: "Agreement / Contract Copy", description: "Signed agreement, contract, or agreement to sell at dispute core.", icon: "📃", isCommon: true },
    { name: "Court Summons / Notice", description: "Court notice or summons received relating to this case.", icon: "📬", isCommon: true },
    { name: "Payment Receipts & Bank Statements", description: "Proof of financial transactions, invoices, or bank ledger records.", icon: "🧾", isCommon: false },
    { name: "Vakalatnama", description: "Power of attorney authorising your advocate to represent you in civil court.", icon: "✍️", isCommon: true },
  ],
  "Commercial & Cheque Bounce": [
    { name: "Original Dishonoured Cheque / Invoice", description: "Original bounced cheque or commercial tax invoice forming claim basis.", icon: "🏧", isCommon: true },
    { name: "Bank Return Memo", description: "Bank memo stating dishonour reason (Insufficient Funds / Account Closed).", icon: "🏛️", isCommon: true },
    { name: "Statutory Demand Legal Notice", description: "Legal notice issued to accused within statutory timeframe & postal receipt.", icon: "📬", isCommon: true },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or GST Certificate of firm.", icon: "🪪", isCommon: true },
    { name: "Vakalatnama", description: "Power of attorney authorising advocate in NI Act / Commercial court.", icon: "✍️", isCommon: true },
  ],
  Family: [
    { name: "Marriage Certificate", description: "Registered marriage certificate or marriage photograph with wedding card.", icon: "💍", isCommon: true },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or any government-issued photo ID.", icon: "🪪", isCommon: true },
    { name: "Income Proof / Salary Slips", description: "Last 6 months' salary slips or IT returns for maintenance / alimony calculation.", icon: "💰", isCommon: true },
    { name: "Children Birth Certificates", description: "Birth certificates of children for child custody or visitation claims.", icon: "👶", isCommon: false },
    { name: "Vakalatnama", description: "Power of attorney authorising advocate in Family Court.", icon: "✍️", isCommon: true },
  ],
  Property: [
    { name: "Sale Deed / Title Deed", description: "Registered sale deed or parent title deeds establishing ownership.", icon: "📜", isCommon: true },
    { name: "Encumbrance Certificate (EC)", description: "EC from Sub-Registrar office confirming property encumbrance status.", icon: "🏛️", isCommon: true },
    { name: "Patta / Khata Extract", description: "Revenue land record extract (Patta / Khata / RTC Revenue Extract).", icon: "📗", isCommon: true },
    { name: "Property Tax Receipts", description: "Recent paid property tax receipts proving physical possession.", icon: "🧾", isCommon: false },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or photo ID.", icon: "🪪", isCommon: true },
    { name: "Vakalatnama", description: "Power of attorney authorising advocate in land/property dispute.", icon: "✍️", isCommon: true },
  ],
  "Motor Accident (MACT)": [
    { name: "FIR & Charge Sheet Copy", description: "Police FIR and charge sheet filed against offending vehicle driver.", icon: "🚓", isCommon: true },
    { name: "Medical Discharge Summary / Bills", description: "Hospital discharge summary, medical bills, or disability certificate.", icon: "🏥", isCommon: true },
    { name: "Vehicle RC & Insurance Copy", description: "Registration certificate and insurance copy of involved vehicle.", icon: "🚗", isCommon: true },
    { name: "Identity & Income Proof", description: "Aadhaar card and salary slip / income proof of injured / deceased.", icon: "🪪", isCommon: true },
    { name: "Vakalatnama", description: "Power of attorney authorising advocate in Motor Accidents Claims Tribunal.", icon: "✍️", isCommon: true },
  ],
  Labour: [
    { name: "Employment Contract / Appointment Letter", description: "Signed appointment letter or employment contract.", icon: "📋", isCommon: true },
    { name: "Termination / Resignation Letter", description: "Termination order or resignation acceptance letter.", icon: "✉️", isCommon: true },
    { name: "Pay Slips (Last 6 Months)", description: "Salary slips or bank statement showing monthly salary credits.", icon: "💵", isCommon: true },
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or photo ID.", icon: "🪪", isCommon: true },
    { name: "Vakalatnama", description: "Power of attorney authorising advocate in Labour Court / CAT.", icon: "✍️", isCommon: true },
  ],
  Other: [
    { name: "Identity Proof", description: "Aadhaar Card, Passport, Voter ID, or any government photo ID.", icon: "🪪", isCommon: true },
    { name: "Relevant Case Documents", description: "Documents directly relevant to the legal matter or claim.", icon: "📁", isCommon: true },
    { name: "Sworn General Affidavit", description: "Affidavit declaring facts under oath for legal proceedings.", icon: "📝", isCommon: true },
    { name: "Vakalatnama", description: "Power of attorney authorising your advocate to represent you in court.", icon: "✍️", isCommon: true },
  ],
};

// ─── Case type display config ──────────────────────────────────────────────
const CASE_TYPE_CONFIG = {
  "Writ & Appeal": { color: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  Criminal: { color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  Civil: { color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  "Commercial & Cheque Bounce": { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Family: { color: "bg-pink-100 text-pink-700 border-pink-200", dot: "bg-pink-500" },
  Property: { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "Motor Accident (MACT)": { color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  Labour: { color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  Other: { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

// ─── Helper: match ANY Indian case type ──────────────────────────────────────
function resolveCaseType(rawType = "") {
  const t = rawType.toLowerCase().trim();
  if (t.includes("writ") || t.includes("appeal") || t.includes("wa") || t.includes("wp") || t.includes("slp")) return "Writ & Appeal";
  if (t.includes("criminal") || t.includes("fir") || t.includes("ipc") || t.includes("bail") || t.includes("bns")) return "Criminal";
  if (t.includes("cheque") || t.includes("bounce") || t.includes("138") || t.includes("nclt") || t.includes("commercial")) return "Commercial & Cheque Bounce";
  if (t.includes("mact") || t.includes("accident") || t.includes("motor")) return "Motor Accident (MACT)";
  if (t.includes("civil") || t.includes("contract") || t.includes("suit") || t.includes("injunction")) return "Civil";
  if (t.includes("family") || t.includes("matrimon") || t.includes("divorce") || t.includes("custody") || t.includes("maintenance")) return "Family";
  if (t.includes("property") || t.includes("land") || t.includes("real estate") || t.includes("partition") || t.includes("eviction")) return "Property";
  if (t.includes("labour") || t.includes("labor") || t.includes("employment") || t.includes("service")) return "Labour";
  return "Other";
}

// ─── Helper: PRECISE check if a doc is uploaded ──────────────────────────────
function isDocUploaded(docName, caseDocs = []) {
  if (!Array.isArray(caseDocs) || caseDocs.length === 0) return false;
  const normDocName = docName.toLowerCase().trim();

  return caseDocs.some((d) => {
    const docType = (d.documentType || "").toLowerCase().trim();
    const fileName = (d.file || d.name || d.url || "").toLowerCase().trim();

    if (!docType && !fileName) return false;

    if (normDocName.includes("identity") || normDocName.includes("aadhaar") || normDocName.includes("passport")) {
      return docType.includes("identity") || docType.includes("id proof") || fileName.includes("aadhaar") || fileName.includes("passport") || fileName.includes("id_proof");
    }
    if (normDocName.includes("vakalatnama")) {
      return docType.includes("vakalat") || fileName.includes("vakalat");
    }
    if (normDocName.includes("impugned order") || normDocName.includes("certified copy")) {
      return docType.includes("order") || docType.includes("certified") || fileName.includes("order") || fileName.includes("certified");
    }
    if (normDocName.includes("petition") || normDocName.includes("appeal memorandum") || normDocName.includes("plaint")) {
      return docType.includes("petition") || docType.includes("appeal") || docType.includes("plaint") || fileName.includes("petition") || fileName.includes("appeal");
    }
    if (normDocName.includes("fir")) {
      return docType.includes("fir") || fileName.includes("fir");
    }
    if (normDocName.includes("bail")) {
      return docType.includes("bail") || fileName.includes("bail");
    }
    if (normDocName.includes("cheque")) {
      return docType.includes("cheque") || fileName.includes("cheque");
    }
    if (normDocName.includes("agreement") || normDocName.includes("contract")) {
      return docType.includes("agreement") || docType.includes("contract") || fileName.includes("contract") || fileName.includes("agreement");
    }
    if (normDocName.includes("summons") || normDocName.includes("notice")) {
      return docType.includes("summons") || docType.includes("notice") || fileName.includes("notice") || fileName.includes("summons");
    }
    if (normDocName.includes("deed") || normDocName.includes("title") || normDocName.includes("patta")) {
      return docType.includes("deed") || docType.includes("patta") || fileName.includes("deed");
    }
    if (normDocName.includes("mact") || normDocName.includes("accident")) {
      return docType.includes("accident") || docType.includes("rc") || fileName.includes("accident");
    }

    return docType === normDocName || fileName.includes(normDocName);
  });
}

function getUploadedDocObj(docName, caseDocs = []) {
  if (!Array.isArray(caseDocs) || caseDocs.length === 0) return null;
  const normDocName = docName.toLowerCase().trim();

  return caseDocs.find((d) => {
    const docType = (d.documentType || "").toLowerCase().trim();
    const fileName = (d.file || d.name || d.url || "").toLowerCase().trim();

    if (!docType && !fileName) return false;

    if (normDocName.includes("identity") || normDocName.includes("aadhaar") || normDocName.includes("passport")) {
      return docType.includes("identity") || docType.includes("id proof") || fileName.includes("aadhaar") || fileName.includes("passport") || fileName.includes("id_proof");
    }
    if (normDocName.includes("vakalatnama")) {
      return docType.includes("vakalat") || fileName.includes("vakalat");
    }
    if (normDocName.includes("impugned order") || normDocName.includes("certified copy")) {
      return docType.includes("order") || docType.includes("certified") || fileName.includes("order") || fileName.includes("certified");
    }
    if (normDocName.includes("petition") || normDocName.includes("appeal memorandum") || normDocName.includes("plaint")) {
      return docType.includes("petition") || docType.includes("appeal") || docType.includes("plaint") || fileName.includes("petition") || fileName.includes("appeal");
    }
    if (normDocName.includes("fir")) {
      return docType.includes("fir") || fileName.includes("fir");
    }
    if (normDocName.includes("bail")) {
      return docType.includes("bail") || fileName.includes("bail");
    }
    if (normDocName.includes("cheque")) {
      return docType.includes("cheque") || fileName.includes("cheque");
    }
    if (normDocName.includes("agreement") || normDocName.includes("contract")) {
      return docType.includes("agreement") || docType.includes("contract") || fileName.includes("contract") || fileName.includes("agreement");
    }
    if (normDocName.includes("summons") || normDocName.includes("notice")) {
      return docType.includes("summons") || docType.includes("notice") || fileName.includes("notice") || fileName.includes("summons");
    }
    if (normDocName.includes("deed") || normDocName.includes("title") || normDocName.includes("patta")) {
      return docType.includes("deed") || docType.includes("patta") || fileName.includes("deed");
    }
    if (normDocName.includes("mact") || normDocName.includes("accident")) {
      return docType.includes("accident") || docType.includes("rc") || fileName.includes("accident");
    }

    return docType === normDocName || fileName.includes(normDocName);
  }) || null;
}

export default function DocumentFormatGenerateView({ hideHeader = false }) {
  const router = useRouter();

  // Filter Mode: "all" | "missing" | "uploaded" | "common"
  const [filterMode, setFilterMode] = useState("all");

  // Shared state
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState("");

  // Admin/Advocate view state
  const [isAdmin, setIsAdmin] = useState(false);
  const [allCases, setAllCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [viewerDoc, setViewerDoc] = useState(null);

  // Quick Upload Modal state
  const [uploadModalDoc, setUploadModalDoc] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchCases = async () => {
    const user = getLoggedInUser();
    const role = (user?.role || "").toLowerCase();
    const isUserAdmin = role.includes("admin") || role.includes("advocate") || role.includes("senior") || role.includes("junior");
    setIsAdmin(isUserAdmin);
    const name = user?.username || user?.name || "";

    try {
      const response = await fetch(`${BASE_URL}/case-management/`);
      if (response.ok) {
        const casesData = await response.json();
        const casesList = Array.isArray(casesData) ? casesData : [];
        setAllCases(casesList);

        if (isUserAdmin) {
          const clientMap = {};
          casesList.forEach((c) => {
            const clientName = c.client_name;
            if (!clientName) return;
            if (!clientMap[clientName]) {
              clientMap[clientName] = {
                name: clientName,
                email: c.email_id || "",
              };
            }
          });
          const clientList = Object.values(clientMap);
          setClients(clientList);
          if (clientList.length > 0 && !selectedClient) {
            setSelectedClient(clientList[0].name);
          }
        } else {
          const clientCases = casesList.filter((c) => {
            const caseEmail = (c.email_id || "").toLowerCase().trim();
            const userEmail = (user?.email || "").toLowerCase().trim();
            if (caseEmail && userEmail && caseEmail === userEmail) return true;
            if (c.client_name) {
              const normalizedName = c.client_name.toLowerCase().replace(/[^a-z0-9]/g, "");
              const normalizedUsername = name.toLowerCase().replace(/[^a-z0-9]/g, "");
              if (normalizedName === normalizedUsername) return true;
            }
            return false;
          });
          setCases(clientCases);
          if (clientCases.length > 0 && !selectedCase) setSelectedCase(clientCases[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Error fetching cases", err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      if (selectedClient) {
        const filtered = allCases.filter(
          (c) => (c.client_name || "").toLowerCase() === selectedClient.toLowerCase()
        );
        setCases(filtered);
        if (filtered.length > 0) {
          setSelectedCase(filtered[0].id.toString());
        } else {
          setSelectedCase("");
        }
      } else {
        setCases([]);
        setSelectedCase("");
      }
    }
  }, [selectedClient, isAdmin, allCases]);

  // Derived selected case
  const selectedCaseObj = cases.find((c) => c.id.toString() === selectedCase) || null;
  const resolvedType = selectedCaseObj ? resolveCaseType(selectedCaseObj.case_type || "") : null;
  const requiredDocs = resolvedType ? (CASE_TYPE_DOCUMENTS[resolvedType] || CASE_TYPE_DOCUMENTS.Other) : [];
  const uploadedDocs = selectedCaseObj?.documents || [];
  const uploadedCount = requiredDocs.filter((d) => isDocUploaded(d.name, uploadedDocs)).length;
  const progress = requiredDocs.length > 0 ? Math.round((uploadedCount / requiredDocs.length) * 100) : 0;

  const caseTypeConfig = resolvedType ? (CASE_TYPE_CONFIG[resolvedType] || CASE_TYPE_CONFIG.Other) : null;

  // Filtered documents list based on filterMode
  const displayedDocs = requiredDocs.filter((doc) => {
    const isUp = isDocUploaded(doc.name, uploadedDocs);
    if (filterMode === "missing") return !isUp;
    if (filterMode === "uploaded") return isUp;
    if (filterMode === "common") return doc.isCommon;
    return true;
  });

  // Handle Quick Upload
  const handleQuickUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadModalDoc || !selectedCaseObj) return;

    setUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", uploadFile);

      const uploadRes = await fetch(`${BASE_URL}/case-management/upload`, {
        method: "POST",
        body: formDataObj,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      const newDoc = {
        documentType: uploadModalDoc.name,
        advocate: selectedCaseObj.selected_advocate || "",
        file: uploadFile.name,
        url: fileUrl,
        uploadedAt: new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
        view: true,
        upload: true,
        edit: true,
        delete: true,
      };

      const existingDocs = Array.isArray(selectedCaseObj.documents) ? selectedCaseObj.documents : [];
      const updatedDocs = [...existingDocs, newDoc];

      const payload = {
        caseId: selectedCaseObj.case_id,
        cnrNumber: selectedCaseObj.cnr_number,
        caseTitle: selectedCaseObj.case_title,
        caseNo: selectedCaseObj.case_no,
        caseType: selectedCaseObj.case_type,
        caseDes: selectedCaseObj.case_description,
        clientName: selectedCaseObj.client_name,
        contactNumber: selectedCaseObj.contact_number,
        emailId: selectedCaseObj.email_id,
        courtName: selectedCaseObj.court_name,
        courtType: selectedCaseObj.court_type,
        status: selectedCaseObj.status,
        selectedAdvocate: selectedCaseObj.selected_advocate,
        documents: updatedDocs,
      };

      const putRes = await fetch(`${BASE_URL}/case-management/${selectedCaseObj.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!putRes.ok) throw new Error("Failed to update case documents");

      await fetchCases();
      setUploadModalDoc(null);
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      alert("Error uploading document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

      {/* Page Header (hidden if embedded inside tab view) */}
      {!hideHeader && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <ClipboardList className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              Document Format Checklist
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-xs sm:text-sm">
              View required documents for your case and upload missing files.
            </p>
          </div>
        </div>
      )}

      {/* DOCUMENT CHECKLIST SECTION */}
      <div className="space-y-6">

        {/* Unified Single Card Container: Select Case + Case Details + Progress + Filter */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">

          {/* Select Case Header Section */}
          <div className="space-y-4 pb-6 border-b border-slate-100">
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Filter by Client
                </label>
                {clients.length === 0 ? (
                  <div className="text-slate-400 text-sm">No clients found.</div>
                ) : (
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 font-medium outline-none transition-all"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">-- Choose a Client --</option>
                    {clients.map((cli, idx) => (
                      <option key={idx} value={cli.name}>
                        {cli.name} ({cli.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                {isAdmin ? "Select Case" : "Select Your Case"}
              </label>
              {cases.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 text-sm font-semibold">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {isAdmin ? "No cases found for the selected client." : "No cases found linked to your account. Please contact your advocate."}
                </div>
              ) : (
                <select
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 font-medium outline-none transition-all cursor-pointer"
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                >
                  <option value="">-- Choose a case --</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_no} — {c.case_title} ({c.case_type || "Unknown Type"})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Case Info + Progress + Filter inside the same Card */}
          {selectedCaseObj && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{selectedCaseObj.case_title}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{selectedCaseObj.case_no} · {selectedCaseObj.court_name || "Civil Court"}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {caseTypeConfig && (
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border ${caseTypeConfig.color}`}>
                      <span className={`w-2 h-2 rounded-full ${caseTypeConfig.dot}`} />
                      {resolvedType} Case
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-slate-600">Documents Submitted Status</span>
                  <span className={`font-bold ${uploadedCount === requiredDocs.length ? "text-emerald-600" : "text-blue-600"}`}>
                    {uploadedCount} / {requiredDocs.length} Uploaded
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${progress === 100 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {progress === 100
                    ? "✅ All required documents have been uploaded for this case!"
                    : `${requiredDocs.length - uploadedCount} document${requiredDocs.length - uploadedCount !== 1 ? "s" : ""} missing`}
                </p>
              </div>

              {/* Filter Dropdown */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter Documents:
                </label>
                <div className="relative w-full sm:w-72 shrink-0">
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold rounded-xl pl-3.5 pr-9 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none shadow-2xs"
                  >
                    <option value="all">All Documents ({requiredDocs.length})</option>
                    <option value="common">Common Core Documents ({requiredDocs.filter(d => d.isCommon).length})</option>
                    <option value="missing">Missing Documents ({requiredDocs.length - uploadedCount})</option>
                    <option value="uploaded">Uploaded Documents ({uploadedCount})</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Cards Grid */}
        {selectedCaseObj && (
          <>
            {displayedDocs.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-slate-500 font-semibold">
                No documents found matching the filter "{filterMode}".
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {displayedDocs.map((doc, idx) => {
                  const uploaded = isDocUploaded(doc.name, uploadedDocs);
                  const uploadedDocObj = getUploadedDocObj(doc.name, uploadedDocs);

                  return (
                    <div
                      key={idx}
                      className={`bg-white rounded-2xl border shadow-xs p-5 flex gap-4 transition-all duration-200 hover:shadow-md ${uploaded ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200 hover:border-blue-200"
                        }`}
                    >
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${uploaded ? "bg-emerald-100/60" : "bg-slate-100"
                        }`}>
                        {doc.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                            {doc.name}
                            {doc.isCommon && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                Common
                              </span>
                            )}
                          </h3>
                          {uploaded ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Uploaded
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertCircle className="w-3 h-3" /> Missing
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{doc.description}</p>

                        {/* Action Buttons */}
                        {!uploaded ? (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {!isAdmin && (
                              <button
                                onClick={() => setUploadModalDoc(doc)}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Upload Document
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {uploadedDocObj && (
                              <button
                                onClick={() => setViewerDoc({ fileUrl: uploadedDocObj.url, title: uploadedDocObj.file || uploadedDocObj.documentType, badge: uploadedDocObj.documentType })}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Document
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Upload Modal (Portal to body for full 100vw/100vh blur overlay) */}
      {uploadModalDoc && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 relative animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Upload Document</h3>
              </div>
              <button
                onClick={() => { setUploadModalDoc(null); setUploadFile(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Document Type
                </label>
                <input
                  type="text"
                  readOnly
                  value={uploadModalDoc.name}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-extrabold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setUploadModalDoc(null); setUploadFile(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload Now
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Document Viewer Modal */}
      {viewerDoc && (
        <DocumentViewerModal
          fileUrl={viewerDoc.fileUrl}
          title={viewerDoc.title}
          badge={viewerDoc.badge}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  );
}
