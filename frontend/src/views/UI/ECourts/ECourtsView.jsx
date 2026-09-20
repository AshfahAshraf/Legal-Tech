"use client";

import { useState, useEffect } from "react";
import {
  Scale,
  Search,
  RefreshCw,
  FileText,
  Calendar,
  Gavel,
  Clock,
  CheckCircle2,
  Download,
  ShieldCheck,
  AlertCircle,
  Building2,
  User,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Filter,
  Layers,
  CheckCircle,
  Clock3,
  FileDown,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser, getAuthHeaders } from "@/utils/auth";
import useModulePermission from "@/utils/useModulePermission";

export default function ECourtsView() {
  const { perms, loading, user } = useModulePermission("eCourts Integration");
  
  const [activeTab, setActiveTab] = useState("lookup"); // 'lookup', 'search', 'causelist', 'sync'
  
  // KPI Metrics State
  const [metrics, setMetrics] = useState({
    todaysHearings: 0,
    upcomingHearings: 0,
    casesUpdatedToday: 0,
    ordersDownloaded: 0,
  });
  
  // CNR Lookup State
  const [searchMode, setSearchMode] = useState("our"); // "our" (Firm's System Cases) or "external" (Other Cases)
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [cnrInput, setCnrInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [caseDetails, setCaseDetails] = useState(null);
  const [lookupError, setLookupError] = useState("");

  // Cause List State
  const [causeListCourt, setCauseListCourt] = useState("");
  const [causeListDate, setCauseListDate] = useState(new Date().toISOString().split("T")[0]);
  const [causeList, setCauseList] = useState([]);
  const [causeListLoading, setCauseListLoading] = useState(false);

  // Sync Hub State
  const [registeredCases, setRegisteredCases] = useState([]);
  const [syncingId, setSyncingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Fetch KPI Metrics & Registered Cases
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const headers = getAuthHeaders();
        const [metricsRes, casesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/ecourts/metrics`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/case-management/`, { headers }).catch(() => null),
        ]);

        if (metricsRes && metricsRes.ok) {
          const mData = await metricsRes.json();
          setMetrics(mData);
        }
        if (casesRes && casesRes.ok) {
          const cData = await casesRes.json();
          setRegisteredCases(cData);
        }
      } catch (err) {
        console.error("Error fetching eCourts initial data:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Handle CNR Lookup
  const handleCnrLookup = async (cnrToSearch) => {
    const targetCnr = (cnrToSearch || cnrInput).trim().toUpperCase();
    if (!targetCnr) {
      setLookupError("Please enter a valid CNR Number.");
      return;
    }
    setLookupLoading(true);
    setLookupError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/ecourts/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnrNumber: targetCnr }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to fetch eCourts data");
      }
      const data = await res.json();
      setCaseDetails(data);
    } catch (err) {
      setLookupError(err.message || "Could not retrieve eCourts case data.");
      setCaseDetails(null);
    } finally {
      setLookupLoading(false);
    }
  };



  // Handle Cause List Fetch
  const handleFetchCauseList = async () => {
    setCauseListLoading(true);
    try {
      const query = new URLSearchParams({
        courtName: causeListCourt,
        date: causeListDate,
      }).toString();
      const res = await fetch(`${API_BASE_URL}/api/ecourts/cause-list?${query}`);
      if (res.ok) {
        const data = await res.json();
        setCauseList(data);
      }
    } catch (err) {
      console.error("Cause list error:", err);
    } finally {
      setCauseListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "causelist") {
      handleFetchCauseList();
    }
  }, [activeTab]);

  // Handle Case Sync
  const handleSyncCase = async (caseId) => {
    setSyncingId(caseId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ecourts/sync/${caseId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`✅ ${data.message || "Case synchronized successfully!"}`);
        
        // Refresh registered cases list
        const updatedRes = await fetch(`${API_BASE_URL}/case-management/`);
        if (updatedRes.ok) {
          setRegisteredCases(await updatedRes.json());
        }
      } else {
        showToast("⚠️ Synchronization failed. Please try again.");
      }
    } catch (err) {
      showToast("❌ Network error during sync.");
    } finally {
      setSyncingId(null);
    }
  };

  const getStageColor = (stageName) => {
    switch (stageName?.toLowerCase()) {
      case "case filed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "first hearing":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "adjourned":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "order uploaded":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "judgment passed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 p-4 md:p-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Scale className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              eCourts India Integration Portal
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Live Sync Enabled
            </span>
          </div>
          <p className="text-slate-500 text-sm pl-11">
            Real-time CNR lookup, cause lists, automated case auto-fill, and chronological court order timelines.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => handleCnrLookup(cnrInput)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${lookupLoading ? "animate-spin" : ""}`} />
            Refresh Portal
          </button>
        </div>
      </div>

      {/* Main View Container */}
      <div className="space-y-6">
          {/* Search Box Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            {/* Search Mode Toggle Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  CNR Quick Lookup & Case Timeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a registered case from our Case Management or lookup any external case across India.
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("our");
                    setLookupError("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    searchMode === "our"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Our Cases ({registeredCases.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode("external");
                    setSelectedCaseId("");
                    setCnrInput("");
                    setLookupError("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    searchMode === "external"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  External / Other Case
                </button>
              </div>
            </div>

            {/* MODE 1: OUR SYSTEM CASES */}
            {searchMode === "our" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <select
                      value={selectedCaseId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCaseId(val);
                        const found = registeredCases.find(
                          (c) => String(c.id) === String(val) || String(c.case_id) === String(val)
                        );
                        if (found) {
                          const cnr = (found.cnr_number || found.cnrNumber || "").trim();
                          setCnrInput(cnr);
                          if (cnr) {
                            handleCnrLookup(cnr);
                          } else {
                            setLookupError("Selected case does not have a CNR Number assigned yet.");
                            setCaseDetails(null);
                          }
                        } else {
                          setCnrInput("");
                          setCaseDetails(null);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Select a Case from Case Management ({registeredCases.length} cases) --</option>
                      {registeredCases.map((c) => (
                        <option key={c.id || c.case_id} value={c.id}>
                          {c.case_title} — CNR: {c.cnr_number || c.cnrNumber || "No CNR"} ({c.client_name || "No Client"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleCnrLookup(cnrInput)}
                    disabled={lookupLoading || !cnrInput}
                    className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {lookupLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Fetching Timeline...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Load Case Timeline
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Select Chips for System Cases */}
                {registeredCases.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Quick Select System Case:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {registeredCases.slice(0, 6).map((c) => {
                        const isSelected = String(selectedCaseId) === String(c.id);
                        return (
                          <button
                            key={c.id || c.case_id}
                            type="button"
                            onClick={() => {
                              setSelectedCaseId(c.id);
                              const cnr = (c.cnr_number || c.cnrNumber || "").trim();
                              setCnrInput(cnr);
                              if (cnr) {
                                handleCnrLookup(cnr);
                              } else {
                                setLookupError("This case does not have a CNR Number assigned.");
                                setCaseDetails(null);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-blue-50 border-blue-300 text-blue-700 font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span className="truncate max-w-[180px]">{c.case_title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: EXTERNAL / OTHER CASE LOOKUP */}
            {searchMode === "external" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={16}
                      value={cnrInput}
                      onChange={(e) => setCnrInput(e.target.value.toUpperCase())}
                      placeholder="Enter 16-character external eCourts CNR (e.g. KLER010045212026)"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-slate-900 outline-none uppercase transition-all shadow-inner"
                    />
                    <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-mono">
                      {cnrInput.length}/16
                    </span>
                  </div>

                  <button
                    onClick={() => handleCnrLookup(cnrInput)}
                    disabled={lookupLoading || cnrInput.length < 16}
                    className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {lookupLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Searching eCourts...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Search External Case
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  ℹ️ Search any third-party or opposition case across eCourts India by entering its 16-character CNR Number.
                </p>
              </div>
            )}

            {lookupError && (
              <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {lookupError}
              </div>
            )}
          </div>

          {/* Case Details Summary Card */}
          {caseDetails && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-extrabold border border-blue-200">
                      CNR: {caseDetails.cnrNumber}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      {caseDetails.caseType} ({caseDetails.caseNo})
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      Status: {caseDetails.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{caseDetails.caseTitle}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {caseDetails.courtName} • {caseDetails.district}, {caseDetails.state}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right self-start lg:self-auto min-w-[220px]">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Next Hearing Date
                  </span>
                  <div className="text-lg font-extrabold text-blue-600 flex items-center justify-end gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {caseDetails.nextHearingDate || "To be scheduled"}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    Bench: {caseDetails.presidingJudge} ({caseDetails.courtHall})
                  </span>
                </div>
              </div>

              {/* Grid Metadata Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Petitioner</span>
                  <span className="font-bold text-slate-800">{caseDetails.petitioner}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Adv: {caseDetails.petitionerAdvocate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Respondent</span>
                  <span className="font-bold text-slate-800">{caseDetails.respondent}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Adv: {caseDetails.respondentAdvocate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Filing & Reg Date</span>
                  <span className="font-bold text-slate-800">Filing: {caseDetails.filingDate}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Reg: {caseDetails.registrationDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Current Case Stage</span>
                  <span className="font-bold text-purple-700">{caseDetails.caseStage}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{caseDetails.courtHall}</span>
                </div>
              </div>

              {/* CHRONOLOGICAL CASE TIMELINE */}
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Chronological Case Milestone Timeline
                </h3>

                <div className="relative pl-6 md:pl-8 space-y-6 before:absolute before:left-2.5 md:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {caseDetails.timeline.map((event, idx) => (
                    <div key={event.id || idx} className="relative group">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[27px] md:-left-[35px] top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center text-xs font-bold shadow-sm transition-transform group-hover:scale-110 ${
                          event.status === "Completed"
                            ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                            : "border-blue-500 text-blue-600 bg-blue-50 animate-pulse"
                        }`}
                      >
                        {idx + 1}
                      </span>

                      {/* Content Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStageColor(event.eventStage)}`}>
                            {event.eventStage}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {event.eventDate}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mb-1">{event.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">{event.description}</p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                          <span>Bench: {event.benchName} ({event.courtHall})</span>
                          {event.documentUrl && (
                            <a
                              href={event.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download Official Order PDF
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ORDERS AND JUDGMENTS SECTION */}
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Official eCourts Orders & Judgment Documents
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Order Date</th>
                        <th className="py-3 px-4">Order Type</th>
                        <th className="py-3 px-4">Presiding Judge</th>
                        <th className="py-3 px-4">Summary</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {caseDetails.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{ord.orderDate}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              {ord.orderType}
                            </span>
                          </td>
                          <td className="py-3 px-4">{ord.judgeName}</td>
                          <td className="py-3 px-4 max-w-xs truncate">{ord.summary}</td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={ord.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              PDF ({ord.fileSize})
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
