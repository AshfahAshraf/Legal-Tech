"use client";

import { useState, useEffect } from "react";
import { Calendar, Briefcase, User, Clock, Building } from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";

const BASE_URL = API_BASE_URL;

export default function ClientDashboard() {
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [assignedAdvocates, setAssignedAdvocates] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const user = getLoggedInUser();
    const name = user?.username || user?.name || "";

    const safeFetch = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.results || data.data || []);
      } catch (err) {
        return [];
      }
    };

    const fetchAll = async () => {
      setUserName(name);
      try {
        const [casesData, consultData, invoicesData, advocatesData] = await Promise.all([
          safeFetch(`${BASE_URL}/case-management/`),
          safeFetch(`${BASE_URL}/consultations`),
          safeFetch(`${BASE_URL}/finance/invoices${name ? `?client_name=${encodeURIComponent(name)}` : ""}`),
          safeFetch(`${BASE_URL}/lawfirm-management/`),
        ]);

        setInvoices(invoicesData);

        // Filter cases for this client by email or client_name matching username
        const clientCases = Array.isArray(casesData)
          ? (user
            ? casesData.filter((c) => {
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
            })
            : casesData)
          : [];

        setCases(clientCases);

        // Derive upcoming hearings from client's active cases that have next_hearing_date
        const clientHearings = clientCases
          .filter((c) => c.next_hearing_date && c.next_hearing_date !== "N/A")
          .map((c) => ({
            case_title: c.case_title || "Untitled Case",
            court: c.court_name || "Civil Court",
            advocate_name: c.selected_advocate || "—",
            date: c.next_hearing_date,
            time: "10:00 AM",
            status: "Scheduled",
          }));

        setHearings(clientHearings);

        // Filter consultations for this client by client_name
        const clientConsults = name
          ? consultData.filter((c) => {
            const normalized = (c.client_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedUser = name.toLowerCase().replace(/[^a-z0-9]/g, "");
            return (
              normalized.includes(normalizedUser) ||
              normalizedUser.includes(normalized)
            );
          })
          : consultData;

        setConsultations(
          Array.isArray(clientConsults)
            ? clientConsults.slice(-5).reverse()
            : []
        );

        const recentActivities = [];

        // Latest case updates
        clientCases.forEach((c) => {
          recentActivities.push({
            title: `Case updated: ${c.case_title}`,
            timestamp: c.updated_at || c.created_at,
          });
        });

        // Latest hearings
        clientHearings.forEach((h) => {
          recentActivities.push({
            title: `Hearing scheduled for ${h.case_title}`,
            timestamp: h.date,
          });
        });

        // Latest consultations
        clientConsults.forEach((c) => {
          recentActivities.push({
            title: `Consultation ${c.status}`,
            timestamp: c.date,
          });
        });

        // Latest payments
        invoicesData.forEach((inv) => {
          recentActivities.push({
            title: `Payment ${inv.status} - ₹${inv.grand_total}`,
            timestamp: inv.created_at,
          });
        });

        // Sort latest first
        recentActivities.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Show top 4
        setActivities(recentActivities.slice(0, 4));

        // Derive unique assigned advocate names across cases and hearings
        const advocateNamesInCases = clientCases
          .map((c) => c.selected_advocate)
          .filter((name) => name && name !== "—" && name !== "");

        const advocateNamesInHearings = clientHearings
          .map((h) => h.advocate_name)
          .filter((name) => name && name !== "—" && name !== "");

        const uniqueAdvocateNames = Array.from(
          new Set([...advocateNamesInCases, ...advocateNamesInHearings])
        );

        const advocatesList = uniqueAdvocateNames.map((name) => {
          const matchedAdvocate = Array.isArray(advocatesData)
            ? advocatesData.find(
              (adv) => (adv.advocate_name || adv.advocateName || "").toLowerCase().trim() === name.toLowerCase().trim()
            )
            : null;

          if (matchedAdvocate) {
            return {
              name: matchedAdvocate.advocate_name || matchedAdvocate.advocateName || name,
              phone: matchedAdvocate.phone_number || matchedAdvocate.phoneNumber || "—",
              email: matchedAdvocate.email_address || matchedAdvocate.emailAddress || "—",
              specialization: matchedAdvocate.specialization || "—",
            };
          } else {
            return {
              name: name,
              phone: "—",
              email: "—",
              specialization: "—",
            };
          }
        });

        setAssignedAdvocates(advocatesList);
      } catch (err) {
        console.error("ClientDashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Derived stats
  const activeCasesCount = cases.filter((c) => c.status === "Active").length;
  const upcomingHearingsCount = hearings.length;

  // Format a date string nicely
  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const hour = new Date().getHours();
  let greeting = "";
  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
  } else {
    greeting = "Good Evening";
  }

  return (
    <div className="w-full max-w-full min-w-0 mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-300 overflow-x-hidden">

      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            {greeting}
            {userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-[#64748B] mt-1 text-xs sm:text-base font-medium">
            Here&apos;s an overview of your legal matters.
          </p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6 w-full min-w-0">
        <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mb-0.5">
            Active Cases
          </p>
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
            {loading ? (
              <span className="inline-block w-12 h-7 rounded-lg bg-slate-100 animate-pulse" />
            ) : activeCasesCount}
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] p-4 sm:p-5 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mb-0.5">
            Upcoming Hearings
          </p>
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
            {loading ? (
              <span className="inline-block w-12 h-7 rounded-lg bg-slate-100 animate-pulse" />
            ) : upcomingHearingsCount}
          </h2>
        </div>
      </div>

      {/* Upcoming Hearings Section */}
      {!loading && hearings.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 overflow-hidden w-full min-w-0">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] mb-4 sm:mb-6">Upcoming Hearings</h2>
          
          {/* Mobile Native Cards (< 640px) */}
          <div className="block sm:hidden space-y-3 w-full min-w-0">
            {hearings.map((h, i) => (
              <div key={i} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 w-full min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <h4 className="text-xs font-extrabold text-[#0F172A] break-words flex-1 min-w-0">{h.case_title}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                    h.status === "Scheduled"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : h.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {h.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p className="flex items-center gap-1">🏛️ Court: <strong className="text-slate-800">{h.court}</strong></p>
                  <p className="flex items-center gap-1">👤 Advocate: <strong className="text-slate-800">{h.advocate_name || "—"}</strong></p>
                  <p className="text-blue-600 font-bold pt-1 border-t border-slate-200/60">🗓️ Hearing Date: {fmtDate(h.date)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop & Tablet Table (>= 640px) */}
          <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-[#E2E8F0] min-w-0">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-xs sm:text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Case</th>
                  <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Court</th>
                  <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Advocate</th>
                  <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Hearing Date</th>
                  <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {hearings.map((h, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-[#0F172A] whitespace-nowrap">{h.case_title}</td>
                    <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap">{h.court}</td>
                    <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap font-medium">{h.advocate_name || "—"}</td>
                    <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap font-bold">{fmtDate(h.date)}</td>
                    <td className="p-3.5 sm:p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        h.status === "Scheduled"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : h.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* My Cases Section */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 overflow-hidden w-full min-w-0">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A]">My Cases</h2>
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
            No cases found.
          </div>
        ) : (
          <>
            {/* Mobile Native Cards (< 640px) */}
            <div className="block sm:hidden space-y-3 w-full min-w-0">
              {cases.map((item, index) => (
                <div key={index} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 w-full min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-[#0F172A] break-words">{item.case_title}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">{item.case_type}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                      item.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : item.status === "Hearing"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 space-y-1">
                    <p>👤 Advocate: <strong className="text-slate-800">{item.selected_advocate || item.advocate_name || "Not Assigned"}</strong></p>
                    <p>🏛️ Court: <strong className="text-slate-800">{item.court_name}</strong></p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table (>= 640px) */}
            <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-[#E2E8F0] min-w-0">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs sm:text-sm">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Title / Type</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Advocate</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Court</th>
                    <th className="p-3.5 sm:p-4 text-left text-xs font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {cases.map((item, index) => (
                    <tr key={index} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap font-medium">
                        <span className="block font-bold text-[#0F172A]">{item.case_title}</span>
                        <span className="text-[11px] text-[#64748B]">{item.case_type}</span>
                      </td>
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap">{item.selected_advocate || item.advocate_name || "Not Assigned"}</td>
                      <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-[#475569] whitespace-nowrap">{item.court_name}</td>
                      <td className="p-3.5 sm:p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          item.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "Hearing"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
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

      {/* Consultation + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">

        {/* Consultation History */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 flex flex-col w-full min-w-0">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] mb-4 sm:mb-6">
            Meeting History
          </h2>

          <div className="space-y-3 flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : consultations.length === 0 ? (
              <div className="text-center text-[#94A3B8] font-medium text-xs sm:text-sm py-6 bg-slate-50 rounded-2xl border border-slate-100">
                No consultations found.
              </div>
            ) : (
              consultations.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 hover:bg-white transition"
                >
                  <div className="min-w-0">
                    <span className="block font-bold text-xs sm:text-sm text-[#1E293B]">{fmtDate(item.date)}</span>
                    <span className="text-[11px] font-medium text-[#64748B]">
                      Meeting Type: {item.type}
                    </span>
                  </div>
                  <span className={`self-start sm:self-auto px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase border ${
                    item.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : item.status === "In Progress"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 flex flex-col w-full min-w-0">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] mb-4 sm:mb-6">
            Recent Activity
          </h2>

          <div className="space-y-3 flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center text-[#94A3B8] font-medium text-xs sm:text-sm py-6 bg-slate-50 rounded-2xl border border-slate-100">
                No recent activity.
              </div>
            ) : (
              activities.map((item, index) => (
                <div key={index} className="flex items-start gap-3 group min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 border border-blue-100">
                    {index + 1}
                  </div>
                  <div className="flex-1 bg-[#F8FAFC] p-3 sm:p-3.5 rounded-2xl border border-[#E2E8F0] min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-[#1E293B] block break-words">{item.title}</span>
                    <span className="text-[10.5px] text-[#64748B] mt-0.5 block">{fmtDate(item.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Assigned Advocates Section */}
      {!loading && assignedAdvocates && assignedAdvocates.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-[#E2E8F0] p-4 sm:p-6 md:p-8 w-full min-w-0">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#0F172A] mb-4 sm:mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
              <User size={18} />
            </div>
            <span>Assigned Advocates</span>
          </h2>
          
          <div className="space-y-4">
            {assignedAdvocates.map((adv, index) => (
              <div key={index} className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 bg-white shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 w-full min-w-0">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 min-w-0">
                    <span className="block text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Name</span>
                    <span className="font-extrabold text-xs sm:text-sm text-[#0F172A] truncate block">{adv.name}</span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 min-w-0">
                    <span className="block text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Phone</span>
                    <span className="font-bold text-xs sm:text-sm text-[#1E293B] truncate block">{adv.phone}</span>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 min-w-0">
                    <span className="block text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Email</span>
                    <span className="font-bold text-xs sm:text-sm text-[#1E293B] truncate block">{adv.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}