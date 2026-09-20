"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useState, useEffect, useMemo } from "react";
import { Shield, ShieldAlert, Save, HelpCircle, Check, CheckSquare } from "lucide-react";

const DEFAULT_ROLES = [
  { id: "senioradvocate", name: "Senior Advocate", description: "Full system access" },
  { id: "junioradvocate", name: "Junior Advocate", description: "Limited access" },
  { id: "client", name: "Client", description: "Client access" },
  { id: "clerk", name: "Clerk", description: "Clerk access" }
];

const DEFAULT_USERS = [
  {
    id: "user_1",
    firstName: "Rahul",
    lastName: "Sharma",
    phone: "+91 98765 43210",
    username: "rahulsharma",
    email: "rahul@legaltech.com",
    role: "Senior Advocate",
    tempPassword: "temp_Rahul123!",
    customPermissions: {},
    documentAccess: []
  },
  {
    id: "user_2",
    firstName: "Priya",
    lastName: "Nair",
    phone: "+91 87654 32109",
    username: "priyanair",
    email: "priya@legaltech.com",
    role: "Junior Advocate",
    tempPassword: "temp_Priya456!",
    customPermissions: {},
    documentAccess: []
  },
  {
    id: "user_3",
    firstName: "Amit",
    lastName: "Verma",
    phone: "+91 76543 21098",
    username: "amitverma",
    email: "amit@legaltech.com",
    role: "Client",
    tempPassword: "temp_Amit789!",
    customPermissions: {},
    documentAccess: []
  }
];

const ACTIONS = ["view", "add", "edit", "delete"];

// All feature groups — used for Senior Advocate & Junior Advocate
const ALL_GROUPS = [
  {
    category: "Senior Advocate / Law Firm Features",
    modules: [
      { key: "Dashboard", label: "Dashboard" },
      { key: "Law Firm Management", label: "Law Firm Management" },
      { key: "Client Management", label: "Client Management" },
      { key: "Case Management", label: "Case Management" },
      { key: "Consultations", label: "Case Discussion (Senior)" },
      { key: "Finance Management", label: "Finance Management" },
      { key: "Calendar", label: "Calendar" },
      { key: "Assigned Tasks", label: "Assigned Tasks" },
      { key: "Profile", label: "Profile" },
      { key: "Leave Management", label: "Leave Management" },
      { key: "eCourts Integration", label: "eCourts Services" },
    ],
  },
  {
    category: "Junior Advocate Features",
    modules: [
      { key: "Junior Dashboard", label: "Dashboard (Junior)" },
      { key: "Assigned Cases", label: "Assigned Cases" },
      { key: "Junior Assigned Tasks", label: "Assigned Tasks (Junior)" },
      { key: "Junior Calendar", label: "Calendar (Junior)" },
      { key: "Junior Leave", label: "Junior Leave" },
    ],
  },
  {
    category: "Client Section Features",
    modules: [
      { key: "Client Dashboard", label: "Dashboard (Client)" },
      { key: "Consultation", label: "Case Discussion (Client)" },
      { key: "Case Tracking", label: "Case Tracking" },
      { key: "Documents", label: "Documents" },
      { key: "Payments", label: "Payments" },
    ],
  },
  {
    category: "System / Administration",
    modules: [
      { key: "User Roles", label: "User Roles" },
      { key: "Roles", label: "Roles" },
      { key: "Users", label: "Users" },
      { key: "Permissions", label: "Permissions" },
    ],
  },
  {
    category: "Clerk Features",
    modules: [
      { key: "Clerk Dashboard", label: "Dashboard (Clerk)" },
      { key: "Court Visit", label: "Court Visit" },
      { key: "Format Physical File", label: "Format Physical File" },
      { key: "Clerk Documents", label: "Documents (Clerk)" },
      { key: "Clerk Leave", label: "Clerk Leave" },
    ]
  }
];

// Client-only group
const CLIENT_GROUPS = [
  {
    category: "Client Section Features",
    modules: [
      { key: "Client Dashboard", label: "Dashboard (Client)" },
      { key: "Consultation", label: "Case Discussion (Client)" },
      { key: "Case Tracking", label: "Case Tracking" },
      { key: "Documents", label: "Documents" },
      { key: "Payments", label: "Payments" },
    ],
  },
];

const getGroupsForRole = (roleName) => {
  const normalized = (roleName || "").toLowerCase().replace(/\s+/g, "");
  if (normalized === "client") return CLIENT_GROUPS;
  return ALL_GROUPS; // Senior Advocate & Junior Advocate see all sections
};


// Pre-configured default permission matrices for standard roles
const DEFAULT_PERMISSIONS = {
  "Senior Advocate": {
    "Dashboard": { view: true, add: true, edit: true, delete: true },
    "Law Firm Management": { view: true, add: true, edit: true, delete: true },
    "Client Management": { view: true, add: true, edit: true, delete: true },
    "Case Management": { view: true, add: true, edit: true, delete: true },
    "Consultations": { view: true, add: true, edit: true, delete: true },
    "Calendar": { view: true, add: true, edit: true, delete: true },
    "Finance Management": { view: true, add: true, edit: true, delete: true },
    "Profile": { view: true, add: true, edit: true, delete: true },
    "Assigned Tasks": { view: true, add: true, edit: true, delete: true },
    "Junior Assigned Tasks": { view: true, add: true, edit: true, delete: true },
    "Junior Dashboard": { view: true, add: true, edit: true, delete: true },
    "Assigned Cases": { view: true, add: true, edit: true, delete: true },
    "Junior Calendar": { view: true, add: true, edit: true, delete: true },
    "Client Dashboard": { view: true, add: true, edit: true, delete: true },
    "Consultation": { view: true, add: true, edit: true, delete: true },
    "Case Tracking": { view: true, add: true, edit: true, delete: true },
    "Documents": { view: true, add: true, edit: true, delete: true },
    "Payments": { view: true, add: true, edit: true, delete: true },
    "User Roles": { view: true, add: true, edit: true, delete: true },
    "Roles": { view: true, add: true, edit: true, delete: true },
    "Users": { view: true, add: true, edit: true, delete: true },
    "Permissions": { view: true, add: true, edit: true, delete: true },
    "Clerk Dashboard": { view: true, add: true, edit: true, delete: true },
    "Court Visit": { view: true, add: true, edit: true, delete: true },
    "Format Physical File": { view: true, add: true, edit: true, delete: true },
    "Leave Management": { view: true, add: true, edit: true, delete: true },
    "Junior Leave": { view: true, add: true, edit: true, delete: true },
    "Clerk Leave": { view: true, add: true, edit: true, delete: true }
  },
  "Junior Advocate": {
    "Dashboard": { view: true, add: false, edit: false, delete: false },
    "Law Firm Management": { view: true, add: false, edit: false, delete: false },
    "Client Management": { view: true, add: false, edit: false, delete: false },
    "Case Management": { view: true, add: false, edit: false, delete: false },
    "Consultations": { view: true, add: false, edit: false, delete: false },
    "Calendar": { view: true, add: false, edit: false, delete: false },
    "Finance Management": { view: true, add: false, edit: false, delete: false },
    "Profile": { view: true, add: false, edit: true, delete: false },
    "Assigned Tasks": { view: false, add: false, edit: false, delete: false },
    "Junior Assigned Tasks": { view: true, add: true, edit: true, delete: true },
    "Junior Dashboard": { view: true, add: true, edit: true, delete: true },
    "Assigned Cases": { view: true, add: true, edit: true, delete: true },
    "Junior Calendar": { view: true, add: true, edit: true, delete: true },
    "Client Dashboard": { view: false, add: false, edit: false, delete: false },
    "Consultation": { view: false, add: false, edit: false, delete: false },
    "Case Tracking": { view: false, add: false, edit: false, delete: false },
    "Documents": { view: false, add: false, edit: false, delete: false },
    "Payments": { view: false, add: false, edit: false, delete: false },
    "User Roles": { view: false, add: false, edit: false, delete: false },
    "Roles": { view: false, add: false, edit: false, delete: false },
    "Users": { view: false, add: false, edit: false, delete: false },
    "Permissions": { view: false, add: false, edit: false, delete: false },
    "Clerk Dashboard": { view: false, add: false, edit: false, delete: false },
    "Court Visit": { view: false, add: false, edit: false, delete: false },
    "Format Physical File": { view: false, add: false, edit: false, delete: false },
    "Leave Management": { view: false, add: false, edit: false, delete: false },
    "Junior Leave": { view: true, add: true, edit: true, delete: false },
    "Clerk Leave": { view: false, add: false, edit: false, delete: false }
  },
  "Client": {
    "Dashboard": { view: false, add: false, edit: false, delete: false },
    "Law Firm Management": { view: false, add: false, edit: false, delete: false },
    "Client Management": { view: false, add: false, edit: false, delete: false },
    "Case Management": { view: false, add: false, edit: false, delete: false },
    "Consultations": { view: false, add: false, edit: false, delete: false },
    "Calendar": { view: false, add: false, edit: false, delete: false },
    "Finance Management": { view: false, add: false, edit: false, delete: false },
    "Profile": { view: true, add: false, edit: true, delete: false },
    "Assigned Tasks": { view: false, add: false, edit: false, delete: false },
    "Junior Assigned Tasks": { view: false, add: false, edit: false, delete: false },
    "Junior Dashboard": { view: false, add: false, edit: false, delete: false },
    "Assigned Cases": { view: false, add: false, edit: false, delete: false },
    "Junior Calendar": { view: false, add: false, edit: false, delete: false },
    "Client Dashboard": { view: true, add: true, edit: true, delete: true },
    "Consultation": { view: true, add: true, edit: true, delete: true },
    "Case Tracking": { view: true, add: true, edit: true, delete: true },
    "Documents": { view: true, add: true, edit: true, delete: true },
    "Payments": { view: true, add: true, edit: true, delete: true },
    "User Roles": { view: false, add: false, edit: false, delete: false },
    "Roles": { view: false, add: false, edit: false, delete: false },
    "Users": { view: false, add: false, edit: false, delete: false },
    "Permissions": { view: false, add: false, edit: false, delete: false },
    "Clerk Dashboard": { view: false, add: false, edit: false, delete: false },
    "Court Visit": { view: false, add: false, edit: false, delete: false },
    "Format Physical File": { view: false, add: false, edit: false, delete: false },
    "Leave Management": { view: false, add: false, edit: false, delete: false },
    "Junior Leave": { view: false, add: false, edit: false, delete: false },
    "Clerk Leave": { view: false, add: false, edit: false, delete: false }
  },
  "Clerk": {
    "Dashboard": { view: false, add: false, edit: false, delete: false },
    "Law Firm Management": { view: false, add: false, edit: false, delete: false },
    "Client Management": { view: false, add: false, edit: false, delete: false },
    "Case Management": { view: false, add: false, edit: false, delete: false },
    "Consultations": { view: false, add: false, edit: false, delete: false },
    "Calendar": { view: false, add: false, edit: false, delete: false },
    "Finance Management": { view: false, add: false, edit: false, delete: false },
    "Profile": { view: true, add: true, edit: true, delete: false },
    "Assigned Tasks": { view: false, add: false, edit: false, delete: false },
    "Junior Assigned Tasks": { view: false, add: false, edit: false, delete: false },
    "Junior Dashboard": { view: false, add: false, edit: false, delete: false },
    "Assigned Cases": { view: false, add: false, edit: false, delete: false },
    "Junior Calendar": { view: false, add: false, edit: false, delete: false },
    "Client Dashboard": { view: false, add: false, edit: false, delete: false },
    "Consultation": { view: false, add: false, edit: false, delete: false },
    "Case Tracking": { view: false, add: false, edit: false, delete: false },
    "Documents": { view: false, add: false, edit: false, delete: false },
    "Payments": { view: false, add: false, edit: false, delete: false },
    "User Roles": { view: false, add: false, edit: false, delete: false },
    "Roles": { view: false, add: false, edit: false, delete: false },
    "Users": { view: false, add: false, edit: false, delete: false },
    "Permissions": { view: false, add: false, edit: false, delete: false },
    "Clerk Dashboard": { view: true, add: true, edit: true, delete: true },
    "Court Visit": { view: true, add: true, edit: true, delete: true },
    "Format Physical File": { view: true, add: true, edit: true, delete: true },
    "Leave Management": { view: false, add: false, edit: false, delete: false },
    "Junior Leave": { view: true, add: false, edit: true, delete: false },
    "Clerk Leave": { view: true, add: true, edit: true, delete: true }
  }
};
;

export default function PermissionView() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [permissions, setPermissions] = useState({});
  const [notification, setNotification] = useState(null);

  // Load roles and permissions on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const resRoles = await fetch(`${API_BASE_URL}/permissions/roles`);
        if (resRoles.ok) {
          const rolesData = await resRoles.json();
          setRoles(rolesData);
          if (rolesData.length > 0) setSelectedRole(rolesData[0].name);
        } else {
          setRoles(DEFAULT_ROLES);
          setSelectedRole(DEFAULT_ROLES[0].name);
        }
      } catch (e) {
        setRoles(DEFAULT_ROLES);
        setSelectedRole(DEFAULT_ROLES[0].name);
      }

      try {
        const resPerms = await fetch(`${API_BASE_URL}/permissions`);
        if (resPerms.ok) {
          setPermissions(await resPerms.json());
        } else {
          setPermissions(DEFAULT_PERMISSIONS);
        }
      } catch (e) {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    };

    loadConfig();
  }, []);


  // Show toast utility
  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Active matrix is always the selected role's defaults
  const getActivePermissionsMatrix = () => permissions[selectedRole] || {};

  // Toggle a single checkbox
  const handlePermissionToggle = (module, action) => {
    if (!selectedRole) return;
    setPermissions((prev) => {
      const rolePerms = prev[selectedRole] || {};
      const modPerms = rolePerms[module] || { view: false, add: false, edit: false, delete: false };
      return {
        ...prev,
        [selectedRole]: {
          ...rolePerms,
          [module]: { ...modPerms, [action]: !modPerms[action] },
        },
      };
    });
  };

  // Toggle ALL actions for a module row
  const handleToggleModuleAll = (module) => {
    if (!selectedRole) return;
    const activeMatrix = getActivePermissionsMatrix();
    const modPerms = activeMatrix[module] || { view: false, add: false, edit: false, delete: false };
    const targetValue = ACTIONS.some(act => !modPerms[act]); // if any is off → turn all on
    const rolePerms = permissions[selectedRole] || {};
    setPermissions((prev) => ({
      ...prev,
      [selectedRole]: {
        ...rolePerms,
        [module]: { view: targetValue, add: targetValue, edit: targetValue, delete: targetValue },
      },
    }));
  };

  // Save role defaults to API
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/role/${selectedRole}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions[selectedRole] || {}),
      });
      if (res.ok) {
        showToast(`Default permissions for "${selectedRole}" saved!`);
        window.dispatchEvent(new Event("permissions_updated"));
      } else {
        showToast("Error saving permissions", "error");
      }
    } catch (err) {
      showToast("Unable to connect to backend", "error");
    }
  };

  const activeMatrix = getActivePermissionsMatrix();
  const activeGroups = getGroupsForRole(selectedRole);

  return (
    <div className="w-full space-y-4 sm:space-y-6 md:space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 sm:bottom-5 right-4 sm:right-5 left-4 sm:left-auto z-50 flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300 border animate-bounce max-w-sm ${
            notification.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          ) : (
            <CheckSquare size={20} className="text-emerald-600 flex-shrink-0" />
          )}
          <span className="font-semibold text-xs sm:text-sm leading-snug">{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 md:p-8">
        <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
          Permissions Management
        </h1>
        <p className="text-[#64748B] text-xs sm:text-sm md:text-base mt-1.5 font-medium leading-relaxed">
          Assign detailed module access rules and security level clearances per user role or specific users.
        </p>
      </div>

      {/* Interactive Role Card Selector */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Select Role to Configure
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
          {roles.map((role) => {
            const active = selectedRole === role.name;

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.name)}
                className={`flex flex-col text-left p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-200 cursor-pointer ${
                  active
                    ? "border-[#2563EB] bg-blue-50/25 ring-2 ring-[#2563EB]/10 shadow-sm"
                    : "border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${
                      active ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Shield size={16} />
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 mt-2.5 sm:mt-4 text-xs sm:text-sm truncate w-full">
                  {role.name}
                </h3>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-semibold truncate w-full">
                  {role.description || "No description provided"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Permissions Matrix Panel */}
      {selectedRole ? (
        <div className="bg-white rounded-2xl sm:rounded-[24px] border border-[#E2E8F0] p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-200/40">
          {/* Title and Save button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 mb-4 sm:mb-6 border-b border-[#E2E8F0] pb-4 sm:pb-6">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#0F172A] flex items-center gap-2">
                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-xl text-[#2563EB] shrink-0">
                  <ShieldAlert size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <span className="truncate">Default Permissions: {selectedRole}</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium leading-relaxed">
                Configure specific module rights and clearance levels. Click &quot;Save Permissions&quot; to commit changes.
              </p>
            </div>
            <button
              onClick={handleSavePermissions}
              className="w-full sm:w-auto bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase py-3 sm:py-3.5 px-6 sm:px-8 rounded-full cursor-pointer tracking-wider transition-all shadow-md shadow-blue-200/50 hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
            >
              <Save size={16} />
              <span>Save Permissions</span>
            </button>
          </div>

          {/* ─── Mobile View: Native Cards (< 640px) ─── */}
          <div className="block sm:hidden space-y-4">
            {activeGroups.map(({ category, modules }) => (
              <div key={category} className="space-y-3">
                <div className="bg-slate-100/90 px-3.5 py-2 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    {category}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {modules.map(({ key, label }) => {
                    const modPerms = activeMatrix[key] || { view: false, add: false, edit: false, delete: false };
                    const allSelected = ACTIONS.every((act) => modPerms[act]);
                    return (
                      <div
                        key={key}
                        className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3 hover:bg-white transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAll(key)}
                            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                              allSelected
                                ? "bg-white text-red-600 border border-red-200"
                                : "bg-white text-blue-600 border border-blue-200"
                            }`}
                          >
                            {allSelected ? "DESELECT" : "SELECT ALL"}
                          </button>
                        </div>

                        {/* 4 Action Checkbox Chips */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                          {ACTIONS.map((action) => {
                            const isChecked = !!modPerms[action];
                            return (
                              <button
                                type="button"
                                key={action}
                                onClick={() => handlePermissionToggle(key, action)}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                  isChecked
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <span className="capitalize">{action}</span>
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    isChecked
                                      ? "border-white bg-white/20"
                                      : "border-slate-300 bg-slate-50"
                                  }`}
                                >
                                  {isChecked && <Check size={12} className="text-white stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ─── Desktop & Tablet View: Table Matrix (>= 640px) ─── */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
            <table className="w-full border-collapse text-left min-w-[650px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-[#64748B] uppercase tracking-widest">Module Name</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="py-3.5 px-4 lg:px-6 text-xs font-bold text-[#64748B] uppercase tracking-widest text-center w-24 lg:w-28">
                      {action}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-[#64748B] uppercase tracking-widest text-center w-28">All</th>
                </tr>
              </thead>
              <tbody>
                {activeGroups.map(({ category, modules }) => (
                  <React.Fragment key={category}>
                    {/* Category header row */}
                    <tr>
                      <td
                        colSpan={6}
                        className="py-3 px-4 lg:px-6 font-bold text-[11px] uppercase tracking-[0.2em] text-[#64748B] bg-gradient-to-r from-[#F8FAFC] to-white border-y border-[#E2E8F0] border-l-4 border-l-[#2563EB]"
                      >
                        {category}
                      </td>
                    </tr>
                    {/* Module rows */}
                    {modules.map(({ key, label }) => {
                      const modPerms = activeMatrix[key] || { view: false, add: false, edit: false, delete: false };
                      const allSelected = ACTIONS.every(act => modPerms[act]);
                      return (
                        <tr key={key} className="hover:bg-[#F8FAFC] transition-colors duration-200 border-b border-[#F1F5F9] group/row">
                          <td className="py-3.5 px-4 lg:px-6 font-semibold text-[#1E293B] text-xs sm:text-sm pl-6 lg:pl-8 flex items-center gap-2.5 sm:gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1] group-hover/row:bg-[#2563EB] transition-colors" />
                            {label}
                          </td>
                          {ACTIONS.map((action) => (
                            <td key={action} className="py-3.5 px-4 lg:px-6 text-center">
                              <label className="relative inline-flex items-center justify-center cursor-pointer group/check">
                                <input
                                  type="checkbox"
                                  checked={modPerms[action] || false}
                                  onChange={() => handlePermissionToggle(key, action)}
                                  className="peer sr-only"
                                />
                                <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all duration-200 border 
                                  ${modPerms[action] 
                                    ? "bg-[#2563EB] border-[#2563EB] shadow-sm shadow-blue-500/30" 
                                    : "bg-white border-[#CBD5E1] group-hover/check:border-[#2563EB]"}
                                `}>
                                  {modPerms[action] && <Check size={13} className="text-white stroke-[3.5]" />}
                                </div>
                              </label>
                            </td>
                          ))}
                          <td className="py-3.5 px-4 lg:px-6 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAll(key)}
                              className={`text-[10px] sm:text-[11px] font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm
                                ${allSelected
                                  ? "bg-white text-[#EF4444] hover:bg-red-50 border border-red-200"
                                  : "bg-white text-[#2563EB] hover:bg-blue-50 border border-blue-200"
                                }`}
                            >
                              {allSelected ? "DESELECT" : "SELECT ALL"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-8 sm:p-12 text-center shadow-sm">
          <HelpCircle size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-sm sm:text-base">Select a user role</h3>
          <p className="text-slate-400 text-xs mt-1">
            Please click on any of the role cards above to configure permissions.
          </p>
        </div>
      )}
    </div>
  );
}