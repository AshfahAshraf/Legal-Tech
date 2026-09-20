"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  UserPlus, Key, Eye, EyeOff, RefreshCw, AlertTriangle,
  ShieldCheck, Mail, Phone, User, Check, X, FileText, Settings, Shield, Plus, Copy
} from "lucide-react";

const DEFAULT_ROLES = [
  { id: "senioradvocate", name: "Senior Advocate", description: "Full system access" },
  { id: "junioradvocate", name: "Junior Advocate", description: "Limited access" },
  { id: "client", name: "Client", description: "Client access" },
  { id: "clerk", name: "Clerk", description: "Clerk access" }
];



const ACTIONS = ["view", "add", "edit", "delete"];

// Base module keys (internal, used for localStorage storage)
const ALL_MODULES = [
  "Dashboard",
  "Junior Dashboard",
  "Client Dashboard",
  "Law Firm Management",
  "Client Management",
  "Case Management",
  "Consultations",
  "Finance Management",
  "Calendar",
  "Junior Calendar",
  "Profile",
  "Assigned Cases",
  "Assigned Tasks",
  "Junior Assigned Tasks",
  "Client Section",
  "Consultation",
  "Case Tracking",
  "Documents",
  "Payments",
  "User Roles",
  "Roles",
  "Users",
  "Permissions",
  "Clerk Dashboard",
  "Court Visit",
  "Format Physical File",
  "Clerk Documents",
  "Leave Management",
  "Junior Leave",
  "Clerk Leave",
  "eCourts Integration",
];

const SENIOR_JUNIOR_MODULES = [
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
    ]
  },
  {
    category: "Junior Advocate Features",
    modules: [
      { key: "Junior Dashboard", label: "Dashboard (Junior)" },
      { key: "Assigned Cases", label: "Assigned Cases" },
      { key: "Junior Assigned Tasks", label: "Assigned Tasks (Junior)" },
      { key: "Junior Calendar", label: "Calendar (Junior)" },
      { key: "Junior Leave", label: "Junior Leave" },
    ]
  },
  {
    category: "Client Section Features",
    modules: [
      { key: "Client Dashboard", label: "Dashboard (Client)" },
      { key: "Consultation", label: "Case Discussion (Client)" },
      { key: "Case Tracking", label: "Case Tracking" },
      { key: "Documents", label: "Documents" },
      { key: "Payments", label: "Payments" }
    ]
  },
  {
    category: "System / Administration",
    modules: [
      { key: "User Roles", label: "User Roles" },
      { key: "Roles", label: "Roles" },
      { key: "Users", label: "Users" },
      { key: "Permissions", label: "Permissions" }
    ]
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


const CLIENT_MODULES = [
  {
    category: "Client Section Features",
    modules: [
      { key: "Client Dashboard", label: "Dashboard (Client)" },
      { key: "Consultation", label: "Case Discussion (Client)" },
      { key: "Case Tracking", label: "Case Tracking" },
      { key: "Documents", label: "Documents" },
      { key: "Payments", label: "Payments" }
    ]
  }
];

const getModuleCategories = (roleName) => {
  const normalized = (roleName || "").toLowerCase().replace(/\s+/g, "");
  if (normalized === "client") return CLIENT_MODULES;
  return SENIOR_JUNIOR_MODULES; // Senior Advocate & Junior Advocate see all sections
};

const DEFAULT_DOCUMENTS = [
  { docId: "doc_1", name: "Smith v. State - Case Brief.pdf", type: "Case File", view: true, upload: true, edit: false, delete: false },
  { docId: "doc_2", name: "Land Title Deed - John Doe.pdf", type: "Property Document", view: true, upload: false, edit: false, delete: false },
  { docId: "doc_3", name: "Consultation Agreement - TechCorp.pdf", type: "Contract", view: true, upload: true, edit: true, delete: false },
  { docId: "doc_4", name: "Divorce Decree - Final.pdf", type: "Court Order", view: false, upload: false, edit: false, delete: false }
];

const findRolePermissions = (allPerms, roleName) => {
  if (!allPerms || !roleName) return {};
  const roleKey = Object.keys(allPerms).find(
    (k) => k.toLowerCase().replace(/\s+/g, "") === roleName.toLowerCase().replace(/\s+/g, "")
  );
  return roleKey ? allPerms[roleKey] : {};
};

export default function UsersView() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("All");
  const [rolePermissions, setRolePermissions] = useState({}); // default permissions per role

  // Advocate auto-fill states
  const [advocates, setAdvocates] = useState([]);
  const [selectedAdvocateId, setSelectedAdvocateId] = useState("");

  // Client auto-fill states
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");


  const [confirmPassword, setConfirmPassword] = useState("");

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [tempPassword, setTempPassword] = useState(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "temp_";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  });
  const [showPassword, setShowPassword] = useState(false);

  // Modal Details State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [modalTab, setModalTab] = useState("profile"); // 'profile', 'permissions', 'documents'

  // Modal Edit Fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [editCustomPerms, setEditCustomPerms] = useState({});
  const [editDocAccess, setEditDocAccess] = useState([]);

  const [notification, setNotification] = useState(null);

  const [mounted, setMounted] = useState(false);
  const [provisionedUser, setProvisionedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [deletedUsername, setDeletedUsername] = useState("");
  const [deletedUserRole, setDeletedUserRole] = useState("");

  // Helper to format role names dynamically for modal and button text
  const getRoleDisplayName = (roleName) => {
    if (!roleName) return "User";
    const lower = roleName.toLowerCase();
    if (lower.includes("senior")) return "Senior";
    if (lower.includes("junior") || lower.includes("client")) return "User";
    return roleName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper to resolve profile photo for any user (Client, Junior, Clerk, Senior)
  const getUserProfilePhoto = (u) => {
    if (!u) return null;
    if (u.profileImage) return u.profileImage;

    if (advocates && advocates.length > 0) {
      const uEmail = (u.email || "").toLowerCase().trim();
      const uName = (u.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const uFull = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");

      const found = advocates.find((a) => {
        const aEmail = (a.emailAddress || a.email_address || "").toLowerCase().trim();
        const aName = (a.advocateName || a.advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          (uEmail && aEmail && uEmail === aEmail) ||
          (uName && aName && (uName === aName || aName.includes(uName))) ||
          (uFull && aName && (uFull === aName || aName.includes(uFull)))
        );
      });

      if (found && (found.profileImage || found.profile_image)) {
        return found.profileImage || found.profile_image;
      }
    }

    try {
      const saved = typeof window !== "undefined" && localStorage.getItem("advocate_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.profileImage &&
          (parsed.emailAddress?.toLowerCase().trim() === u.email?.toLowerCase().trim() ||
           parsed.advocateName?.toLowerCase().replace(/[^a-z0-9]/g, "") === u.username?.toLowerCase().replace(/[^a-z0-9]/g, ""))
        ) {
          return parsed.profileImage;
        }
      }
    } catch (e) {}

    return null;
  };

  const getUserDisplayName = (u) => {
    if (!u) return "";
    const fn = (u.firstName || u.first_name || "").trim();
    const ln = (u.lastName || u.last_name || "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();
    return full || u.username || "User";
  };

  // Generate random password helper
  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "temp_";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(password);
  };

 

  // Load roles & users from backend on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const resRoles = await fetch(`${API_BASE_URL}/permissions/roles`);
        if (resRoles.ok) {
          const rolesData = await resRoles.json();
          setRoles(rolesData);
          if (rolesData.length > 0) {
            setSelectedRole(rolesData[0].name);
          }
        }
      } catch (e) {
        console.error("Error fetching roles", e);
        setRoles(DEFAULT_ROLES);
        if (DEFAULT_ROLES.length > 0) setSelectedRole(DEFAULT_ROLES[0].name);
      }

      try {
        const resUsers = await fetch(`${API_BASE_URL}/permissions/users`);
        if (resUsers.ok) {
          const usersData = await resUsers.json();
          setUsers(usersData);
        }
      } catch (e) {
        console.error("Error fetching users", e);
        setUsers(DEFAULT_USERS);
      }

      try {
        const resAdv = await fetch(`${API_BASE_URL}/lawfirm-management/`);
        if (resAdv.ok) {
          setAdvocates(await resAdv.json());
        }
      } catch (e) {
        console.error("Error fetching advocates", e);
      }

      try {
        const resCases = await fetch(`${API_BASE_URL}/case-management/`);
        if (resCases.ok) {
          const casesData = await resCases.json();
          const uniqueClientsMap = new Map();
          casesData.forEach(c => {
            const clientName = c.clientName || c.client_name;
            const emailId = c.emailId || c.email_id;
            const contactNumber = c.contactNumber || c.contact_number;

            if (clientName) {
              const key = `${clientName.trim().toLowerCase()}_${(emailId || "").trim().toLowerCase()}`;
              if (!uniqueClientsMap.has(key)) {
                uniqueClientsMap.set(key, {
                  id: key, // using composite key as unique id
                  clientName: clientName,
                  contactNumber: contactNumber || "",
                  emailId: emailId || ""
                });
              }
            }
          });
          setClients(Array.from(uniqueClientsMap.values()));
        }
      } catch (e) {
        console.error("Error fetching cases for clients", e);
      }
    };

    loadData();
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

  // Fetch global role permissions (used to pre-populate Direct Permissions)
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/permissions`);
        if (res.ok) {
          setRolePermissions(await res.json());
        }
      } catch (e) {
        // silently ignore — checkboxes will just start empty
      }
    };
    loadPermissions();
  }, []);

  // Show notification toast helper
  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle Provisioning
  const handleProvisionUser = async (e) => {
    e.preventDefault();

    if (!selectedRole) {
      showToast("Please select a role from the tabs above", "error");
      return;
    }
    if (!firstName.trim()) {
      showToast("Full name is required", "error");
      return;
    }
    if (!phoneNumber.trim()) {
      showToast("Phone number is required", "error");
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(phoneNumber.trim())) {
      showToast("Please enter a valid Indian mobile number", "error");
      return;
    }
    if (!username.trim()) {
      showToast("Username is required", "error");
      return;
    }
    if (!emailAddress.trim()) {
      showToast("Email address is required", "error");
      return;
    }
    if (!tempPassword.trim()) {
      showToast("Temporary password is required", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/permissions/users/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: "",
          phone: phoneNumber.trim(),
          username: username.trim(),
          email: emailAddress.trim(),
          role: selectedRole,
          tempPassword: tempPassword
        })
      });

      if (res.ok) {
        const newUser = await res.json();
        setUsers((prev) => [...prev, newUser]);

        // Show success modal overlaying the page
        setProvisionedUser(newUser);

        // Reset Form
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setUsername("");
        setEmailAddress("");
        generateRandomPassword();
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Error provisioning user", "error");
      }
    } catch (err) {
      showToast("Unable to connect to the backend", "error");
    }
  };

  // Cancel form edits
  const handleCancel = () => {
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
    setUsername("");
    setEmailAddress("");
    generateRandomPassword();
    showToast("Provisioning cancelled", "error");
  };

  // Trigger Delete Confirmation Modal — fetch impact first
  const handleDeleteUserClick = async (userId, uName, uRole) => {
    if (userId === "user_1" || userId === 1 || uName === "admin") {
      showToast("Cannot delete system administration user", "error");
      return;
    }
    setImpactLoading(true);
    setDeleteImpact(null);
    setDeleteTarget({ id: userId, username: uName, role: uRole });
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/users/${userId}/delete-impact`);
      if (res.ok) {
        const impact = await res.json();
        setDeleteImpact(impact);
      } else {
        setDeleteImpact({ has_impact: false, assigned_cases: [], cases: [], total: 0 });
      }
    } catch (_) {
      setDeleteImpact({ has_impact: false, assigned_cases: [], cases: [], total: 0 });
    } finally {
      setImpactLoading(false);
    }
  };

  // Execute Deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, username, role } = deleteTarget;
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/users/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setDeleteTarget(null);
        setDeletedUsername(username);
        setDeletedUserRole(role || "");
      } else {
        const errData = await res.json();
        showToast(errData.detail || `Error de-provisioning ${getRoleDisplayName(role).toLowerCase()}`, "error");
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast("Unable to connect to backend", "error");
      setDeleteTarget(null);
    }
  };

  // Modal actions — fetch fresh role permissions every time modal opens
  const handleOpenDetails = async (user) => {
    setActiveUser(user);
    const fullName = [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(" ").trim() || user.username || "";
    setEditFirstName(fullName);
    setEditLastName(user.lastName || user.last_name || "");
    setEditPhone(user.phone || "");
    setEditUsername(user.username || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setConfirmPassword("");

    setEditDocAccess(user.documentAccess && user.documentAccess.length > 0
      ? user.documentAccess
      : DEFAULT_DOCUMENTS
    );

    // Always fetch latest role permissions from API to stay in sync with PermissionView
    try {
      const res = await fetch(`${API_BASE_URL}/permissions`);
      let basePerms = {};
      if (res.ok) {
        const freshPerms = await res.json();
        setRolePermissions(freshPerms); // also update cached state
        basePerms = findRolePermissions(freshPerms, user.role);
      } else {
        basePerms = findRolePermissions(rolePermissions, user.role);
      }

      const hasCustom = user.customPermissions && Object.keys(user.customPermissions).length > 0;
      if (hasCustom) {
        // Deep merge role defaults with user's custom overrides
        const merged = JSON.parse(JSON.stringify(basePerms));
        for (const mod in user.customPermissions) {
          merged[mod] = { ...(merged[mod] || {}), ...user.customPermissions[mod] };
        }
        setEditCustomPerms(merged);
      } else {
        setEditCustomPerms(basePerms);
      }
    } catch (_) {
      const fallbackBase = findRolePermissions(rolePermissions, user.role);
      const hasCustom = user.customPermissions && Object.keys(user.customPermissions).length > 0;
      if (hasCustom) {
        const merged = JSON.parse(JSON.stringify(fallbackBase));
        for (const mod in user.customPermissions) {
          merged[mod] = { ...(merged[mod] || {}), ...user.customPermissions[mod] };
        }
        setEditCustomPerms(merged);
      } else {
        setEditCustomPerms(fallbackBase);
      }
    }

    setModalTab("profile");
    setIsDetailsOpen(true);
  };


  const handleSaveModal = async () => {
    if (!editUsername.trim() || !editEmail.trim()) {
      showToast("Username and email are required", "error");
      return;
    }
    if (editPassword && editPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    try {
      // Fetch fresh role defaults to compute diff
      let currentRolePerms = {};
      try {
        const resRole = await fetch(`${API_BASE_URL}/permissions`);
        if (resRole.ok) {
          const allPerms = await resRole.json();
          currentRolePerms = findRolePermissions(allPerms, activeUser.role);
        }
      } catch (_) {
        currentRolePerms = findRolePermissions(rolePermissions, activeUser.role);
      }

      // Compute diff: Only save what differs from the global role defaults
      const diffPerms = {};
      for (const mod in editCustomPerms) {
        const modPerms = editCustomPerms[mod];
        const baseModPerms = currentRolePerms[mod] || { view: false, add: false, edit: false, delete: false };

        let hasDiff = false;
        for (const act of ["view", "add", "edit", "delete"]) {
          if (modPerms[act] !== baseModPerms[act]) {
            hasDiff = true;
          }
        }
        if (hasDiff) {
          diffPerms[mod] = { ...modPerms };
        }
      }

      const nameParts = editFirstName.trim().split(" ");
      const fName = nameParts[0] || editFirstName.trim();
      const lName = nameParts.slice(1).join(" ") || editLastName.trim();

      const res = await fetch(`${API_BASE_URL}/permissions/users/${activeUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fName,
          lastName: lName,
          phone: editPhone.trim(),
          username: editUsername.trim(),
          email: editEmail.trim(),
          customPermissions: diffPerms,
          documentAccess: editDocAccess,
          password: editPassword || null,
          confirmPassword: confirmPassword || null,
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers((prev) => prev.map((u) => u.id === activeUser.id ? updatedUser : u));
        showToast("User details and overrides updated successfully!");
        window.dispatchEvent(new Event("permissions_updated"));
        setIsDetailsOpen(false);
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Error updating user details", "error");
      }
    } catch (err) {
      showToast("Unable to connect to backend", "error");
    }
  };

  // Toggle custom permission in details modal
  const handleCustomPermissionToggle = (module, action) => {
    setEditCustomPerms((prev) => {
      const modulePermissions = prev[module] || {
        view: false,
        add: false,
        edit: false,
        delete: false,
      };

      return {
        ...prev,
        [module]: {
          ...modulePermissions,
          [action]: !modulePermissions[action],
        },
      };
    });
  };



  return (
    <div className="w-full space-y-6 md:space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all duration-300 border animate-bounce ${notification.type === "error"
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle size={20} className="text-red-500" />
          ) : (
            <ShieldCheck size={20} className="text-emerald-600" />
          )}
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Main card containing Creation panel */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] p-4 sm:p-6 md:p-8 shadow-sm">
        {/* Page Header */}
        <div className="mb-6 sm:mb-10 pb-4 sm:pb-6 border-b border-slate-100">
          <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
            Users Management
          </h1>
        </div>
        {/* Form header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center shrink-0">
            <UserPlus size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Create New User
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Provision user credentials and map their security role
            </p>
          </div>
        </div>

        {/* Dynamic role selection tabs */}
        <div className="mb-6 sm:mb-8">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5 sm:mb-3">
            Select User Role Tab
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {roles.map((role) => {
              const active = selectedRole === role.name;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.name)}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${active
                    ? "bg-[#2563EB] text-white shadow-md shadow-blue-200/50 hover:bg-blue-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                >
                  {role.name}
                </button>
              );
            })}

            {/* NEW role button */}
            <button
              type="button"
              onClick={() => router.push("/permissions/roles")}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50/50 transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} />
              <span>NEW</span>
            </button>
          </div>
        </div>

        {/* User Details Form */}
        <form onSubmit={handleProvisionUser} className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">

            {/* First Name (Dynamic based on Role) */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Full Name *
              </label>
              {(selectedRole || "").toUpperCase().includes("CLERK") ? (
                <select
                  value={selectedAdvocateId}
                  onChange={(e) => {
                    const advId = e.target.value;
                    setSelectedAdvocateId(advId);
                    if (!advId) {
                      setFirstName("");
                      setLastName("");
                      setPhoneNumber("");
                      setEmailAddress("");
                      setUsername("");
                      setTempPassword("");
                      return;
                    }
                    const adv = advocates.find(a => a.id.toString() === advId);
                    if (adv) {
                      const nameParts = (adv.advocateName || adv.advocate_name || "").trim().split(" ");
                      setFirstName(nameParts[0] || "");
                      setLastName(nameParts.slice(1).join(" ") || "Clerk");
                      setPhoneNumber(adv.phoneNumber || adv.phone_number || "");
                      setEmailAddress(adv.emailAddress || adv.email_address || "");
                      const baseUsername = (adv.advocateName || adv.advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      setUsername(baseUsername);
                      setTempPassword(adv.tempPassword || "");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium cursor-pointer"
                  required
                >
                  <option value="">-- Select Clerk --</option>
                  {(() => {
                    const clerks = advocates.filter((adv) => (adv.role || "").toLowerCase().includes("clerk"));
                    if (clerks.length === 0) {
                      return <option value="" disabled>No Clerks added in Law Firm Management</option>;
                    }
                    return clerks.map((adv) => {
                      const advName = adv.advocateName || adv.advocate_name || "Unknown Clerk";
                      return (
                        <option key={adv.id} value={adv.id}>
                          {advName} ({adv.role || "Clerk"})
                        </option>
                      );
                    });
                  })()}
                </select>
              ) : (selectedRole || "").toUpperCase().includes("ADVOCATE") ? (
                <select
                  value={selectedAdvocateId}
                  onChange={(e) => {
                    const advId = e.target.value;
                    setSelectedAdvocateId(advId);
                    if (!advId) {
                      setFirstName("");
                      setLastName("");
                      setPhoneNumber("");
                      setEmailAddress("");
                      setUsername("");
                      setTempPassword("");
                      return;
                    }
                    const adv = advocates.find(a => a.id.toString() === advId);
                    if (adv) {
                      const nameParts = (adv.advocateName || adv.advocate_name || "").trim().split(" ");
                      setFirstName(nameParts[0] || "");
                      setLastName(nameParts.slice(1).join(" ") || "Advocate");
                      setPhoneNumber(adv.phoneNumber || adv.phone_number || "");
                      setEmailAddress(adv.emailAddress || adv.email_address || "");
                      const baseUsername = (adv.advocateName || adv.advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      setUsername(baseUsername);
                      setTempPassword(adv.tempPassword || "");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium cursor-pointer"
                  required
                >
                  <option value="">-- Select Advocate --</option>
                  {advocates
                    .filter((adv) => {
                      const r = (adv.role || "").toLowerCase();
                      const selR = (selectedRole || "").toLowerCase();
                      if (selR.includes("junior")) return r.includes("junior");
                      if (selR.includes("senior")) return r.includes("senior");
                      return !r.includes("clerk");
                    })
                    .map((adv) => {
                      const advName = adv.advocateName || adv.advocate_name || "Unknown Advocate";
                      return (
                        <option key={adv.id} value={adv.id}>
                          {advName} ({adv.role || "Advocate"})
                        </option>
                      );
                    })}
                </select>
              ) : (selectedRole || "").toUpperCase().includes("CLIENT") ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedClientId(cId);
                    if (!cId) {
                      setFirstName("");
                      setLastName("");
                      setPhoneNumber("");
                      setEmailAddress("");
                      setUsername("");
                      return;
                    }
                    const client = clients.find(c => c.id === cId);
                    if (client) {
                      const nameParts = (client.clientName || "").trim().split(" ");
                      setFirstName(nameParts[0] || "");
                      setLastName(nameParts.slice(1).join(" ") || "Client");
                      setPhoneNumber(client.contactNumber || "");
                      setEmailAddress(client.emailId || "");
                      const baseUsername = (client.clientName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      setUsername(baseUsername);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium cursor-pointer"
                  required
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((client) => {
                    const cName = client.clientName || "Unknown Client";
                    return (
                      <option key={client.id} value={client.id}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-800 placeholder:text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium"
                />
              )}
            </div>



            {/* Phone Number */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Phone Number *
                </label>
                {Boolean(selectedAdvocateId || selectedClientId) && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                    Auto-Fetched
                  </span>
                )}
              </div>

              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  if (selectedAdvocateId || selectedClientId) return;
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) setPhoneNumber(value);
                }}
                readOnly={Boolean(selectedAdvocateId || selectedClientId)}
                maxLength={10}
                required
                placeholder={selectedAdvocateId || selectedClientId ? "Auto-fetched phone number" : "Enter phone number"}
                className={`w-full rounded-xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all ${
                  (selectedAdvocateId || selectedClientId)
                    ? "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] cursor-not-allowed select-none font-bold"
                    : "bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB]"
                }`}
              />

              {phoneNumber &&
                !/^[6-9][0-9]{9}$/.test(phoneNumber) && (
                  <p className="mt-2 text-xs font-medium text-red-500">
                    Enter a valid Indian mobile number
                  </p>
                )}
            </div>

            {/* Username */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Username *
                </label>
                {Boolean(selectedAdvocateId || selectedClientId) && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                    Auto-Fetched
                  </span>
                )}
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  if (selectedAdvocateId || selectedClientId) return;
                  setUsername(e.target.value);
                }}
                readOnly={Boolean(selectedAdvocateId || selectedClientId)}
                required
                placeholder={selectedAdvocateId || selectedClientId ? "Auto-fetched username" : "Enter username"}
                className={`w-full rounded-xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all ${
                  (selectedAdvocateId || selectedClientId)
                    ? "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] cursor-not-allowed select-none font-bold"
                    : "bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB]"
                }`}
              />
            </div>

            {/* Email Address */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email Address *
                </label>
                {Boolean(selectedAdvocateId || selectedClientId) && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                    Auto-Fetched
                  </span>
                )}
              </div>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => {
                  if (selectedAdvocateId || selectedClientId) return;
                  setEmailAddress(e.target.value);
                }}
                readOnly={Boolean(selectedAdvocateId || selectedClientId)}
                required
                placeholder={selectedAdvocateId || selectedClientId ? "Auto-fetched email address" : "Enter email address"}
                className={`w-full rounded-xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all ${
                  (selectedAdvocateId || selectedClientId)
                    ? "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] cursor-not-allowed select-none font-bold"
                    : "bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB]"
                }`}
              />
            </div>

            {/* Temp Password */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Temp Password *
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3.5 sm:pl-4 pr-24 py-2.5 sm:py-3 text-slate-800 placeholder:text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-50">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#2563EB] text-white hover:bg-blue-700 text-xs font-bold uppercase rounded-full cursor-pointer tracking-wider transition-all shadow-md shadow-blue-200/50 active:scale-95 flex items-center justify-center gap-2 text-center"
            >
              <Check size={16} />
              <span>Provision {getRoleDisplayName(selectedRole)}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-full cursor-pointer tracking-wider transition-all flex items-center justify-center text-center"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Provisioned Users Table / Mobile Cards */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Active Provisioned Users
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {(() => {
                const filteredUsers = filterRole === "All" ? users : users.filter(u => u.role === filterRole);
                return `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} available`;
              })()}
            </p>
          </div>

          {/* Role Filter Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2 sm:py-2.5 text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-bold cursor-pointer"
            >
              <option value="All">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Mobile View: Native Card List (< 640px) ─── */}
        <div className="block sm:hidden p-4 space-y-3">
          {(() => {
            const filteredUsers = filterRole === "All" ? users : users.filter(u => u.role === filterRole);
            if (filteredUsers.length === 0) {
              return (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No users available</p>
                </div>
              );
            }
            return filteredUsers.map((user, idx) => {
              const avatarColors = [
                "bg-indigo-600",
                "bg-blue-600",
                "bg-emerald-600",
                "bg-violet-600",
                "bg-rose-600",
              ];
              const avatarBg = avatarColors[idx % avatarColors.length];
              const photo = getUserProfilePhoto(user);

              return (
                <div
                  key={user.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={user.username}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-100 shadow-sm shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold shrink-0 text-sm`}
                        >
                          {getUserDisplayName(user)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {getUserDisplayName(user)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 mt-1">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleOpenDetails(user)}
                      className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all text-center shadow-xs cursor-pointer active:scale-95"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteUserClick(user.id, user.username, user.role)}
                      className="py-2 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all text-center border border-red-100 cursor-pointer active:scale-95"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* ─── Desktop & Tablet View: Table (>= 640px) ─── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase">
                  Profile Name
                </th>
                <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase">
                  Role
                </th>
                <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase text-center">
                  Status
                </th>
                <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {(() => {
                const filteredUsers = filterRole === "All" ? users : users.filter(u => u.role === filterRole);
                if (filteredUsers.length === 0) {
                  return (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                        No users available
                      </td>
                    </tr>
                  );
                }
                return filteredUsers.map((user, idx) => {
                  const avatarColors = [
                    "bg-indigo-600",
                    "bg-blue-600",
                    "bg-emerald-600",
                    "bg-violet-600",
                    "bg-rose-600",
                  ];

                  const avatarBg = avatarColors[idx % avatarColors.length];

                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">

                      {/* Profile */}
                      <td className="py-3.5 px-4 lg:px-6">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const photo = getUserProfilePhoto(user);
                            if (photo) {
                              return (
                                <img
                                  src={photo}
                                  alt={user.username}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 shadow-sm shrink-0"
                                />
                              );
                            }
                            return (
                              <div
                                className={`w-10 h-10 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold shrink-0`}
                              >
                                {getUserDisplayName(user)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            );
                          })()}

                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {getUserDisplayName(user)}
                            </p>
                            <p className="text-xs text-slate-400">@{user.username}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{user.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 lg:px-6">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 lg:px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 lg:px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(user)}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteUserClick(user.id, user.username, user.role)}
                            className="px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Edit Info & Direct Override Modal ─── */}
      {mounted && typeof window !== "undefined" && isDetailsOpen && activeUser ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto"
          onClick={() => setIsDetailsOpen(false)}
        >
          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 my-auto max-h-[90vh]"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-8 py-5 sm:py-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  {(() => {
                    const photo = getUserProfilePhoto(activeUser);
                    if (photo) {
                      return (
                        <img
                          src={photo}
                          alt={editUsername}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-white/20 shadow-md shrink-0"
                        />
                      );
                    }
                    const modalFullName = [editFirstName, editLastName].filter(Boolean).join(" ").trim() || editUsername;
                    return (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-lg sm:text-xl font-bold shrink-0">
                        {(modalFullName || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    );
                  })()}

                  <div>
                    <h3 className="text-white font-bold text-xl sm:text-2xl">
                      {[editFirstName, editLastName].filter(Boolean).join(" ") || editUsername}
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm">@{editUsername}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-white/10 text-white border border-white/20">
                        {activeUser.role}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Info strip */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-6 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Mail size={12} />
                  {editEmail}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Phone size={12} />
                  {editPhone || "No phone"}
                </div>

                {activeUser?.tempPassword && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Key size={12} />
                    <span>Temp Pwd: <strong className="text-white select-all">{activeUser.tempPassword}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-slate-100 bg-white px-4 sm:px-6 gap-2 overflow-x-auto">
              {[
                { key: "profile", icon: <User size={15} />, label: "Profile Info" },
                {
                  key: "permissions",
                  icon: <Settings size={15} />,
                  label: "Direct Permissions",
                }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setModalTab(tab.key)}
                  className={`flex items-center gap-2 py-3 sm:py-4 px-4 sm:px-5 text-xs font-bold uppercase border-b-2 whitespace-nowrap ${modalTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className={`max-h-[50vh] sm:max-h-[60vh] bg-slate-50 ${modalTab === "permissions" ? "overflow-hidden" : "overflow-y-auto"}`}>

              {/* Profile */}
              {modalTab === "profile" && (
                <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {[
                    ["Full Name", editFirstName, setEditFirstName],
                    ["Phone Number", editPhone, setEditPhone],
                    ["Username", editUsername, setEditUsername],
                    ["Email Address", editEmail, setEditEmail],
                  ].map(([label, value, setter]) => (

                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
                          {label}
                        </label>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                          Auto-Fetched
                        </span>
                      </div>
                      <input
                        value={value}
                        readOnly
                        title="Auto-fetched system detail — non-editable"
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3.5 sm:px-4 py-2.5 sm:py-3.5 text-[#475569] font-bold outline-none cursor-not-allowed select-none text-xs sm:text-sm"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-2 block">
                      New Password (Optional)
                    </label>

                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 sm:px-4 py-2.5 sm:py-3.5 pr-12 text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 flex items-center justify-center"
                        title={showEditPassword ? "Hide password" : "Show password"}
                      >
                        {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-2 block">
                      Confirm New Password
                    </label>

                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 sm:px-4 py-2.5 sm:py-3.5 pr-12 text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 flex items-center justify-center"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct Permissions Tab */}
              {modalTab === "permissions" && (
                <div className="h-full flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Direct User Permissions</h4>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Modifying checkboxes here overrides default role permissions specifically for <strong>@{editUsername}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {getModuleCategories(activeUser.role).map((cat) => (
                      <div key={cat.category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                        <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200">
                          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{cat.category}</span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {cat.modules.map((mod) => {
                            const perms = editCustomPerms[mod.key] || { view: false, add: false, edit: false, delete: false };
                            return (
                              <div key={mod.key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50">
                                <div>
                                  <span className="font-bold text-slate-800 text-xs sm:text-sm">{mod.label}</span>
                                  <span className="block text-[10px] text-slate-400">Key: {mod.key}</span>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                  {ACTIONS.map((act) => (
                                    <label key={act} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!!perms[act]}
                                        onChange={() => handleCustomPermissionToggle(mod.key, act)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                      />
                                      <span className="capitalize text-[11px]">{act}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-8 py-3.5 sm:py-4 border-t border-[#E2E8F0] bg-white flex flex-col-reverse xs:flex-row sm:flex-row justify-end gap-2.5 sm:gap-4 rounded-b-3xl">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-bold uppercase tracking-wider transition-colors text-center"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveModal}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-center"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* ─── Success Modal for Provisioned User ─── */}
      {mounted && typeof window !== "undefined" && provisionedUser ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-6 overflow-y-auto"
          onClick={() => setProvisionedUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            {/* Header Success Section */}
            <div className="bg-emerald-50 py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center border-b border-slate-100 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg shadow-emerald-200">
                <Check size={28} className="sm:w-8 sm:h-8" strokeWidth={3} />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl sm:text-2xl text-center">
                Create New {getRoleDisplayName(provisionedUser.role)} Successfully
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium max-w-xs text-center leading-relaxed">
                A new {getRoleDisplayName(provisionedUser.role).toLowerCase()} account has been successfully created and linked with the mapped security role.
              </p>
            </div>

            {/* Info Section */}
            <div className="p-4 sm:p-6 space-y-4 text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Role</span>
                  <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded text-xs inline-block mt-1">
                    {provisionedUser.role}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Full Name</span>
                  <span className="text-slate-800 font-semibold block mt-1">
                    {provisionedUser.firstName || "-"} {provisionedUser.lastName || ""}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Username</span>
                  <span className="text-slate-800 font-semibold block mt-1">
                    @{provisionedUser.username}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Email Address</span>
                  <span className="text-slate-800 font-semibold block mt-1 truncate">
                    {provisionedUser.email}
                  </span>
                </div>
              </div>

              {/* Temporary Password Box */}
              <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-100">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Temporary Password
                </span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[#2563EB] font-bold text-xs sm:text-sm select-all truncate">
                    {provisionedUser.tempPassword}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(provisionedUser.tempPassword);
                      showToast("Password copied to clipboard!");
                    }}
                    className="text-[10px] font-extrabold uppercase bg-blue-50 hover:bg-blue-100 text-[#2563EB] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setProvisionedUser(null)}
                className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white text-xs font-bold uppercase py-3 px-6 rounded-full cursor-pointer tracking-wider transition-all shadow-md active:scale-95 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* ─── Custom Delete Confirmation Modal ─── */}
      {mounted && typeof window !== "undefined" && deleteTarget ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-6 overflow-y-auto"
          onClick={() => { setDeleteTarget(null); setDeleteImpact(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            {/* Header / Warning Icon */}
            <div className="bg-red-50 py-6 sm:py-7 px-4 sm:px-6 flex flex-col items-center border-b border-slate-100 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg shadow-red-200 animate-pulse">
                <AlertTriangle size={28} className="sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl sm:text-2xl text-center">
                Delete {getRoleDisplayName(deleteTarget.role)} Account?
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium max-w-xs text-center leading-relaxed">
                Remove <strong className="text-red-600">@{deleteTarget.username}</strong>? This action cannot be undone.
              </p>
            </div>

            {/* Impact Warning Section */}
            {impactLoading ? (
              <div className="px-4 sm:px-6 py-5 flex items-center justify-center gap-2 text-slate-500 text-xs sm:text-sm">
                <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Checking active cases...</span>
              </div>
            ) : deleteImpact && deleteImpact.has_impact ? (
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={13} className="text-amber-600" />
                  </div>
                  <p className="text-amber-700 font-bold text-xs sm:text-sm">
                    {deleteImpact.total} active {deleteImpact.total === 1 ? "case" : "cases"} still in progress
                  </p>
                </div>
                <p className="text-slate-500 text-xs mb-3">
                  These cases will remain but the advocate / client assignment will be cleared:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {[...( deleteImpact.assigned_cases || []).map(c => ({
                    name: c.case_name,
                    number: c.case_number,
                    status: c.status,
                    sub: c.client_name || c.advocate_name
                  })), ...(deleteImpact.cases || []).map(c => ({
                    name: c.title,
                    number: c.case_no,
                    status: c.status,
                    sub: c.client_name
                  }))].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
                          <FileText size={13} className="text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{item.number}{item.sub ? ` · ${item.sub}` : ""}</p>
                        </div>
                      </div>
                      <span className="ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : deleteImpact && !deleteImpact.has_impact ? (
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3">
                  <Check size={15} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-xs font-semibold">No active cases linked to this user.</p>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-slate-50 flex flex-col-reverse xs:flex-row sm:flex-row gap-2.5 sm:gap-3 justify-end">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteImpact(null); }}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={impactLoading}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer text-center"
              >
                {deleteImpact && deleteImpact.has_impact ? "Confirm Delete" : `Delete ${getRoleDisplayName(deleteTarget.role)}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* ─── Delete Success Modal ─── */}
      {mounted && typeof window !== "undefined" && deletedUsername ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-6 overflow-y-auto"
          onClick={() => {
            setDeletedUsername("");
            setDeletedUserRole("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            {/* Header Success Section */}
            <div className="bg-red-50 py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center border-b border-slate-100 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg shadow-red-200">
                <Check size={28} className="sm:w-8 sm:h-8" strokeWidth={3} />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl sm:text-2xl text-center">
                Delete {getRoleDisplayName(deletedUserRole)} Successfully
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium max-w-xs text-center leading-relaxed">
                The {getRoleDisplayName(deletedUserRole).toLowerCase()} account <strong className="text-slate-900">@{deletedUsername}</strong> has been completely de-provisioned and deleted from the database.
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => {
                  setDeletedUsername("");
                  setDeletedUserRole("");
                }}
                className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white text-xs font-bold uppercase py-3 px-6 rounded-full cursor-pointer tracking-wider transition-all shadow-md active:scale-95 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
