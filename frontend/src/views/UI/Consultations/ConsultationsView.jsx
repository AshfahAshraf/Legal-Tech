"use client";

import { API_BASE_URL } from "@/utils/api";

import { useState, useEffect } from "react";
import { getLoggedInUser } from "@/utils/auth";
import { getTodayDateString } from "@/utils/dateUtils";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from "react-dom";
import {
  BookOpen,
  BarChart3,
  Video,
  MessageSquare,
  CalendarCheck,
  History,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Plus,
  ChevronRight,
  User,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";

export default function ConsultationsView() {
    const [showAppointments, setShowAppointments] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [rescheduleReason, setRescheduleReason] = useState("");
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const [showHistory, setShowHistory] = useState(false);
    const [clientName, setClientName] = useState("");
    const [consultationType, setConsultationType] = useState("Meeting Type");
    const [consultationDate, setConsultationDate] = useState("");
    const [consultationTime, setConsultationTime] = useState("");
    const [selectedTimeDate, setSelectedTimeDate] = useState(null);

    const [history, setHistory] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [user, setUser] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [dismissedNotifications, setDismissedNotifications] = useState([]);
    const [clients, setClients] = useState([]);
    const [meetingLink, setMeetingLink] = useState("");
    const [generatingMeetLink, setGeneratingMeetLink] = useState(false);
    const [showScheduleSuccess, setShowScheduleSuccess] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateMessage, setDuplicateMessage] = useState("");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: "", type: "success" });
        }, 4000);
    };

    const generateMeetingLink = async (currentClient, currentDate, currentTime) => {
        setGeneratingMeetLink(true);
        const token = localStorage.getItem("token");
        try {
            const client = currentClient || "Client";
            const date = currentDate || new Date().toISOString().split('T')[0];
            const time = currentTime || "12:00 PM";
            const headers = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_BASE_URL}/consultations/generate-meet-link?client_name=${encodeURIComponent(client)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`, {
                headers: headers
            });
            if (res.ok) {
                const data = await res.json();
                setMeetingLink(data.meeting_link);
            }
        } catch (err) {
            console.error("Failed to generate meet link:", err);
        } finally {
            setGeneratingMeetLink(false);
        }
    };
    const [showRescheduleSuccess, setShowRescheduleSuccess] = useState(false);
    const fetchConsultations = async (currentUser) => {
        try {
            let url = `${API_BASE_URL}/consultations`;
            if (currentUser) {
                const roleLower = (currentUser.role || "").toLowerCase();
                if (roleLower === "senior advocate" || roleLower === "junior advocate") {
                    url += `?advocate_id=${currentUser.id}`;
                } else if (roleLower === "client") {
                    url += `?client_id=${currentUser.id}`;
                }
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();

                // Mapped to match original component client name display
                const mappedData = data.map(item => ({
                    ...item,
                    client: item.client_name,
                }));

                // Appointments for advocate to action: Pending
                const appts = mappedData.filter(item =>
                    item.status === "Pending" ||
                    item.status === "Pending Advocate"
                );

                // History: Approved, Rescheduled, or Pending Client
                const hist = mappedData.filter(item =>
                    item.status === "Approved" || item.status === "Pending Advocate" || item.status === "Pending Client" || item.status === "Rescheduled"
                );

                setAppointments(appts);
                setHistory(hist);
            }
        } catch (err) {
            if (err.name !== "AbortError") {
                console.warn("Could not fetch consultations:", err.message);
            }
        }
    };

    const handleDismissNotification = (id) => {
        const updated = [...dismissedNotifications, id];
        setDismissedNotifications(updated);
        localStorage.setItem("dismissed_consultation_notifications", JSON.stringify(updated));
    };

    // Fetch user and consultations on mount
    useEffect(() => {
        const initialize = async () => {
            setMounted(true);
            const loggedIn = getLoggedInUser();
            setUser(loggedIn);
            await fetchConsultations(loggedIn);
            const dismissed = JSON.parse(localStorage.getItem("dismissed_consultation_notifications") || "[]");
            setDismissedNotifications(dismissed);

            try {
                const uniqueClientsMap = new Map();

                // 1. Registered client users
                try {
                    const resUsers = await fetch(`${API_BASE_URL}/permissions/users`);
                    if (resUsers.ok) {
                        const usersData = await resUsers.json();
                        usersData.forEach(u => {
                            if (u.role && u.role.toLowerCase() === "client") {
                                const firstName = (u.firstName || u.first_name || "").trim();
                                const lastName = (u.lastName || u.last_name || "").trim();
                                const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
                                const displayName = fullName || u.username;

                                if (displayName) {
                                    const key = displayName.toLowerCase();
                                    if (!uniqueClientsMap.has(key)) {
                                        uniqueClientsMap.set(key, {
                                            id: u.id,
                                            clientName: displayName,
                                            emailId: u.email || ""
                                        });
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {}

                // 2. Client Management entries
                try {
                    const resClientMgmt = await fetch(`${API_BASE_URL}/client-management/`);
                    if (resClientMgmt.ok) {
                        const clientsData = await resClientMgmt.json();
                        clientsData.forEach(c => {
                            const cName = (c.name || c.client_name || c.clientName || "").trim();
                            if (cName) {
                                const key = cName.toLowerCase();
                                if (!uniqueClientsMap.has(key)) {
                                    uniqueClientsMap.set(key, {
                                        id: c.id || cName,
                                        clientName: cName,
                                        emailId: c.email || c.email_id || ""
                                    });
                                }
                            }
                        });
                    }
                } catch (e) {}

                // 3. Case Management entries
                try {
                    const resCases = await fetch(`${API_BASE_URL}/case-management/`);
                    if (resCases.ok) {
                        const casesData = await resCases.json();
                        casesData.forEach(c => {
                            const cName = (c.clientName || c.client_name || "").trim();
                            if (cName) {
                                const key = cName.toLowerCase();
                                if (!uniqueClientsMap.has(key)) {
                                    uniqueClientsMap.set(key, {
                                        id: cName,
                                        clientName: cName,
                                        emailId: c.emailId || c.email_id || ""
                                    });
                                }
                            }
                        });
                    }
                } catch (e) {}

                setClients(Array.from(uniqueClientsMap.values()));
            } catch (err) {
                console.error("Failed to fetch clients:", err);
            }
        };
        initialize();
    }, []);

    const formatDateString = (dateStr) => {
        if (!dateStr) return "";
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = dateObj.getDate();
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatTimeString = (timeStr) => {
        if (!timeStr) return "";
        if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
        const parts = timeStr.split(":");
        if (parts.length < 2) return timeStr;
        const [hoursStr, minutesStr] = parts;
        let hours = parseInt(hoursStr, 10);
        const minutes = minutesStr;
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesFormatted = minutes.length === 1 ? `0${minutes}` : minutes;
        return `${hours}:${minutesFormatted} ${ampm}`;
    };

    const handleTimeChange = (date) => {
        setSelectedTimeDate(date);
        if (date) {
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const timeString = `${hours}:${minutes} ${ampm}`;
            setConsultationTime(timeString);
        } else {
            setConsultationTime("");
        }
    };

    const handleStartConsultation = async () => {
        if (!clientName.trim()) {
            showToast("Please enter a client name.", "warning");
            return;
        }
        if (consultationType === "Consultation Type" || consultationType === "Meeting Type") {
            showToast("Please select a meeting type.", "warning");
            return;
        }
        if (!consultationDate) {
            showToast("Please select a date.", "warning");
            return;
        }
        if (!consultationTime) {
            showToast("Please select a time.", "warning");
            return;
        }

        if (consultationType === "Video Call" && !meetingLink.trim()) {
            showToast("Please enter Google Meet link.", "warning");
            return;
        }

        const selectedClient = clients.find(c => c.clientName === clientName);
        const clientEmail = selectedClient ? (selectedClient.emailId || selectedClient.email || "") : "";

        const newMeeting = {
            client_name: clientName,
            client_email: clientEmail,
            type: consultationType,
            date: consultationDate,
            time: consultationTime,
            meeting_link: consultationType === "Video Call" ? meetingLink : "",
            status: "Pending Client",
        };

        try {
            let url = `${API_BASE_URL}/consultations/start`;
            if (user) {
                if (user.role && user.role.toLowerCase() === "client") {
                    url += `?client_id=${user.id}`;
                } else if (
                    user.role && (
                        user.role.toLowerCase() === "senior advocate" ||
                        user.role.toLowerCase() === "junior advocate"
                    )
                ) {
                    url += `?advocate_name=${encodeURIComponent(user.username || "")}`;
                }
            }

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newMeeting),
            });

            if (res.status === 409) {
                const errData = await res.json();
                setDuplicateMessage(errData.detail || "This time slot is already booked. Please choose a different time.");
                setShowDuplicateModal(true);
                return;
            }

            if (res.ok) {
                setClientName("");
                setConsultationType("Consultation Type");
                setConsultationDate("");
                setConsultationTime("");
                setMeetingLink("");
                setSelectedTimeDate(null);
                fetchConsultations(user);
                setShowScheduleSuccess(true);
                

            } else {
                showToast("Failed to start/schedule consultation.", "error");
            }
        } catch (err) {
            console.error("Error creating consultation:", err);
            showToast("Error connecting to server.", "error");
        }



    };

    const handleDeleteConsultation = async () => {
        if (!deleteId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/consultations/${deleteId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchConsultations(user);
                setShowDeleteModal(false);
                setDeleteId(null);
                showToast("Consultation deleted successfully.", "success");
            } else {
                showToast("Failed to delete consultation.", "error");
            }
        } catch (err) {
            console.error("Error deleting:", err);
            showToast("Error connecting to server.", "error");
        }
    };

    const totalConsultations = history.length;
    const videoCalls = history.filter(item => item.type === "Video Call" || item.type === "Video Consultation").length;
    const chatConsultations = history.filter(item => item.type === "Chat" || item.type === "Chat Consultation").length;

    return (
        <div className="w-full space-y-6 md:space-y-8 max-w-7xl mx-auto">

            {/* ── Duplicate Booking Warning Modal ── */}
            {showDuplicateModal && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
                        onClick={() => setShowDuplicateModal(false)}
                    />
                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md mx-4 p-6 sm:p-8 animate-in zoom-in-95 fade-in duration-200">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-500">
                            <AlertTriangle size={24} />
                        </div>
                        {/* Title */}
                        <h3 className="text-xl font-extrabold text-[#0F172A] text-center tracking-tight mb-2">
                            Time Slot Already Booked
                        </h3>
                        {/* Message */}
                        <p className="text-[#475569] text-sm text-center leading-relaxed mb-6">
                            {duplicateMessage}
                        </p>
                        {/* Action */}
                        <button
                            onClick={() => setShowDuplicateModal(false)}
                            className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-colors duration-200 cursor-pointer"
                        >
                            OK, Choose a Different Time
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ──── HEADER ──── */}
            <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-xs">
                        <BookOpen size={20} className="text-white" />
                    </div>
                    <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                        Case Discussion
                    </h1>
                </div>
                <p className="text-sm sm:text-base lg:text-lg text-[#64748B] ml-0 sm:ml-[52px]">
                    Schedule and manage client meetings
                </p>
            </div>

            {/* ──── STATS ──── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                            <BarChart3 size={20} />
                        </div>
                        <p className="text-[#64748B] font-bold uppercase tracking-wider text-xs">Total Meetings</p>
                    </div>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                        {totalConsultations}
                    </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Video size={20} />
                        </div>
                        <p className="text-[#64748B] font-bold uppercase tracking-wider text-xs">Video Calls</p>
                    </div>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                        {videoCalls}
                    </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <MessageSquare size={20} />
                        </div>
                        <p className="text-[#64748B] font-bold uppercase tracking-wider text-xs">Chat Meetings</p>
                    </div>
                    <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                        {chatConsultations}
                    </h3>
                </div>
            </div>

            {/* Notifications */}
            {mounted && history.filter(item => {
                if (dismissedNotifications.includes(item.id)) return false;
                const isApprovedByClient = item.status === "Approved" && item.reschedule_reason === "Approved by client";
                const isRescheduledByClient = item.status === "Pending Advocate" && item.reschedule_reason?.includes("client");
                return isApprovedByClient || isRescheduledByClient;
            }).length > 0 && (
                    <div className="space-y-3 mb-6">
                        {history.filter(item => {
                            if (dismissedNotifications.includes(item.id)) return false;
                            const isApprovedByClient = item.status === "Approved" && item.reschedule_reason === "Approved by client";
                            const isRescheduledByClient = item.status === "Pending Advocate" && item.reschedule_reason?.includes("client");
                            return isApprovedByClient || isRescheduledByClient;
                        }).map(item => {
                            const isApproved = item.status === "Approved";
                            return (
                                <div
                                    key={item.id}
                                    className={`flex items-start justify-between p-4 rounded-xl border transition-all duration-300 ${isApproved
                                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                                        : "bg-amber-50/80 border-amber-200 text-amber-900"
                                        }`}
                                >
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                            {isApproved ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">
                                                {isApproved
                                                    ? `Client ${item.client} approved your consultation request`
                                                    : `Client ${item.client} requested a reschedule`}
                                            </p>
                                            <p className="text-xs mt-0.5 opacity-90 font-medium">
                                                Scheduled for: <span className="font-bold">{formatDateString(item.date)}</span> at <span className="font-bold">{formatTimeString(item.time)}</span> ({item.type})
                                                {!isApproved && item.reschedule_reason && (
                                                    <span className="block mt-1 font-semibold italic">Reason: {item.reschedule_reason}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDismissNotification(item.id)}
                                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors focus:outline-none cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

            {/* ──── ACTION CARDS ──── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 w-full">
                {/* Accept Appointments */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all duration-200">
                    <div>
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                            <CalendarCheck size={20} />
                        </div>
                        <h3 className="text-xl font-extrabold text-[#0F172A]">
                            Accept Appointments
                        </h3>
                        <p className="text-[#64748B] text-sm mt-1.5 font-medium">
                            View and manage consultation requests
                        </p>
                    </div>

                    <button
                        onClick={() => setShowAppointments(!showAppointments)}
                        className="w-full mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                        <CalendarCheck size={16} />
                        <span>{showAppointments ? "Hide Appointments" : "View Appointments"}</span>
                    </button>
                </div>

                {/* Meeting History */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all duration-200">
                    <div>
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                            <History size={20} />
                        </div>
                        <h3 className="text-xl font-extrabold text-[#0F172A]">
                            Meeting History
                        </h3>
                        <p className="text-[#64748B] text-sm mt-1.5 font-medium">
                            View previous meetings and records
                        </p>
                    </div>

                    <Link
                        href="/consultations/history"
                        className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] text-center"
                    >
                        <History size={16} />
                        <span>View History</span>
                    </Link>
                </div>
            </div>

            {/* Appointment Requests */}
            {showAppointments && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 mb-8 overflow-hidden">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mb-6 flex items-center gap-2.5">
                        <CalendarCheck size={22} className="text-[#2563EB]" />
                        <span>Appointment Requests</span>
                    </h2>

                    <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0]">
                        <table className="min-w-full divide-y divide-[#E2E8F0]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Client Name</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Date</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Time</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Type</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Issue</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E2E8F0] bg-white text-sm">
                                {appointments.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-[#64748B] font-medium">
                                            No pending appointment requests.
                                        </td>
                                    </tr>
                                ) : (
                                    appointments.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                                            <td className="p-4 font-bold text-[#0F172A] capitalize">
                                                {item.client}
                                            </td>

                                            <td className="p-4 text-[#475569]">
                                                {formatDateString(item.date)}
                                            </td>

                                            <td className="p-4 text-[#475569] font-medium">
                                                {formatTimeString(item.time)}
                                            </td>

                                            <td className="p-4 text-[#475569]">
                                                {item.type}
                                            </td>

                                            <td className="p-4 text-[#475569]">
                                                {item.issue || "General Consultation"}
                                            </td>

                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.status === "Pending Advocate"
                                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                        : "bg-purple-50 text-purple-700 border border-purple-200"
                                                        }`}
                                                >
                                                    <Clock size={12} />
                                                    {item.status || "Pending"}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex gap-2 items-center">

                                                    {/* Normal appointment request */}
                                                    {item.status === "Pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAppointment(item);
                                                                    setShowAcceptModal(true);
                                                                }}
                                                                className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Check size={14} />
                                                                <span>Accept</span>
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAppointment(item);
                                                                    setShowDeclineModal(true);
                                                                }}
                                                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Clock size={14} />
                                                                <span>Reschedule</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Client requested reschedule */}
                                                    {item.status === "Pending Advocate" && (
                                                        <>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await fetch(
                                                                            `${API_BASE_URL}/consultations/${item.id}/status`,
                                                                            {
                                                                                method: "PUT",
                                                                                headers: {
                                                                                    "Content-Type": "application/json",
                                                                                },
                                                                                body: JSON.stringify({
                                                                                    status: "Approved",
                                                                                    reason: "Approved client reschedule"
                                                                                }),
                                                                            }
                                                                        );

                                                                        if (res.ok) {
                                                                            fetchConsultations(user);
                                                                            showToast("Client reschedule approved successfully!", "success");
                                                                        }
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                    }
                                                                }}
                                                                className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Check size={14} />
                                                                <span>Accept Client Date</span>
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAppointment(item);
                                                                    setShowDeclineModal(true);
                                                                }}
                                                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Clock size={14} />
                                                                <span>Give Another Date</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            setDeleteId(item.id);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Consultation Form */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 mb-8">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mb-6 flex items-center gap-2.5">
                    <CalendarDays size={22} className="text-[#2563EB]" />
                    <span>Schedule Meeting</span>
                </h2>
                <div className={`grid grid-cols-1 md:grid-cols-2 ${consultationType === "Video Call" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-6`}>
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Client Name</label>
                        <select
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full border border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] bg-[#F8FAFC] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm font-medium cursor-pointer"
                        >
                            <option value="">Select Client</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.clientName}>
                                    {client.clientName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Type</label>
                        <select
                            value={consultationType}
                            onChange={(e) => {
                                const newType = e.target.value;
                                setConsultationType(newType);
                                if (newType === "Video Call") {
                                    if (!meetingLink) {
                                        generateMeetingLink(clientName, consultationDate, consultationTime);
                                    }
                                } else {
                                    setMeetingLink("");
                                }
                            }}
                            className="w-full border border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] bg-[#F8FAFC] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm font-medium cursor-pointer"
                        >
                            <option>Meeting Type</option>
                            <option value="Video Call">Video Call</option>
                            <option value="Chat">Chat</option>
                            <option value="Person to Person">Person to Person</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Date</label>
                        <CustomDatePicker
                            selected={consultationDate}
                            onChange={(dateStr) => setConsultationDate(dateStr)}
                            minDate={new Date()}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Time</label>
                        <div className="w-full border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/20 focus-within:border-[#2563EB] transition-all cursor-pointer">
                            <DatePicker
                                selected={selectedTimeDate}
                                onChange={handleTimeChange}
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="Time"
                                dateFormat="h:mm aa"
                                placeholderText="Select Time"
                                className="w-full p-3 text-[#0F172A] bg-transparent outline-none text-sm font-medium cursor-pointer"
                            />
                        </div>
                    </div>
                    {consultationType === "Video Call" && (
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                                Google Meet Link
                            </label>
                            <input
                                type="url"
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                placeholder={generatingMeetLink ? "Generating Meet link..." : "Paste Google Meet link"}
                                disabled={generatingMeetLink}
                                className="w-full border border-[#E2E8F0] rounded-xl p-3 text-[#0F172A] bg-[#F8FAFC] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm font-medium"
                            />
                        </div>
                    )}

                </div>
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleStartConsultation}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xs hover:shadow active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                    >
                        <Plus size={16} />
                        <span>Schedule Meeting</span>
                    </button>
                </div>
            </div>

            {/* Scheduled Meetings Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mb-6 flex items-center gap-2.5">
                    <Clock size={22} className="text-[#2563EB]" />
                    <span>Scheduled Meetings</span>
                </h2>
                {history.length === 0 ? (
                    <div className="text-center py-12 text-[#64748B] font-medium bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0]">
                        No scheduled meetings.
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0]">
                        <table className="min-w-full divide-y divide-[#E2E8F0]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Client Name</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Time</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Type</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Google Meet Link</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="p-4 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] bg-white text-sm">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                                        <td className="p-4 whitespace-nowrap font-bold text-[#0F172A] capitalize">{item.client}</td>
                                        <td className="p-4 whitespace-nowrap text-[#475569]">{formatDateString(item.date)}</td>
                                        <td className="p-4 whitespace-nowrap font-medium text-[#475569]">{formatTimeString(item.time)}</td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.type === "Video Call" || item.type === "Video Consultation"
                                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                : item.type === "Chat" || item.type === "Chat Consultation"
                                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-sm">
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
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.status === "Completed"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : item.status === "Approved"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : item.status === "Rescheduled"
                                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                        : item.status === "Pending Client"
                                                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                }`}>
                                                <CheckCircle2 size={11} />
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setDeleteId(item.id);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                                <span>Delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {mounted && showScheduleSuccess && typeof document !== "undefined"
                ? createPortal(
                    <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-center border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">

                            <div className="w-14 h-14 mx-auto bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} />
                            </div>

                            <h2 className="text-xl font-extrabold text-[#0F172A]">
                                Consultation Scheduled
                            </h2>

                            <p className="text-[#64748B] text-sm mt-3 font-medium leading-relaxed">
                                Your consultation has been scheduled successfully.
                                The client will receive the meeting details and can approve it.
                            </p>

                            <button
                                onClick={() => setShowScheduleSuccess(false)}
                                className="mt-6 w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                                OK
                            </button>
                        </div>
                    </div>,
                    document.body
                )
                : null}

            {/* Delete Confirmation Modal */}
            {mounted && showDeleteModal && typeof document !== "undefined" ? createPortal(
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-center border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 mx-auto bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                            <Trash2 size={28} />
                        </div>
                        <h2 className="text-xl font-extrabold text-[#0F172A]">
                            Delete Consultation
                        </h2>
                        <p className="text-[#64748B] text-sm mt-3 font-medium leading-relaxed">
                            Are you sure you want to delete this consultation? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteId(null);
                                }}
                                className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-[#475569] rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConsultation}
                                className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            ) : null}

            {/* Accept Approval Modal */}
            {mounted && showAcceptModal && typeof document !== "undefined" ? createPortal(
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-center border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 mx-auto bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-xl font-extrabold text-[#0F172A]">
                            Appointment Approved
                        </h2>
                        {selectedAppointment && (
                            <p className="text-[#64748B] text-sm mt-3 font-medium leading-relaxed">
                                Appointment request from{" "}
                                <span className="font-bold text-[#0F172A]">
                                    {selectedAppointment.client}
                                </span>{" "}
                                has been approved successfully.
                            </p>
                        )}
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch(`${API_BASE_URL}/consultations/${selectedAppointment.id}/status`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: "Approved" })
                                    });
                                    if (res.ok) {
                                        fetchConsultations(user);
                                    } else {
                                        showToast("Failed to approve appointment.", "error");
                                    }
                                } catch (err) {
                                    console.error(err);
                                }
                                setShowAcceptModal(false);
                            }}
                            className="mt-6 w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                        >
                            OK, Continue
                        </button>
                    </div>
                </div>,
                document.body
            ) : null}

            {mounted && showRescheduleSuccess && typeof document !== "undefined"
                ? createPortal(
                    <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 text-center border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">

                            <div className="w-14 h-14 mx-auto bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                                <Clock size={28} />
                            </div>

                            <h2 className="text-xl font-extrabold text-[#0F172A]">
                                Reschedule Sent
                            </h2>

                            <p className="text-[#64748B] text-sm mt-3 font-medium leading-relaxed">
                                Your reschedule request has been sent successfully to the client.
                            </p>

                            <button
                                onClick={() => setShowRescheduleSuccess(false)}
                                className="mt-6 w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                                OK
                            </button>
                        </div>
                    </div>,
                    document.body
                )
                : null}

            {/* Decline/Reschedule Modal */}
            {mounted && showDeclineModal && typeof document !== "undefined" ? createPortal(
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                            <h2 className="text-xl font-extrabold text-[#0F172A]">
                                Reschedule Appointment
                            </h2>
                            <button
                                onClick={() => {
                                    setShowDeclineModal(false);
                                    setRescheduleReason("");
                                }}
                                className="w-9 h-9 rounded-xl bg-[#F8FAFC] text-[#64748B] hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {selectedAppointment && (
                            <div className="mb-6 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                                <p className="font-bold text-[#0F172A] text-sm">
                                    <span className="text-[#64748B] font-semibold uppercase tracking-wider text-xs mr-2">Client:</span>
                                    {selectedAppointment.client}
                                </p>
                            </div>
                        )}
                        <div className="space-y-5">
                            <div>
                                <label className="block mb-2 font-bold text-xs uppercase tracking-wider text-[#475569]">
                                    Next Available Date & Time
                                </label>
                                <div className="w-full border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/20 focus-within:border-[#2563EB] transition-all cursor-pointer">
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={(date) => setSelectedDate(date)}
                                        showTimeSelect
                                        timeIntervals={15}
                                        dateFormat="MMMM d, yyyy h:mm aa"
                                        className="w-full p-3.5 text-[#0F172A] bg-transparent outline-none text-sm font-medium cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-2 font-bold text-xs uppercase tracking-wider text-[#475569]">
                                    Message / Reason
                                </label>
                                <textarea
                                    rows="4"
                                    placeholder="Enter reason for rescheduling..."
                                    value={rescheduleReason}
                                    onChange={(e) => setRescheduleReason(e.target.value)}
                                    className="w-full border border-[#E2E8F0] rounded-xl p-3.5 text-[#0F172A] bg-[#F8FAFC] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all text-sm font-medium placeholder:text-[#94A3B8]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[#F1F5F9]">
                            <button
                                onClick={() => {
                                    setShowDeclineModal(false);
                                    setRescheduleReason("");
                                }}
                                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedDate) {
                                        showToast("Please select a valid date.", "warning");
                                        return;
                                    }
                                    const yyyy = selectedDate.getFullYear();
                                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                                    const formattedDate = `${yyyy}-${mm}-${dd}`;

                                    const hours = String(selectedDate.getHours()).padStart(2, '0');
                                    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
                                    const formattedTime = `${hours}:${minutes}`;

                                    try {
                                        const res = await fetch(`${API_BASE_URL}/consultations/${selectedAppointment.id}/reschedule`, {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                date: formattedDate,
                                                time: formattedTime,
                                                reason: rescheduleReason || "Rescheduled by advocate",
                                                status: "Rescheduled"
                                            })
                                        });
                                        if (res.ok) {
                                            setShowRescheduleSuccess(true);
                                            fetchConsultations(user);
                                        } else {
                                            showToast("Failed to reschedule consultation.", "error");
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        showToast("Error connecting to server.", "error");
                                    }
                                    setShowDeclineModal(false);
                                    setRescheduleReason("");
                                }}
                                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                            >
                                Submit Reschedule
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            ) : null}

            {/* Custom Toast Notification */}
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