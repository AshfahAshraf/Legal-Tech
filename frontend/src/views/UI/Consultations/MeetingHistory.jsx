"use client";

import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  ArrowLeft,
  History,
  Clock,
  Video,
  MessageSquare,
  User,
  CheckCircle2,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  RotateCcw
} from "lucide-react";

export default function MeetingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all"); // 'all', 'today', 'week', 'month', 'year', 'custom'
  const [selectedDate, setSelectedDate] = useState("");

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getBookedHeaderLabel = (dateStr) => {
    if (!dateStr) return "BOOKED ON UNKNOWN DATE";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `BOOKED ON ${String(dateStr).toUpperCase()}`;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const dayName = d.toLocaleDateString("en-US", { weekday: 'long' }).toUpperCase();
    const monthName = d.toLocaleDateString("en-US", { month: 'long' }).toUpperCase();
    const dayNum = d.getDate();
    const year = d.getFullYear();

    const fullFormatted = `${dayName}, ${monthName} ${dayNum}, ${year}`;

    if (targetDate.getTime() === today.getTime()) {
      return `BOOKED TODAY - ${fullFormatted}`;
    }
    if (targetDate.getTime() === yesterday.getTime()) {
      return `BOOKED YESTERDAY - ${fullFormatted}`;
    }
    return `BOOKED ON ${fullFormatted}`;
  };

  const formatTimeString = (timeStr) => {
    if (!timeStr) return "N/A";
    if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const fetchConsultations = async (currentUser) => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/consultations`;
      if (currentUser && currentUser.role) {
        const role = currentUser.role.toLowerCase();
        if (role === "client") {
          url += `?client_id=${currentUser.id}`;
        }
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Could not fetch consultation history:", err);
      showToast("Failed to load meeting history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loggedIn = getLoggedInUser();
    setUser(loggedIn);
    fetchConsultations(loggedIn);
  }, []);

  // Filtering logic (Search + Dropdown Period + Calendar Date Selection)
  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter((item) => {
      // 1. Search by Client Name
      const clientName = (item.client_name || item.client || "").toLowerCase();
      if (searchQuery.trim() && !clientName.includes(searchQuery.trim().toLowerCase())) {
        return false;
      }

      // 2. Specific Calendar Date Selection
      if (selectedDate) {
        const itemDateStr = (item.created_at || item.date || "").split("T")[0];
        if (itemDateStr !== selectedDate) {
          return false;
        }
        return true;
      }

      // 3. Time Period Dropdown Filter
      const dVal = item.created_at || item.date;
      if (!dVal) return true;
      const itemDate = new Date(dVal);
      if (isNaN(itemDate.getTime())) return true;

      if (timeFilter === "today") {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getDate() === now.getDate()
        );
      }

      if (timeFilter === "week") {
        const firstDayOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        firstDayOfWeek.setHours(0, 0, 0, 0);

        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        lastDayOfWeek.setHours(23, 59, 59, 999);

        return itemDate >= firstDayOfWeek && itemDate <= lastDayOfWeek;
      }

      if (timeFilter === "month") {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      }

      if (timeFilter === "year") {
        return itemDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [history, searchQuery, timeFilter, selectedDate]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, selectedDate]);

  // Sort items by booked date descending so newest bookings are grouped together
  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date).getTime() || 0;
      const dateB = new Date(b.created_at || b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [filteredHistory]);

  // Pagination Calculations
  const totalItems = sortedHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentTableData = sortedHistory.slice(startIndex, endIndex);

  const handleResetFilters = () => {
    setSearchQuery("");
    setTimeFilter("all");
    setSelectedDate("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/consultations"
            className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:border-slate-300 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Meeting History
              </h1>
              <span className="text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-200 px-3 py-1 rounded-full">
                {totalItems} Records
              </span>
            </div>
            <p className="text-sm text-[#64748B] font-medium mt-1">
              Complete archive of previous consultations and scheduled meetings
            </p>
          </div>
        </div>
      </div>

      {/* Combined Card: Filter Controls + History Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-6 border-b border-[#E2E8F0]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Client Name Search Input */}
            <div className="lg:col-span-4 relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client name..."
                className="w-full pl-10 pr-8 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Time Period Dropdown */}
            <div className="lg:col-span-3">
              <select
                value={timeFilter}
                onChange={(e) => {
                  setTimeFilter(e.target.value);
                  if (e.target.value !== "custom") {
                    setSelectedDate("");
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all cursor-pointer"
              >
                <option value="all">All Meetings</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* Calendar Date Selection */}
            <div className="lg:col-span-3 relative">
              <DatePicker
                selected={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
                onChange={(date) => {
                  if (!date) {
                    setSelectedDate("");
                    setTimeFilter("all");
                    return;
                  }
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  setSelectedDate(`${year}-${month}-${day}`);
                  setTimeFilter("custom");
                }}
                placeholderText="Select Date on Calendar"
                dateFormat="yyyy-MM-dd"
                isClearable
                className="w-full pl-10 pr-8 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all cursor-pointer"
              />
              <Calendar size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>

            {/* Reset Button */}
            {(searchQuery || timeFilter !== "all" || selectedDate) && (
              <div className="lg:col-span-2 flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Reset Filters"
                >
                  <RotateCcw size={14} />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History Table Content */}
        <div className="p-4 sm:p-6">
          <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="min-w-full divide-y divide-[#E2E8F0]">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Client Name</th>
                <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Meeting Date</th>
                <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Time</th>
                <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-[#64748B] font-medium">
                    Loading meeting history...
                  </td>
                </tr>
              ) : currentTableData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-[#64748B] font-medium">
                    No meeting history records found.
                  </td>
                </tr>
              ) : (
                (() => {
                  let lastGroupKey = null;
                  return currentTableData.map((item) => {
                    const rawDate = item.created_at || item.date || "";
                    const dateKey = typeof rawDate === "string" ? rawDate.split("T")[0] : String(rawDate);
                    const showHeader = dateKey !== lastGroupKey;
                    if (showHeader) {
                      lastGroupKey = dateKey;
                    }
                    return (
                      <React.Fragment key={item.id}>
                        {showHeader && (
                          <tr className="bg-[#F8FAFC] border-t border-b border-[#E2E8F0]">
                            <td colSpan={5} className="py-2.5 px-4 text-xs font-extrabold text-[#334155] tracking-wider uppercase border-l-4 border-l-[#2563EB]">
                              {getBookedHeaderLabel(item.created_at || item.date)}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-[#F8FAFC] transition-colors duration-150">
                          <td className="p-4 font-bold text-[#0F172A] capitalize whitespace-nowrap">
                            {item.client_name || item.client || "Client"}
                          </td>
                          <td className="p-4 text-[#475569] whitespace-nowrap">
                            {formatDateString(item.date)}
                          </td>
                          <td className="p-4 text-[#475569] font-medium whitespace-nowrap">
                            {formatTimeString(item.time)}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              item.type === "Video Call" || item.type === "Video Consultation"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : item.type === "Chat" || item.type === "Chat Consultation"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              item.status === "Completed" || item.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "Rescheduled" || item.status === "Pending Advocate"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}>
                              <CheckCircle2 size={11} />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (10 per page) */}
        {totalItems > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0]">
            <p className="text-xs font-medium text-[#64748B]">
              Showing <span className="font-bold text-[#0F172A]">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-[#0F172A]">{endIndex}</span> of{" "}
              <span className="font-bold text-[#0F172A]">{totalItems}</span> entries
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1 text-xs font-bold"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "text-[#64748B] hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1 text-xs font-bold"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[10000] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all duration-300 max-w-sm animate-in fade-in slide-in-from-top-4 ${
          toast.type === "error"
            ? "bg-rose-600 text-white border-rose-500"
            : toast.type === "warning"
            ? "bg-amber-600 text-white border-amber-500"
            : "bg-emerald-600 text-white border-emerald-500"
        }`}>
          {toast.type === "error" ? (
            <X size={20} className="text-white shrink-0" />
          ) : toast.type === "warning" ? (
            <Clock size={20} className="text-white shrink-0" />
          ) : (
            <CheckCircle2 size={20} className="text-white shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm leading-tight">
              {toast.type === "error" ? "Error" : toast.type === "warning" ? "Notice" : "Success"}
            </p>
            <p className="text-xs font-medium mt-0.5 opacity-90">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast({ show: false, message: "", type: "success" })}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
