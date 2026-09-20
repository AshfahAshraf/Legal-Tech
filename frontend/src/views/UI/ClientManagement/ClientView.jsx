"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Search,
  Phone,
  Mail,
  Users,
  Briefcase,
  Clock,
  UserCheck,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  RefreshCw,
  X,
  Building,
  LayoutGrid,
  List
} from "lucide-react";
import { usePermissions } from "@/utils/usePermissions";
import { API_BASE_URL } from "@/utils/api";
import ClientEdit from "./ClientEdit";

export default function ClientView() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [clientsPage, setClientsPage] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    activeClients: 0,
    totalCases: 0,
  });

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    type: "", // "warning", "confirm", "success", "error"
    title: "",
    message: "",
    clientId: null,
    clientName: ""
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const [casesRes, advRes] = await Promise.all([
        fetch(`${API_BASE_URL}/case-management/`),
        fetch(`${API_BASE_URL}/lawfirm-management/`).catch(() => null),
      ]);

      let profilesMap = {};
      if (advRes && advRes.ok) {
        const advList = await advRes.json();
        advList.forEach((adv) => {
          if (adv.emailAddress) {
            profilesMap[adv.emailAddress.toLowerCase().trim()] = adv;
          }
          if (adv.advocateName) {
            profilesMap[adv.advocateName.toLowerCase().trim()] = adv;
          }
        });
      }

      // Check local cache if client saved profile locally
      try {
        const saved = localStorage.getItem("advocate_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.emailAddress) {
            profilesMap[parsed.emailAddress.toLowerCase().trim()] = parsed;
          }
          if (parsed.advocateName) {
            profilesMap[parsed.advocateName.toLowerCase().trim()] = parsed;
          }
        }
      } catch (e) {}

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        const clientMap = {};
        let idCounter = 1;

        casesData.forEach(c => {
          const name = c.client_name;
          if (!name) return;

          const emailKey = (c.email_id || "").toLowerCase().trim();
          const nameKey = name.toLowerCase().trim();
          const matchedProfile = profilesMap[emailKey] || profilesMap[nameKey] || {};

          if (!clientMap[name]) {
            clientMap[name] = {
              clientId: `CUST-${String(idCounter).padStart(4, '0')}`,
              clientName: matchedProfile.advocateName || name,
              contactNumber: matchedProfile.phoneNumber || c.contact_number || "N/A",
              altPhone: c.alt_contact_number || "",
              emailId: matchedProfile.emailAddress || c.email_id || "N/A",
              profileImage: matchedProfile.profileImage || null,
              activeCases: 1,
              courtName: c.court_name || "N/A",
              status: c.status || "N/A",
            };
            idCounter++;
          } else {
            clientMap[name].activeCases += 1;
            if (!clientMap[name].profileImage && matchedProfile.profileImage) {
              clientMap[name].profileImage = matchedProfile.profileImage;
            }
          }
        });

        const clientList = Object.values(clientMap);
        setClients(clientList);

        let activeCount = 0;
        let casesSum = 0;

        clientList.forEach(c => {
          const statusLower = (c.status || "").toLowerCase();
          if (statusLower === "active" || statusLower === "progress" || statusLower === "in progress") {
            activeCount++;
          }
          casesSum += c.activeCases;
        });

        setMetrics({
          totalClients: clientList.length,
          activeClients: activeCount,
          totalCases: casesSum,
        });
      }
    } catch (err) {
      console.error("Failed to fetch clients from case-management:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filter clients based on search query and status filter
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      !searchQuery ||
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.emailId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.courtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    const statusLower = (client.status || "").toLowerCase();
    if (statusFilter === "active") {
      return statusLower === "active" || statusLower === "progress" || statusLower === "in progress";
    }
    if (statusFilter === "closed") {
      return statusLower === "closed" || statusLower === "inactive";
    }
    return true;
  });

  // Reset page when filter changes
  useEffect(() => {
    setClientsPage(0);
  }, [searchQuery, statusFilter]);

  const handleDelete = async (clientId) => {
    const client = clients.find(c => c.clientId === clientId);
    if (!client) return;

    const statusLower = (client.status || "").toLowerCase();
    const isClosed = statusLower === "closed" || statusLower === "inactive";

    if (!isClosed) {
      setDeleteModal({
        show: true,
        type: "warning",
        title: "Deletion Restrained",
        message: `Only clients with closed cases can be deleted.\n"${client.clientName}" currently has an active status.`
      });
      return;
    }

    setDeleteModal({
      show: true,
      type: "confirm",
      title: "Delete Client?",
      message: `Are you sure you want to delete client "${client.clientName}" and all their associated cases?\nThis action cannot be undone.`,
      clientId: clientId,
      clientName: client.clientName
    });
  };

  const ITEMS_PER_PAGE = 5;
  const paginatedClients = filteredClients.slice(clientsPage * ITEMS_PER_PAGE, (clientsPage + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  return (
    <div className="w-full space-y-5 animate-fade-in pb-10">
      {/* ──── HEADER ──── */}
      <div className="mb-4">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
            <Users size={18} />
          </div>
          <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl leading-tight">
            Client Management
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#64748B] ml-0 sm:ml-[48px]">
          Consolidated workspace to track active representation cases, client activity audit trails, and financial records.
        </p>
      </div>

      {/* ──── KPI STATS (3 Widgets) ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Clients"
          value={metrics.totalClients}
          subtext="Registered clients list"
          icon={<Users size={20} />}
          color="text-[#0F172A]"
          bg="bg-white border-[#E2E8F0]"
          iconBg="bg-indigo-50 text-[#2563EB]"
        />
        <StatCard
          label="Active Clients"
          value={metrics.activeClients}
          subtext="Currently represented"
          icon={<UserCheck size={20} />}
          color="text-emerald-600"
          bg="bg-white border-[#E2E8F0]"
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total Cases"
          value={metrics.totalCases}
          subtext="Active legal matters"
          icon={<Briefcase size={20} />}
          color="text-violet-600"
          bg="bg-white border-[#E2E8F0]"
          iconBg="bg-violet-50 text-violet-600"
        />
      </div>

      {/* ──── ACTION CARDS (White Background & Clean Compact Padding) ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          title="Case Tracking"
          desc="Monitor legal milestones, upcoming hearings, and case summaries."
          btnText="Track Cases"
          icon={<Briefcase size={20} className="text-[#2563EB]" />}
          iconBg="bg-indigo-50"
          link="/client-management/case-tracking"
        />
        <ActionCard
          title="View History"
          desc="Access unified logs of cases, invoices, and documents for all clients."
          btnText="View History"
          icon={<Clock size={20} className="text-[#2563EB]" />}
          iconBg="bg-blue-50"
          onClick={() => {
            localStorage.removeItem("clientData");
            router.push("/client-management/view-history");
          }}
        />
      </div>

      {/* ──── CLIENT OVERVIEW TABLE ──── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs">
        {/* Table Top Header & Search/Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#F1F5F9]">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-[#0F172A]">Client Overview</h2>
            <p className="text-xs text-[#64748B]">List of clients derived from active court cases.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs (All, Active, Closed) */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-[#0F172A] shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                All ({clients.length})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "active" ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-emerald-700"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("closed")}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "closed" ? "bg-white text-slate-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Closed
              </button>
            </div>

            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grid"
                    ? "bg-white text-[#2563EB] font-bold shadow-xs border border-[#E2E8F0]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "list"
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

        {/* VIEW 1: GRID VIEW (When viewMode === "grid") */}
        {viewMode === "grid" && (
          <div>
            {loading ? (
              <div className="py-12 text-center text-[#64748B]">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#2563EB]" />
                <p className="text-xs">Loading client overview...</p>
              </div>
            ) : paginatedClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedClients.map((client) => {
                  const initials = client.clientName ? client.clientName.charAt(0).toUpperCase() : "?";
                  const statusLower = (client.status || "").toLowerCase();
                  const isActive = statusLower === "active" || statusLower === "progress" || statusLower === "in progress";
                  const isClosed = statusLower === "closed" || statusLower === "inactive";

                  return (
                    <div
                      key={client.clientId}
                      className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all space-y-4"
                    >
                      {/* Card Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {client.profileImage ? (
                            <img
                              src={client.profileImage}
                              alt={client.clientName}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-sm select-none shadow-xs shrink-0">
                              {initials}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-[#0F172A] text-sm leading-tight">
                              {client.clientName}
                            </h3>
                            <span className="text-[10px] text-[#94A3B8] font-mono mt-0.5 block">
                              {client.clientId}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Metadata Info */}
                      <div className="space-y-2 text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Court Room:</span>
                          <span className="font-bold text-[#0F172A] truncate max-w-[170px]" title={client.courtName}>
                            {client.courtName || "Unassigned"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Active Cases:</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] font-bold text-[#0F172A]">
                            {client.activeCases}
                          </span>
                        </div>

                        <a
                          href={`tel:${client.contactNumber}`}
                          className="flex items-center gap-2 hover:text-[#2563EB] transition-colors"
                        >
                          <Phone size={12} className="text-[#94A3B8] shrink-0" />
                          <span className="truncate">{client.contactNumber || "N/A"}</span>
                        </a>

                        <a
                          href={`mailto:${client.emailId}`}
                          className="flex items-center gap-2 hover:text-[#2563EB] transition-colors"
                          title={client.emailId}
                        >
                          <Mail size={12} className="text-[#94A3B8] shrink-0" />
                          <span className="truncate">{client.emailId || "N/A"}</span>
                        </a>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem("clientData", JSON.stringify({
                              clientId: client.clientId,
                              fullName: client.clientName,
                              clientName: client.clientName,
                              email: client.emailId,
                              emailId: client.emailId,
                              phone: client.contactNumber,
                              contactNumber: client.contactNumber,
                              profileImage: client.profileImage || null,
                              caseStatus: client.status,
                              status: client.status,
                            }));
                            router.push("/client-management/view-history");
                          }}
                          className="flex-1 py-1.5 px-3 bg-[#F1F5F9] hover:bg-blue-50 text-[#0F172A] hover:text-[#2563EB] rounded-xl transition border border-[#E2E8F0] flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                          title="View Client"
                        >
                          <Eye size={13} />
                          View
                        </button>

                        {hasPermission("Client Management", "edit") && (
                          <button
                            onClick={() => {
                              localStorage.setItem("clientData", JSON.stringify({
                                clientId: client.clientId,
                                fullName: client.clientName,
                                email: client.emailId,
                                phone: client.contactNumber,
                                altPhone: client.altPhone || ""
                              }));
                              setShowEditModal(true);
                            }}
                            className="py-1.5 px-3 bg-[#F1F5F9] hover:bg-amber-50 text-[#0F172A] hover:text-amber-700 rounded-xl transition border border-[#E2E8F0] flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                            title="Edit Client"
                          >
                            <Edit3 size={13} />
                            Edit
                          </button>
                        )}

                        {hasPermission("Client Management", "delete") && (
                          <button
                            onClick={() => handleDelete(client.clientId)}
                            className="py-1.5 px-3 bg-[#F1F5F9] hover:bg-red-50 text-[#0F172A] hover:text-red-600 rounded-xl transition border border-[#E2E8F0] flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                            title="Delete Client"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState query={searchQuery} resetSearch={() => setSearchQuery("")} />
            )}
          </div>
        )}

        {/* VIEW 2: LIST VIEW (When viewMode === "list") */}
        {viewMode === "list" && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[#E2E8F0]">
          {loading ? (
            <div className="py-12 text-center text-[#64748B]">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#2563EB]" />
              <p className="text-xs">Loading client overview...</p>
            </div>
          ) : paginatedClients.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-3 px-4">Client Profile</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Court Room</th>
                  <th className="py-3 px-4 text-center">Cases</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {paginatedClients.map((client) => {
                  const initials = client.clientName ? client.clientName.charAt(0).toUpperCase() : "?";
                  const statusLower = (client.status || "").toLowerCase();
                  const isActive = statusLower === "active" || statusLower === "progress" || statusLower === "in progress";
                  const isClosed = statusLower === "closed" || statusLower === "inactive";

                  return (
                    <tr
                      key={client.clientId}
                      className="group hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {client.profileImage ? (
                            <img
                              src={client.profileImage}
                              alt={client.clientName}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs select-none shadow-xs shrink-0">
                              {initials}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-[#0F172A] text-xs block leading-tight">
                              {client.clientName}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-mono mt-0.5 block">{client.clientId}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-[#64748B]">
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={`tel:${client.contactNumber}`}
                            className="flex items-center gap-1.5 hover:text-[#2563EB] transition-colors"
                          >
                            <Phone size={10} className="text-[#94A3B8]" />
                            <span>{client.contactNumber}</span>
                          </a>
                          <a
                            href={`mailto:${client.emailId}`}
                            className="flex items-center gap-1.5 hover:text-[#2563EB] transition-colors truncate max-w-[180px]"
                            title={client.emailId}
                          >
                            <Mail size={10} className="text-[#94A3B8]" />
                            <span className="truncate">{client.emailId}</span>
                          </a>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs font-medium text-[#0F172A]">
                        {client.courtName}
                      </td>

                      <td className="py-3 px-4 text-xs text-center font-bold text-[#0F172A]">
                        <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] border border-[#E2E8F0]">
                          {client.activeCases}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              localStorage.setItem("clientData", JSON.stringify({
                                clientId: client.clientId,
                                fullName: client.clientName,
                                clientName: client.clientName,
                                email: client.emailId,
                                emailId: client.emailId,
                                phone: client.contactNumber,
                                contactNumber: client.contactNumber,
                                profileImage: client.profileImage || null,
                                caseStatus: client.status,
                                status: client.status,
                              }));
                              router.push("/client-management/view-history");
                            }}
                            title="View Client"
                            className="p-1.5 bg-[#F1F5F9] hover:bg-blue-50 text-[#0F172A] hover:text-[#2563EB] rounded-lg cursor-pointer transition border border-[#E2E8F0] flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Eye size={12} />
                            View
                          </button>

                          {hasPermission("Client Management", "edit") && (
                            <button
                              onClick={() => {
                                localStorage.setItem("clientData", JSON.stringify({
                                  clientId: client.clientId,
                                  fullName: client.clientName,
                                  email: client.emailId,
                                  phone: client.contactNumber,
                                  altPhone: client.altPhone || ""
                                }));
                                setShowEditModal(true);
                              }}
                              title="Edit Client"
                              className="p-1.5 bg-[#F1F5F9] hover:bg-amber-50 text-[#0F172A] hover:text-amber-700 rounded-lg cursor-pointer transition border border-[#E2E8F0] flex items-center gap-1 text-[11px] font-bold"
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                          )}

                          {hasPermission("Client Management", "delete") && (
                            <button
                              onClick={() => handleDelete(client.clientId)}
                              title="Delete Client"
                              className="p-1.5 bg-[#F1F5F9] hover:bg-red-50 text-[#0F172A] hover:text-red-600 rounded-lg cursor-pointer transition border border-[#E2E8F0] flex items-center gap-1 text-[11px] font-bold"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState query={searchQuery} resetSearch={() => setSearchQuery("")} />
          )}
        </div>

        {/* Mobile Responsive Cards (< md screens) */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="py-12 text-center text-[#64748B]">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#2563EB]" />
              <p className="text-xs">Loading clients...</p>
            </div>
          ) : paginatedClients.length > 0 ? (
            paginatedClients.map((client) => {
              const initials = client.clientName ? client.clientName.charAt(0).toUpperCase() : "?";
              const statusLower = (client.status || "").toLowerCase();
              const isActive = statusLower === "active" || statusLower === "progress" || statusLower === "in progress";

              return (
                <div
                  key={client.clientId}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-2.5">
                    <div className="flex items-center gap-2.5">
                      {client.profileImage ? (
                        <img
                          src={client.profileImage}
                          alt={client.clientName}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-[#0F172A] text-xs leading-tight">
                          {client.clientName}
                        </h3>
                        <span className="text-[10px] text-[#94A3B8] font-mono block mt-0.5">
                          {client.clientId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#64748B]">
                    <a
                      href={`tel:${client.contactNumber}`}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                    >
                      <Phone size={12} className="text-[#94A3B8]" />
                      <span>{client.contactNumber}</span>
                    </a>
                    <a
                      href={`mailto:${client.emailId}`}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] truncate"
                    >
                      <Mail size={12} className="text-[#94A3B8] shrink-0" />
                      <span className="truncate">{client.emailId}</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
                    <button
                      onClick={() => {
                        localStorage.setItem(
                          "clientData",
                          JSON.stringify({
                            clientId: client.clientId,
                            fullName: client.clientName,
                            clientName: client.clientName,
                            email: client.emailId,
                            emailId: client.emailId,
                            phone: client.contactNumber,
                            contactNumber: client.contactNumber,
                            caseStatus: client.status,
                            status: client.status,
                          })
                        );
                        router.push("/client-management/view-history");
                      }}
                      title="View Client"
                      className="flex-1 py-1.5 bg-[#F1F5F9] hover:bg-blue-50 text-[#0F172A] hover:text-[#2563EB] rounded-lg font-bold text-xs transition border border-[#E2E8F0] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye size={12} />
                      View
                    </button>

                    {hasPermission("Client Management", "edit") && (
                      <button
                        onClick={() => {
                          localStorage.setItem(
                            "clientData",
                            JSON.stringify({
                              clientId: client.clientId,
                              fullName: client.clientName,
                              email: client.emailId,
                              phone: client.contactNumber,
                              altPhone: client.altPhone || "",
                            })
                          );
                          setShowEditModal(true);
                        }}
                        className="flex-1 py-1.5 bg-[#F1F5F9] hover:bg-amber-50 text-[#0F172A] hover:text-amber-700 rounded-lg font-bold text-xs transition border border-[#E2E8F0] flex items-center justify-center gap-1"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    )}

                    {hasPermission("Client Management", "delete") && (
                      <button
                        onClick={() => handleDelete(client.clientId)}
                        className="py-1.5 px-2.5 bg-[#F1F5F9] hover:bg-red-50 text-[#0F172A] hover:text-red-600 rounded-lg font-bold text-xs transition border border-[#E2E8F0] flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState query={searchQuery} resetSearch={() => setSearchQuery("")} />
          )}
        </div>
        </>
        )}

        {/* Pagination Controls */}
        {filteredClients.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#64748B] font-semibold">
              Page {clientsPage + 1} of {totalPages} ({filteredClients.length} clients)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClientsPage((p) => Math.max(0, p - 1))}
                disabled={clientsPage === 0}
                className="flex items-center justify-center px-3 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer select-none font-bold text-xs"
              >
                &lt; Prev
              </button>
              <button
                onClick={() => setClientsPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={(clientsPage + 1) * ITEMS_PER_PAGE >= filteredClients.length}
                className="flex items-center justify-center px-3 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer select-none font-bold text-xs"
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div className="w-full max-w-2xl">
              <ClientEdit
                onSave={(updatedData) => {
                  fetchClients();
                  setShowEditModal(false);
                }}
                onCancel={() => {
                  setShowEditModal(false);
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirm Modal */}
      {deleteModal.show &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[10001] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center animate-scale-up">
              {deleteModal.type === "warning" && (
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 border border-amber-100 text-amber-500 mb-4 shadow-xs">
                  <AlertTriangle className="h-7 w-7" />
                </div>
              )}
              {deleteModal.type === "confirm" && (
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 border border-red-100 text-red-500 mb-4 shadow-xs">
                  <Trash2 className="h-7 w-7" />
                </div>
              )}
              {deleteModal.type === "success" && (
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-500 mb-4 shadow-xs">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
              )}
              {deleteModal.type === "error" && (
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 border border-red-100 text-red-500 mb-4 shadow-xs">
                  <XCircle className="h-7 w-7" />
                </div>
              )}

              <h3 className="text-lg font-bold text-[#0F172A] mb-2">
                {deleteModal.title}
              </h3>
              <p className="text-xs text-[#64748B] mb-6 px-2 whitespace-pre-line leading-relaxed">
                {deleteModal.message}
              </p>

              {deleteModal.type === "confirm" ? (
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteModal((prev) => ({ ...prev, show: false }))}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#0F172A] py-2.5 rounded-lg font-semibold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const clientId = deleteModal.clientId;
                      const clientName = deleteModal.clientName;
                      setDeleteModal((prev) => ({ ...prev, show: false }));

                      try {
                        const res = await fetch(`${API_BASE_URL}/case-management/`);
                        if (res.ok) {
                          const casesData = await res.json();
                          const targetName = clientName.trim().toLowerCase();
                          const clientCases = casesData.filter((c) => {
                            const itemClientName = (c.client_name || "").trim().toLowerCase();
                            return itemClientName === targetName;
                          });

                          for (const item of clientCases) {
                            await fetch(`${API_BASE_URL}/case-management/${item.id}`, {
                              method: "DELETE",
                            });
                          }

                          try {
                            await fetch(`${API_BASE_URL}/clients/${clientId}`, {
                              method: "DELETE",
                            });
                          } catch (err) {
                            console.error("Failed to delete client from /clients endpoint:", err);
                          }

                          setDeleteModal({
                            show: true,
                            type: "success",
                            title: "Client Deleted Successfully",
                            message: `Client "${clientName}" and associated case records have been removed.`
                          });
                          fetchClients();
                        } else {
                          throw new Error("Failed to fetch cases");
                        }
                      } catch (err) {
                        console.error("Error deleting client:", err);
                        setDeleteModal({
                          show: true,
                          type: "error",
                          title: "Deletion Failed",
                          message: "Failed to delete client. Please try again."
                        });
                      }
                    }}
                    className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold text-xs shadow-xs transition cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteModal((prev) => ({ ...prev, show: false }))}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-lg font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function StatCard({ label, value, subtext, icon, color, bg, iconBg }) {
  return (
    <div className={`${bg} rounded-2xl p-4 sm:p-5 border shadow-xs flex items-center justify-between`}>
      <div className="space-y-1">
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-wide block">{label}</span>
        <span className={`text-2xl sm:text-3xl font-extrabold block ${color}`}>{value}</span>
        <span className="text-[10px] text-[#64748B] block leading-tight">{subtext}</span>
      </div>
      <div className={`p-3 rounded-xl border border-transparent ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

function ActionCard({ title, desc, btnText, link, onClick, icon, iconBg }) {
  const content = (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between cursor-pointer group min-h-[120px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base text-[#0F172A] mb-1 tracking-tight">{title}</h3>
          <p className="text-xs text-[#64748B] leading-relaxed max-w-sm">
            {desc}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg || "bg-indigo-50"} shrink-0`}>
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer">
          <span>{btnText}</span>
          <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );

  if (onClick) {
    return <div onClick={onClick} className="w-full">{content}</div>;
  }

  return (
    <Link href={link} className="w-full">
      {content}
    </Link>
  );
}

function EmptyState({ query, resetSearch }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-12 h-12 bg-[#F1F5F9] text-[#64748B] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#E2E8F0]">
        <Users size={20} />
      </div>
      <h3 className="font-bold text-[#0F172A] text-sm mb-1">
        {query ? "No Matching Clients Found" : "No Client Registered"}
      </h3>
      <p className="text-xs text-[#64748B] max-w-xs mx-auto leading-relaxed mb-3">
        {query
          ? `No clients match your search term "${query}". Try resetting the search.`
          : "No client details have been recorded yet. Clients are derived automatically from active case records."}
      </p>
      {query && (
        <button
          onClick={resetSearch}
          className="px-3.5 py-1.5 bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-xl transition cursor-pointer"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}