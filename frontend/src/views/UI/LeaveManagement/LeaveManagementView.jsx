"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  ChevronDown,
  UserCheck,
  Building,
  Users,
  ArrowLeft,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";
import useModulePermission from "@/utils/useModulePermission";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

export default function LeaveManagementView({
  viewMode = "senior", // "senior" | "junior" | "clerk"
  moduleKey = "Leave Management",
}) {
  const { perms, loading: permsLoading } = useModulePermission(moduleKey);
  const user = getLoggedInUser();
  const roleNorm = (user?.role || "").toLowerCase().replace(/\s+/g, "");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if this view can approve/reject leave requests
  const canApprove =
    viewMode === "senior"
      ? ["senioradvocate", "admin"].includes(roleNorm)
      : viewMode === "clerk"
      ? ["clerk", "senioradvocate", "admin"].includes(roleNorm) && perms.edit
      : false;

  const [balances, setBalances] = useState({
    financial_year: "FY 2026-27",
    emergency_leave: { total: 6, used: 0, remaining: 6 },
    sick_leave: { total: 4, used: 0, remaining: 4 },
    floater_leave: { total: 2, used: 0, remaining: 2 },
  });

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [timePeriod, setTimePeriod] = useState("all"); // "all" | "this_week" | "this_month" | "this_year" | "custom"
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
    setCurrentPage(1);

    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();

    if (period === "all") {
      setFromDate("");
      setToDate("");
    } else if (period === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFromDate(monday.toISOString().split("T")[0]);
      setToDate(sunday.toISOString().split("T")[0]);
    } else if (period === "this_month") {
      const firstDay = new Date(todayY, todayM, 1);
      const lastDay = new Date(todayY, todayM + 1, 0);
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(lastDay.toISOString().split("T")[0]);
    } else if (period === "this_year") {
      setFromDate(`${todayY}-01-01`);
      setToDate(`${todayY}-12-31`);
    }
  };

  // Clerk specific tab: "own" vs "team"
  const [clerkTab, setClerkTab] = useState("own"); // "own" | "team"

  // Apply View Page State
  const [isApplying, setIsApplying] = useState(false);
  const [duration, setDuration] = useState("Multiple Days"); // "Single Day" | "Half Day" | "Multiple Days"
  const [halfDayPeriod, setHalfDayPeriod] = useState("First Half"); // "First Half" | "Second Half"
  const [leaveTypeSearch, setLeaveTypeSearch] = useState("");
  const [isLeaveTypeDropdownOpen, setIsLeaveTypeDropdownOpen] = useState(false);

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState("Approved"); // Approved or Rejected
  const [rejectionReason, setRejectionReason] = useState("");
  const [deleteLeaveId, setDeleteLeaveId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });

  const showAlert = (message, title = "Notice", type = "error") => {
    setAlertModal({ show: true, title, message, type });
  };

  // Apply Form State
  const [applyForm, setApplyForm] = useState({
    leave_type: "Casual Leave",
    subject: "",
    description: "",
    from_date: "",
    to_date: "",
    is_half_day: "None",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch balances and leave requests
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch Balances
      const resBal = await fetch(`${API_BASE_URL}/leaves/balances`, { headers });
      if (resBal.ok) {
        const balData = await resBal.json();
        setBalances(balData);
      }

      // 2. Fetch Leaves with view_mode and scope
      let queryParams = [`view_mode=${viewMode}`];
      if (viewMode === "clerk") {
        queryParams.push(`scope=${clerkTab}`);
      }
      if (statusFilter !== "All") queryParams.push(`status=${statusFilter}`);
      if (fromDate) queryParams.push(`from_date=${fromDate}`);
      if (toDate) queryParams.push(`to_date=${toDate}`);

      const url = `${API_BASE_URL}/leaves?${queryParams.join("&")}`;
      const resLeaves = await fetch(url, { headers });
      if (resLeaves.ok) {
        const leaveData = await resLeaves.json();
        setLeaves(leaveData);
      } else {
        const errJson = await resLeaves.json();
        setError(errJson.detail || "Failed to load leave records.");
      }
    } catch (err) {
      console.error("Error fetching leave data:", err);
      setError("Network or server connection error.");
    } finally {
      setLoading(false);
    }
  }, [viewMode, clerkTab, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter leaves locally by search input, date range & user scope
  const filteredLeaves = React.useMemo(() => {
    return leaves.filter((item) => {
      if (viewMode === "junior" && user?.id) {
        if (item.user_id !== user.id) return false;
      }
      if (search.trim()) {
        const term = search.toLowerCase();
        const matches =
          item.applicant_name?.toLowerCase().includes(term) ||
          item.subject?.toLowerCase().includes(term) ||
          item.leave_type?.toLowerCase().includes(term) ||
          item.applicant_role?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      const leaveFrom = item.from_date;
      const leaveTo = item.to_date || item.from_date;

      if (fromDate && leaveTo && leaveTo < fromDate) return false;
      if (toDate && leaveFrom && leaveFrom > toDate) return false;

      return true;
    });
  }, [leaves, viewMode, user?.id, search, fromDate, toDate]);

  const totalPages = Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE) || 1;
  const activeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLeaves = React.useMemo(() => {
    const start = (activeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeaves.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLeaves, activeCurrentPage, ITEMS_PER_PAGE]);

  // Helper to format duration display dynamically
  const getDurationDisplay = (req) => {
    const isHalf = req.is_half_day && req.is_half_day !== "None" && req.is_half_day !== "false";
    if (isHalf) {
      return req.is_half_day === "First Half" || req.is_half_day === "Second Half"
        ? `Half Day (${req.is_half_day})`
        : "Half Day";
    }

    if (req.from_date && req.to_date) {
      const start = new Date(req.from_date + "T00:00:00");
      const end = new Date(req.to_date + "T00:00:00");
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays === 1) return "1 day";
        return `${diffDays} days`;
      }
    }

    const days = req.total_days || 1;
    return days === 1 ? "1 day" : `${days} days`;
  };

  // Handle Apply Form submission
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.from_date || !applyForm.to_date) {
      showAlert("Please select both From Date and To Date.", "Validation Error", "error");
      return;
    }

    let computedDays = 1.0;
    if (duration === "Half Day" || applyForm.is_half_day !== "None") {
      computedDays = 0.5;
    } else if (applyForm.from_date && applyForm.to_date) {
      const start = new Date(applyForm.from_date + "T00:00:00");
      const end = new Date(applyForm.to_date + "T00:00:00");
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        computedDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...applyForm,
          total_days: computedDays,
        }),
      });

      if (res.ok) {
        setIsApplying(false);
        setApplyForm({
          leave_type: "Casual Leave",
          subject: "",
          description: "",
          from_date: "",
          to_date: "",
          is_half_day: "None",
        });
        fetchData();
        showAlert("Your leave request has been submitted successfully!", "Leave Submitted", "success");
      } else {
        const errJson = await res.json();
        showAlert(errJson.detail || "Failed to submit leave request.", "Submission Error", "error");
      }
    } catch (err) {
      showAlert("Error submitting request: " + err.message, "Network Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Update (Approve / Reject)
  const handleStatusUpdate = async () => {
    if (!selectedLeave) return;
    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${selectedLeave.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: actionType,
          rejection_reason: actionType === "Rejected" ? rejectionReason : null,
        }),
      });

      if (res.ok) {
        const resJson = await res.json();
        setShowActionModal(false);
        setSelectedLeave(null);
        setRejectionReason("");
        fetchData();

        if (resJson.reassigned_cases_count && resJson.reassigned_cases_count > 0) {
          showAlert(
            `Leave Approved!\n\n${resJson.reassigned_cases_count} case hearing(s) falling on the approved leave dates were automatically transferred to Secondary Junior Advocates:\n\n` +
              (resJson.reassigned_details || []).map((d) => `• ${d}`).join("\n"),
            "Hearing Auto-Reassigned",
            "success"
          );
        } else {
          showAlert(`Leave request successfully ${actionType.toLowerCase()}!`, "Status Updated", "success");
        }
      } else {
        const errJson = await res.json();
        showAlert(errJson.detail || "Failed to update leave status.", "Action Failed", "error");
      }
    } catch (err) {
      showAlert("Error updating status: " + err.message, "Network Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteLeave = async () => {
    if (!deleteLeaveId) return;
    setDeleteLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${deleteLeaveId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteLeaveId(null);
        fetchData();
        showAlert("Leave application deleted successfully.", "Deleted", "success");
      } else {
        const errJson = await res.json().catch(() => ({}));
        setDeleteLeaveId(null);
        showAlert(errJson.detail || "Failed to delete leave request.", "Permission Denied", "error");
      }
    } catch (err) {
      console.error("Error deleting leave:", err);
      setDeleteLeaveId(null);
      showAlert("Error deleting leave request.", "Action Failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Header Titles
  const getHeaderTitle = () => {
    if (viewMode === "junior") return "My Leave";
    if (viewMode === "clerk") return "Clerk Leave & Approvals";
    return "Leave Management";
  };

  const getHeaderSubtitle = () => {
    if (viewMode === "junior") return "Apply and track your personal leave requests";
    if (viewMode === "clerk") return "Apply for leave and manage junior leave applications";
    return "Review employee leave applications and manage balances";
  };

  // ─── Apply Form View ────────────────────────────────────────────────────────
  if (isApplying) {
    const leaveTypesList = [
      "Select Leave Type",
      "Emergency Leave",
      "Casual Leave",
      "Sick Leave",
      "Floater Leave",
      "Loss of Pay",
    ];

    const filteredLeaveTypes = leaveTypesList.filter((t) =>
      t.toLowerCase().includes(leaveTypeSearch.toLowerCase())
    );

    const userName = user?.full_name || user?.name || user?.username || user?.sub || "Current User";

    return (
      <div className="min-h-screen bg-[#F8FAFC] p-3.5 sm:p-5 md:p-8 w-full max-w-full min-w-0 overflow-x-hidden">
        <form
          onSubmit={handleApplySubmit}
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] p-5 sm:p-8 md:p-10 shadow-xs max-w-6xl mx-auto w-full min-w-0 space-y-6"
        >
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">Apply Leave</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Submit a new leave request</p>
            </div>
            <button
              type="button"
              onClick={() => setIsApplying(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <ArrowLeft size={16} />
              <span>Back to Leaves</span>
            </button>
          </div>

          {/* Form Fields Card */}
          <div className="bg-[#F8FAFC] rounded-2xl p-4 sm:p-6 border border-slate-200/80 space-y-5 w-full min-w-0">
            <div className="flex items-center gap-2 text-blue-600 pb-3 border-b border-slate-200">
              <FileText size={18} />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Leave Details</h3>
            </div>

            {/* Grid: Employee & Leave Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full min-w-0">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Employee</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2.5">
                  <UserCheck size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">{userName}</span>
                </div>
              </div>

              {/* Leave Type Dropdown */}
              <div className="relative min-w-0">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLeaveTypeDropdownOpen(!isLeaveTypeDropdownOpen)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <span className="truncate">{applyForm.leave_type || "Select Leave Type"}</span>
                    <ChevronDown size={18} className="text-slate-400 shrink-0" />
                  </button>

                  {isLeaveTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-2 space-y-1">
                      <div className="relative p-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={leaveTypeSearch}
                          onChange={(e) => setLeaveTypeSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredLeaveTypes.map((type) => (
                          <div
                            key={type}
                            onClick={() => {
                              if (type !== "Select Leave Type") {
                                setApplyForm({ ...applyForm, leave_type: type });
                              }
                              setIsLeaveTypeDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                              applyForm.leave_type === type ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-100 text-slate-800"
                            }`}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Duration Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Duration</label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {["Single Day", "Half Day", "Multiple Days"].map((durOption) => {
                  const isSelected = duration === durOption;
                  return (
                    <label
                      key={durOption}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="duration"
                        value={durOption}
                        checked={isSelected}
                        onChange={(e) => {
                          const newDur = e.target.value;
                          setDuration(newDur);
                          if (newDur === "Single Day") {
                            setApplyForm((prev) => ({ ...prev, to_date: prev.from_date, is_half_day: "None" }));
                          } else if (newDur === "Half Day") {
                            setApplyForm((prev) => ({ ...prev, to_date: prev.from_date, is_half_day: halfDayPeriod }));
                          } else {
                            setApplyForm((prev) => ({ ...prev, is_half_day: "None" }));
                          }
                        }}
                        className="accent-blue-600 cursor-pointer"
                      />
                      {durOption}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Date Inputs */}
            {duration === "Multiple Days" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full min-w-0">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <CustomDatePicker
                    selected={applyForm.from_date}
                    onChange={(dateStr) => setApplyForm({ ...applyForm, from_date: dateStr })}
                    minDate={new Date()}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <CustomDatePicker
                    selected={applyForm.to_date}
                    onChange={(dateStr) => setApplyForm({ ...applyForm, to_date: dateStr })}
                    minDate={applyForm.from_date ? new Date(applyForm.from_date + "T00:00:00") : new Date()}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="w-full sm:max-w-xs min-w-0">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <CustomDatePicker
                  selected={applyForm.from_date}
                  onChange={(dateStr) =>
                    setApplyForm({ ...applyForm, from_date: dateStr, to_date: dateStr })
                  }
                  minDate={new Date()}
                  required
                />
              </div>
            )}

            {/* Half Day Period */}
            {duration === "Half Day" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Half Day Period</label>
                <div className="flex items-center gap-3">
                  {["First Half", "Second Half"].map((period) => {
                    const isSelected = halfDayPeriod === period;
                    return (
                      <label
                        key={period}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                          isSelected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="halfDayPeriod"
                          value={period}
                          checked={isSelected}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHalfDayPeriod(val);
                            setApplyForm((prev) => ({ ...prev, is_half_day: val }));
                          }}
                          className="accent-blue-600 cursor-pointer"
                        />
                        {period}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reason for Absence */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Reason for Absence (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Provide a detailed reason..."
                value={applyForm.description}
                onChange={(e) => setApplyForm({ ...applyForm, description: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-600 transition resize-y min-h-[120px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsApplying(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer flex-1 sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
              >
                {submitting ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─── Main View ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-3.5 sm:p-5 md:p-8 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6 w-full min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {getHeaderTitle()}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{getHeaderSubtitle()}</p>
      </div>

      {/* Clerk Dual Mode Switcher */}
      {viewMode === "clerk" && (
        <div className="flex items-center gap-2 mb-4 w-full min-w-0">
          <button
            onClick={() => setClerkTab("own")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              clerkTab === "own" ? "bg-[#2563EB] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            My Leave Applications
          </button>
          <button
            onClick={() => setClerkTab("team")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              clerkTab === "team" ? "bg-[#2563EB] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users size={14} /> Junior Advocate Approvals
          </button>
        </div>
      )}

      {/* Filter and Action Header Container */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 mb-5 shadow-xs w-full max-w-full min-w-0">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 sm:gap-4 w-full min-w-0">
          
          {/* Left Group: Status Pills & Time Period Dropdown */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {["All", "Pending", "Approved", "Rejected"].map((tab) => {
                const active = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setStatusFilter(tab); setCurrentPage(1); }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      active ? "bg-[#2563EB] text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Time Period Filter Dropdown */}
            <div className="relative shrink-0">
              <select
                value={timePeriod}
                onChange={(e) => handleTimePeriodChange(e.target.value)}
                className="appearance-none bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition"
              >
                <option value="all">All Time</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Right Group: Search, Single Date Picker, Apply Button */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 justify-start xl:justify-end">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search applicant, type, reason..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Single Calendar Date Filter */}
            <div className="w-full sm:w-44 shrink-0">
              <CustomDatePicker
                selected={fromDate}
                onChange={(dateStr) => {
                  setFromDate(dateStr);
                  setToDate(dateStr);
                  setTimePeriod(dateStr ? "custom" : "all");
                  setCurrentPage(1);
                }}
                minDate={null}
                placeholder="Select Date"
              />
            </div>

            {/* Apply Leave Button */}
            {perms.add && viewMode !== "senior" && (viewMode !== "clerk" || clerkTab === "own") && (
              <button
                onClick={() => setIsApplying(true)}
                className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>Apply Leave</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Leave Requests Table / Cards */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden w-full max-w-full min-w-0">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium animate-pulse">
            <RefreshCw size={24} className="animate-spin mx-auto text-blue-600 mb-2" />
            <p>Loading leave applications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50/50 space-y-2">
            <AlertCircle size={28} className="mx-auto text-red-500" />
            <p className="text-xs sm:text-sm font-semibold">{error}</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CalendarIcon size={36} className="mx-auto text-slate-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">No Leave Requests Found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or apply for a new leave.</p>
          </div>
        ) : (
          <>
            {/* Mobile Native Card View (< 640px) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {paginatedLeaves.map((req) => {
                const isOwnRequest = user?.id === req.user_id;
                const statusColor =
                  req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : req.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200"
                  : req.status === "Cancelled" ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";

                return (
                  <div key={req.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{req.applicant_name}</h4>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                          {req.applicant_role}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold border ${statusColor}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{req.leave_type}</span>
                        <span className="font-mono text-slate-500 font-bold">{getDurationDisplay(req)}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] font-medium leading-relaxed">{req.description || "No description provided."}</p>
                      <div className="text-[11px] text-blue-600 font-semibold pt-1 border-t border-slate-200/60 flex items-center gap-1">
                        <CalendarIcon size={12} /> {req.from_date} to {req.to_date}
                      </div>
                    </div>

                    {/* Approver / Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {req.approver_name ? `Approved by ${req.approver_name}` : "Pending review"}
                      </div>
                      {canApprove && req.status === "Pending" && perms.edit && !isOwnRequest && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setSelectedLeave(req); setActionType("Approved"); setShowActionModal(true); }}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setSelectedLeave(req); setActionType("Rejected"); setShowActionModal(true); }}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === "Pending" && (isOwnRequest || viewMode === "junior") && (
                        <button
                          onClick={() => setDeleteLeaveId(req.id)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                          title="Delete Pending Leave Request"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop & Tablet Table (>= 640px) */}
            <div className="hidden sm:block w-full max-w-full overflow-x-auto min-w-0">
              <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Applicant</th>
                    <th className="py-3.5 px-4">Leave Type</th>
                    <th className="py-3.5 px-4">Description / Reason</th>
                    <th className="py-3.5 px-4">Dates</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Approver Info</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {paginatedLeaves.map((req) => {
                    const isOwnRequest = user?.id === req.user_id;
                    const statusColor =
                      req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : req.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200"
                      : req.status === "Cancelled" ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{req.applicant_name}</div>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                            {req.applicant_role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{req.leave_type}</td>
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <p className="truncate text-slate-600">{req.description || "—"}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          <div>{req.from_date}</div>
                          <div className="text-[10px] text-slate-400">to {req.to_date}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {getDurationDisplay(req)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${statusColor}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {req.approver_name ? (
                            <div>
                              <span className="font-semibold text-slate-700">{req.approver_name}</span>
                              {req.rejection_reason && (
                                <p className="text-[11px] text-red-600 italic">&quot;{req.rejection_reason}&quot;</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Pending review</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canApprove && req.status === "Pending" && perms.edit && !isOwnRequest && (
                              <>
                                <button
                                  onClick={() => { setSelectedLeave(req); setActionType("Approved"); setShowActionModal(true); }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setSelectedLeave(req); setActionType("Rejected"); setShowActionModal(true); }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === "Pending" && (isOwnRequest || viewMode === "junior") && (
                              <button
                                onClick={() => setDeleteLeaveId(req.id)}
                                className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Delete Pending Leave Request"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Controls */}
            {filteredLeaves.length > 0 && (
              <div className="px-4 py-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-800">{(activeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                  <span className="font-bold text-slate-800">{Math.min(activeCurrentPage * ITEMS_PER_PAGE, filteredLeaves.length)}</span> of{" "}
                  <span className="font-bold text-slate-800">{filteredLeaves.length}</span> leave records
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activeCurrentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    {activeCurrentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={activeCurrentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve / Reject Modal */}
      {mounted && showActionModal && selectedLeave && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs" onClick={() => setShowActionModal(false)} />
          <div className="relative bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {actionType === "Approved" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                You are about to <strong className="uppercase">{actionType}</strong> the leave request for{" "}
                <strong>{selectedLeave.applicant_name}</strong> ({selectedLeave.leave_type}, {selectedLeave.total_days} days).
              </p>
              {actionType === "Rejected" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none"
                  />
                </div>
              )}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={submitting}
                  className={`flex-1 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                    actionType === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting ? "Updating..." : `Confirm ${actionType}`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && deleteLeaveId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center shadow-inner">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Confirm Delete
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed font-medium">
              Are you sure you want to delete this pending leave application? This action cannot be undone.
            </p>

            <div className="flex justify-center items-center gap-3 mt-6 pt-2">
              <button
                type="button"
                onClick={() => setDeleteLeaveId(null)}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteLeave}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete Leave"}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Custom Alert / Notification Modal */}
      {mounted && alertModal.show && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-inner ${
                alertModal.type === "error" ? "bg-rose-100 text-rose-600" :
                alertModal.type === "success" ? "bg-emerald-100 text-emerald-600" :
                "bg-blue-100 text-blue-600"
              }`}>
                {alertModal.type === "error" ? (
                  <AlertCircle className="w-8 h-8" />
                ) : alertModal.type === "success" ? (
                  <CheckCircle className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8" />
                )}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {alertModal.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-medium whitespace-pre-line">
              {alertModal.message}
            </p>

            <div className="flex justify-center items-center mt-6 pt-2">
              <button
                type="button"
                onClick={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition shadow-md shadow-blue-600/20 cursor-pointer"
              >
                OK
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
