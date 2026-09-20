"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  User,
  Building2,
  FileText,
  CheckCircle2,
  Briefcase,
  Search,
  Clock,
  Sparkles,
  ShieldCheck,
  Scale,
} from "lucide-react";
import useModulePermission from "@/utils/useModulePermission";
import { getLoggedInUser } from "@/utils/auth";

export default function ClientCaseTrackingView() {
  const { perms, loading, user } = useModulePermission("Case Tracking");
  const [advocateName, setAdvocateName] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [searchClient, setSearchClient] = useState("");

  const [cases, setCases] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch cases dynamically
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/case-management/");
        const data = await res.json();
        
        let clientCases = data;
        if (user) {
          const role = (user.role || "").toLowerCase().replace(/\s+/g, "");
          if (role === "client") {
            clientCases = data.filter((c) => {
              const caseEmail = (c.email_id || "").toLowerCase().trim();
              const userEmail = (user.email || "").toLowerCase().trim();
              if (caseEmail && userEmail && caseEmail === userEmail) {
                return true;
              }
              if (c.client_name) {
                const normalizedName = c.client_name.toLowerCase().replace(/[^a-z0-9]/g, "");
                const normalizedUsername = (user.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                if (normalizedName === normalizedUsername) {
                  return true;
                }
              }
              return false;
            });
          }
        }

        const formatRelativeDate = (dateInput) => {
          if (!dateInput) return "";
          try {
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return String(dateInput);
        
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
            const diffTime = today.getTime() - target.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
            if (diffDays === 0) {
              return "Today";
            } else if (diffDays === 1) {
              return "Yesterday";
            } else {
              return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
            }
          } catch (e) {
            return String(dateInput);
          }
        };

        const mappedCases = clientCases.map(item => {
          let formattedUpdatedDate = formatRelativeDate(item.updated_at || item.created_at) || "Today";
          let formattedFilingDate = formatRelativeDate(item.created_at || item.updated_at) || "Today";

          const primaryAdv = item.selected_advocate || item.advocate_name || item.advocateName || item.assigned_advocate;
          const secondaryAdv = item.secondary_advocate_name || item.secondaryAdvocateName;

          let advocateNameStr = "";
          if (primaryAdv && primaryAdv.toLowerCase() !== "advocate") {
            advocateNameStr = primaryAdv;
            if (secondaryAdv && secondaryAdv.toLowerCase() !== "advocate") {
              advocateNameStr += ` & ${secondaryAdv}`;
            }
          } else if (secondaryAdv && secondaryAdv.toLowerCase() !== "advocate") {
            advocateNameStr = secondaryAdv;
          } else {
            advocateNameStr = "Not Assigned";
          }

          return {
            caseId: item.case_no || "N/A",
            title: item.case_title || "Untitled Case",
            status: item.status || "Active",
            advocate: advocateNameStr,
            clientName: item.client_name || "Client",
            court: item.court_name || "Civil Court",
            nextHearing: item.next_hearing_date || "To be scheduled",
            updatedAt: formattedUpdatedDate,
            filingDate: formattedFilingDate,
          };
        });
        setCases(mappedCases);
      } catch (err) {
        console.error("Error fetching case tracking data:", err);
      } finally {
        setDataLoading(false);
      }
    };
    if (!loading && perms.view) {
      fetchCases();
    }
  }, [loading, perms.view, user]);

  const formatDateLabel = (prefix, dateStr) => {
    if (!dateStr) return "";
    if (dateStr === "Today") {
      return `${prefix} Today`;
    }
    if (dateStr === "Yesterday") {
      return `${prefix} Yesterday`;
    }
    return `${prefix} On ${dateStr}`;
  };

  const getDynamicTimelineSteps = (statusStr, filingDate, updatedAtDate) => {
    const s = (statusStr || "").toLowerCase();

    const isWon = s.includes("won");
    const isLost = s.includes("lost");
    const isDisposed = s.includes("dispose");
    const isDismissed = s.includes("dismiss");
    const isSettled = s.includes("settle");
    const isClosed = s.includes("close") || s.includes("reject") || s.includes("resolve") || isWon || isLost || isDisposed || isDismissed || isSettled;

    const hasStatusChanged = Boolean(filingDate && updatedAtDate && filingDate !== updatedAtDate);

    // Final Outcome Reached (Disposed, Won, Lost, Closed, Settled, Dismissed)
    if (isClosed) {
      let finalLabel = "Case Closed";
      if (isWon) finalLabel = "🏆 Case Won";
      else if (isLost) finalLabel = "❌ Case Lost";
      else if (isDisposed) finalLabel = "⚖️ Disposed";
      else if (isDismissed) finalLabel = "🚫 Case Dismissed";
      else if (isSettled) finalLabel = "🤝 Case Settled";

      return [
        { label: "Case Filed", isCompleted: true, isCurrent: false, dateText: formatDateLabel("Filed", filingDate) },
        { label: "Document Verified", isCompleted: true, isCurrent: false, dateText: "Completed" },
        { label: "Hearing Completed", isCompleted: true, isCurrent: false, dateText: "Completed" },
        { label: "Judgment Delivered", isCompleted: true, isCurrent: false, dateText: "Completed" },
        { 
          label: finalLabel, 
          isCompleted: true, 
          isCurrent: true, 
          dateText: formatDateLabel("Disposed", updatedAtDate)
        },
      ];
    }

    const stageList = [
      "Client Consulting",
      "Client Detail Collection",
      "Document Collection",
      "Document Verified",
      "Advocate Assigned",
      "Case Preparation",
      "Court File",
      "Active",
      "In Progress",
      "Hearing Scheduled",
      "Hearing Completed",
      "Awaiting Judgment",
      "Judgment Delivered",
    ];

    let currIdx = stageList.findIndex(st => s.includes(st.toLowerCase()) || st.toLowerCase().includes(s));
    if (currIdx === -1) {
      if (s.includes("active") || s.includes("progress")) currIdx = 7;
      else currIdx = 0;
    }

    if (currIdx === 0) {
      const currLabel = statusStr || stageList[0];
      const next1 = stageList[2];
      const next2 = stageList[3];

      return [
        { label: "Case Filed", isCompleted: true, isCurrent: false, dateText: formatDateLabel("Filed", filingDate) },
        { label: currLabel, isCompleted: false, isCurrent: true, dateText: formatDateLabel("Changed", updatedAtDate) },
        { label: next1, isCompleted: false, isCurrent: false, dateText: "Upcoming" },
        { label: next2, isCompleted: false, isCurrent: false, dateText: "Upcoming" },
        { label: "Final Outcome", isCompleted: false, isCurrent: false, dateText: "Pending" },
      ];
    }

    const prevLabel = stageList[Math.max(0, currIdx - 1)];
    const currLabel = statusStr || stageList[currIdx];
    const nextLabel = currIdx + 1 < stageList.length ? stageList[currIdx + 1] : "Awaiting Judgment";

    return [
      { label: "Case Filed", isCompleted: true, isCurrent: false, dateText: formatDateLabel("Filed", filingDate) },
      { label: prevLabel, isCompleted: true, isCurrent: false, dateText: hasStatusChanged ? formatDateLabel("Changed", updatedAtDate) : "Completed" },
      { label: currLabel, isCompleted: false, isCurrent: true, dateText: formatDateLabel("Changed", updatedAtDate) },
      { label: nextLabel, isCompleted: false, isCurrent: false, dateText: "Upcoming" },
      { label: "Final Outcome", isCompleted: false, isCurrent: false, dateText: "Pending" },
    ];
  };

  // Filter cases based on inputs
  const filteredCases = cases.filter((item) => {
    const matchClient =
      searchClient.trim() === "" ||
      (item.clientName || "").toLowerCase().includes(searchClient.toLowerCase().trim());
    const matchAdvocate =
      advocateName.trim() === "" ||
      item.advocate.toLowerCase() === advocateName.toLowerCase();
    const matchCase =
      caseNumber.trim() === "" ||
      item.caseId.toLowerCase() === caseNumber.toLowerCase();
    return matchClient && matchAdvocate && matchCase;
  });

  // No view access
  if (!loading && !perms.view) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-8 max-w-sm text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 text-xs">You do not have permission to view Case Tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">

      {/* Page Header Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 md:p-8 w-full min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Case Tracking
        </h1>
        <p className="text-[#64748B] mt-1 text-xs sm:text-base font-medium">
          Track your case status and progress
        </p>
      </div>

      {/* Unified Card Container (Search Filter Header Bar + Cases List TOGETHER) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden w-full min-w-0">
        
        {/* Integrated Search Bar Header Strip inside the Cases Container */}
        <div className="bg-[#F8FAFC]/70 border-b border-[#E2E8F0] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">Tracked Cases</h2>
          <div className="relative w-full sm:w-80 shrink-0">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all text-[#0F172A] font-medium placeholder:text-[#94A3B8]"
            />
            {searchClient && (
              <button
                onClick={() => setSearchClient("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
                title="Clear search"
              >
                <span className="text-xs font-bold">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body inside the same Card Container */}
        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 w-full min-w-0">
          {dataLoading ? (
            <div className="p-8 text-center text-[#64748B] text-xs sm:text-sm font-medium animate-pulse">
              Loading cases...
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center text-[#64748B] text-xs sm:text-sm font-medium bg-slate-50 rounded-2xl border border-slate-100">
              No cases found
            </div>
          ) : (
            filteredCases.map((item, index) => {
              const timelineSteps = getDynamicTimelineSteps(item.status, item.filingDate, item.updatedAt);
              const statusLower = item.status.toLowerCase();

              const badgeStyle =
                statusLower.includes("won")
                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                  : statusLower.includes("lost")
                  ? "bg-rose-100 text-rose-800 ring-1 ring-rose-300"
                  : statusLower.includes("dispose")
                  ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                  : statusLower === "in progress" || statusLower === "active"
                  ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                  : "bg-slate-100 text-slate-800 ring-1 ring-slate-300";

              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8 shadow-2xs space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-hidden hover:border-slate-300 transition"
                >
                  {/* Case Info Header Row */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-5 w-full min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight break-words">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5 text-[11px] sm:text-xs font-bold text-[#64748B]">
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                          <FileText size={13} className="text-[#2563EB]" />
                          {item.caseId}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                          <User size={13} className="text-[#2563EB]" />
                          Client: {item.clientName}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                          <Briefcase size={13} className="text-[#2563EB]" />
                          Advocate: {item.advocate}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                          <Building2 size={13} className="text-[#2563EB]" />
                          {item.court}
                        </span>
                        <span className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg text-blue-700 border border-blue-100">
                          <Calendar size={13} className="text-[#2563EB]" />
                          Next: {item.nextHearing}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-[10.5px] sm:text-xs font-extrabold tracking-wider uppercase ${badgeStyle}`}
                      >
                        {item.status === "Won" ? "🏆 Case Won" : item.status === "Lost" ? "❌ Case Lost" : item.status === "Disposed" ? "⚖️ Disposed" : item.status}
                      </span>
                      <span className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                        <Clock size={11} className="text-amber-500 shrink-0" /> <strong className="text-slate-800 font-extrabold">{formatDateLabel("Status Changed", item.updatedAt)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Stepper Card */}
                  <div className="bg-gradient-to-br from-slate-900 via-[#1E293B] to-slate-900 rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl border border-slate-800/80 relative overflow-hidden w-full min-w-0">
                    <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-amber-400" />
                        <h3 className="text-[11px] sm:text-xs font-extrabold text-slate-300 uppercase tracking-widest">
                          Case Progress & Stage Timeline
                        </h3>
                      </div>
                      <span className="text-[10px] font-black text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" /> {formatDateLabel("Status Changed", item.updatedAt)}
                      </span>
                    </div>

                    {/* Desktop Stepper — horizontal */}
                    <div className="hidden md:flex items-start justify-between relative pt-2 pb-4">
                      {timelineSteps.map((stepObj, stepIdx) => {
                        const stepIcons = [
                          <FileText key={0} size={16} />,
                          <Briefcase key={1} size={16} />,
                          <Calendar key={2} size={16} />,
                          <Scale key={3} size={16} />,
                          <ShieldCheck key={4} size={16} />,
                        ];

                        return (
                          <div key={stepIdx} className="flex items-start flex-1 last:flex-none relative">
                            {stepIdx < timelineSteps.length - 1 && (
                              <div className="absolute top-4 left-1/2 w-full px-4 -translate-y-1/2 z-0">
                                <div
                                  className={`h-1 rounded-full transition-all ${
                                    stepObj.isCompleted
                                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-xs shadow-emerald-500/50"
                                      : "bg-slate-800 border border-slate-700/50"
                                  }`}
                                />
                              </div>
                            )}

                            <div className="flex flex-col items-center mx-auto z-10 text-center space-y-2.5">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  stepObj.isCompleted
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border-2 border-emerald-400"
                                    : stepObj.isCurrent
                                    ? "bg-[#2563EB] text-white shadow-xl shadow-blue-500/40 ring-4 ring-blue-400/30 border-2 border-white scale-110"
                                    : "bg-slate-800 text-slate-400 border border-slate-700"
                                }`}
                              >
                                {stepObj.isCompleted ? (
                                  <CheckCircle2 size={18} />
                                ) : stepObj.isCurrent ? (
                                  stepIcons[stepIdx] || <Sparkles size={16} />
                                ) : (
                                  <span className="text-xs font-bold">{stepIdx + 1}</span>
                                )}
                              </div>

                              <div className="flex flex-col items-center">
                                <span
                                  className={`text-xs font-bold max-w-[100px] leading-snug ${
                                    stepObj.isCompleted
                                      ? "text-emerald-400"
                                      : stepObj.isCurrent
                                      ? "text-white font-extrabold"
                                      : "text-slate-400 font-medium"
                                  }`}
                                >
                                  {stepObj.label}
                                </span>

                                {stepObj.isCurrent ? (
                                  <span className="mt-1.5 text-[10px] font-black text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs whitespace-nowrap">
                                    <Clock size={10} /> {stepObj.dateText}
                                  </span>
                                ) : stepObj.dateText ? (
                                  <span className={`mt-1 text-[10px] font-bold ${stepObj.isCompleted ? "text-emerald-400/90" : "text-slate-500"}`}>
                                    {stepObj.dateText}
                                  </span>
                                ) : (
                                  <span className="mt-1 text-[10px] text-slate-500 font-medium">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile Stepper — vertical */}
                    <div className="md:hidden space-y-4">
                      {timelineSteps.map((stepObj, stepIdx) => (
                        <div key={stepIdx} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                stepObj.isCompleted
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                  : stepObj.isCurrent
                                  ? "bg-[#2563EB] text-white ring-4 ring-blue-400/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}
                            >
                              {stepObj.isCompleted ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <span className="text-[11px] font-bold">{stepIdx + 1}</span>
                              )}
                            </div>
                            {stepIdx < timelineSteps.length - 1 && (
                              <div
                                className={`w-0.5 h-6 mt-1 ${
                                  stepObj.isCompleted
                                    ? "bg-emerald-500"
                                    : "bg-slate-800"
                                  }`}
                              />
                            )}
                          </div>
                          <div className="pt-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-xs sm:text-sm font-bold ${
                                  stepObj.isCompleted
                                    ? "text-emerald-400"
                                    : stepObj.isCurrent
                                    ? "text-white font-extrabold"
                                    : "text-slate-400"
                                }`}
                              >
                                {stepObj.label}
                              </span>
                              {stepObj.dateText && (
                                <span className={`text-[10px] font-bold shrink-0 ${stepObj.isCurrent ? "text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-full" : "text-slate-400"}`}>
                                  {stepObj.dateText}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
