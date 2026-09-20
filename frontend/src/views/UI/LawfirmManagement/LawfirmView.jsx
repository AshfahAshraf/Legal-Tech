"use client";

import { API_BASE_URL } from "@/utils/api";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Search,
  Eye,
  Trash2,
  LayoutGrid,
  List,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { usePermissions } from "@/utils/usePermissions";

export default function LawfirmView() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [advocates, setAdvocates] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [assignedCases, setAssignedCases] = useState([]);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("All");
  const [membersViewMode, setMembersViewMode] = useState("list"); // "list" or "grid"
  const [casesViewMode, setCasesViewMode] = useState("list"); // "list" or "grid"
  const [advocatesPage, setAdvocatesPage] = useState(0);
  const [casesPage, setCasesPage] = useState(0);
  const [selectedViewCase, setSelectedViewCase] = useState(null);


  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const actions = [
    {
      title: "Add Member",
      icon: Building2,
      button: "Add Member",
      color: "bg-blue-600",
      path: "/lawfirm-management/add-manage-firm",
      permissionAction: "add"
    },
    {
      title: "Assign Advocate",
      icon: Users,
      button: "Assign Advocate",
      color: "bg-green-600",
      path: "/lawfirm-management/assign-advocate",
      permissionAction: "add"
    },
  ];

  const allowedActions = actions.filter(item => hasPermission("Law Firm Management", item.permissionAction));

  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lawfirm-management/`);
        if (!response.ok) {
          console.error("fetchAdvocates failed:", response.status);
          setAdvocates([]);
          return;
        }
        const data = await response.json();
        setAdvocates(Array.isArray(data) ? data : data.data || []);
      } catch (error) {
        console.error("Error fetching advocates:", error);
        setAdvocates([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchAssignedCases = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/lawfirm-management/assigned-cases`
        );
        if (!response.ok) {
          console.error("fetchAssignedCases failed:", response.status);
          setAssignedCases([]);
          return;
        }
        const data = await response.json();
        setAssignedCases(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching assigned cases:", error);
        setAssignedCases([]);
      }
    };

    const fetchDashboardStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/advocate/dashboard`);
        const data = await response.json();
        setDashboardStats(data.stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchAdvocates();
    fetchDashboardStats();
    fetchAssignedCases();
  }, []);

  const handleAdvocateDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lawfirm-management/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setAdvocates((prev) => prev.filter((a) => a.id !== id));
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Failed to delete advocate: ${errData.detail || "Server error"}`);
      }
    } catch (e) {
      console.warn("Advocate API delete info:", e?.message || e);
      // Remove from UI state on client action
      setAdvocates((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleCaseDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setAssignedCases((prev) => prev.filter((c) => c.id !== id));
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Failed to delete assigned case: ${errData.detail || "Server error"}`);
      }
    } catch (e) {
      console.warn("Case API delete info:", e?.message || e);
      // Remove from UI state on client action
      setAssignedCases((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const confirmDelete = () => {
    if (deleteType === "advocate") {
      handleAdvocateDelete(deleteId);
    } else {
      handleCaseDelete(deleteId);
    }

    setShowDeleteModal(false);
    setDeleteId(null);
    setDeleteType("");
  };

  const filteredAdvocates = advocates.filter((item) => {
    const matchesSearch =
      item.advocateName?.toLowerCase().includes(search.toLowerCase()) ||
      item.specialization?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ? true : item.status === filter;

    return matchesSearch && matchesFilter;
  });

  const filteredAssignedCases = assignedCases.filter((item) => {
    const matchesSearch =
      item.case_title
        ?.toLowerCase()
        .includes(caseSearch.toLowerCase()) ||
      item.id
        ?.toString()
        .includes(caseSearch.toLowerCase()) ||
      item.case_name
        ?.toLowerCase()
        .includes(caseSearch.toLowerCase());

    const matchesFilter =
      caseFilter === "All" || item.priority === caseFilter;

    return matchesSearch && matchesFilter;
  });

  const getAdvocateProfileImage = (name) => {
    if (!name) return null;
    const normSearch = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const found = advocates.find((adv) => {
      const advName = (adv.advocateName || adv.advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return advName === normSearch || advName.includes(normSearch) || normSearch.includes(advName);
    });
    if (found && (found.profileImage || found.profile_image)) {
      return found.profileImage || found.profile_image;
    }
    return null;
  };

  return (
    <div className="w-full space-y-5 sm:space-y-8 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-5 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl tracking-tight">
            Law Firm Management
          </h1>
          <p className="text-[#64748B] mt-2 font-medium">
            Manage law firms, branches and firm information
          </p>
        </div>
      </div>

      {/* Action Cards */}
      {allowedActions.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-${allowedActions.length} gap-3 sm:gap-4`}>
          {allowedActions.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-[#2563EB] rounded-xl flex items-center justify-center border border-blue-100 flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-[#0F172A]">
                    {item.title}
                  </h3>
                </div>
                <button
                  onClick={() => router.push(item.path)}
                  className={`px-5 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wide transition-all shadow hover:shadow-md active:scale-[0.98] flex-shrink-0 ${item.color}`}
                >
                  {item.button}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:-translate-y-0.5 transition-transform duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-3xl opacity-60 -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 border border-purple-200">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">Total Members</p>
            <h3 className="text-3xl font-extrabold mt-1 text-[#0F172A]">
              {advocates.length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:-translate-y-0.5 transition-transform duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full blur-3xl opacity-60 -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3 border border-green-200">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">Active Members</p>
            <h3 className="text-3xl font-extrabold mt-1 text-[#0F172A]">
              {advocates.filter((a) => a.status === "Active" || !a.status).length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:-translate-y-0.5 transition-transform duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full blur-3xl opacity-60 -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-3 border border-red-200">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wider">Inactive</p>
            <h3 className="text-3xl font-extrabold mt-1 text-[#0F172A]">
              {advocates.filter((a) => a.status === "Inactive").length}
            </h3>
          </div>
        </div>
      </div>

      {/* Search + Filter + Table Card */}
      {!loading && advocates.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-xl shadow-slate-200/40 overflow-hidden">

          {/* Header with Search + Filter + View Toggle */}
          <div className="p-4 sm:p-6 border-b border-[#F1F5F9] flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-stretch md:items-center bg-white">
            <h2 className="text-xl font-extrabold text-[#0F172A]">
              Firm Members Profile
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center border border-[#E2E8F0] rounded-full px-4 py-2 sm:py-2.5 w-full sm:w-[260px] bg-[#F8FAFC] focus-within:ring-2 focus-within:ring-[#2563EB]/20 focus-within:border-[#2563EB] transition-all">
                <Search className="w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search member..."
                  className="w-full ml-2 bg-transparent outline-none text-xs text-[#0F172A] placeholder:text-[#94A3B8]"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setAdvocatesPage(0);
                  }}
                />
              </div>

              <select
                className="border border-[#E2E8F0] rounded-full px-4 py-2 text-xs bg-[#F8FAFC] text-[#0F172A] font-medium outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all cursor-pointer"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setAdvocatesPage(0);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-full border border-[#E2E8F0] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMembersViewMode("grid")}
                  title="Grid View"
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    membersViewMode === "grid"
                      ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMembersViewMode("list")}
                  title="List View"
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    membersViewMode === "list"
                      ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <List size={14} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Members Content */}
          {filteredAdvocates.length > 0 ? (
            <>
              {/* GRID VIEW */}
              {membersViewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 bg-[#F8FAFC]/50 border-b border-[#E2E8F0]">
                  {filteredAdvocates.slice(advocatesPage * 6, (advocatesPage + 1) * 6).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.profileImage
                                ? item.profileImage
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.advocateName || (item.role === 'Clerk' ? 'Clerk' : 'Advocate'))}&background=E2E8F0&color=64748B&rounded=true&bold=true`
                            }
                            alt={item.advocateName || "Member"}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs ring-1 ring-[#E2E8F0] shrink-0"
                          />
                          <div>
                            <h3 className="font-bold text-[#0F172A] text-sm leading-tight">
                              {item.advocateName}
                            </h3>
                            <span className="text-xs text-[#64748B] block mt-0.5 font-medium truncate max-w-[170px]" title={item.emailAddress || item.email}>
                              {item.emailAddress || item.email || "No Email"}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            item.status === "Active" || !item.status
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status || "Active"}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Role:</span>
                          <span className="font-bold text-[#0F172A]">{item.role || "Junior Advocate"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Phone:</span>
                          <span className="font-semibold text-[#475569]">{item.phoneNumber || "-"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                        <button
                          onClick={() => router.push(`/lawfirm-management/view?id=${item.id}`)}
                          className="px-3 py-1.5 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-blue-100 hover:text-blue-600 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={14} />
                          View Profile
                        </button>
                        {hasPermission("Law Firm Management", "delete") && (
                          <button
                            onClick={() => {
                              setDeleteType("advocate");
                              setDeleteId(item.id);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LIST VIEW */}
              {membersViewMode === "list" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                          Profile
                        </th>
                        <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                          Name
                        </th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                          Phone
                        </th>
                        <th className="hidden md:table-cell px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                          Role
                        </th>
                        <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                          Status
                        </th>
                        <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-center text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F1F5F9]">
                      {filteredAdvocates.slice(advocatesPage * 5, (advocatesPage + 1) * 5).map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 transition duration-200 group"
                        >
                          {/* Profile */}
                          <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
                            <img
                              src={
                                item.profileImage
                                  ? item.profileImage
                                  : `https://ui-avatars.com/api/?name=${item.advocateName || (item.role === 'Clerk' ? 'Clerk' : 'Advocate')}&background=E2E8F0&color=64748B&rounded=true&bold=true`
                              }
                              alt={item.advocateName || (item.role === 'Clerk' ? "Clerk" : "Advocate")}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-[#E2E8F0] group-hover:ring-[#CBD5E1] transition-all"
                            />
                          </td>

                          {/* Name */}
                          <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
                            <div>
                              <p className="font-bold text-[#0F172A] text-sm">
                                {item.advocateName}
                              </p>
                              <p className="text-xs text-[#64748B] mt-1 font-medium">
                                {item.emailAddress || item.email || "No Email"}
                              </p>
                            </div>
                          </td>

                          <td className="hidden sm:table-cell px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-sm font-medium text-[#475569]">
                            {item.phoneNumber || "-"}
                          </td>

                          <td className="hidden md:table-cell px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-sm font-medium text-[#475569]">
                            {item.role || "Junior Advocate"}
                          </td>


                          {/* Status */}
                          <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
                            <span
                              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${item.status === "Active" || !item.status
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                                }`}
                            >
                              {item.status || "Active"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() =>
                                  router.push(`/lawfirm-management/view?id=${item.id}`)
                                }
                                className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors"
                              >
                                <Eye size={16} />
                              </button>

                              {hasPermission("Law Firm Management", "delete") && (
                                <button
                                  onClick={() => {
                                    setDeleteType("advocate");
                                    setDeleteId(item.id);
                                    setShowDeleteModal(true);
                                  }} className="w-9 h-9 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
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
              )}

              {/* Pagination Controls */}
              {filteredAdvocates.length > 5 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]/50">
                  <span className="text-xs text-[#64748B] font-semibold">
                    Page {advocatesPage + 1} of {Math.ceil(filteredAdvocates.length / 5)}
                  </span>
                  <button
                    onClick={() => setAdvocatesPage(p => Math.max(0, p - 1))}
                    disabled={advocatesPage === 0}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setAdvocatesPage(p => Math.min(Math.ceil(filteredAdvocates.length / 5) - 1, p + 1))}
                    disabled={(advocatesPage + 1) * 5 >= filteredAdvocates.length}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4 border border-[#E2E8F0]">
                <Search className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">No members found</h3>
              <p className="text-[#64748B] text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}

      {assignedCases.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-xl shadow-slate-200/40 overflow-hidden mt-5 sm:mt-8">

          {/* Header with Search + View Toggle */}
          <div className="p-4 sm:p-6 border-b border-[#F1F5F9] flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-stretch md:items-center bg-white">
            <h2 className="text-xl font-extrabold text-[#0F172A]">
              Junior Assigned Cases
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex items-center border border-[#E2E8F0] rounded-full px-4 py-2 sm:py-2.5 w-full sm:w-72 bg-[#F8FAFC] focus-within:ring-2 focus-within:ring-[#2563EB]/20 focus-within:border-[#2563EB] transition-all">
                <Search className="w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search case..."
                  className="w-full ml-2 bg-transparent outline-none text-xs text-[#0F172A] placeholder:text-[#94A3B8]"
                  value={caseSearch}
                  onChange={(e) => {
                    setCaseSearch(e.target.value);
                    setCasesPage(0);
                  }}
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-full border border-[#E2E8F0] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCasesViewMode("grid")}
                  title="Grid View"
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    casesViewMode === "grid"
                      ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCasesViewMode("list")}
                  title="List View"
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    casesViewMode === "list"
                      ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <List size={14} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* GRID VIEW */}
          {casesViewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 bg-[#F8FAFC]/50 border-b border-[#E2E8F0]">
              {filteredAssignedCases
                .slice(casesPage * 6, (casesPage + 1) * 6)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-[#0F172A] text-sm leading-tight">
                          {item.case_name}
                        </h3>
                        <span className="text-[11px] font-mono text-[#64748B] block mt-1">
                          {item.case_id_code || item.case_number || (item.case_id ? `CASE-#${item.case_id}` : `#${item.id}`)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]/60">
                      <span className="text-[11px] font-semibold text-[#94A3B8] block mb-1">Assigned Advocates:</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Primary */}
                        <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-[#E2E8F0] shadow-xs">
                          {(() => {
                            const pImg = getAdvocateProfileImage(item.advocate_name);
                            const fallbackUrl = item.advocate_name
                              ? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.advocate_name)}&background=2563EB&color=FFFFFF&rounded=true&bold=true`
                              : `https://ui-avatars.com/api/?name=Advocate&background=E2E8F0&color=64748B&rounded=true&bold=true`;
                            return (
                              <img
                                src={pImg || fallbackUrl}
                                alt={item.advocate_name || "Primary Advocate"}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                            );
                          })()}
                          <span className="font-bold text-[#0F172A] text-xs truncate max-w-[110px]" title={item.advocate_name}>
                            {item.advocate_name || "Primary Advocate"}
                          </span>
                        </div>

                        {/* Standby */}
                        {(item.secondary_advocate_name || item.secondaryAdvocateName) && (
                          <div className="flex items-center gap-2 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-xs">
                            {(() => {
                              const secName = item.secondary_advocate_name || item.secondaryAdvocateName;
                              const sImg = getAdvocateProfileImage(secName);
                              const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(secName)}&background=F59E0B&color=FFFFFF&rounded=true&bold=true`;
                              return (
                                <img
                                  src={sImg || fallbackUrl}
                                  alt={secName}
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              );
                            })()}
                            <span className="font-bold text-amber-800 text-xs truncate max-w-[110px]" title={item.secondary_advocate_name || item.secondaryAdvocateName}>
                              {item.secondary_advocate_name || item.secondaryAdvocateName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                      <button
                        onClick={() => setSelectedViewCase(item)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="View Details & Edit"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                      {hasPermission("Law Firm Management", "delete") && (
                        <button
                          onClick={() => {
                            setDeleteType("case");
                            setDeleteId(item.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Assignment"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* LIST VIEW */}
          {casesViewMode === "list" && (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                    Case Name
                  </th>
                  <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                    Case ID
                  </th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-left text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                    Advocates
                  </th>
                  <th className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-center text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredAssignedCases
                  .slice(casesPage * 5, (casesPage + 1) * 5)
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition duration-200 group"
                    >
                      <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-sm font-bold text-[#0F172A]">{item.case_name}</td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-sm font-medium text-[#475569]">{item.case_id_code || item.case_number || (item.case_id ? `CASE-#${item.case_id}` : `#${item.id}`)}</td>
                      <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 text-sm font-medium text-[#475569]">
                        <div
                          onClick={() => setSelectedViewCase(item)}
                          className="flex items-center -space-x-2 overflow-hidden cursor-pointer group/adv hover:scale-105 transition-transform"
                          title={`Click to view Assigned Advocates:\n• Primary: ${item.advocate_name || 'N/A'}\n• Standby: ${item.secondary_advocate_name || item.secondaryAdvocateName || 'None'}`}
                        >
                          {/* Primary Advocate Avatar */}
                          {(() => {
                            const pImg = getAdvocateProfileImage(item.advocate_name);
                            const fallbackUrl = item.advocate_name
                              ? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.advocate_name)}&background=2563EB&color=FFFFFF&rounded=true&bold=true`
                              : `https://ui-avatars.com/api/?name=Advocate&background=E2E8F0&color=64748B&rounded=true&bold=true`;
                            return (
                              <img
                                src={pImg || fallbackUrl}
                                alt={item.advocate_name || "Primary Advocate"}
                                title={`Primary Advocate: ${item.advocate_name || 'N/A'} (Click to view details)`}
                                className="inline-block w-8 h-8 rounded-full ring-2 ring-white object-cover shadow-xs group-hover/adv:ring-blue-400 transition-all"
                              />
                            );
                          })()}

                          {/* Standby Advocate Avatar */}
                          {(item.secondary_advocate_name || item.secondaryAdvocateName) && (() => {
                            const secName = item.secondary_advocate_name || item.secondaryAdvocateName;
                            const sImg = getAdvocateProfileImage(secName);
                            const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(secName)}&background=F59E0B&color=FFFFFF&rounded=true&bold=true`;
                            return (
                              <img
                                src={sImg || fallbackUrl}
                                alt={secName}
                                title={`Standby Advocate: ${secName} (Click to view details)`}
                                className="inline-block w-8 h-8 rounded-full ring-2 ring-amber-400 object-cover shadow-xs group-hover/adv:ring-amber-500 transition-all"
                              />
                            );
                          })()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 sm:px-6 md:px-8 py-4 sm:py-5">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedViewCase(item)}
                            className="w-8 h-8 rounded-full bg-blue-50 text-[#2563EB] hover:bg-blue-100 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                            title="View Details & Edit"
                          >
                            <Eye size={15} />
                          </button>

                          {hasPermission("Law Firm Management", "delete") && (
                            <button
                              onClick={() => {
                                setDeleteType("case");
                                setDeleteId(item.id);
                                setShowDeleteModal(true);
                              }} className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Assignment"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination Controls */}
          {filteredAssignedCases.length > 5 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]/50">
              <span className="text-xs text-[#64748B] font-semibold">
                Page {casesPage + 1} of {Math.ceil(filteredAssignedCases.length / 5)}
              </span>
              <button
                onClick={() => setCasesPage(p => Math.max(0, p - 1))}
                disabled={casesPage === 0}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
              >
                &lt;
              </button>
              <button
                onClick={() => setCasesPage(p => Math.min(Math.ceil(filteredAssignedCases.length / 5) - 1, p + 1))}
                disabled={(casesPage + 1) * 5 >= filteredAssignedCases.length}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition cursor-pointer select-none font-bold text-xs"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      )}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-8 animate-in fade-in zoom-in-95 duration-200">

          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-slate-900 mt-6">
            Confirm Delete
          </h2>

          <p className="text-gray-600 mb-6 text-center mt-3 leading-relaxed">
            {deleteType === "advocate"
              ? "Are you sure you want to delete this member profile?"
              : "Are you sure you want to delete this assigned case?"}
          </p>

          <div className="flex justify-center gap-4 mt-8">

            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            <button
              onClick={confirmDelete}
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            >
              Delete
            </button>

          </div>

        </div>
        </div>,
        document.body
      )}
      {selectedViewCase && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
          <div className="w-full max-w-2xl md:max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    Assigned Case Details
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    selectedViewCase.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {selectedViewCase.status || "Active"}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
                  {selectedViewCase.case_name || selectedViewCase.case_title}
                </h2>
                {selectedViewCase.case_number && (
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Case No: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{selectedViewCase.case_number}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedViewCase(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center transition cursor-pointer text-base shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Case Info Grid */}
            <div className="space-y-5 text-xs">
              {/* Advocates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    Primary Advocate (Lead)
                  </span>
                  <div className="flex items-center gap-3">
                    {getAdvocateProfileImage(selectedViewCase.advocate_name) ? (
                      <img
                        src={getAdvocateProfileImage(selectedViewCase.advocate_name)}
                        alt="Primary Advocate"
                        className="w-9 h-9 rounded-full object-cover border-2 border-blue-300 shadow-xs"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs shadow-xs">PA</span>
                    )}
                    <div>
                      <span className="font-bold text-slate-900 text-sm capitalize block">
                        {selectedViewCase.advocate_name || "Not Specified"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Primary Counsel</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    Standby Advocate (Backup)
                  </span>
                  <div className="flex items-center gap-3">
                    {getAdvocateProfileImage(selectedViewCase.secondary_advocate_name || selectedViewCase.secondaryAdvocateName) ? (
                      <img
                        src={getAdvocateProfileImage(selectedViewCase.secondary_advocate_name || selectedViewCase.secondaryAdvocateName)}
                        alt="Standby Advocate"
                        className="w-9 h-9 rounded-full object-cover border-2 border-amber-300 shadow-xs"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs shadow-xs">SA</span>
                    )}
                    <div>
                      <span className="font-bold text-slate-900 text-sm capitalize block">
                        {selectedViewCase.secondary_advocate_name || selectedViewCase.secondaryAdvocateName || "None"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Backup / Proxy Counsel</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forum & Client Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Client Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedViewCase.client_name || "N/A"}
                  </span>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Court / Forum
                  </span>
                  <span className="font-bold text-slate-900 text-sm block truncate">
                    {selectedViewCase.practice_court || selectedViewCase.practice_area || "N/A"}
                  </span>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Next Hearing Date
                  </span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedViewCase.due_date || "No date scheduled"}
                  </span>
                </div>
              </div>

              {/* Assignment Notes */}
              {selectedViewCase.assignment_notes && (
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1">
                    Assignment Notes / Instructions
                  </span>
                  <p className="text-slate-800 italic font-medium leading-relaxed">
                    "{selectedViewCase.assignment_notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedViewCase(null)}
                className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>

              {hasPermission("Law Firm Management", "edit") && (
                <button
                  onClick={() => {
                    const editId = selectedViewCase.id;
                    setSelectedViewCase(null);
                    router.push(`/lawfirm-management/assign-advocate?id=${editId}`);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
                >
                  ✏️ Edit Assignment
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}