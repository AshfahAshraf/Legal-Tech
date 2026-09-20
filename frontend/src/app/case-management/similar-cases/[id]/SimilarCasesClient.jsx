"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/utils/api";
import {
  ArrowLeft,
  Scale,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BookOpen,
  Search,
  TrendingUp,
  Gavel,
  FileText,
  Shield,
  Building2,
  RefreshCw,
  Award,
  Zap,
  Target,
  UserCheck,
  FileCheck2,
  Bookmark,
  Download,
} from "lucide-react";

// ─── Outcome badge ───────────────────────────────────────────────────────────
function OutcomeBadge({ outcome }) {
  const cfg = {
    Won: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", icon: <CheckCircle size={12} />, label: "WON" },
    Lost: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", icon: <XCircle size={12} />, label: "LOST" },
    Pending: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", icon: <Clock size={12} />, label: "PENDING" },
    Disposed: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", icon: <Scale size={12} />, label: "DISPOSED" },
    Unknown: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", icon: <AlertTriangle size={12} />, label: "UNKNOWN" },
  };
  const c = cfg[outcome] || cfg.Unknown;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border font-extrabold text-[11px] tracking-wide ${c.bg} ${c.text} ${c.border} shrink-0`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  return source === "ecourts" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
      ⚡ eCourts Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
      🏛 Internal Firm
    </span>
  );
}

// ─── Main Client Page Component ───────────────────────────────────────────────
export default function SimilarCasesClient({ caseId }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState(null);
  const [similarData, setSimilarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [caseLoading, setCaseLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  // Fetch active case (tries case-management endpoint first, then assigned-cases endpoint)
  useEffect(() => {
    if (!caseId) return;
    const fetchCase = async () => {
      setCaseLoading(true);
      try {
        // 1. Try case-management endpoint first
        const res = await fetch(`${API_BASE_URL}/case-management/${caseId}`);
        if (res.ok) {
          const data = await res.json();
          setCaseData(data);
          return;
        }

        // 2. Fall back to assigned-cases endpoint if case-management is 404
        const assignedRes = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases/${caseId}`);
        if (assignedRes.ok) {
          const assignedData = await assignedRes.json();

          // If assigned case links to a master case_id, try fetching master case
          if (assignedData.case_id) {
            const masterRes = await fetch(`${API_BASE_URL}/case-management/${assignedData.case_id}`);
            if (masterRes.ok) {
              const masterData = await masterRes.json();
              setCaseData(masterData);
              return;
            }
          }

          // Otherwise construct full caseData from assignedData
          setCaseData({
            id: assignedData.id,
            case_id: assignedData.case_id || assignedData.id,
            case_title: assignedData.case_title || assignedData.title || assignedData.caseTitle || `Case #${assignedData.case_number || assignedData.id}`,
            case_no: assignedData.case_number || assignedData.caseNo || assignedData.case_id_code || `ID-${assignedData.id}`,
            case_type: assignedData.practice_area || assignedData.practice_court || "Civil",
            court_name: assignedData.practice_court || assignedData.court_name || "High Court",
            court_type: assignedData.practice_court ? "High Court" : "District Court",
            cnr_number: assignedData.cnr_number || assignedData.cnrNumber || "",
            client_name: assignedData.client_name || assignedData.client || "Client",
            status: assignedData.status || "Active",
            case_description: assignedData.assignment_notes || "",
          });
        }
      } catch (e) {
        console.error("Failed to load parent case:", e);
      } finally {
        setCaseLoading(false);
      }
    };
    fetchCase();
  }, [caseId]);

  // Fetch similar cases & AI report
  const fetchSimilarCases = async () => {
    if (!caseData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ecourts/similar-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseType: caseData.case_type || caseData.practice_area || "Civil",
          courtType: caseData.court_type || "High Court",
          courtName: caseData.court_name || "High Court",
          caseId: Number(caseData.case_id || caseData.id || caseId),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimilarData(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to fetch similar cases.");
      }
    } catch (e) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseData) fetchSimilarCases();
  }, [caseData]);

  const cases = similarData?.cases || [];
  const stats = similarData?.summaryStats || {};
  const master = similarData?.masterStrategy || {};
  const activePrecedent = cases[selectedCaseIdx] || null;

  const handleDownloadSummary = () => {
    if (!master || !caseData) return;
    
    const timeStr = new Date().toLocaleString();
    const fileName = `Legal_Brief_Case_${caseId}_${Date.now()}.txt`;
    
    const fileContent = `================================================================================
LEGAL TECH ENTERPRISE — MASTER AI STRATEGIC LEGAL BRIEF
================================================================================
Case Title: ${caseData.case_title || "N/A"}
Case ID: #${caseId} | Case No: ${caseData.case_no || "N/A"} | CNR: ${caseData.cnr_number || "N/A"}
Court: ${caseData.court_name || "N/A"}
Generated Date: ${timeStr}
Estimated Win Likelihood: ${master.winProbability || 75}%
Precedents Analyzed: ${cases.length} cases
--------------------------------------------------------------------------------

I. KEY WINNING FORMULA:
${master.winningFormula || "Focus on documentary proof and statutory compliance."}

II. CRITICAL LOOPHOLES & VULNERABILITIES TO PATCH:
${(master.keyLoopholes || []).map((l, i) => `${i + 1}. ${l}`).join("\n")}

III. MAIN LEGAL ARGUMENTS TO PRESENT IN COURT:
${(master.mainArguments || []).map((a, i) => `✓ ${a}`).join("\n")}

IV. STATUTORY SECTIONS TO CITE:
${(master.importantActs || []).join(", ")}

V. SENIOR ADVOCATE TRIAL PLAYBOOK:
${master.advocateRecommendation || "File protective interim applications early."}
================================================================================
`;

    // Download text file
    const element = document.createElement("a");
    const file = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    // Save brief entry to localStorage for Case Detail View
    try {
      const storageKey = `saved_briefs_${caseId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const newBrief = {
        id: Date.now(),
        fileName: fileName,
        downloadedAt: timeStr,
        winProbability: master.winProbability || 75,
        winningFormula: master.winningFormula,
        keyLoopholes: master.keyLoopholes,
        mainArguments: master.mainArguments,
        importantActs: master.importantActs,
        advocateRecommendation: master.advocateRecommendation,
        fileContent: fileContent,
      };
      existing.unshift(newBrief);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (e) {
      console.error("Failed to save brief to localStorage:", e);
    }

    alert("✅ Strategic Brief downloaded and saved to Previous Similar Case History!");
  };


  if (caseLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading case details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 pb-20 overflow-x-hidden">
      {/* ── STICKY TOP NAV BAR (FULLY RESPONSIVE) ───────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push(`/case-management/view/${caseId}`);
                }
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600 shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-xl font-black text-[#0F172A] truncate">
                  Similar Case Legal Brief &amp; Strategy
                </h1>
              </div>
              {caseData && (
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate max-w-[250px] sm:max-w-[450px] md:max-w-xl lg:max-w-2xl">
                  Target Case: <span className="font-bold text-slate-800">{caseData.case_title}</span>
                  {caseData.case_type && <span className="text-slate-400"> · {caseData.case_type}</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              onClick={handleDownloadSummary}
              disabled={loading || !similarData}
              className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              title="Download Brief & Save to Case History"
            >
              <Download size={13} />
              <span>Download &amp; Save Brief</span>
            </button>

            <button
              onClick={fetchSimilarCases}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Analyzing…" : "Refresh AI Report"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">

        {/* ── HEADER BAR: COMPARED PRECEDENT CASES (RESPONSIVE CHIPS) ───────── */}
        {similarData && cases.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                  {cases.length}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-[#0F172A]">Compared Precedent Cases</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Select any case pill below to view its complete record on this page</p>
                </div>
              </div>
              <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shrink-0">
                Active: Case #{selectedCaseIdx + 1}
              </span>
            </div>

            {/* Responsive Flex-Wrap Chips List */}
            <div className="flex flex-wrap gap-2 max-h-[160px] sm:max-h-[180px] overflow-y-auto p-1 scrollbar-thin">
              {cases.map((c, idx) => {
                const isSelected = idx === selectedCaseIdx;
                const titleDisplay = (c.caseTitle && c.caseTitle.trim().toLowerCase() !== "court case")
                  ? c.caseTitle
                  : `${c.petitioner || "Petitioner"} vs. ${c.respondent || "Respondent"}`;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCaseIdx(idx);
                      const el = document.getElementById("precedent-detail-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md ring-2 ring-indigo-500/20"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isSelected ? "bg-indigo-500 text-white" : "bg-white border border-slate-300 text-slate-600"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[260px]">{titleDisplay}</span>
                    <OutcomeBadge outcome={c.outcome} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LOADING OVERLAY ───────────────────────────────────────────── */}
        {loading && (
          <div className="bg-white rounded-3xl border border-indigo-200 p-8 sm:p-12 flex flex-col items-center gap-4 shadow-sm text-center">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-indigo-100 rounded-full" />
              <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Scale size={18} className="text-indigo-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold text-indigo-900">Generating Master Legal Brief &amp; Report</p>
              <p className="text-xs text-indigo-600 mt-1">Analyzing eCourts live registry &amp; firm precedents…</p>
            </div>
          </div>
        )}

        {/* ── ERROR DISPLAY ─────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle size={32} className="text-red-400 mx-auto mb-3" />
            <h4 className="font-bold text-red-800 text-sm mb-1">Analysis Failed</h4>
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={fetchSimilarCases}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── UNIFIED MASTER LEGAL BRIEF DOCUMENT (RESPONSIVE GRID) ──────── */}
        {similarData && !loading && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Responsive Banner Header */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white p-5 sm:p-7 md:p-8 border-b border-indigo-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-3 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg uppercase tracking-wider">
                      Master Legal Brief &amp; Strategy
                    </span>
                    <span className="px-3 py-1 bg-white/10 border border-white/20 text-indigo-200 text-xs font-bold rounded-lg">
                      Based on {cases.length} Precedent Cases
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug break-words">
                    {caseData?.case_title || "Current Case Legal Brief"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-indigo-200">
                    <span>CNR: {caseData?.cnr_number || "N/A"}</span>
                    <span className="hidden sm:inline">·</span>
                    <span>Case No: {caseData?.case_no || "N/A"}</span>
                    <span className="hidden sm:inline">·</span>
                    <span>Court: {caseData?.court_name || "Court"}</span>
                  </div>
                </div>

                {/* Win Likelihood Box */}
                <div className="lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between sm:justify-start gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Estimated Win Likelihood</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">{master.winProbability || 75}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Award size={24} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Strip (Responsive Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs">
              <div className="p-3.5 sm:p-4 text-center border-r border-b md:border-b-0 border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Won Precedents</p>
                <p className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">{stats.won || 0} Cases</p>
              </div>
              <div className="p-3.5 sm:p-4 text-center border-b md:border-b-0 md:border-r border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lost Precedents</p>
                <p className="text-base sm:text-lg font-black text-rose-600 mt-0.5">{stats.lost || 0} Cases</p>
              </div>
              <div className="p-3.5 sm:p-4 text-center border-r border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Precedents</p>
                <p className="text-base sm:text-lg font-black text-amber-600 mt-0.5">{stats.pending || 0} Cases</p>
              </div>
              <div className="p-3.5 sm:p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Win Rate</p>
                <p className="text-base sm:text-lg font-black text-blue-600 mt-0.5">{stats.winRate || 0}%</p>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
              
              {/* Section II: Winning Formula */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Award size={18} className="text-amber-500 shrink-0" />
                  <h3 className="font-black text-sm sm:text-base text-[#0F172A] uppercase tracking-wider">
                    I. Key Winning Formula
                  </h3>
                </div>
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-amber-950 leading-relaxed font-semibold">
                  {master.winningFormula || "Establish a solid documentary trail and prove compliance with statutory preconditions in proceedings."}
                </div>
              </div>

              {/* Section III: Vulnerabilities & Loopholes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                  <h3 className="font-black text-sm sm:text-base text-[#0F172A] uppercase tracking-wider">
                    II. Critical Loopholes &amp; Points of Vulnerability (To Patch)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(master.keyLoopholes || [
                    "Delayed service of legal notices beyond statutory limitation window",
                    "Lack of primary electronic evidence certificate (Sec 65B Evidence Act)",
                    "Failure to quantify precise quantum of monetary loss or specific performance",
                    "Non-joinder of necessary parties in court filings"
                  ]).map((loop, i) => (
                    <div key={i} className="flex items-start gap-3 bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs sm:text-sm text-rose-950 font-semibold">
                      <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{loop}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section IV: Main Legal Arguments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Scale size={18} className="text-blue-600 shrink-0" />
                  <h3 className="font-black text-sm sm:text-base text-[#0F172A] uppercase tracking-wider">
                    III. Main Legal Arguments to Present in Court
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {(master.mainArguments || [
                    "Establish mandatory statutory compliance and procedural regularity under law",
                    "Highlight material contradictions and gaps in opposing party's pleadings and affidavits",
                    "Invoke Apex Court precedent on fundamental rights and natural justice safeguards"
                  ]).map((arg, i) => (
                    <div key={i} className="flex items-start gap-3 bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs sm:text-sm text-blue-950 font-semibold">
                      <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                      <span className="leading-relaxed">{arg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section V: Statutory Sections to Cite */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Shield size={18} className="text-indigo-600 shrink-0" />
                  <h3 className="font-black text-sm sm:text-base text-[#0F172A] uppercase tracking-wider">
                    IV. Statutory Sections &amp; Acts to Rely Upon
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(master.importantActs || stats.topActs || ["IPC Section 420", "CPC Order 39 Rule 1 & 2", "Indian Evidence Act Sec 65B", "Constitution Article 21"]).map((act, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold shadow-2xs">
                      📜 {act}
                    </span>
                  ))}
                </div>
              </div>

              {/* Section VI: Senior Advocate Playbook */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Zap size={18} className="text-amber-500 shrink-0" />
                  <h3 className="font-black text-sm sm:text-base text-[#0F172A] uppercase tracking-wider">
                    V. Senior Advocate Trial Action Plan
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-2xl p-5 sm:p-6 shadow-lg space-y-2">
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-100">
                    {master.advocateRecommendation || "File protective interim applications early, challenge opposing evidence admissibility under Section 65B, and cross-examine on timeline gaps."}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── ON-PAGE PRECEDENT CASE DETAILS SECTION ─────────────────────── */}
        {activePrecedent && (
          <div id="precedent-detail-section" className="bg-white rounded-3xl border border-indigo-200 shadow-lg overflow-hidden space-y-0">
            {/* Banner Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-3 py-1 bg-indigo-500 text-white font-black text-xs rounded-lg">
                    Precedent Record #{selectedCaseIdx + 1} of {cases.length}
                  </span>
                  <OutcomeBadge outcome={activePrecedent.outcome} />
                  <SourceBadge source={activePrecedent.source} />
                </div>
                <h2 className="text-base sm:text-lg md:text-xl font-black text-white leading-snug break-words">
                  {(activePrecedent.caseTitle && activePrecedent.caseTitle.trim().toLowerCase() !== "court case")
                    ? activePrecedent.caseTitle
                    : `${activePrecedent.petitioner || "Petitioner"} vs. ${activePrecedent.respondent || "Respondent"}`}
                </h2>
                <p className="text-xs text-indigo-200 font-mono mt-1">CNR: {activePrecedent.cnrNumber || "N/A"} · Case No: {activePrecedent.caseNo || "N/A"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  disabled={selectedCaseIdx === 0}
                  onClick={() => setSelectedCaseIdx(selectedCaseIdx - 1)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  ← Prev
                </button>
                <button
                  disabled={selectedCaseIdx === cases.length - 1}
                  onClick={() => setSelectedCaseIdx(selectedCaseIdx + 1)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* On-Page Precedent Details */}
            <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Court Name</p>
                  <p className="font-extrabold text-slate-800 mt-0.5">{activePrecedent.courtName || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Case Type &amp; Filing</p>
                  <p className="font-extrabold text-slate-800 mt-0.5">{activePrecedent.caseType || "—"} {activePrecedent.filingDate ? `(${activePrecedent.filingDate})` : ""}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presiding Judge</p>
                  <p className="font-extrabold text-slate-800 mt-0.5">{activePrecedent.presidingJudge || "Hon'ble Presiding Judge"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                    <UserCheck size={12} /> Petitioner / Appellant
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">{activePrecedent.petitioner || "Petitioner"}</p>
                </div>
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <Shield size={12} /> Respondent / Opposing Party
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">{activePrecedent.respondent || "Respondent"}</p>
                </div>
              </div>

              {activePrecedent.outcomeDetail && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2">
                  <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={15} /> Judgment &amp; Verdict Analysis
                  </h4>
                  <p className="text-xs sm:text-sm text-emerald-900 font-semibold leading-relaxed">{activePrecedent.outcomeDetail}</p>
                </div>
              )}

              {activePrecedent.mainArgument && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-2">
                  <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale size={15} /> Core Legal Argument &amp; Defense Strategy
                  </h4>
                  <p className="text-xs sm:text-sm text-blue-900 leading-relaxed font-medium">{activePrecedent.mainArgument}</p>
                </div>
              )}

              {activePrecedent.loopholes && activePrecedent.loopholes.length > 0 && (
                <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Loopholes &amp; Evidence Gaps Identified in This Precedent
                  </h4>
                  <div className="space-y-2">
                    {activePrecedent.loopholes.map((loop, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-semibold text-rose-900 bg-white/70 rounded-xl p-3 border border-rose-100">
                        <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                        <span className="leading-relaxed">{loop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePrecedent.importantSections && activePrecedent.importantSections.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={15} /> Statutory Sections Cited
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activePrecedent.importantSections.map((sec, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800">
                        📜 {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
