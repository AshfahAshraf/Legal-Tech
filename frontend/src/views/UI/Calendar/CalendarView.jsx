"use client";

import { API_BASE_URL } from "@/utils/api";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { getTodayDateString, getCurrentTimeString } from "@/utils/dateUtils";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import {
  Calendar as CalendarIcon,
  X,
  Clock,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Briefcase,
  FileText,
  Bookmark
} from "lucide-react";
import { format } from "date-fns";
import { usePermissions } from "@/utils/usePermissions";

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const generateHolidaysForYear = (year) => {
  const generated = [];
  const publicHolidays = {
    "01-26": "Republic Day",
    "04-14": "Ambedkar Jayanti",
    "05-01": "May Day / Labour Day",
    "08-15": "Independence Day",
    "10-02": "Gandhi Jayanti",
    "12-25": "Christmas Day"
  };

  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    let saturdayCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      const dayOfWeek = date.getDay();
      const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (dayOfWeek === 0) {
        generated.push({
          id: `holiday-sun-${dateStr}`,
          title: "Sunday",
          date: dateStr,
          time: "00:00",
          type: "Holiday",
          isHoliday: true,
          caseNo: "N/A",
          court: "All Courts",
          status: "Completed",
          notes: "Weekly court holiday."
        });
      }

      if (dayOfWeek === 6) {
        saturdayCount++;
        if (saturdayCount === 2) {
          generated.push({
            id: `holiday-sat2-${dateStr}`,
            title: "2nd Saturday",
            date: dateStr,
            time: "00:00",
            type: "Holiday",
            isHoliday: true,
            caseNo: "N/A",
            court: "All Courts",
            status: "Completed",
            notes: "Second Saturday court leave."
          });
        }
      }

      const mmdd = `${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (publicHolidays[mmdd]) {
        generated.push({
          id: `holiday-pub-${dateStr}`,
          title: publicHolidays[mmdd],
          date: dateStr,
          time: "00:00",
          type: "Holiday",
          isHoliday: true,
          caseNo: "N/A",
          court: "All Courts",
          status: "Completed",
          notes: `${publicHolidays[mmdd]} public holiday.`
        });
      }
    }
  }

  return generated;
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
};

const formatMonthDay = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
};

const formatMonthYear = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
};

const formatFullDate = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${MONTHS_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const formatWeekdayMonthDay = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
};

const formatWeekdayMonthDayYear = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const formatMonthDayYear = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const getWeekdayShortName = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return WEEKDAYS_SHORT[date.getDay()];
};

const getWeekdayLongName = (dateObjOrStr) => {
  const date = parseLocalDate(dateObjOrStr);
  return WEEKDAYS_LONG[date.getDay()];
};

const pad = (n) => String(n).padStart(2, "0");

const getDateString = (date) => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutesStr} ${ampm}`;
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // adjust to Sunday
  return new Date(d.setDate(diff));
};

const getDaysOfWeek = (date) => {
  const start = getStartOfWeek(date);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(start);
    nextDay.setDate(start.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

const getWeekRangeLabel = (date) => {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = MONTHS_SHORT[start.getMonth()];
  const endMonth = MONTHS_SHORT[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${start.getDate()}, ${startYear} – ${endMonth} ${end.getDate()}, ${endYear}`;
  } else if (startMonth !== endMonth) {
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${startYear}`;
  } else {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${startYear}`;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case "Civil":
      return "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100";
    case "Criminal":
      return "bg-red-50 border-red-200 text-red-700 hover:bg-red-100";
    case "Corporate":
      return "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100";
    case "Family":
      return "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
    case "Consumer":
      return "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100";
    case "Holiday":
      return "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "Pending":
    default:
      return "bg-amber-100 text-amber-800";
  }
};

export default function CalendarView() {
  const { hasPermission } = usePermissions();
  // --- States ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // "month" | "week" | "day" | "agenda"
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Search & Filter state for Agenda View
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    time: "",
    type: "",
    caseNo: "",
    court: "",
    status: "Pending",
    notes: "",
  });

  // --- Dynamic Events ---
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedEvents = data
          .filter((c) => c.next_hearing_date) // Only cases with hearing date
          .map((c) => ({
            id: String(c.id),
            title: c.case_title || "Untitled Case",
            date: c.next_hearing_date ? c.next_hearing_date.split("T")[0] : "",
            time: "10:00", // Default time as requested
            type: c.case_type || "Civil",
            caseNo: c.case_no || "Unknown",
            court: c.court_name || "Unknown Court",
            status: c.status || "Pending",
            notes: c.case_description || "",
          }));
        setEvents(mappedEvents);
      }
    } catch (err) {
      console.error("Failed to fetch calendar cases:", err);
    }
  };

  const holidayEvents = useMemo(() => {
    const currentYear = selectedDate.getFullYear();
    return [
      ...generateHolidaysForYear(currentYear - 1),
      ...generateHolidaysForYear(currentYear),
      ...generateHolidaysForYear(currentYear + 1),
    ];
  }, [selectedDate]);

  const allEvents = useMemo(() => {
    return [...events, ...holidayEvents];
  }, [events, holidayEvents]);



  // --- Navigation Controls ---
  const handlePrev = () => {
    if (viewMode === "month") {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      const prevWeek = new Date(selectedDate);
      prevWeek.setDate(selectedDate.getDate() - 7);
      setSelectedDate(prevWeek);
    } else if (viewMode === "day") {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(selectedDate.getDate() - 1);
      setSelectedDate(prevDay);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      const nextWeek = new Date(selectedDate);
      nextWeek.setDate(selectedDate.getDate() + 7);
      setSelectedDate(nextWeek);
    } else if (viewMode === "day") {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
      setSelectedDate(nextDay);
    }
  };

  const getDateLabel = () => {
    if (viewMode === "month") {
      return formatMonthYear(selectedDate);
    } else if (viewMode === "week") {
      return getWeekRangeLabel(selectedDate);
    } else if (viewMode === "day") {
      return formatFullDate(selectedDate);
    } else {
      return "All Agenda Items";
    }
  };

  // --- Month Grid Calculations ---
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Padding days from the previous month
    const startDayOfWeek = firstDay.getDay(); // 0 for Sunday
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${d.getDate()}`,
      });
    }

    // Days of the current month
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`,
      });
    }

    // Padding days from the next month to fill the 42 cells grid (6 rows)
    const totalGridCells = 42;
    const remainingCells = totalGridCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`,
      });
    }

    return days;
  }, [selectedDate]);

  // --- Filtering Events ---
  const activeEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (viewMode === "day") {
        return e.date === getDateString(selectedDate);
      } else if (viewMode === "week") {
        const start = getStartOfWeek(selectedDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const eventDate = parseLocalDate(e.date);
        
        // Reset times for date comparison
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        eventDate.setHours(12,0,0,0);
        
        return eventDate >= start && eventDate <= end;
      } else if (viewMode === "month") {
        const eventDate = parseLocalDate(e.date);
        return (
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getFullYear() === selectedDate.getFullYear()
        );
      }
      return true; // Agenda shows all (optionally filtered by search)
    });
  }, [allEvents, selectedDate, viewMode]);

  // Agenda list (includes search & filter type filtering)
  const filteredAgendaEvents = useMemo(() => {
    return allEvents
      .filter((e) => {
        const matchesSearch =
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (e.caseNo && e.caseNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (e.court && e.court.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = filterType ? e.type === filterType : true;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  }, [allEvents, searchQuery, filterType]);

  // Upcoming Hearings (sorted chronologically, today or future)
  const upcomingHearings = useMemo(() => {
    const todayStr = getDateString(new Date());
    return events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
      .slice(0, 3);
  }, [events]);

  // Selected case details logic
  const selectedEventDetails = useMemo(() => {
    if (selectedEventId) {
      return allEvents.find((e) => e.id === selectedEventId);
    }
    // Default to the first upcoming event if none selected
    return upcomingHearings[0] || allEvents[0] || null;
  }, [allEvents, selectedEventId, upcomingHearings]);

  // --- CRUD Handlers ---
  const handleOpenAddModal = (dateStr = "") => {
    setEditingId(null);
    setEventForm({
      title: "",
      date: dateStr || getDateString(selectedDate),
      time: "10:00",
      type: "Civil",
      caseNo: "",
      court: "",
      status: "Pending",
      notes: "",
    });
    setShowEventModal(true);
  };

  const handleOpenEditModal = (eventObj, e) => {
    if (e) e.stopPropagation();
    setEditingId(eventObj.id);
    setEventForm({ ...eventObj });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (eventId, e) => {
    if (e) e.stopPropagation();
    setEventToDelete(eventId);
  };

  const confirmDeleteEvent = async () => {
    if (eventToDelete) {
      try {
        const res = await fetch(`${API_BASE_URL}/case-management/${eventToDelete}`, {
          method: 'DELETE',
        });
        
        if (res.ok) {
          setEvents(events.filter((item) => item.id !== eventToDelete));
          if (selectedEventId === eventToDelete) {
            setSelectedEventId(null);
            setShowViewModal(false);
          }
        } else {
          console.error("Failed to delete the event from server.");
        }
      } catch (err) {
        console.error("Error deleting event:", err);
      } finally {
        setEventToDelete(null);
      }
    }
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.time || !eventForm.type) {
      alert("Please fill in the Title, Date, Time, and Type fields.");
      return;
    }

    if (editingId) {
      // Edit
      setEvents(
        events.map((item) =>
          item.id === editingId ? { ...item, ...eventForm } : item
        )
      );
    } else {
      // Add
      const newEvent = {
        ...eventForm,
        id: String(Date.now()),
      };
      setEvents([...events, newEvent]);
    }

    setShowEventModal(false);
    setEditingId(null);
  };



  return (
    <div className="w-full space-y-6 md:space-y-8">
            {/* --- Page Header --- */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
          <h1 className="text-[#0F172A] font-bold" style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1.2 }}>
            Calendar
          </h1>
          <p className="text-[#64748B] mt-1.5" style={{ fontSize: '18px' }}>
            View hearings, meetings and deadlines
          </p>
        </div>

        {hasPermission("Calendar", "add") && (
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingId(null);  setEventForm({
        title: "",
        date: getDateString(selectedDate),
        time: "",
        type: "Civil",
        caseNo: "",
        court: "",
        status: "Pending",
        notes: "",
      }); setShowEventModal(true); }}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Event</span>
            </button>
          </div>
        )}


        {/* --- Top Control Bar --- */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-4 md:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Navigation buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm bg-slate-50">
                <button
                  onClick={handlePrev}
                  className="p-3 hover:bg-white text-[#64748B] hover:text-[#2563EB] transition"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="h-5 w-[1px] bg-slate-200"></div>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 hover:bg-white text-sm font-semibold text-[#64748B] hover:text-[#2563EB] transition"
                >
                  Today
                </button>
                <div className="h-5 w-[1px] bg-slate-200"></div>
                <button
                  onClick={handleNext}
                  className="p-3 hover:bg-white text-[#64748B] hover:text-[#2563EB] transition"
                  title="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <span className="px-4 py-2.5 bg-blue-50/70 border border-blue-100 text-blue-800 text-sm md:text-base font-bold rounded-2xl">
                {getDateLabel()}
              </span>
            </div>

            {/* View selectors */}
            <div className="grid grid-cols-4 p-1 bg-[#F8FAFC] border border-[#E2E8F0]/50 rounded-2xl w-full md:w-auto">
              {["month", "week", "day", "agenda"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold capitalize transition duration-200 ${
                    viewMode === mode
                      ? "bg-white text-[#2563EB] shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* --- Main Content Section --- */}
        <div className="space-y-6">

          {/* 1. MONTH VIEW */}
          {viewMode === "month" && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              
              {/* Calendar Grid Container */}
              <div className="xl:col-span-3 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
                
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-[#E2E8F0]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="py-4 text-center text-xs md:text-sm font-bold text-[#64748B] tracking-wider uppercase"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Desktop Grid Layout (xl and up) */}
                <div className="hidden md:grid grid-cols-7 divide-x divide-y divide-slate-100">
                  {monthDays.map(({ date, isCurrentMonth, key }) => {
                    const dateStr = getDateString(date);
                    const isToday = dateStr === getDateString(new Date());
                    const isSelected = dateStr === getDateString(selectedDate);
                    const dayEvents = allEvents.filter((e) => e.date === dateStr);
                    const holidayEvent = dayEvents.find((e) => e.isHoliday);

                    return (
                      <div
                        key={key}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedEventId(dayEvents[0]?.id || null);
                          if (dayEvents[0]?.id) setShowViewModal(true);
                        }}
                        className={`min-h-[110px] p-2 transition cursor-pointer flex flex-col justify-between group ${
                          holidayEvent
                            ? "bg-red-50/70 hover:bg-red-100/60 border border-red-100"
                            : isCurrentMonth
                            ? "bg-white hover:bg-[#F8FAFC]/50"
                            : "bg-[#F8FAFC]/30 text-[#64748B] hover:bg-[#F8FAFC]/50"
                        } ${isSelected ? (holidayEvent ? "ring-2 ring-red-400 ring-inset" : "ring-2 ring-blue-500 ring-inset") : ""}`}
                      >
                        {/* Day indicator header */}
                        <div className="flex justify-between items-center">
                          <span
                            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              isToday
                                ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                                : holidayEvent
                                ? "text-red-600 font-extrabold"
                                : isCurrentMonth
                                ? "text-[#0F172A]"
                                : "text-[#64748B]"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {/* Quick add trigger on cell hover */}
                          {hasPermission("Calendar", "add") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal(dateStr);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 text-[#2563EB] rounded-lg transition"
                              title="Add event here"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {holidayEvent && (
                          <div className="flex flex-col items-center justify-center flex-1 py-2 text-center">
                            <span className="text-[10px] md:text-xs font-extrabold text-red-600 leading-tight">
                              {holidayEvent.title}
                            </span>
                          </div>
                        )}

                        {/* Events list within cell */}
                        <div className="space-y-1 mt-2 overflow-y-auto max-h-[70px] custom-scrollbar">
                          {dayEvents
                            .filter((evt) => !evt.isHoliday)
                            .map((evt) => (
                              <div
                                key={evt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventId(evt.id);
                                  setShowViewModal(true);
                                }}
                                className={`px-2 py-1 text-[10px] md:text-xs rounded-lg border flex items-center justify-between font-medium cursor-pointer transition ${getTypeColor(
                                  evt.type
                                )}`}
                              >
                                <span className="truncate pr-1">{evt.title}</span>
                                <span className="text-[8px] opacity-75 shrink-0">
                                  {formatTime(evt.time)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Grid Layout (Smaller screens) */}
                <div className="md:hidden">
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-[#E2E8F0]">
                    {monthDays.map(({ date, isCurrentMonth, key }) => {
                      const dateStr = getDateString(date);
                      const isToday = dateStr === getDateString(new Date());
                      const isSelected = dateStr === getDateString(selectedDate);
                      const dayEvents = allEvents.filter((e) => e.date === dateStr);
                      const holidayEvent = dayEvents.find((e) => e.isHoliday);

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedEventId(dayEvents[0]?.id || null);
                          }}
                          className={`h-14 flex flex-col items-center justify-center relative cursor-pointer text-center ${
                            holidayEvent
                              ? "bg-red-50/70 border border-red-100 text-red-600"
                              : isCurrentMonth
                              ? "bg-white"
                              : "bg-[#F8FAFC]/30"
                          } ${isSelected ? "bg-blue-50/50 font-bold ring-1 ring-blue-500 ring-inset" : ""}`}
                        >
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                              isToday
                                ? "bg-[#2563EB] text-white shadow-sm"
                                : holidayEvent
                                ? "text-red-600 font-extrabold"
                                : isSelected
                                ? "text-[#2563EB] border border-blue-600/50"
                                : isCurrentMonth
                                ? "text-[#0F172A]"
                                : "text-[#64748B]"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {/* Dots for event presence */}
                          {dayEvents.filter((evt) => !evt.isHoliday).length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {dayEvents
                                .filter((evt) => !evt.isHoliday)
                                .slice(0, 3)
                                .map((evt) => (
                                  <span
                                    key={evt.id}
                                    className={`w-1 h-1 rounded-full ${
                                      evt.type === "Civil"
                                        ? "bg-blue-500"
                                        : evt.type === "Criminal"
                                        ? "bg-red-500"
                                        : evt.type === "Corporate"
                                        ? "bg-purple-500"
                                        : evt.type === "Family"
                                        ? "bg-emerald-500"
                                        : "bg-amber-500"
                                    }`}
                                  ></span>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Date Detail List (Mobile Only) */}
                  <div className="p-4 bg-[#F8FAFC]/50 border-t border-[#E2E8F0]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-[#64748B]">
                        Agenda for {formatMonthDay(selectedDate)}
                      </h4>
                      {hasPermission("Calendar", "add") && (
                        <button
                          onClick={() => handleOpenAddModal(getDateString(selectedDate))}
                          className="text-xs text-[#2563EB] hover:text-blue-800 font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Event</span>
                        </button>
                      )}
                    </div>

                     {allEvents.filter((e) => e.date === getDateString(selectedDate)).length === 0 ? (
                      <p className="text-xs text-[#64748B] py-3 text-center bg-white rounded-2xl border border-[#E2E8F0]">
                        No events scheduled for this day.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {allEvents
                          .filter((e) => e.date === getDateString(selectedDate))
                          .map((evt) => (
                            <div
                              key={evt.id}
                              onClick={() => { setSelectedEventId(evt.id); setShowViewModal(true); }}
                              className="bg-white p-3 rounded-2xl border border-[#E2E8F0] flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-300 transition"
                            >
                              <div className="flex gap-2.5 items-center min-w-0">
                                <span className={`w-2 h-8 rounded-full ${
                                  evt.type === "Civil"
                                    ? "bg-blue-500"
                                    : evt.type === "Criminal"
                                    ? "bg-red-500"
                                    : evt.type === "Corporate"
                                    ? "bg-purple-500"
                                    : evt.type === "Family"
                                    ? "bg-emerald-500"
                                    : evt.type === "Holiday"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                }`}></span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#0F172A] truncate">
                                    {evt.title}
                                  </p>
                                  <p className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 text-[#64748B]" />
                                    <span>{formatTime(evt.time)} ({evt.type})</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {hasPermission("Calendar", "edit") && (
                                  <button
                                    onClick={(e) => handleOpenEditModal(evt, e)}
                                    className="p-1.5 bg-[#F8FAFC] text-[#64748B] rounded-lg hover:text-[#2563EB]"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {hasPermission("Calendar", "delete") && (
                                  <button
                                    onClick={(e) => handleDeleteEvent(evt.id, e)}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Month View Right Panel */}
              <div className="space-y-6">
                
                {/* 1. Upcoming Hearings */}
                <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                    <h2 className="font-extrabold text-[#0F172A] text-lg flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-[#2563EB]" />
                      <span>Upcoming Hearings</span>
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {upcomingHearings.length === 0 ? (
                      <div className="text-center py-6 text-[#64748B]">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm">No upcoming hearings scheduled.</p>
                      </div>
                    ) : (
                      upcomingHearings.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedEventId(item.id);
                            setSelectedDate(parseLocalDate(item.date));
                          }}
                          className={`border rounded-2xl p-3.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition ${
                            selectedEventDetails?.id === item.id
                              ? "border-blue-500 bg-blue-50/30"
                              : "border-[#E2E8F0]"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            <span className="text-xs font-bold text-[#2563EB]">
                              {formatMonthDay(item.date)}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-[#0F172A] mt-2 text-sm">
                            {item.title}
                          </h3>
                          
                          <div className="flex items-center gap-1.5 mt-2 text-[#64748B] text-xs">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatTime(item.time)}</span>
                          </div>

                          {item.court && (
                            <div className="flex items-center gap-1.5 mt-1 text-[#64748B] text-xs">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.court}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Active Case Details */}
                <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
                  <h2 className="font-extrabold text-[#0F172A] text-lg flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Case Details</span>
                  </h2>

                  {selectedEventDetails ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Case / Event Name</span>
                        <h3 className="text-base font-bold text-[#0F172A] mt-0.5">{selectedEventDetails.title}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-[#E2E8F0]">
                        <div>
                          <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Case Number</span>
                          <span className="text-xs font-bold text-[#64748B]">{selectedEventDetails.caseNo || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block">Type</span>
                          <span className="text-xs font-bold text-[#64748B]">{selectedEventDetails.type}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-[#64748B]">
                        <div className="flex gap-2 items-start">
                          <MapPin className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-[#64748B] block leading-none">Court Venue</span>
                            <span className="text-xs font-medium text-[#64748B]">{selectedEventDetails.court || "Not Specified"}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 items-start">
                          <Clock className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-[#64748B] block leading-none">Schedule Time</span>
                            <span className="text-xs font-medium text-[#64748B]">
                              {formatWeekdayMonthDay(selectedEventDetails.date)} at {formatTime(selectedEventDetails.time)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {selectedEventDetails.notes && (
                        <div>
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Agenda Notes</span>
                          <p className="text-xs text-[#64748B] bg-slate-50 p-3 rounded-2xl mt-1 leading-relaxed border border-[#E2E8F0]">
                            {selectedEventDetails.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {hasPermission("Calendar", "edit") && !selectedEventDetails.isHoliday && (
                          <button
                            onClick={(e) => handleOpenEditModal(selectedEventDetails, e)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-[#E2E8F0] hover:border-slate-300 text-[#64748B] rounded-xl text-xs font-bold transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        {hasPermission("Calendar", "delete") && !selectedEventDetails.isHoliday && (
                          <button
                            onClick={(e) => handleDeleteEvent(selectedEventDetails.id, e)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#64748B]">
                      <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs">Select any event/hearing to view full details.</p>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* 2. WEEK VIEW */}
          {viewMode === "week" && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-4 md:p-6">
              
              {/* Desktop Week Grid */}
              <div className="hidden md:grid grid-cols-7 gap-4">
                {getDaysOfWeek(selectedDate).map((day) => {
                  const dateStr = getDateString(day);
                  const isToday = dateStr === getDateString(new Date());
                  const isSelected = dateStr === getDateString(selectedDate);
                  const dayEvents = allEvents.filter((e) => e.date === dateStr);

                  return (
                    <div
                      key={day.toString()}
                      className={`border rounded-2xl p-4 min-h-[300px] flex flex-col justify-between transition ${
                        isSelected ? "border-blue-500 bg-blue-50/10 shadow-sm" : "border-[#E2E8F0] bg-[#F8FAFC]/30"
                      }`}
                    >
                      {/* Week Column Header */}
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                              {getWeekdayShortName(day)}
                            </p>
                            <h3 className={`text-lg font-black mt-0.5 leading-none ${isToday ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                              {day.getDate()}
                            </h3>
                          </div>
                          {hasPermission("Calendar", "add") && (
                            <button
                              onClick={() => handleOpenAddModal(dateStr)}
                              className="p-1 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#2563EB] rounded-lg hover:scale-105 transition"
                              title="Add event"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Event List in Week Day */}
                        <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                          {dayEvents.length === 0 ? (
                            <p className="text-[11px] text-[#64748B] italic">No events</p>
                          ) : (
                            dayEvents.map((evt) => (
                              <div
                                key={evt.id}
                                onClick={() => { setSelectedEventId(evt.id); setShowViewModal(true); }}
                                className={`p-2.5 rounded-xl border flex flex-col font-medium cursor-pointer transition text-xs relative group ${getTypeColor(
                                  evt.type
                                )}`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-[#0F172A] truncate max-w-[80px]">
                                    {evt.title}
                                  </span>
                                  <span className="text-[9px] opacity-75 shrink-0 font-medium">
                                    {formatTime(evt.time)}
                                  </span>
                                </div>
                                <span className="text-[9px] text-[#64748B] mt-1 truncate">
                                  {evt.court || "No Court"}
                                </span>
                                
                                {/* Hover quick actions */}
                                <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 flex gap-0.5 transition">
                                  {hasPermission("Calendar", "edit") && !evt.isHoliday && (
                                    <button
                                      onClick={(e) => handleOpenEditModal(evt, e)}
                                      className="p-1 bg-white/80 hover:bg-white text-[#64748B] rounded shadow-sm"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                  {hasPermission("Calendar", "delete") && !evt.isHoliday && (
                                    <button
                                      onClick={(e) => handleDeleteEvent(evt.id, e)}
                                      className="p-1 bg-white/80 hover:bg-red-50 text-red-600 rounded shadow-sm"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Select Column Action */}
                      <button
                        onClick={() => setSelectedDate(day)}
                        className={`w-full py-1.5 text-[10px] font-bold rounded-xl mt-3 transition text-center uppercase tracking-wide ${
                          isSelected
                            ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/10"
                            : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select Day"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Week Grid (Vertical Stack) */}
              <div className="md:hidden space-y-3">
                {getDaysOfWeek(selectedDate).map((day) => {
                  const dateStr = getDateString(day);
                  const isToday = dateStr === getDateString(new Date());
                  const isSelected = dateStr === getDateString(selectedDate);
                  const dayEvents = allEvents.filter((e) => e.date === dateStr);

                  return (
                    <div
                      key={day.toString()}
                      className={`border rounded-2xl overflow-hidden transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/5"
                          : "border-[#E2E8F0] bg-white"
                      }`}
                    >
                      {/* Mobile Column Header */}
                      <div
                        onClick={() => setSelectedDate(day)}
                        className="flex items-center justify-between p-4 bg-slate-50/70 border-b border-[#E2E8F0] cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isToday
                              ? "bg-[#2563EB] text-white"
                              : isSelected
                              ? "text-[#2563EB] border border-blue-600"
                              : "bg-slate-200 text-[#64748B]"
                          }`}>
                            {day.getDate()}
                          </span>
                          <div>
                            <p className="text-xs text-[#64748B] font-bold uppercase tracking-wider leading-none">
                              {getWeekdayLongName(day)}
                            </p>
                            <p className="text-[10px] text-[#64748B] mt-1">
                              {formatMonthYear(day)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasPermission("Calendar", "add") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal(dateStr);
                              }}
                              className="p-2 bg-white border border-[#E2E8F0] text-[#2563EB] rounded-xl"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Column Content */}
                      <div className="p-3 space-y-2">
                        {dayEvents.length === 0 ? (
                          <p className="text-xs text-[#64748B] italic py-1 pl-1">No hearings or schedules.</p>
                        ) : (
                          dayEvents.map((evt) => (
                            <div
                              key={evt.id}
                              className={`p-3 rounded-xl border flex items-center justify-between transition ${getTypeColor(
                                evt.type
                              )}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[#0F172A] truncate">{evt.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#64748B] font-medium">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#64748B]" />
                                    {formatTime(evt.time)}
                                  </span>
                                  {evt.court && (
                                    <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                                      <MapPin className="w-3 h-3 text-[#64748B]" />
                                      {evt.court}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 ml-2">
                                {hasPermission("Calendar", "edit") && !evt.isHoliday && (
                                  <button
                                    onClick={(e) => handleOpenEditModal(evt, e)}
                                    className="p-1.5 bg-white text-[#64748B] rounded-lg shadow-sm"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {hasPermission("Calendar", "delete") && !evt.isHoliday && (
                                  <button
                                    onClick={(e) => handleDeleteEvent(evt.id, e)}
                                    className="p-1.5 bg-white text-red-600 rounded-lg shadow-sm"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* 3. DAY VIEW */}
          {viewMode === "day" && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-4 md:p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A]">
                    Daily Schedule
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    Timeline calendar events for selected day.
                  </p>
                </div>
                
                {hasPermission("Calendar", "add") && (
                  <button
                    onClick={() => handleOpenAddModal(getDateString(selectedDate))}
                    className="flex items-center gap-1 px-4 py-2.5 bg-blue-50 text-[#2563EB] hover:bg-blue-100 rounded-xl font-bold text-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Event</span>
                  </button>
                )}
              </div>

              {activeEvents.length === 0 ? (
                <div className="text-center py-12 bg-[#F8FAFC]/30 rounded-3xl border border-dashed border-[#E2E8F0]">
                  <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="font-bold text-[#64748B] text-base">Day is clear</h3>
                  <p className="text-sm text-[#64748B] mt-1 max-w-xs mx-auto">
                    You have no scheduled court hearings, agendas, or meetings for this day.
                  </p>
                  {hasPermission("Calendar", "add") && (
                    <button
                      onClick={() => handleOpenAddModal(getDateString(selectedDate))}
                      className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-[#2563EB]/10"
                    >
                      Schedule First Event
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {activeEvents
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((event) => (
                      <div
                        key={event.id}
                        className={`border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-sm ${getTypeColor(
                          event.type
                        )}`}
                      >
                        <div className="flex gap-4 items-start md:items-center">
                          <div className="bg-white/90 p-3 rounded-2xl text-[#64748B] border border-[#E2E8F0] text-center shrink-0 min-w-[70px] shadow-sm">
                            <Clock className="w-4 h-4 mx-auto text-[#64748B] mb-1" />
                            <span className="text-xs font-bold">{formatTime(event.time)}</span>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-[#0F172A] text-base md:text-lg">
                                {event.title}
                              </h3>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(event.status)}`}>
                                {event.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                              {event.caseNo && (
                                <span className="font-semibold text-[#64748B]">
                                  Case: {event.caseNo}
                                </span>
                              )}
                              {event.court && (
                                <span className="flex items-center gap-1 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                  <span className="truncate">{event.court}</span>
                                </span>
                              )}
                            </div>

                            {event.notes && (
                              <p className="text-xs text-[#64748B] bg-white/50 p-2.5 rounded-xl border border-[#E2E8F0]/40 mt-2 max-w-xl leading-relaxed">
                                {event.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 border-t md:border-t-0 border-[#E2E8F0] pt-3 md:pt-0">
                          {hasPermission("Calendar", "edit") && !event.isHoliday && (
                            <button
                              onClick={(e) => handleOpenEditModal(event, e)}
                              className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#64748B] transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                          
                          {hasPermission("Calendar", "delete") && !event.isHoliday && (
                            <button
                              onClick={(e) => handleDeleteEvent(event.id, e)}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 4. AGENDA VIEW */}
          {viewMode === "agenda" && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-4 md:p-6">
              
              {/* Search and Filter panel */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A]">
                    Agenda Search
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    Search hearings and schedules by keyword or case type.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search agenda..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="relative w-full sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] w-3.5 h-3.5" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl text-sm outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition appearance-none"
                    >
                      <option value="">All Case Types</option>
                      <option value="Civil">Civil</option>
                      <option value="Criminal">Criminal</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Family">Family</option>
                      <option value="Consumer">Consumer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Agenda List */}
              {filteredAgendaEvents.length === 0 ? (
                <div className="text-center py-12 text-[#64748B]">
                  <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-base font-bold text-[#64748B]">No matching agenda items</p>
                  <p className="text-sm mt-1">Try clearing filters or search terms.</p>
                </div>
              ) : (
                <div className="space-y-6 relative border-l border-[#E2E8F0]/70 ml-4 md:ml-8 pl-6 md:pl-10">
                  {filteredAgendaEvents.map((evt) => {
                    const evtDate = new Date(evt.date);
                    return (
                      <div key={evt.id} className="relative group">
                        
                        {/* Timeline Node Point */}
                        <span className="absolute -left-[31px] md:-left-[47px] top-1 bg-white border-4 border-blue-500 w-4.5 h-4.5 rounded-full z-10"></span>
                        
                        <div className="bg-slate-50/40 hover:bg-slate-50 border border-[#E2E8F0] rounded-3xl p-4 md:p-5 transition shadow-sm hover:shadow-md hover:border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                          
                          <div className="space-y-2">
                            {/* Date & Type metadata */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-[#2563EB]">
                                {formatWeekdayMonthDayYear(evtDate)}
                              </span>
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                              <span className="text-xs font-bold text-[#64748B] flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                                {formatTime(evt.time)}
                              </span>
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full tracking-wider uppercase border ${getTypeColor(
                                evt.type
                              )}`}>
                                {evt.type}
                              </span>
                            </div>

                            <h3 className="text-base md:text-lg font-black text-[#0F172A]">
                              {evt.title}
                            </h3>

                            {/* Court & Case Info */}
                            {(evt.caseNo || evt.court) && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                                {evt.caseNo && (
                                  <span className="font-bold text-[#64748B]">
                                    Case No: {evt.caseNo}
                                  </span>
                                )}
                                {evt.court && (
                                  <span className="flex items-center gap-1 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                    {evt.court}
                                  </span>
                                )}
                              </div>
                            )}

                            {evt.notes && (
                              <p className="text-xs text-[#64748B] bg-white p-3 rounded-2xl border border-[#E2E8F0] mt-2 max-w-xl leading-relaxed">
                                {evt.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 border-t md:border-t-0 border-[#E2E8F0] pt-3 md:pt-0 justify-end">
                            <span className={`px-3 py-1 rounded-xl text-xs font-bold mr-2 ${getStatusColor(evt.status)}`}>
                              {evt.status}
                            </span>
                            {hasPermission("Calendar", "edit") && !evt.isHoliday && (
                              <button
                                onClick={(e) => handleOpenEditModal(evt, e)}
                                className="p-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#2563EB] rounded-xl transition shadow-sm hover:scale-105"
                                title="Edit Agenda"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission("Calendar", "delete") && !evt.isHoliday && (
                              <button
                                onClick={(e) => handleDeleteEvent(evt.id, e)}
                                className="p-2.5 bg-white border border-[#E2E8F0] text-red-600 hover:bg-red-50 rounded-xl transition shadow-sm hover:scale-105"
                                title="Delete Agenda"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>

        {/* --- DYNAMIC SCHEDULE TABLE SECTION (Syncs dynamically with events) --- */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-[#0F172A]">
                Schedule Registry
              </h2>
              <p className="text-sm text-[#64748B] mt-0.5">
                Overview of court hearings and lawyer timetables.
              </p>
            </div>
            <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-bold text-[#64748B] self-start">
              Total Listed: {events.length}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left font-bold text-[#64748B] uppercase tracking-wider text-xs">Date</th>
                  <th className="p-4 text-left font-bold text-[#64748B] uppercase tracking-wider text-xs">Time</th>
                  <th className="p-4 text-left font-bold text-[#64748B] uppercase tracking-wider text-xs">Case / Title</th>
                  <th className="p-4 text-left font-bold text-[#64748B] uppercase tracking-wider text-xs">Case No</th>
                  <th className="p-4 text-left font-bold text-[#64748B] uppercase tracking-wider text-xs">Court</th>
                  <th className="p-4 text-left font-bold text-[#64748B] uppercase tracking-wider text-xs">Status</th>
                  <th className="p-4 text-center font-bold text-[#64748B] uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-[#64748B]">
                      No schedule records available. Click &quot;+ Add Event&quot; to populate.
                    </td>
                  </tr>
                ) : (
                  events
                    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
                    .map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedEventId(item.id);
                          setSelectedDate(parseLocalDate(item.date));
                          setShowViewModal(true);
                        }}
                        className={`hover:bg-[#F8FAFC]/50 transition cursor-pointer ${
                          selectedEventId === item.id ? "bg-blue-50/30 font-medium" : ""
                        }`}
                      >
                        <td className="p-4 text-[#64748B] font-bold whitespace-nowrap">
                          {formatMonthDayYear(item.date)}
                        </td>
                        <td className="p-4 text-[#64748B] font-medium whitespace-nowrap">{formatTime(item.time)}</td>
                        <td className="p-4 text-[#0F172A] font-extrabold">{item.title}</td>
                        <td className="p-4 text-[#64748B] font-semibold whitespace-nowrap">{item.caseNo || "—"}</td>
                        <td className="p-4 text-[#64748B] truncate max-w-[150px]">{item.court || "—"}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {hasPermission("Calendar", "edit") && (
                              <button
                                onClick={(e) => handleOpenEditModal(item, e)}
                                className="p-1.5 text-[#64748B] hover:text-[#2563EB] bg-[#F8FAFC] rounded-lg transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission("Calendar", "delete") && (
                              <button
                                onClick={(e) => handleDeleteEvent(item.id, e)}
                                className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        
        {/* --- VIEW EVENT MODAL --- */}
        {showViewModal && selectedEventDetails && mounted && createPortal(
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
            onClick={() => setShowViewModal(false)}
          >
            <div
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F1F5F9] bg-gradient-to-r from-[#2563EB] to-[#1d4ed8]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl leading-tight">
                      {selectedEventDetails.title}
                    </h2>
                    <p className="text-white/70 text-xs mt-0.5 font-mono uppercase tracking-wider">
                      Case #{selectedEventDetails.caseNo || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(selectedEventDetails.status)}`}>
                    {selectedEventDetails.status}
                  </span>
                  <span className="text-xs text-[#94A3B8] font-medium">
                    {selectedEventDetails.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#F1F5F9] space-y-4">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Schedule Details</h4>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                        <Clock size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Date & Time</p>
                        <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
                          {formatFullDate(selectedEventDetails.date)} at {formatTime(selectedEventDetails.time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Court / Venue</p>
                        <p className="text-sm font-semibold text-[#0F172A] mt-0.5">{selectedEventDetails.court || "Not Specified"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#F1F5F9] space-y-4">
                     <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">Case Details</h4>
                     <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Case Type</p>
                        <p className="text-sm font-semibold text-[#0F172A] mt-0.5">{selectedEventDetails.type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedEventDetails.notes && (
                  <div className="bg-[#FFFBEB] border border-amber-100 rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText size={13} /> Agenda Notes
                    </h4>
                    <p className="text-sm text-[#475569] leading-relaxed">
                      {selectedEventDetails.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-between items-center">
                <div className="text-xs text-[#94A3B8] font-medium">
                  Event ID: <span className="font-mono text-[#64748B]">{selectedEventDetails.id}</span>
                </div>
                <div className="flex gap-2">
                  {hasPermission("Calendar", "delete") && !selectedEventDetails.isHoliday && (
                    <button
                      onClick={(e) => {
                        handleDeleteEvent(selectedEventDetails.id, e);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-6 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* --- ADD / EDIT EVENT MODAL --- */}
        {showEventModal && mounted && createPortal(
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
            onClick={() => setShowEventModal(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-[#E2E8F0] flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center justify-center"
                    title="Back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl md:text-2xl font-black text-[#0F172A]">
                    {editingId ? "Edit Event details" : "Schedule New Event"}
                  </h2>
                </div>
                <span className="text-[10px] font-bold uppercase px-3 py-1 bg-[#F8FAFC] text-[#64748B] rounded-full">
                  Advocate Log
                </span>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                
                {/* Title */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Event / Case Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Property Dispute Hearing, Bail Plea"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                  />
                </div>

                {/* Grid Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Date *
                    </label>
                    <CustomDatePicker
                      selected={eventForm.date}
                      onChange={(dateStr) => setEventForm({ ...eventForm, date: dateStr })}
                      minDate={new Date()}
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Time *
                    </label>
                    <input
                      type="time"
                      min={eventForm.date === getTodayDateString() ? getCurrentTimeString() : undefined}
                      required
                      value={eventForm.time}
                      onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Case Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Case Type *
                    </label>
                    <select
                      value={eventForm.type}
                      required
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                      className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition appearance-none"
                    >
                      <option value="Civil">Civil</option>
                      <option value="Criminal">Criminal</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Family">Family</option>
                      <option value="Consumer">Consumer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Status *
                    </label>
                    <select
                      value={eventForm.status}
                      required
                      onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                      className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition appearance-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Case No & Court Venue */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Case No (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CS/890/2023"
                      value={eventForm.caseNo}
                      onChange={(e) => setEventForm({ ...eventForm, caseNo: e.target.value })}
                      className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                      Court / Venue (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Civil Court, Prayagraj"
                      value={eventForm.court}
                      onChange={(e) => setEventForm({ ...eventForm, court: e.target.value })}
                      className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                {/* Notes/Agenda Description */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Agenda Notes / Description
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Brief outline of case agenda, client context, or required documents..."
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                    className="w-full border border-[#E2E8F0] bg-[#F8FAFC]/50 rounded-2xl px-4 py-3 text-[#0F172A] outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition resize-none"
                  />
                </div>

                {/* Dialog Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-5 py-2.5 bg-[#F8FAFC] text-[#64748B] hover:bg-slate-200 rounded-xl font-bold text-sm transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-[#2563EB]/10"
                  >
                    {editingId ? "Save Changes" : "Create Event"}
                  </button>
                </div>

              </form>
            </div>
          </div>,
          document.body
        )}

        {/* --- DELETE CONFIRMATION MODAL --- */}
        {eventToDelete && mounted && createPortal(
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in"
            onClick={() => setEventToDelete(null)}
          >
            <div
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-[#E2E8F0] flex flex-col text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Delete Event</h3>
              <p className="text-[#64748B] text-sm mb-6">
                Are you sure you want to delete this event/hearing? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setEventToDelete(null)}
                  className="px-5 py-2.5 bg-[#F8FAFC] text-[#64748B] hover:bg-slate-200 rounded-xl font-bold text-sm transition flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-red-500/20 flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
  );
}