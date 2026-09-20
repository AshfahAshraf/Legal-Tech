"use client";

import { API_BASE_URL } from "@/utils/api";
import { useState, useEffect } from "react";
import { getLoggedInUser } from "@/utils/auth";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  BookOpen,
  CalendarPlus,
  History,
  CheckCircle2,
  Clock,
  Check,
  X,
  Lock,
  Calendar,
  Video,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ClientConsultationView() {
  const [showModal, setShowModal] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState([]);
  const [hearings, setHearings] = useState([]);

  const formatDateString = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTimeString = (timeStr) => {
    if (!timeStr) return "N/A";
    return timeStr;
  };

  const handleDismissNotification = (id) => {
    const newDismissed = [...dismissedNotifications, id];
    setDismissedNotifications(newDismissed);
    localStorage.setItem("client_dismissed_consultation_notifications", JSON.stringify(newDismissed));
  };

  const [canAddConsultation, setCanAddConsultation] = useState(true);
  const [clientDisplayName, setClientDisplayName] = useState("");

  const getClientDisplayName = (u) => {
    if (!u) return "";
    const fullName = [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if (u.fullName) return u.fullName;
    if (u.full_name) return u.full_name;
    if (u.client_name) return u.client_name;
    if (u.clientName) return u.clientName;
    if (u.name) return u.name;
    return u.username || "";
  };

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    type: "",
  });
  const [selectedTimeDate, setSelectedTimeDate] = useState(null);

  const handleTimeChange = (date) => {
    setSelectedTimeDate(date);
    if (date) {
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeString = `${hours}:${minutes} ${ampm}`;
      setFormData((prev) => ({ ...prev, time: timeString }));
    } else {
      setFormData((prev) => ({ ...prev, time: "" }));
    }
  };

  const [rescheduleId, setRescheduleId] = useState(null);
  const [successToast, setSuccessToast] = useState({ show: false, message: "", type: "success" });

  const fetchConsultations = async (currentUser) => {
    try {
      let url = `${API_BASE_URL}/consultations`;
      const clientId = currentUser?.id || currentUser?.user_id || currentUser?.sub;
      if (clientId && !isNaN(Number(clientId))) {
        url += `?client_id=${clientId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const upcoming = data.filter(
          (item) =>
            item.status === "Pending" ||
            item.status === "Approved" ||
            item.status === "Rescheduled" ||
            item.status === "Scheduled" ||
            item.status === "Pending Client" ||
            item.status === "Pending Advocate"
        );
        const hist = data.filter(
          (item) =>
            item.status === "Completed" ||
            item.status === "Approved" ||
            item.status === "Pending" ||
            item.status === "Rescheduled" ||
            item.status === "Scheduled" ||
            item.status === "Pending Client" ||
            item.status === "Pending Advocate"
        );
        setAppointments(upcoming);
        setHistory(hist);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("Could not fetch consultations:", err.message);
      }
    }
  };

  const resolveConsultationAddPermission = async (loggedInUser) => {
    if (!loggedInUser) return;
    try {
      const resUser = await fetch(`${API_BASE_URL}/permissions/users/${loggedInUser.id}`);
      if (resUser.ok) {
        const userData = await resUser.json();
        const custom = userData.customPermissions || {};
        if (custom["Consultation"] !== undefined) {
          setCanAddConsultation(custom["Consultation"].add === true);
          return;
        }
      }
    } catch (_) { }

    try {
      const resPerms = await fetch(`${API_BASE_URL}/permissions`);
      if (resPerms.ok) {
        const allPerms = await resPerms.json();
        const roleKey = Object.keys(allPerms).find(k => k.toLowerCase() === loggedInUser.role.toLowerCase()) || loggedInUser.role;
        const rolePerms = allPerms[roleKey] || {};
        const consultPerm = rolePerms["Consultation"];
        if (consultPerm !== undefined) {
          setCanAddConsultation(consultPerm.add === true);
          return;
        }
      }
    } catch (_) { }

    setCanAddConsultation(true);
  };

  useEffect(() => {
    setMounted(true);
    const loggedIn = getLoggedInUser();
    setUser(loggedIn);
    if (loggedIn) {
      const initialName = getClientDisplayName(loggedIn);
      setClientDisplayName(initialName);
      setFormData((prev) => ({
        ...prev,
        name: initialName,
      }));

      fetch(`${API_BASE_URL}/case-management/`)
        .then((res) => (res.ok ? res.json() : []))
        .then((cases) => {
          if (Array.isArray(cases) && cases.length > 0) {
            const userEmail = (loggedIn.email || "").toLowerCase().trim();
            const userName = (loggedIn.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const matchedCase = cases.find((c) => {
              const cEmail = (c.email_id || "").toLowerCase().trim();
              const cClientName = (c.client_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return (
                (userEmail && cEmail && userEmail === cEmail) ||
                (userName && cClientName && (cClientName === userName || userName.includes(cClientName)))
              );
            });
            if (matchedCase && matchedCase.client_name) {
              setClientDisplayName(matchedCase.client_name);
              setFormData((prev) => ({
                ...prev,
                name: matchedCase.client_name,
              }));
            }
          }
        })
        .catch(() => {});
    }
    fetchConsultations(loggedIn);
    if (loggedIn) {
      resolveConsultationAddPermission(loggedIn);
    }
    const dismissed = JSON.parse(localStorage.getItem("client_dismissed_consultation_notifications") || "[]");
    setDismissedNotifications(dismissed);
  }, []);

  const triggerSuccess = (message, type = "success") => {
    setSuccessToast({ show: true, message, type });
    setTimeout(() => {
      setSuccessToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  const handleBookAppointment = async () => {
    if (!canAddConsultation) {
      triggerSuccess("You do not have permission to book a consultation.", "warning");
      return;
    }
    if (
      !formData.name ||
      !formData.date ||
      !formData.time ||
      !formData.type
    ) {
      triggerSuccess("Please fill all required fields.", "warning");
      return;
    }

    const bookData = {
      client_name: formData.name,
      client_id: user ? user.id : null,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      issue: "Consultation Request",
      fee: "₹500",
    };

    try {
      const res = await fetch(`${API_BASE_URL}/consultations/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      });

      if (res.ok) {
        triggerSuccess("Booking submitted successfully!");
        setShowModal(false);
        fetchConsultations(user);
        setFormData({
          name: clientDisplayName || getClientDisplayName(user),
          date: "",
          time: "",
          type: "",
        });
        setSelectedTimeDate(null);
      } else {
        triggerSuccess("Failed to book appointment.", "error");
      }
    } catch (err) {
      console.error("Error booking consultation:", err);
      triggerSuccess("Error connecting to server.", "error");
    }
  };

  const handleReschedule = async () => {
    if (!formData.date || !formData.time) {
      triggerSuccess("Please select Date and Time.", "warning");
      return;
    }

    const rescheduleData = {
      date: formData.date,
      time: formData.time,
      reason: "Requested by client",
      status: "Pending Advocate"
    };

    try {
      const res = await fetch(
        `${API_BASE_URL}/consultations/${rescheduleId}/reschedule`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rescheduleData),
        }
      );

      if (res.ok) {
        triggerSuccess("Reschedule request sent successfully!");
        setRescheduleId(null);
        setShowModal(false);
        fetchConsultations(user);
        setFormData({
          name: clientDisplayName || getClientDisplayName(user),
          date: "",
          time: "",
          type: "",
        });
        setSelectedTimeDate(null);
      } else {
        triggerSuccess("Failed to reschedule consultation.", "error");
      }
    } catch (err) {
      console.error("Error rescheduling:", err);
      triggerSuccess("Error connecting to server.", "error");
    }
  };

  const handleApproveAppointment = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/consultations/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved" }),
      });

      if (res.ok) {
        triggerSuccess("Approved successfully!");
        fetchConsultations(user);
      } else {
        triggerSuccess("Failed to approve appointment.", "error");
      }
    } catch (err) {
      console.error("Error approving:", err);
      triggerSuccess("Error connecting to server.", "error");
    }
  };

  const pendingRequests = appointments.filter(
    item => item.status === "Pending Client" || item.status === "Pending"
  );

  const upcomingMeetings = appointments.filter(
    item =>
      item.status === "Approved" ||
      item.status === "Scheduled" ||
      item.status === "Rescheduled" ||
      item.status === "Pending Advocate"
  );

  return (
    <div className="w-full max-w-full min-w-0 mx-auto space-y-5 sm:space-y-8 p-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
      {/* ──── HEADER ──── */}
      <div className="mb-4 sm:mb-6 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap mb-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-xs shrink-0">
            <BookOpen size={20} className="text-white" />
          </div>
          <h1 className="text-[#0F172A] font-extrabold text-xl sm:text-3xl lg:text-4xl leading-tight truncate">
            Case Discussion
          </h1>
        </div>
        <p className="text-xs sm:text-base text-[#64748B] sm:ml-[48px]">
          Book an appointment or join a consultation
        </p>
      </div>

      {/* Notifications */}
      {mounted && appointments.filter(item => {
        if (dismissedNotifications.includes(item.id)) return false;
        const isApprovedByAdvocate = item.status === "Approved" && item.reschedule_reason === "Approved by advocate";
        const isRescheduledByAdvocate = item.status === "Rescheduled" && item.reschedule_reason?.includes("advocate");
        return isApprovedByAdvocate || isRescheduledByAdvocate;
      }).length > 0 && (
        <div className="space-y-2.5 mb-4 sm:mb-6 w-full min-w-0">
          {appointments.filter(item => {
            if (dismissedNotifications.includes(item.id)) return false;
            const isApprovedByAdvocate = item.status === "Approved" && item.reschedule_reason === "Approved by advocate";
            const isRescheduledByAdvocate = item.status === "Rescheduled" && item.reschedule_reason?.includes("advocate");
            return isApprovedByAdvocate || isRescheduledByAdvocate;
          }).map(item => {
            const isApproved = item.status === "Approved";
            return (
              <div
                key={item.id}
                className={`flex items-start justify-between p-3 sm:p-4 rounded-xl border transition-all ${
                  isApproved
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex gap-2.5 items-start sm:items-center min-w-0">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isApproved ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm truncate">
                      {isApproved
                        ? `Your consultation request has been approved`
                        : `Your consultation has been rescheduled`}
                    </p>
                    <p className="text-[11px] sm:text-xs mt-0.5 opacity-90 font-medium">
                      Scheduled for: <span className="font-bold">{formatDateString(item.date)}</span> at <span className="font-bold">{formatTimeString(item.time)}</span> ({item.type})
                      {!isApproved && item.reschedule_reason && (
                        <span className="block mt-0.5 font-semibold italic truncate">Reason: {item.reschedule_reason}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissNotification(item.id)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors shrink-0 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ──── ACTION CARDS ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6 mb-6 w-full min-w-0">
        {/* Book Appointment */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all w-full min-w-0">
          <div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#2563EB] rounded-xl flex items-center justify-center mb-3">
              <CalendarPlus size={20} />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">Book Appointment</h2>
            <p className="text-[#64748B] mt-1 text-xs sm:text-sm font-medium">Choose a date and time to meet your advocate.</p>
          </div>
          {canAddConsultation ? (
            <button
              onClick={() => {
                setRescheduleId(null);
                setFormData({
                  name: clientDisplayName || getClientDisplayName(user),
                  date: "",
                  time: "",
                  type: "",
                });
                setShowModal(true);
              }}
              className="w-full mt-4 sm:mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <CalendarPlus size={16} />
              <span>Book Appointment</span>
            </button>
          ) : (
            <div className="w-full mt-4 sm:mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider">
              <Lock size={16} />
              <span>Booking not permitted</span>
            </div>
          )}
        </div>

        {/* Meeting History */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all w-full min-w-0">
          <div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
              <History size={20} />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">Meeting History</h2>
            <p className="text-[#64748B] mt-1 text-xs sm:text-sm font-medium">View your previous meetings and logs.</p>
          </div>
          <Link
            href="/client-consultation/history"
            className="w-full mt-4 sm:mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 text-center cursor-pointer"
          >
            <History size={16} />
            <span>View History</span>
          </Link>
        </div>
      </div>

      {/* Meeting Requests Section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 md:p-8 mb-6 overflow-hidden w-full min-w-0">
        <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] mb-4 sm:mb-6 flex items-center gap-2">
          <Calendar size={20} className="text-[#2563EB]" />
          <span>Meeting Requests</span>
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="p-6 text-center text-[#64748B] font-medium text-xs sm:text-sm bg-slate-50 rounded-2xl border border-slate-100">
            No pending meeting requests.
          </div>
        ) : (
          <>
            {/* Mobile Native Cards (< 640px) */}
            <div className="block sm:hidden space-y-3 w-full min-w-0">
              {pendingRequests.map((item) => (
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 w-full min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <h4 className="text-xs font-extrabold text-[#0F172A] capitalize truncate">{item.client_name || item.client}</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      <Clock size={10} />
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p>🗓️ Date: <strong>{item.date}</strong> at <strong>{item.time}</strong></p>
                    <p>💬 Type: <strong>{item.type}</strong></p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleApproveAppointment(item.id)}
                      className="flex-1 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleId(item.id);
                        setFormData({
                          name: item.client_name,
                          date: item.date,
                          time: item.time,
                          type: item.type,
                        });
                        setShowModal(true);
                      }}
                      className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Clock size={14} />
                      <span>Reschedule</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table (>= 640px) */}
            <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-[#E2E8F0] min-w-0">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs sm:text-sm">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Client Name</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Time</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {pendingRequests.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 sm:p-4 font-bold text-[#0F172A] capitalize whitespace-nowrap">{item.client_name || item.client}</td>
                      <td className="p-3.5 sm:p-4 text-[#475569] whitespace-nowrap">{item.date}</td>
                      <td className="p-3.5 sm:p-4 text-[#475569] whitespace-nowrap font-medium">{item.time}</td>
                      <td className="p-3.5 sm:p-4 text-[#475569] whitespace-nowrap">{item.type}</td>
                      <td className="p-3.5 sm:p-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          <Clock size={11} />
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveAppointment(item.id)}
                            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setRescheduleId(item.id);
                              setFormData({
                                name: item.client_name,
                                date: item.date,
                                time: item.time,
                                type: item.type,
                              });
                              setShowModal(true);
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Clock size={14} />
                            <span>Reschedule</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Upcoming Meetings Section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 md:p-8 mb-6 overflow-hidden w-full min-w-0">
        <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] mb-4 sm:mb-6 flex items-center gap-2">
          <Clock size={20} className="text-[#2563EB]" />
          <span>Upcoming Meetings</span>
        </h2>

        {upcomingMeetings.length === 0 ? (
          <div className="p-6 text-center text-[#64748B] font-medium text-xs sm:text-sm bg-slate-50 rounded-2xl border border-slate-100">
            No upcoming meetings.
          </div>
        ) : (
          <>
            {/* Mobile Native Cards (< 640px) */}
            <div className="block sm:hidden space-y-3 w-full min-w-0">
              {upcomingMeetings.map((item) => (
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 w-full min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0F172A]">{formatDateString(item.date)}</h4>
                      <p className="text-[11px] text-slate-500 font-bold">{formatTimeString(item.time)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                      item.status === "Approved" || item.status === "Scheduled"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      <CheckCircle2 size={10} />
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="font-bold text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded-md">{item.type}</span>
                    {item.meeting_link ? (
                      <a
                        href={item.meeting_link.startsWith("http") ? item.meeting_link : `https://${item.meeting_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:text-[#1D4ED8] font-bold inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-[10px]"
                      >
                        <Video size={12} />
                        <span>Google Meet</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table (>= 640px) */}
            <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-[#E2E8F0] min-w-0">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs sm:text-sm">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Time</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Google Meet Link</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {upcomingMeetings.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 sm:p-4 text-[#475569] font-medium whitespace-nowrap">{formatDateString(item.date)}</td>
                      <td className="p-3.5 sm:p-4 text-[#475569] font-medium whitespace-nowrap">{formatTimeString(item.time)}</td>
                      <td className="p-3.5 sm:p-4 text-[#475569] whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          item.type === "Video Call" || item.type === "Video Consultation"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : item.type === "Chat" || item.type === "Chat Consultation"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 whitespace-nowrap">
                        {item.meeting_link ? (
                          <a
                            href={item.meeting_link.startsWith("http") ? item.meeting_link : `https://${item.meeting_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563EB] hover:text-[#1D4ED8] font-bold inline-flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-3 py-1 rounded-lg transition-colors text-xs"
                          >
                            <Video size={14} />
                            <span>Open Google Meet</span>
                          </a>
                        ) : (
                          <span className="text-[#94A3B8] font-medium">-</span>
                        )}
                      </td>
                      <td className="p-3.5 sm:p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          item.status === "Approved" || item.status === "Scheduled"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          <CheckCircle2 size={11} />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {mounted && showModal && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-3.5 sm:p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">
                {rescheduleId ? "Reschedule Consultation" : "Book Appointment"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#F8FAFC] text-[#64748B] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {!rescheduleId && (
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Client Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] bg-[#F8FAFC] focus:bg-white text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Date</label>
                <CustomDatePicker
                  selected={formData.date}
                  onChange={(dateStr) => setFormData({ ...formData, date: dateStr })}
                  minDate={new Date()}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Time</label>
                <div className="w-full border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] focus-within:bg-white transition-all cursor-pointer">
                  <DatePicker
                    selected={selectedTimeDate}
                    onChange={handleTimeChange}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat="h:mm aa"
                    placeholderText="Select Time"
                    wrapperClassName="w-full"
                    className="w-full p-3 text-[#0F172A] bg-transparent outline-none text-xs sm:text-sm font-medium cursor-pointer"
                  />
                </div>
              </div>

              {!rescheduleId && (
                <div>
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Meeting Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] bg-[#F8FAFC] focus:bg-white text-xs sm:text-sm font-medium outline-none cursor-pointer"
                  >
                    <option value="">Select Type</option>
                    <option value="Video Consultation">Video Consultation</option>
                    <option value="Chat Consultation">Chat Consultation</option>
                    <option value="Person to Person">Person to Person</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F1F5F9]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={rescheduleId ? handleReschedule : handleBookAppointment}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                {rescheduleId ? "Reschedule" : "Book Appointment"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Toast Notification */}
      {successToast.show && (
        <div className={`fixed top-5 right-5 z-[10000] px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all max-w-sm ${
          successToast.type === "error"
            ? "bg-rose-600 text-white border-rose-500"
            : successToast.type === "warning"
            ? "bg-amber-600 text-white border-amber-500"
            : "bg-emerald-600 text-white border-emerald-500"
        }`}>
          {successToast.type === "error" ? (
            <X size={18} className="text-white shrink-0" />
          ) : successToast.type === "warning" ? (
            <Clock size={18} className="text-white shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-white shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs leading-tight">
              {successToast.type === "error" ? "Error" : successToast.type === "warning" ? "Notice" : "Success"}
            </p>
            <p className="text-[11px] font-medium mt-0.5 opacity-90 truncate">{successToast.message}</p>
          </div>
          <button
            onClick={() => setSuccessToast({ show: false, message: "", type: "success" })}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}