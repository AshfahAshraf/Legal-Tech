"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getLoggedInUser } from "@/utils/auth";
import { isSensitiveCase } from "@/utils/caseSensitivity";
import { API_BASE_URL } from "@/utils/api";
import {
  Briefcase,
  Calendar,
  FileText,
  FolderOpen,
  User,
  ArrowRight,
} from "lucide-react";

const ROLE_BADGE = {
  "Junior Advocate": "bg-indigo-100 text-indigo-700",
  "Senior Advocate": "bg-slate-100 text-slate-700",
  "Client": "bg-rose-100 text-rose-700",
  "Advocate": "bg-slate-100 text-slate-600",
};

export default function JunAdvDashView() {
  const router = useRouter();

  const [cases, setCases] = useState([]);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({ assignedCases: 0, activeCases: 0, hearings: 0 });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    const user = getLoggedInUser();
    if (user && user.username) {
      setUserName(user.username);
    }

    const fetchAssignedCases = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases`);
        const data = await res.json();

        let casesToShow = data;
        if (user && user.role && user.role.toLowerCase().includes("junior")) {
          casesToShow = data.filter((item) => {
            const primaryName = item.advocate_name || "";
            const secondaryName = item.secondary_advocate_name || item.secondaryAdvocateName || "";

            const normalizedPrimary = primaryName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedSecondary = secondaryName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedUsername = (user.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedEmail = (user.email || "").toLowerCase().replace(/[^a-z0-9]/g, "");

            const isPrimaryMatch = primaryName && (
              normalizedPrimary === normalizedUsername ||
              normalizedPrimary === normalizedEmail ||
              normalizedUsername.includes(normalizedPrimary) ||
              normalizedPrimary.includes(normalizedUsername)
            );

            const isSecondaryMatch = secondaryName && (
              normalizedSecondary === normalizedUsername ||
              normalizedSecondary === normalizedEmail ||
              normalizedUsername.includes(normalizedSecondary) ||
              normalizedSecondary.includes(normalizedUsername)
            );

            return isPrimaryMatch || isSecondaryMatch;
          });
        }

        // --- Stats ---
        const todayStr = new Date().toISOString().split("T")[0];
        const assignedCasesCount = casesToShow.length;
        const activeCasesCount = casesToShow.filter(
          (item) => item.status === "Active" || item.status === "Hearing"
        ).length;
        const hearingsCount = casesToShow.filter(
          (item) => item.due_date && item.due_date !== "No date" && item.due_date.split("T")[0] >= todayStr
        ).length;

        setStats({
          assignedCases: assignedCasesCount,
          activeCases: activeCasesCount,
          hearings: hearingsCount,
        });

        // --- Recent Documents ---
        const juniorDocs = [];
        casesToShow.forEach((item, index) => {
          const docs = Array.isArray(item.assigned_documents) ? item.assigned_documents : [];
          docs.forEach((doc, idx) => {
            const fname = doc.file || doc.filename || doc.name || "Document";
            const doc_type = doc.documentType || doc.document_type || "File";
            const uploaded_by = doc.advocate || doc.uploadedBy || doc.uploaded_by || item.advocate_name || "Unknown";
            
            const ul_lower = uploaded_by.toLowerCase();
            let role_label = "Advocate";
            if (ul_lower.includes("junior")) {
              role_label = "Junior Advocate";
            } else if (ul_lower.includes("client")) {
              role_label = "Client";
            } else if (ul_lower.includes("senior")) {
              role_label = "Senior Advocate";
            }

            let file_url = doc.url || doc.file_url;
            if (!file_url && fname) {
              file_url = `${API_BASE_URL}/uploads/case_documents/${encodeURIComponent(fname)}`;
            }

            let timestampDisplay = "Recently";
            const rawTime = doc.uploaded_at || doc.created_at || doc.timestamp || item.updated_at || item.created_at;
            if (rawTime) {
              try {
                const diffMs = new Date() - new Date(rawTime);
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                if (diffDays > 0) {
                  timestampDisplay = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
                } else if (diffHours > 0) {
                  timestampDisplay = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
                } else if (diffMins > 0) {
                  timestampDisplay = `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
                } else {
                  timestampDisplay = "Just now";
                }
              } catch (e) {
                timestampDisplay = "Recently";
              }
            }

            juniorDocs.push({
              id: doc.id || `doc_${item.id || index}_${idx}`,
              filename: fname,
              document_type: doc_type,
              uploaded_by: uploaded_by,
              uploaded_by_role: role_label,
              case_title: item.case_title || item.case_name || "",
              case_no: item.case_number || item.case_no || "",
              client_name: isSensitiveCase(item) ? "Confidential (Restricted)" : (item.client_name || ""),
              timestamp_display: timestampDisplay,
              file_url: file_url,
            });
          });
        });

        const sortedDocs = juniorDocs.slice(-8).reverse();
        setRecentDocuments(sortedDocs);

        const formattedCases = casesToShow.map((item) => ({
          id: item.id,
          title: item.case_title || item.case_name,
          hearing: item.due_date ? item.due_date.split("T")[0] : "No date",
          status: item.status || "Active",
          clientName: isSensitiveCase(item) ? "Confidential (Restricted)" : (item.client_name || "N/A"),
          court: item.practice_court || item.practice_area || "Family Court",
          advocateName: item.advocate_name || "",
          secondaryAdvocateName: item.secondaryAdvocateName || item.secondary_advocate_name || "",
        }));

        setCases(formattedCases);
      } catch (error) {
        console.error("Error fetching dashboard cases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedCases();
  }, []);

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

  const todayStr = new Date().toISOString().split("T")[0];
  const assignedCasesList = cases;
  const activeCasesList = cases.filter(
    (c) => c.status === "Active" || c.status === "Hearing"
  );
  const upcomingHearingsList = cases.filter(
    (c) => c.hearing !== "No date" && c.hearing >= todayStr
  );

  const getSelectedList = () => {
    if (selectedCard === "assignedCases") return assignedCasesList;
    if (selectedCard === "activeCases") return activeCasesList;
    if (selectedCard === "upcomingHearings") return upcomingHearingsList;
    return [];
  };

  const selectedList = getSelectedList();

  return (
    <div className="w-full max-w-full min-w-0 mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-300 overflow-x-hidden">

      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight truncate">
            {greeting}, {userName ? <span className="capitalize">{userName}</span> : ""}
          </h1>
          <p className="text-[#64748B] mt-1 text-sm sm:text-base font-medium truncate">
            Junior Advocate {userName ? <span className="capitalize">{userName}</span> : ""}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto">
          <div className="text-left sm:text-right bg-[#F8FAFC] px-4 sm:px-5 py-3 rounded-2xl border border-[#E2E8F0] w-full sm:w-auto">
            <p className="text-[#64748B] font-bold text-xs uppercase tracking-wider">Today&apos;s Date</p>
            <p className="text-[#0F172A] font-extrabold text-sm sm:text-base mt-0.5">{currentDate}</p>
          </div>
          <button
            onClick={() => router.push("/junior-calendar")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-extrabold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-3 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Calendar size={15} />
            <span>View Calendar</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 w-full min-w-0">
        <StatCard
          title="Assigned Cases"
          value={loading ? "—" : stats.assignedCases}
          icon={<Briefcase className="w-5 h-5" />}
          color="bg-blue-50 text-blue-600 border-blue-200"
          activeColor="border-blue-400 ring-2 ring-blue-200"
          isActive={selectedCard === "assignedCases"}
          onClick={() => setSelectedCard(selectedCard === "assignedCases" ? null : "assignedCases")}
          loading={loading}
        />

        <StatCard
          title="Active Cases"
          value={loading ? "—" : stats.activeCases}
          icon={<FolderOpen className="w-5 h-5" />}
          color="bg-emerald-50 text-emerald-600 border-emerald-200"
          activeColor="border-emerald-400 ring-2 ring-emerald-200"
          isActive={selectedCard === "activeCases"}
          onClick={() => setSelectedCard(selectedCard === "activeCases" ? null : "activeCases")}
          loading={loading}
        />

        <StatCard
          title="Upcoming Hearings"
          value={loading ? "—" : stats.hearings}
          icon={<Calendar className="w-5 h-5" />}
          color="bg-purple-50 text-purple-600 border-purple-200"
          activeColor="border-purple-400 ring-2 ring-purple-200"
          isActive={selectedCard === "upcomingHearings"}
          onClick={() => setSelectedCard(selectedCard === "upcomingHearings" ? null : "upcomingHearings")}
          loading={loading}
        />
      </div>

      {/* Dynamic Detail Panel (Stat Card Expansion) */}
      {selectedCard && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 overflow-hidden animate-in fade-in duration-200 w-full min-w-0">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">
              {selectedCard === "assignedCases" && "All Assigned Cases"}
              {selectedCard === "activeCases" && "Active Cases"}
              {selectedCard === "upcomingHearings" && "Upcoming Hearings"}
            </h3>
            <span className="text-xs sm:text-sm text-[#64748B] font-bold bg-slate-100 px-3 py-1 rounded-full">
              {selectedList.length} {selectedCard === "upcomingHearings" ? "hearings" : "cases"}
            </span>
          </div>

          {/* Mobile Native Card View (< 640px) for Stat Card Expansion */}
          <div className="block sm:hidden space-y-3 w-full min-w-0">
            {selectedList.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs font-semibold">No cases found in this category.</p>
            ) : (
              selectedList.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 w-full min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <h4 className="text-xs font-extrabold text-[#0F172A] break-words flex-1 min-w-0">{item.title}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                      item.status === "Active" || item.status === "Hearing"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {selectedCard === "upcomingHearings" ? `Hearing: ${item.hearing}` : `Client: ${item.clientName}`}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Desktop & Tablet Table (>= 640px) */}
          <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-[#E2E8F0] min-w-0">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-xs sm:text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="p-3.5 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Case</th>
                  <th className="p-3.5 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">
                    {selectedCard === "upcomingHearings" ? "Hearing Date" : "Client Name"}
                  </th>
                  <th className="p-3.5 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {selectedList.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-[#94A3B8] font-medium text-xs sm:text-sm">
                      No cases found for this category.
                    </td>
                  </tr>
                ) : (
                  selectedList.map((item, index) => (
                    <tr key={index} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 text-xs sm:text-sm font-bold text-[#0F172A] whitespace-nowrap">{item.title}</td>
                      <td className="p-3.5 text-xs sm:text-sm text-[#475569] whitespace-nowrap font-medium">
                        {selectedCard === "upcomingHearings" ? item.hearing : item.clientName}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          item.status === "Active" || item.status === "Hearing"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full min-w-0">

        {/* Assigned Cases Card Container */}
        <div className="lg:col-span-12 bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 w-full max-w-full min-w-0">

          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A]">
              Assigned Cases
            </h2>

            <button
              onClick={() => router.push("/assigned-cases")}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 sm:px-5 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] sm:text-xs transition-all shadow-xs cursor-pointer shrink-0"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#64748B] font-medium">Loading cases…</p>
              </div>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-8 text-center text-[#94A3B8] font-medium text-xs sm:text-sm bg-slate-50 rounded-2xl border border-slate-100">
              No assigned cases found.
            </div>
          ) : (
            <>
              {/* Mobile Native Card View (< 640px) */}
              <div className="block sm:hidden space-y-3 w-full min-w-0">
                {cases.map((item, index) => {
                  const normUser = (userName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const normSec = (item.secondaryAdvocateName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const isStandby = normSec && (normSec === normUser || normUser.includes(normSec) || normSec.includes(normUser));

                  return (
                    <div
                      key={index}
                      onClick={() => router.push("/assigned-cases")}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-2xl space-y-2.5 transition cursor-pointer w-full min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <h4 className="text-xs font-extrabold text-[#0F172A] break-words flex-1 min-w-0">
                          {item.title}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                          item.status === "Active" || item.status === "Hearing"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p className="flex items-center gap-1.5 truncate">
                          <User size={12} className="text-slate-400 shrink-0" />
                          <span>Client: <strong>{item.clientName}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px]">
                        {isStandby ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800">
                            🛡️ Standby Advocate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-800">
                            👤 Primary Counsel
                          </span>
                        )}
                        <span className="text-blue-600 font-bold flex items-center gap-0.5">
                          View Details <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop & Tablet Table (>= 640px) */}
              <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-[#E2E8F0] min-w-0">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs sm:text-sm">
                  <thead className="bg-[#F8FAFC]">
                    <tr>
                      <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Case</th>
                      <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Client Name</th>
                      <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">My Role</th>
                      <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {cases.map((item, index) => {
                      const normUser = (userName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      const normSec = (item.secondaryAdvocateName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      const isStandby = normSec && (normSec === normUser || normUser.includes(normSec) || normSec.includes(normUser));

                      return (
                        <tr key={index} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-[#0F172A] whitespace-nowrap">
                            {item.title}
                          </td>
                          <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap font-medium">
                            {item.clientName}
                          </td>
                          <td className="p-3.5 sm:p-4 whitespace-nowrap">
                            {isStandby ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                🛡️ Standby / Backup
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                👤 Primary Counsel
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 sm:p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              item.status === "Active" || item.status === "Hearing"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>

        {/* Recent Documents */}
        <div className="lg:col-span-12 bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 flex flex-col w-full min-w-0">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A]">
              Recent Documents
            </h2>
          </div>

          <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto max-h-[350px] lg:max-h-[480px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="text-center p-6 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                <FileText className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-medium text-[#64748B]">No documents found.</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Assigned case documents will appear here.</p>
              </div>
            ) : (
              recentDocuments.map((doc, index) => {
                const roleBadgeClass = ROLE_BADGE[doc.uploaded_by_role] || "bg-slate-100 text-slate-600";
                return (
                  <div
                    key={doc.id || index}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] hover:bg-white border border-transparent hover:border-[#E2E8F0] hover:shadow-xs transition-all cursor-pointer group space-y-2"
                    onClick={() => {
                      if (doc.file_url) window.open(doc.file_url, "_blank");
                    }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-[#1E293B] group-hover:text-[#2563EB] transition-colors truncate">
                          {doc.filename}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
                          {doc.document_type && doc.document_type !== "File" && (
                            <span className="inline-flex text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {doc.document_type}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/assigned-cases");
                            }}
                            className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full hover:bg-blue-100 cursor-pointer"
                          >
                            View Case
                          </button>
                        </div>
                      </div>
                    </div>

                    {doc.case_title && (
                      <p className="text-[10.5px] text-[#475569] font-medium truncate pt-1 border-t border-slate-100">
                        📁 {doc.case_title}
                        {doc.case_no && <span className="text-[#94A3B8] ml-1">({doc.case_no})</span>}
                      </p>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500">
                      <div className="flex items-center flex-wrap gap-1">
                        <span>by</span>
                        <span className="font-bold text-[#0F172A]">{doc.uploaded_by}</span>
                        <span>•</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${roleBadgeClass}`}>
                          {doc.uploaded_by_role}
                        </span>
                      </div>
                      <span className="font-medium text-[#94A3B8]">
                        {doc.timestamp_display}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, activeColor, isActive, onClick, loading }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-xs border p-3.5 sm:p-5 hover:shadow-md transition-all cursor-pointer group ${
        isActive ? activeColor : "border-[#E2E8F0]"
      }`}
    >
      <div className={`w-9 h-9 sm:w-10 sm:h-10 ${color} rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform border`}>
        {icon}
      </div>

      <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mb-0.5">
        {title}
      </p>

      <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
        {loading ? (
          <span className="inline-block w-12 h-7 rounded-lg bg-slate-100 animate-pulse" />
        ) : (
          value
        )}
      </h2>
    </div>
  );
}
