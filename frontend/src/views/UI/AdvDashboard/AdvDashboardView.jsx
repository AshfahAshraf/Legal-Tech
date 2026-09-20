"use client";

import { API_BASE_URL } from "@/utils/api";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/utils/auth";
import {
    Users,
    Briefcase,
    FolderOpen,
    Gavel,
    FileText,
    RefreshCw,
    Upload,
    PlusCircle,
    ClipboardList,
    UserCheck,
    Phone,
} from "lucide-react";


// ─── Role badge colours ─────────────────────────────────────
const ROLE_BADGE = {
    "Junior Advocate": "bg-indigo-100 text-indigo-700",
    "Senior Advocate": "bg-slate-100 text-slate-700",
    "Client": "bg-rose-100 text-rose-700",
    "Advocate": "bg-slate-100 text-slate-600",
};

export default function AdvDashboardView() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const [casesPage, setCasesPage] = useState(0);
    const [hearingsPage, setHearingsPage] = useState(0);
    const [discussionsPage, setDiscussionsPage] = useState(0);

    const hour = new Date().getHours();
    let greeting = "";

    if (hour >= 5 && hour < 12) {
        greeting = "Good Morning";
    } else if (hour >= 12 && hour < 17) {
        greeting = "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
        greeting = "Good Evening";
    } else {
        greeting = "Good Night";
    }

    const currentDate = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const fetchDashboardData = useCallback(async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) setIsRefreshing(true);

        try {
            const loggedIn = getLoggedInUser();
            if (!user && loggedIn) setUser(loggedIn);

            const advParam = loggedIn && loggedIn.id ? `?advocate_id=${loggedIn.id}` : "";

            const [resUsers, resCases, resAssigned, resConsultations] = await Promise.all([
                fetch(`${API_BASE_URL}/permissions/users`),
                fetch(`${API_BASE_URL}/case-management/`),
                fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases`),
                fetch(`${API_BASE_URL}/consultations`),
            ]);

            if (!resUsers.ok || !resCases.ok) {
                throw new Error("Failed to fetch dashboard data from backend resources");
            }

            const [users, cases] = await Promise.all([
                resUsers.json(),
                resCases.json(),
            ]);

            let assignedCases = [];
            if (resAssigned && resAssigned.ok) {
                try {
                    assignedCases = await resAssigned.json();
                } catch (e) {
                    console.warn("Failed to parse assigned cases:", e);
                }
            }

            let consultations = [];
            if (resConsultations && resConsultations.ok) {
                try {
                    consultations = await resConsultations.json();
                } catch (e) {
                    console.warn("Failed to parse consultations:", e);
                }
            }


            // Documents — fetched separately so backend restart isn't required
            let documents = [];
            try {
                const resDocs = await fetch(`${API_BASE_URL}/dashboard/recent-documents?limit=8`);
                if (resDocs.ok) documents = await resDocs.json();
            } catch (e) {
                console.warn("Recent documents endpoint not available:", e.message);
            }

            // 1. Total advocates count
            const advocatesList = users.filter(u => u.role && u.role.toLowerCase().includes("advocate"));
            const total_advocates = advocatesList.length;

            // 2. Cases stats
            const activeCasesList = cases.filter(c => c.status === "Active" || c.status === "Hearing");
            const active_cases = activeCasesList.length;
            const pending_cases = cases.filter(c => c.status === "Pending").length;
            const closed_cases = cases.filter(c => c.status === "Closed").length;

            // 3. Upcoming hearings count
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const extractedHearings = [];
            cases.forEach(c => {
                if (c.next_hearing_date) {
                    const isIso = c.next_hearing_date.includes('T');
                    const datePart = isIso ? c.next_hearing_date.split('T')[0] : c.next_hearing_date.split(' ')[0];

                    if (datePart >= todayStr) {
                        // Find assigned advocate from lawfirm assignments
                        const match = Array.isArray(assignedCases) ? assignedCases.find(ac =>
                            (ac.case_number && ac.case_number === c.case_no) ||
                            (ac.case_title && ac.case_title.trim().toLowerCase() === c.case_title.trim().toLowerCase())
                        ) : null;

                        const advocateName = match ? match.advocate_name : (c.selected_advocate || "");

                        extractedHearings.push({
                            date: datePart,
                            case_title: c.case_title,
                            court: c.court_name,
                            advocate_name: advocateName
                        });
                    }
                }
            });

            const upcoming_hearings_count = extractedHearings.length;

            // 4. Case Overview list
            const casesList = [...cases]
                .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                .map(c => ({
                    case_id: c.case_id,
                    client_name: c.client_name,
                    type: c.case_type,
                    court: c.court_name,
                    status: c.status
                }));

            // 5. Hearings list
            const formatHearingDate = (dateStr) => {
                if (!dateStr) return "";
                const parts = dateStr.split("-");
                if (parts.length !== 3) return dateStr;
                const dNum = parseInt(parts[2], 10);
                const mNum = parseInt(parts[1], 10) - 1;
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${dNum} ${months[mNum]}`;
            };

            const hearingsList = [...extractedHearings]
                .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.time || "").localeCompare(b.time || "");
                })
                .map(h => ({
                    date: formatHearingDate(h.date),
                    case_title: h.case_title,
                    court: h.court,
                    advocate_name: h.advocate_name || "",
                }));

            // 6. Discussions list
            const extractedDiscussions = [];
            if (Array.isArray(consultations)) {
                consultations.forEach(c => {
                    const datePart = c.date ? c.date.split("T")[0] : "";
                    if (datePart && datePart >= todayStr) {
                        extractedDiscussions.push({
                            id: c.id,
                            client_name: c.client_name || "Unknown",
                            issue: c.issue || "N/A",
                            advocate_name: c.advocate_name || "N/A",
                            date: datePart,
                            time: c.time || "12:00 PM",
                            status: c.status || "Scheduled",
                            type: c.type || "Video Call",
                            meeting_link: c.meeting_link || ""
                        });
                    }
                });
            }

            const discussionsList = [...extractedDiscussions]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(d => ({
                    ...d,
                    date_formatted: formatHearingDate(d.date)
                }));

            setData({
                stats: {
                    total_advocates,
                    active_cases,
                    pending_cases,
                    closed_cases,
                    upcoming_hearings_count
                },
                cases: casesList,
                hearings: hearingsList,
                discussions: discussionsList,
                documents,
                advocates: advocatesList,
                activeCases: activeCasesList,
            });

            setLastRefreshed(new Date());
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            if (!data) setError(err.message); // Only show full error on first load
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loggedIn = getLoggedInUser();
        setUser(loggedIn);
        fetchDashboardData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchDashboardData(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    if (loading) {
        return (
            <div className="w-full h-96 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2563EB]"></div>
                <p className="text-[#64748B] text-sm animate-pulse">Loading dashboard data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
                <h3 className="text-red-800 font-semibold text-lg mb-2">Error Loading Dashboard</h3>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const displayName = user
        ? user.username
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "";

    const displayRole = user ? user.role : "";

    const stats = [
        {
            key: "advocates",
            title: "Total Advocates",
            value: data ? String(data.stats.total_advocates) : "0",
            icon: Users,
        },
        {
            key: "activeCases",
            title: "Active Cases",
            value: data ? String(data.stats.active_cases) : "0",
            icon: Briefcase,
        },
        {
            key: "hearings",
            title: "Upcoming Hearings",
            value: data ? String(data.stats.upcoming_hearings_count) : "0",
            icon: Gavel,
        },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Page Header */}
            <div className="bg-white rounded-2xl shadow-md border border-[#E2E8F0] p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight break-words">
                        {greeting}, {displayName}
                    </h1>
                    <p className="text-[#64748B] mt-1 sm:mt-2 text-base sm:text-lg font-medium">
                        {displayRole}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">
                    <div className="text-left lg:text-right bg-[#F8FAFC] px-4 py-3 sm:px-6 sm:py-4 rounded-2xl border border-[#E2E8F0] flex-1 sm:flex-none">
                        <p className="text-[#475569] font-bold text-xs sm:text-sm uppercase tracking-wider">Today's Date</p>
                        <p className="text-[#0F172A] font-extrabold text-base sm:text-lg mt-0.5 sm:mt-1">{currentDate}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
                        {/* View Calendar button */}
                        <button
                            onClick={() => router.push("/calendar")}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                            View Calendar
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {stats.map((item, index) => {
                    const Icon = item.icon;
                    const colors = [
                        { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", active: "border-blue-400 ring-2 ring-blue-200" },
                        { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", active: "border-emerald-400 ring-2 ring-emerald-200" },
                        { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", active: "border-purple-400 ring-2 ring-purple-200" },
                    ];
                    const color = colors[index % colors.length];
                    const isActive = selectedCard === item.key;

                    return (
                        <div
                            key={index}
                            onClick={() => setSelectedCard(isActive ? null : item.key)}
                            className={`bg-white rounded-2xl shadow-md shadow-slate-200/40 border p-4 sm:p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 cursor-pointer group ${isActive ? color.active : "border-[#E2E8F0] hover:shadow-slate-200/60"
                                }`}
                        >
                            <div className={`w-10 h-10 ${color.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm border ${color.border}`}>
                                <Icon className={`w-5 h-5 ${color.text}`} />
                            </div>

                            <p className="text-[#475569] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                                {item.title}
                            </p>

                            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                                {item.value}
                            </h2>
                        </div>
                    );
                })}
            </div>

            {/* Dynamic Detail Panel */}
            {selectedCard && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Total Advocates */}
                    {selectedCard === "advocates" && (
                        <>
                            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#F1F5F9] bg-slate-50 flex items-center justify-between">
                                <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] uppercase tracking-wider">All Advocates</h3>
                                <span className="text-xs text-[#64748B] font-medium">{data?.advocates?.length || 0} total</span>
                            </div>

                            {/* Mobile Card List */}
                            <div className="block sm:hidden divide-y divide-[#E2E8F0] bg-white">
                                {data?.advocates?.length > 0 ? data.advocates.map((adv, i) => (
                                    <div key={`adv-card-${i}`} className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-[#0F172A] capitalize">{adv.username || adv.name || "—"}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[adv.role] || "bg-slate-100 text-slate-600"}`}>{adv.role}</span>
                                        </div>
                                        <p className="text-xs text-[#64748B]">{adv.email || "—"}</p>
                                    </div>
                                )) : (
                                    <div className="p-6 text-center text-sm text-[#94A3B8]">No advocates found.</div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block w-full">
                                <table className="w-full divide-y divide-[#E2E8F0]">
                                    <thead className="bg-[#F8FAFC]">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">#</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Name</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Role</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F1F5F9] bg-white">
                                        {data?.advocates?.length > 0 ? data.advocates.map((adv, i) => (
                                            <tr key={`adv-panel-${i}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3 text-xs text-[#64748B]">{i + 1}</td>
                                                <td className="px-5 py-3 text-sm font-semibold text-[#0F172A] capitalize">{adv.username || adv.name || "—"}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[adv.role] || "bg-slate-100 text-slate-600"}`}>{adv.role}</span>
                                                </td>
                                                <td className="px-5 py-3 text-xs text-[#64748B]">{adv.email || "—"}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#94A3B8]">No advocates found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Active Cases */}
                    {selectedCard === "activeCases" && (
                        <>
                            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#F1F5F9] bg-slate-50 flex items-center justify-between">
                                <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] uppercase tracking-wider">Active Cases</h3>
                                <span className="text-xs text-[#64748B] font-medium">{data?.activeCases?.length || 0} cases</span>
                            </div>

                            {/* Mobile Card List */}
                            <div className="block sm:hidden divide-y divide-[#E2E8F0] bg-white">
                                {data?.activeCases?.length > 0 ? data.activeCases.map((c, i) => (
                                    <div key={`active-card-${i}`} className="p-4 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-mono font-bold text-[#64748B]">{c.case_id || c.case_no || "—"}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{c.status}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-[#0F172A]">{c.client_name || "—"}</p>
                                        <div className="flex items-center justify-between text-xs text-[#475569]">
                                            <span>{c.case_type || "—"}</span>
                                            <span>{c.court_name || "—"}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 text-center text-sm text-[#94A3B8]">No active cases found.</div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block w-full">
                                <table className="w-full divide-y divide-[#E2E8F0]">
                                    <thead className="bg-[#F8FAFC]">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Case ID</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Client</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Type</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Court</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F1F5F9] bg-white">
                                        {data?.activeCases?.length > 0 ? data.activeCases.map((c, i) => (
                                            <tr key={`active-panel-${i}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3 text-xs font-mono text-[#64748B]">{c.case_id || c.case_no || "—"}</td>
                                                <td className="px-5 py-3 text-sm font-semibold text-[#0F172A]">{c.client_name || "—"}</td>
                                                <td className="px-5 py-3 text-xs text-[#475569]">{c.case_type || "—"}</td>
                                                <td className="px-5 py-3 text-xs text-[#475569]">{c.court_name || "—"}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                                        }`}>{c.status}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-[#94A3B8]">No active cases found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Upcoming Hearings */}
                    {selectedCard === "hearings" && (
                        <>
                            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#F1F5F9] bg-slate-50 flex items-center justify-between">
                                <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] uppercase tracking-wider">Upcoming Hearings</h3>
                                <span className="text-xs text-[#64748B] font-medium">{data?.hearings?.length || 0} scheduled</span>
                            </div>

                            {/* Mobile Card List */}
                            <div className="block sm:hidden divide-y divide-[#E2E8F0] bg-white">
                                {data?.hearings?.length > 0 ? data.hearings.map((h, i) => (
                                    <div key={`hearing-card-${i}`} className="p-4 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{h.date}</span>
                                            <span className="text-xs text-[#475569]">{h.court || "—"}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-[#0F172A]">{h.case_title || "—"}</p>
                                        {h.advocate_name && <p className="text-xs text-[#64748B]">👤 {h.advocate_name}</p>}
                                    </div>
                                )) : (
                                    <div className="p-6 text-center text-sm text-[#94A3B8]">No upcoming hearings found.</div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block w-full">
                                <table className="w-full divide-y divide-[#E2E8F0]">
                                    <thead className="bg-[#F8FAFC]">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Date</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Case Title</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Court</th>
                                            <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">Advocate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F1F5F9] bg-white">
                                        {data?.hearings?.length > 0 ? data.hearings.map((h, i) => (
                                            <tr key={`hearing-panel-${i}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{h.date}</span>
                                                </td>
                                                <td className="px-5 py-3 text-sm font-semibold text-[#0F172A]">{h.case_title || "—"}</td>
                                                <td className="px-5 py-3 text-xs text-[#475569]">{h.court || "—"}</td>
                                                <td className="px-5 py-3 text-xs text-[#475569]">{h.advocate_name || "—"}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#94A3B8]">No upcoming hearings found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Case Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                <div className="col-span-12 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                            Case Overview
                        </h2>
                        <button className="text-xs font-bold text-[#2563EB] uppercase tracking-wider hover:text-[#1d4ed8] transition-colors cursor-pointer">
                            View All
                        </button>
                    </div>

                    {/* Mobile Card List */}
                    <div className="block sm:hidden space-y-3">
                        {data && data.cases.length > 0 ? (
                            data.cases.slice(casesPage * 5, (casesPage + 1) * 5).map((c, index) => (
                                <div
                                    key={`case-overview-card-${index}`}
                                    className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-extrabold text-[#0F172A] tracking-tight">{c.case_id}</span>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.status === "Hearing"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : c.status === "Active"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-[#1E293B]">{c.client_name}</p>
                                        <p className="text-xs text-[#475569] font-medium">{c.type}</p>
                                        <p className="text-xs text-[#64748B] flex items-center gap-1">
                                            🏛️ <span>{c.court}</span>
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-sm font-medium text-[#64748B] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                                No cases found.
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block w-full rounded-2xl border border-[#E2E8F0] overflow-hidden">
                        <table className="w-full table-auto divide-y divide-[#E2E8F0]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Case ID</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Client</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Type</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Court</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                                {data && data.cases.length > 0 ? (
                                    data.cases.slice(casesPage * 5, (casesPage + 1) * 5).map((c, index) => (
                                        <tr
                                            key={`case-overview-${index}`}
                                            className="hover:bg-[#F8FAFC] transition-colors duration-150"
                                        >
                                            <td className="p-4 text-sm font-bold text-[#0F172A] whitespace-nowrap">{c.case_id}</td>
                                            <td className="p-4 text-sm text-[#475569] break-words">{c.client_name}</td>
                                            <td className="p-4 text-sm text-[#475569] break-words">{c.type}</td>
                                            <td className="p-4 text-sm text-[#475569] break-words">{c.court}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${c.status === "Hearing"
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : c.status === "Active"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-sm font-medium text-[#64748B]">
                                            No cases found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {data && data.cases.length > 5 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <span className="text-xs text-[#64748B] font-semibold">
                                Page {casesPage + 1} of {Math.ceil(data.cases.length / 5)}
                            </span>
                            <button
                                onClick={() => setCasesPage(p => Math.max(0, p - 1))}
                                disabled={casesPage === 0}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => setCasesPage(p => Math.min(Math.ceil(data.cases.length / 5) - 1, p + 1))}
                                disabled={(casesPage + 1) * 5 >= data.cases.length}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Upcoming Hearings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                <div className="col-span-1 lg:col-span-12 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between overflow-hidden">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                            Upcoming Hearings
                        </h2>
                    </div>

                    {/* Mobile Card List */}
                    <div className="block sm:hidden space-y-3">
                        {data && data.hearings.length > 0 ? (
                            data.hearings.slice(hearingsPage * 5, (hearingsPage + 1) * 5).map((h, index) => (
                                <div
                                    key={`hearing-card-${index}`}
                                    className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="bg-[#F1F5F9] px-2.5 py-1 rounded-lg text-xs font-bold text-[#0F172A] border border-[#E2E8F0]">
                                            {h.date}
                                        </div>
                                        <span className="text-xs text-[#475569] font-semibold">{h.court}</span>
                                    </div>
                                    <p className="text-sm font-bold text-[#0F172A]">{h.case_title}</p>
                                    {h.advocate_name && (
                                        <p className="text-xs text-[#64748B]">👤 {h.advocate_name}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-sm font-medium text-[#64748B] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                                No upcoming hearings found.
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:flex flex-col flex-1 w-full rounded-2xl border border-[#E2E8F0] overflow-hidden min-h-[340px]">
                        <table className="w-full h-full table-auto divide-y divide-[#E2E8F0]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="p-4 sm:px-5 sm:py-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="p-4 sm:px-5 sm:py-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Case</th>
                                    <th className="p-4 sm:px-5 sm:py-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Court</th>
                                    <th className="p-4 sm:px-5 sm:py-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Advocate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] bg-white h-full">
                                {data && data.hearings.length > 0 ? (
                                    data.hearings.slice(hearingsPage * 5, (hearingsPage + 1) * 5).map((h, index) => (
                                        <tr
                                            key={index}
                                            className="hover:bg-[#F8FAFC] transition-colors duration-150"
                                        >
                                            <td className="p-4 sm:px-5 sm:py-4 text-sm font-bold text-[#0F172A] whitespace-nowrap">
                                                <div className="bg-[#F1F5F9] px-3 py-1.5 rounded-lg inline-block text-center border border-[#E2E8F0]">
                                                    {h.date}
                                                </div>
                                            </td>
                                            <td className="p-4 sm:px-5 sm:py-4 text-sm text-[#475569] font-medium break-words">
                                                {h.case_title}
                                            </td>
                                            <td className="p-4 sm:px-5 sm:py-4 text-sm text-[#475569] break-words">
                                                {h.court}</td>
                                            <td className="p-4 sm:px-5 sm:py-4 text-sm text-[#475569] break-words">
                                                {h.advocate_name}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-20 px-6 text-center text-sm font-medium text-[#64748B]">
                                            No upcoming hearings found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {data && data.hearings.length > 5 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <span className="text-xs text-[#64748B] font-semibold">
                                Page {hearingsPage + 1} of {Math.ceil(data.hearings.length / 5)}
                            </span>
                            <button
                                onClick={() => setHearingsPage(p => Math.max(0, p - 1))}
                                disabled={hearingsPage === 0}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => setHearingsPage(p => Math.min(Math.ceil(data.hearings.length / 5) - 1, p + 1))}
                                disabled={(hearingsPage + 1) * 5 >= data.hearings.length}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Upcoming Case Discussions ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                <div className="col-span-1 lg:col-span-12 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                            Upcoming Case Discussions
                        </h2>
                        <button
                            onClick={() => router.push("/consultations")}
                            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline bg-transparent border-0 p-0 cursor-pointer transition-colors"
                        >
                            <span>Go to</span>
                            <span>→</span>
                        </button>
                    </div>

                    {/* Mobile Card List */}
                    <div className="block sm:hidden space-y-3">
                        {data && data.discussions && data.discussions.length > 0 ? (
                            data.discussions.slice(discussionsPage * 5, (discussionsPage + 1) * 5).map((d, index) => (
                                <div
                                    key={`discussion-card-${d.id || index}`}
                                    className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[#475569]">{d.date_formatted}</span>
                                            <span className="text-xs font-bold text-[#2563EB]">{d.time}</span>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${d.status.toLowerCase() === "approved" || d.status.toLowerCase() === "completed" || d.status.toLowerCase() === "scheduled"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : d.status.toLowerCase() === "rescheduled"
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : d.status.toLowerCase() === "pending"
                                                    ? "bg-slate-50 text-slate-700 border-slate-200"
                                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                            }`}>
                                            {d.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-[#0F172A]">{d.client_name}</p>
                                    <div>
                                        {d.type.toLowerCase().includes("video") ? (
                                            d.meeting_link ? (
                                                <a
                                                    href={d.meeting_link.startsWith("http") ? d.meeting_link : `https://${d.meeting_link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                                                >
                                                    🎥 Video (Join Meet)
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-100">
                                                    🎥 Video Call
                                                </span>
                                            )
                                        ) : d.type.toLowerCase().includes("chat") ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                                                💬 Chat
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200">
                                                🤝 Person to Person
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-sm font-medium text-[#64748B] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                                No upcoming case discussions found.
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block w-full rounded-2xl border border-[#E2E8F0] overflow-hidden">
                        <table className="w-full table-auto divide-y divide-[#E2E8F0]">
                            <thead className="bg-[#F8FAFC]">
                                <tr>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Client</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Time</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Type / Link</th>
                                    <th className="p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                                {data && data.discussions && data.discussions.length > 0 ? (
                                    data.discussions.slice(discussionsPage * 5, (discussionsPage + 1) * 5).map((d, index) => (
                                        <tr
                                            key={d.id || index}
                                            className="hover:bg-[#F8FAFC] transition-colors duration-150"
                                        >
                                            <td className="p-4 text-xs font-medium text-[#475569] whitespace-nowrap">
                                                {d.date_formatted}
                                            </td>
                                            <td className="p-4 text-sm text-[#475569] whitespace-nowrap font-semibold">{d.client_name}</td>
                                            <td className="p-4 text-sm font-bold text-[#2563EB] whitespace-nowrap">
                                                {d.time}
                                            </td>
                                            <td className="p-4 text-sm whitespace-nowrap">
                                                {d.type.toLowerCase().includes("video") ? (
                                                    d.meeting_link ? (
                                                        <a
                                                            href={d.meeting_link.startsWith("http") ? d.meeting_link : `https://${d.meeting_link}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                                                        >
                                                            🎥 Video (Join Meet)
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-100">
                                                            🎥 Video Call
                                                        </span>
                                                    )
                                                ) : d.type.toLowerCase().includes("chat") ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                                                        💬 Chat
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200">
                                                        🤝 Person to Person
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${d.status.toLowerCase() === "approved" || d.status.toLowerCase() === "completed" || d.status.toLowerCase() === "scheduled"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : d.status.toLowerCase() === "rescheduled"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : d.status.toLowerCase() === "pending"
                                                            ? "bg-slate-50 text-slate-700 border-slate-200"
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                    }`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-sm font-medium text-[#64748B]">
                                            No upcoming case discussions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {data && data.discussions && data.discussions.length > 5 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <span className="text-xs text-[#64748B] font-semibold">
                                Page {discussionsPage + 1} of {Math.ceil(data.discussions.length / 5)}
                            </span>
                            <button
                                onClick={() => setDiscussionsPage(p => Math.max(0, p - 1))}
                                disabled={discussionsPage === 0}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => setDiscussionsPage(p => Math.min(Math.ceil(data.discussions.length / 5) - 1, p + 1))}
                                disabled={(discussionsPage + 1) * 5 >= data.discussions.length}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}