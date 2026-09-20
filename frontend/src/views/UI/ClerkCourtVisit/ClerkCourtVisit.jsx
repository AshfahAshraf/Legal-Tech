"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  User, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Plus, 
  Search, 
  Trash2, 
  AlertCircle,
  Play,
  Square,
  LayoutGrid,
  List,
  Calendar,
  ChevronDown
} from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";

export default function ClerkCourtVisit() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [visits, setVisits] = useState([]);
  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateFilterMode, setDateFilterMode] = useState("active_today"); // "active_today", "all_visits", "completed_history"
  const [viewMode, setViewMode] = useState("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Check-Out Modal & Notes State
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutCategory, setCheckoutCategory] = useState("Hearing Prep");
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Schedule Next Hearing Visit State
  const [scheduleItem, setScheduleItem] = useState(null);
  const [nextHearingDateInput, setNextHearingDateInput] = useState("");
  const [nextCourtHallInput, setNextCourtHallInput] = useState("Hall #01");
  const [nextPurposeInput, setNextPurposeInput] = useState("Next Hearing & Arguments");
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const fetchAllData = async () => {
    try {
      const [resVisits, resCases] = await Promise.all([
        fetch(`${API_BASE_URL}/clerk/court-visit`),
        fetch(`${API_BASE_URL}/case-management/`)
      ]);

      let visitList = [];
      let caseList = [];

      if (resVisits.ok) {
        visitList = await resVisits.json();
      }
      if (resCases.ok) {
        caseList = await resCases.json();
      }

      setVisits(visitList);
      setCases(caseList);
    } catch (e) {
      console.error("Failed to load court visits or cases:", e);
    }
  };

  useEffect(() => {
    setMounted(true);
    const loggedIn = getLoggedInUser();
    if (!loggedIn) {
      router.push("/login");
    } else {
      setUser(loggedIn);
      setIsLoading(true);
      fetchAllData().finally(() => setIsLoading(false));
    }
  }, [router]);

  // Combine system cases and custom visits into a unified list
  const combinedItems = React.useMemo(() => {
    const items = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Map all visits by case_no
    const visitsByCaseNo = {};
    visits.forEach((v) => {
      const cNo = v.case_no || (v.notes ? v.notes.match(/Case:\s*([^\s-]+)/)?.[1] : null);
      if (cNo) {
        if (!visitsByCaseNo[cNo]) visitsByCaseNo[cNo] = [];
        visitsByCaseNo[cNo].push(v);
      }
    });

    // Add system cases with smart date-based status resolution
    cases.forEach((c) => {
      const caseNo = c.case_no || c.case_id || `CASE-#${c.id}`;
      const caseVisits = visitsByCaseNo[caseNo] || visits.filter(v => v.court_name === c.court_name && v.notes?.includes(caseNo));

      // Find visit specifically logged for selectedDate or today
      let activeVisit = caseVisits.find(v => v.visit_date === selectedDate || v.visit_date === todayStr);

      // If no visit for today/selectedDate, check if there's a non-completed or latest visit
      if (!activeVisit && caseVisits.length > 0) {
        const pendingOrInCourt = caseVisits.find(v => v.visit_status !== "Completed");
        if (pendingOrInCourt) {
          activeVisit = pendingOrInCourt;
        } else {
          // All past visits were completed on earlier dates.
          // For today/next hearing, if the case has a next hearing date or current active status,
          // it presents as a fresh Pending visit for the new date!
          if (dateFilterMode === "completed_history") {
            // Pick the latest completed visit for history view
            activeVisit = caseVisits[caseVisits.length - 1];
          }
        }
      }

      items.push({
        id: `sys_case_${c.id}_${activeVisit ? activeVisit.id : 'none'}`,
        dbVisitId: activeVisit ? activeVisit.id : null,
        case_id: c.id,
        case_no: caseNo,
        case_title: c.case_title || "Untitled Case",
        court_name: c.court_name || "District Court",
        court_hall: activeVisit ? activeVisit.court_hall : "Hall #01",
        judge_name: activeVisit ? activeVisit.judge_name : "Bench Judge",
        purpose_of_visit: activeVisit ? activeVisit.purpose_of_visit : "Cause List & Hearing",
        visit_status: activeVisit ? activeVisit.visit_status : "Pending",
        check_in_time: activeVisit ? activeVisit.check_in_time : null,
        check_out_time: activeVisit ? activeVisit.check_out_time : null,
        client_name: c.client_name || "N/A",
        next_hearing_date: c.next_hearing_date || todayStr,
        visit_date: activeVisit ? (activeVisit.visit_date || todayStr) : (c.next_hearing_date || todayStr),
        notes: activeVisit ? activeVisit.notes : null,
        isSystemCase: true
      });
    });

    // Add visits that don't belong to a system case
    visits.forEach((v) => {
      const existsInCases = cases.some((c) => c.case_no === v.case_no || (v.notes && v.notes.includes(c.case_no)));
      if (!existsInCases) {
        items.push({
          id: `custom_visit_${v.id}`,
          dbVisitId: v.id,
          case_no: v.case_no || "General Visit",
          case_title: v.court_name,
          court_name: v.court_name,
          court_hall: v.court_hall || "Main Hall",
          judge_name: v.judge_name || "",
          purpose_of_visit: v.purpose_of_visit,
          visit_status: v.visit_status,
          check_in_time: v.check_in_time,
          check_out_time: v.check_out_time,
          client_name: "General",
          next_hearing_date: v.visit_date || todayStr,
          visit_date: v.visit_date || todayStr,
          notes: v.notes || null,
          isSystemCase: false
        });
      }
    });

    return items;
  }, [cases, visits, selectedDate, dateFilterMode]);

  // Filter items by search & status
  // Filter items by search, status & selected date
  const filteredItems = combinedItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.case_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.case_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.court_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || item.visit_status === statusFilter;

    const matchesDate =
      dateFilterMode === "all_dates" ||
      item.visit_date === selectedDate ||
      item.next_hearing_date === selectedDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleCheckIn = async (item) => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      if (item.dbVisitId) {
        const response = await fetch(`${API_BASE_URL}/clerk/court-visit/${item.dbVisitId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visit_status: "In Court",
            check_in_time: nowStr
          })
        });
        if (response.ok) fetchAllData();
      } else {
        const response = await fetch(`${API_BASE_URL}/clerk/court-visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            court_name: item.court_name,
            court_hall: item.court_hall,
            judge_name: item.judge_name,
            purpose_of_visit: item.purpose_of_visit,
            visit_status: "In Court",
            check_in_time: nowStr,
            notes: `Case: ${item.case_no} - ${item.case_title}`,
            visit_date: new Date().toISOString().split("T")[0]
          })
        });
        if (response.ok) fetchAllData();
      }
    } catch (err) {
      console.error("Check-in error:", err);
    }
  };

  const handleCheckOut = (item) => {
    setCheckoutItem(item);
    setCheckoutNotes("");
    setCheckoutCategory("Hearing Prep");
  };

  const handleConfirmCheckout = async (e) => {
    if (e) e.preventDefault();
    if (!checkoutItem) return;
    setIsSubmittingCheckout(true);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const noteText = checkoutNotes.trim();

    try {
      let visitId = checkoutItem.dbVisitId;

      if (visitId) {
        await fetch(`${API_BASE_URL}/clerk/court-visit/${visitId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visit_status: "Completed",
            check_out_time: nowStr,
            notes: noteText || checkoutItem.notes
          })
        });
      } else {
        const res = await fetch(`${API_BASE_URL}/clerk/court-visit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            court_name: checkoutItem.court_name,
            court_hall: checkoutItem.court_hall,
            judge_name: checkoutItem.judge_name,
            purpose_of_visit: checkoutItem.purpose_of_visit,
            visit_status: "Completed",
            check_in_time: checkoutItem.check_in_time || nowStr,
            check_out_time: nowStr,
            notes: noteText,
            case_no: checkoutItem.case_no,
            visit_date: new Date().toISOString().split("T")[0]
          })
        });
        if (res.ok) {
          const created = await res.json();
          visitId = created.id;
        }
      }

      // Sync Note to Case Management -> Advocate Notes
      const matchingCase = cases.find(
        c => String(c.id) === String(checkoutItem.case_id) || 
             c.case_no === checkoutItem.case_no || 
             (c.case_id && String(c.case_id) === String(checkoutItem.case_no))
      );
      const targetCaseId = checkoutItem.case_id || (matchingCase ? matchingCase.id : null);

      if (targetCaseId) {
        let rawAuthor = user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Clerk"
          : "Clerk";
        if (rawAuthor.toLowerCase().endsWith("advocate")) {
          rawAuthor = rawAuthor.replace(/\s+Advocate$/i, "");
        }

        const formattedNoteContent = noteText
          ? `🏛️ [Court Visit Completed]\nCourt: ${checkoutItem.court_name} (${checkoutItem.court_hall})\nJudge: ${checkoutItem.judge_name || 'Bench Judge'}\nTime Out: ${nowStr}\n\nOutcome / Remarks:\n${noteText}`
          : `🏛️ [Court Visit Completed]\nCourt: ${checkoutItem.court_name} (${checkoutItem.court_hall})\nCheck-Out Time: ${nowStr}`;

        await fetch(`${API_BASE_URL}/case-management/${targetCaseId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: formattedNoteContent,
            category: checkoutCategory || "Hearing Prep",
            author: `${rawAuthor} (Clerk)`
          })
        });
      }

      setCheckoutItem(null);
      setCheckoutNotes("");
      fetchAllData();
    } catch (err) {
      console.error("Check-out confirmation error:", err);
      alert("Failed to save court visit notes.");
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  const openScheduleModal = (item) => {
    setScheduleItem(item);
    const todayStr = new Date().toISOString().split("T")[0];
    let defaultNext = item.next_hearing_date && item.next_hearing_date !== "Today" ? item.next_hearing_date : "";
    if (!defaultNext || defaultNext < todayStr) {
      defaultNext = new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0];
    }
    setNextHearingDateInput(defaultNext);
    setNextCourtHallInput(item.court_hall || "Hall #01");
    setNextPurposeInput("Next Hearing & Arguments");
  };

  const handleConfirmSchedule = async (e) => {
    if (e) e.preventDefault();
    if (!scheduleItem || !nextHearingDateInput) return;
    setIsSubmittingSchedule(true);

    try {
      const caseId = scheduleItem.case_id;

      // 1. Update case next_hearing_date in backend
      if (caseId) {
        await fetch(`${API_BASE_URL}/case-management/${caseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nextHearingDate: nextHearingDateInput
          })
        }).catch(() => null);
      }

      // 2. Create a new Pending Court Visit log for the next hearing date
      await fetch(`${API_BASE_URL}/clerk/court-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_name: scheduleItem.court_name,
          court_hall: nextCourtHallInput,
          judge_name: scheduleItem.judge_name,
          purpose_of_visit: nextPurposeInput,
          visit_status: "Pending",
          case_no: scheduleItem.case_no,
          notes: `Case: ${scheduleItem.case_no} - ${scheduleItem.case_title} | Next Hearing: ${nextHearingDateInput} (${nextCourtHallInput})`,
          visit_date: nextHearingDateInput
        })
      });

      // 3. Log an advocate note in Case Management
      if (caseId) {
        let rawAuthor = user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Clerk"
          : "Clerk";
        if (rawAuthor.toLowerCase().endsWith("advocate")) {
          rawAuthor = rawAuthor.replace(/\s+Advocate$/i, "");
        }

        await fetch(`${API_BASE_URL}/case-management/${caseId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `📅 [Next Hearing Scheduled]\nDate: ${nextHearingDateInput}\nCourt: ${scheduleItem.court_name} (${nextCourtHallInput})\nPurpose: ${nextPurposeInput}`,
            category: "Hearing Prep",
            author: `${rawAuthor} (Clerk)`
          })
        }).catch(() => null);
      }

      setScheduleItem(null);
      fetchAllData();
      alert(`Next hearing visit scheduled for ${nextHearingDateInput}!`);
    } catch (err) {
      console.error("Error scheduling next visit:", err);
      alert("Failed to schedule next visit.");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleDelete = async (dbVisitId) => {
    if (!dbVisitId) return;
    if (!confirm("Are you sure you want to delete this visit log?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/clerk/court-visit/${dbVisitId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-xs font-bold uppercase tracking-wider">
            🏛️ Daily Movement & Cause List Tracker
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Court Visit Tracker
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">
            All system cases are automatically tracked here. Record check-in/out timestamps and monitor daily cause list progress.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case no, title, court..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode("active_today");
              }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
            {selectedDate !== new Date().toISOString().split("T")[0] && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 underline"
              >
                Today
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold pl-3.5 pr-8 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer shadow-xs"
            >
              <option value="All">All Statuses ({combinedItems.length})</option>
              <option value="Pending">Pending</option>
              <option value="In Court">In Court</option>
              <option value="Completed">Completed</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Grid & List View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-white text-emerald-700 font-bold shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white text-emerald-700 font-bold shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List size={15} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visit / Case List */}
      {isLoading ? (
        <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600"></div>
          <p className="text-slate-400 text-sm font-medium">Loading cases and court visit logs...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">No Cases Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {searchQuery ? "No cases match your search query." : "All newly added cases will automatically appear here for court visit tracking."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                    item.visit_status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    item.visit_status === 'In Court' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {item.visit_status}
                  </span>
                  {item.dbVisitId && (
                    <button onClick={() => handleDelete(item.dbVisitId)} className="text-slate-400 hover:text-red-600 p-1 cursor-pointer" title="Delete Log">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {item.case_no}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{item.case_title}</h3>
                </div>
                
                <div className="space-y-2 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    <span>Court: <strong>{item.court_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span>Hall: <strong>{item.court_hall}</strong></span>
                  </div>
                  {item.client_name && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <span>Client: <strong>{item.client_name}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span>Hearing: <strong>{item.next_hearing_date}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Check In / Check Out */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>In: {item.check_in_time || '--:--'}</span>
                  <span>Out: {item.check_out_time || '--:--'}</span>
                </div>

                <div className="flex gap-2">
                  {item.visit_status === 'Pending' && (
                    <button
                      onClick={() => handleCheckIn(item)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Play size={14} /> Check In Now
                    </button>
                  )}
                  {item.visit_status === 'In Court' && (
                    <button
                      onClick={() => handleCheckOut(item)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Square size={14} /> Check Out & Complete
                    </button>
                  )}
                  {item.visit_status === 'Completed' && (
                    <div className="w-full space-y-2">
                      <div className="w-full text-center py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200">
                        ✓ Visit Completed
                      </div>
                      <button
                        onClick={() => openScheduleModal(item)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                      >
                        <Calendar size={14} /> Schedule Next Visit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Case Details</th>
                  <th className="px-6 py-4">Court & Hall</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Hearing Date</th>
                  <th className="px-6 py-4">Check In / Out</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                          {item.case_no}
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5">{item.case_title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">{item.court_name}</span>
                        <span className="text-slate-400">{item.court_hall}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-800 text-xs font-semibold">
                      {item.client_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {item.next_hearing_date}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      <div>In: <span className="font-semibold text-slate-700">{item.check_in_time || '--:--'}</span></div>
                      <div>Out: <span className="font-semibold text-slate-700">{item.check_out_time || '--:--'}</span></div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block ${
                        item.visit_status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        item.visit_status === 'In Court' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.visit_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.visit_status === 'Pending' && (
                          <button
                            onClick={() => handleCheckIn(item)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Play size={13} /> Check In
                          </button>
                        )}
                        {item.visit_status === 'In Court' && (
                          <button
                            onClick={() => handleCheckOut(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Square size={13} /> Check Out
                          </button>
                        )}
                        {item.visit_status === 'Completed' && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200">
                              ✓ Done
                            </span>
                            <button
                              onClick={() => openScheduleModal(item)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs border border-blue-200 transition cursor-pointer flex items-center gap-1"
                              title="Schedule Next Hearing Visit"
                            >
                              <Calendar size={13} /> Next Visit
                            </button>
                          </div>
                        )}
                        {item.dbVisitId && (
                          <button
                            onClick={() => handleDelete(item.dbVisitId)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Log"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHECK OUT & NOTES MODAL */}
      {mounted && typeof document !== "undefined" && (checkoutItem || scheduleItem) ? createPortal(
        <>
          {checkoutItem && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 transform animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                      Check Out & Complete Visit
                    </span>
                    <h3 className="font-extrabold text-xl text-slate-900 mt-2 leading-tight">
                      {checkoutItem.case_title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Case No: {checkoutItem.case_no} • {checkoutItem.court_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setCheckoutItem(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Visit Context Badge Info */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-1.5 font-medium text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Hall & Bench: <strong className="text-slate-900">{checkoutItem.court_hall} ({checkoutItem.judge_name || 'Bench Judge'})</strong></span>
                    <span>Check-In: <strong className="text-amber-700">{checkoutItem.check_in_time || '--:--'}</strong></span>
                  </div>
                  <div>Client: <strong className="text-slate-900">{checkoutItem.client_name}</strong></div>
                </div>

                {/* Note Entry Form */}
                <form onSubmit={handleConfirmCheckout} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Category Tag (Case Management)
                    </label>
                    <select
                      value={checkoutCategory}
                      onChange={(e) => setCheckoutCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                    >
                      <option value="Hearing Prep">🟡 Hearing Prep / Hearing Outcome</option>
                      <option value="Action Item">🔴 Urgent Action Item / Registry Followup</option>
                      <option value="Client Call">🟢 Client Update Required</option>
                      <option value="General Note">🔵 General Court Visit Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Court Hearing Outcome Notes
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Enter hearing outcome remarks, judge instructions, next hearing date directions, or filing tasks to sync with Case Management Advocate Notes..."
                      value={checkoutNotes}
                      onChange={(e) => setCheckoutNotes(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition leading-relaxed resize-y"
                    />
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      ℹ️ Saved notes will automatically sync to the Advocate Notes tab in Case Management for this case.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCheckoutItem(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCheckout}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingCheckout ? "Saving & Syncing..." : " Save Notes & Complete Check Out"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SCHEDULE NEXT HEARING VISIT MODAL */}
          {scheduleItem && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 transform animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-200">
                      Schedule Next Court Visit
                    </span>
                    <h3 className="font-extrabold text-xl text-slate-900 mt-2 leading-tight">
                      {scheduleItem.case_title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Case No: {scheduleItem.case_no} • {scheduleItem.court_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setScheduleItem(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleConfirmSchedule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Next Hearing Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={nextHearingDateInput}
                      onChange={(e) => setNextHearingDateInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Court Hall
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hall #02, Court Room 5"
                      value={nextCourtHallInput}
                      onChange={(e) => setNextCourtHallInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Purpose / Notes for Next Hearing
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Arguments, Evidence Filing, Interim Orders..."
                      value={nextPurposeInput}
                      onChange={(e) => setNextPurposeInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setScheduleItem(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSchedule}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSubmittingSchedule ? "Scheduling..." : "📅 Confirm Next Hearing Visit"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>,
        document.body
      ) : null}
    </div>
  );
}
