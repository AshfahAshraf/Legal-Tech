"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Shield, Info, AlertTriangle, Check } from "lucide-react";
import { createPortal } from "react-dom";

const DEFAULT_ROLES = [
  { id: "senioradvocate", name: "Senior Advocate", description: "Full system access" },
  { id: "junioradvocate", name: "Junior Advocate", description: "Limited access" },
  { id: "client", name: "Client", description: "Client access" },
  { id: "clerk", name: "Clerk", description: "Clerk access" }
];

export default function RolesView() {
  const [roles, setRoles] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRole, setEditingRole] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [mounted, setMounted] = useState(false);
  const [provisionedRole, setProvisionedRole] = useState(null);
  const [deletedRoleName, setDeletedRoleName] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load roles from backend on mount
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/permissions/roles`);
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
        }
      } catch (e) {
        console.error("Error loading roles", e);
        setRoles(DEFAULT_ROLES);
      }
    };
    loadRoles();
  }, []);

  // Show notification toast helper
  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Create or update role
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showToast("Role name is required", "error");
      return;
    }

    if (editingRole) {
      // Editing Mode
      if (editingRole.id === "senioradvocate" && roleName.toLowerCase() !== "senior advocate") {
        showToast("Cannot rename Senior Advocate role to protect system integrity.", "error");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/permissions/roles/${editingRole.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim()
          })
        });
        if (res.ok) {
          const updatedRole = await res.json();
          setRoles((prev) => prev.map((r) => r.id === editingRole.id ? updatedRole : r));
          showToast(`Role "${roleName}" updated successfully!`);
          setEditingRole(null);
          setRoleName("");
          setRoleDescription("");
        } else {
          const errData = await res.json();
          showToast(errData.detail || "Error updating role", "error");
        }
      } catch (err) {
        showToast("Unable to connect to backend", "error");
      }
    } else {
      // Creating Mode
      try {
        const res = await fetch(`${API_BASE_URL}/permissions/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim()
          })
        });
        if (res.ok) {
          const newRole = await res.json();
          setRoles((prev) => [...prev, newRole]);
          setProvisionedRole(newRole);
          setRoleName("");
          setRoleDescription("");
        } else {
          const errData = await res.json();
          showToast(errData.detail || "Error creating role", "error");
        }
      } catch (err) {
        showToast("Unable to connect to backend", "error");
      }
    }
  };

  // Set role up for editing
  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete a role
  const handleDeleteRole = async (roleId, roleName) => {
    if (
      roleId === "senioradvocate" ||
      roleId === "junioradvocate" ||
      roleId === "client" ||
      roleName === "Senior Advocate" ||
      roleName === "Junior Advocate" ||
      roleName === "Client"
    ) {
      showToast(`Cannot delete core role "${roleName}"`, "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/permissions/roles/${roleId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
        setDeletedRoleName(roleName);

        // Clear edit state if we just deleted the role being edited
        if (editingRole && editingRole.id === roleId) {
          setEditingRole(null);
          setRoleName("");
          setRoleDescription("");
        }
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Error deleting role", "error");
      }
    } catch (err) {
      showToast("Unable to connect to backend", "error");
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
  };

  // Filter roles based on search query
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Shield size={20} className="text-emerald-600 flex-shrink-0" />
          )}
          <span className="font-semibold text-xs sm:text-sm leading-snug">{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6 md:p-8">
        <h1 className="text-[#0F172A] font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
          Roles Management
        </h1>
        <p className="text-[#64748B] text-xs sm:text-sm md:text-base mt-1.5 font-medium leading-relaxed">
          Create, edit, and delete user roles. Assign permissions separately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Create / Edit Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm h-fit">
          <div className="flex items-center gap-3 sm:gap-3.5 mb-5 sm:mb-6">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2563EB] text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                {editingRole ? "Edit Role" : "Create New Role"}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                {editingRole ? "Modify role settings" : "Add a custom role to the system"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveRole} className="space-y-5 sm:space-y-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Role Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Manager, Editor"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium"
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Description (Optional)
              </label>
              <textarea
                placeholder="Short description of this role"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all text-xs sm:text-sm font-medium resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:flex-1 bg-[#2563EB] text-white hover:bg-blue-700 text-xs font-bold uppercase py-3 sm:py-3.5 px-4 sm:px-6 rounded-full cursor-pointer tracking-wider transition-all shadow-md shadow-blue-200/50 active:scale-95 text-center"
              >
                {editingRole ? "Save Changes" : "Create Role"}
              </button>

              {editingRole && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full sm:w-auto bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold uppercase py-3 sm:py-3.5 px-5 rounded-full cursor-pointer tracking-wider transition-all text-center"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Roles list */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Existing Roles
              </h2>
              <p className="text-xs text-slate-400 sm:hidden mt-0.5">
                {filteredRoles.length} role{filteredRoles.length === 1 ? "" : "s"} found
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64 md:w-72">
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50/50 pl-10 sm:pl-11 pr-4 sm:pr-5 py-2 sm:py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#2563EB] outline-none transition-all"
              />
              <Search
                size={16}
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {/* ─── Mobile View: Native Card List (< 640px) ─── */}
          <div className="block sm:hidden space-y-3">
            {filteredRoles.length > 0 ? (
              filteredRoles.map((role) => {
                const isCoreRole =
                  role.id === "senioradvocate" ||
                  role.id === "junioradvocate" ||
                  role.id === "client" ||
                  role.id === "clerk" ||
                  role.name === "Senior Advocate" ||
                  role.name === "Junior Advocate" ||
                  role.name === "Client" ||
                  role.name === "Clerk";

                return (
                  <div
                    key={role.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <Shield size={15} className="text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {role.name}
                          </h3>
                          {isCoreRole && (
                            <span className="inline-block text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 mt-0.5">
                              System Core Role
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="p-2 text-slate-500 hover:text-slate-900 bg-white rounded-lg border border-slate-200 shadow-xs cursor-pointer active:scale-95"
                          title="Edit Role"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: role.id, name: role.name })}
                          className={`p-2 rounded-lg border shadow-xs transition-colors cursor-pointer active:scale-95 ${
                            isCoreRole
                              ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                              : "bg-white border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                          }`}
                          disabled={isCoreRole}
                          title="Delete Role"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {role.description || (
                        <span className="text-slate-400 italic">No description provided</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                <Info size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">No roles found</p>
                <p className="text-slate-400 text-xs mt-1">Try searching for something else or create a new role.</p>
              </div>
            )}
          </div>

          {/* ─── Desktop & Tablet View: Table (>= 640px) ─── */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-10">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>
                  </th>
                  <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Role Name
                  </th>
                  <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-3.5 px-4 lg:px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRoles.length > 0 ? (
                  filteredRoles.map((role) => (
                    <tr
                      key={role.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 lg:px-6">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0"></div>
                      </td>
                      <td className="py-3.5 px-4 lg:px-6 font-bold text-slate-800 text-sm">
                        {role.name}
                      </td>
                      <td className="py-3.5 px-4 lg:px-6 text-slate-500 text-xs font-medium">
                        {role.description || (
                          <span className="text-slate-300 italic">No description provided</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 lg:px-6 text-right">
                        <div className="flex items-center justify-end gap-3.5">
                          <button
                            onClick={() => handleEditRole(role)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: role.id, name: role.name })}
                            className={`p-1 transition-colors cursor-pointer ${
                              role.id === "senioradvocate" ||
                              role.id === "junioradvocate" ||
                              role.id === "client" ||
                              role.id === "clerk" ||
                              role.name === "Senior Advocate" ||
                              role.name === "Junior Advocate" ||
                              role.name === "Client" ||
                              role.name === "Clerk"
                                ? "text-slate-200 cursor-not-allowed"
                                : "text-slate-400 hover:text-red-600"
                            }`}
                            disabled={
                              role.id === "senioradvocate" ||
                              role.id === "junioradvocate" ||
                              role.id === "client" ||
                              role.id === "clerk" ||
                              role.name === "Senior Advocate" ||
                              role.name === "Junior Advocate" ||
                              role.name === "Client" ||
                              role.name === "Clerk"
                            }
                            title="Delete Role"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info size={24} className="text-slate-300" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                          No roles found
                        </span>
                        <span className="text-slate-300 text-xs font-semibold">
                          Try searching for something else or create a new role.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Success Modal for Provisioned Role ─── */}
      {mounted && typeof window !== "undefined" && provisionedRole ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-6 overflow-y-auto"
          onClick={() => setProvisionedRole(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            {/* Header Success Section */}
            <div className="bg-emerald-50 py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center border-b border-slate-100 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg shadow-emerald-200">
                <Check size={28} className="sm:w-8 sm:h-8" strokeWidth={3} />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl sm:text-2xl text-center">
                Role Created Successfully
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium max-w-xs text-center leading-relaxed">
                The security role has been successfully created. You can now configure its permissions in the Permissions matrix.
              </p>
            </div>

            {/* Info Section */}
            <div className="p-4 sm:p-6 space-y-4 text-slate-700">
              <div className="space-y-3">
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Role Name</span>
                  <span className="text-slate-900 font-extrabold text-sm block mt-1">
                    {provisionedRole.name}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Description</span>
                  <span className="text-slate-800 text-xs font-medium block mt-1 leading-relaxed">
                    {provisionedRole.description || <span className="text-slate-300 italic">No description provided</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setProvisionedRole(null)}
                className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white text-xs font-bold uppercase py-3 px-6 rounded-full cursor-pointer tracking-wider transition-all shadow-md active:scale-95 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* ─── Success Modal for Deleted Role ─── */}
      {mounted && typeof window !== "undefined" && deletedRoleName ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-6 overflow-y-auto"
          onClick={() => setDeletedRoleName(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            {/* Header Success Section */}
            <div className="bg-red-50 py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center border-b border-slate-100 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg shadow-red-200">
                <Trash2 size={28} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl sm:text-2xl text-center">
                Role Deleted Successfully
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium max-w-xs text-center leading-relaxed">
                The role has been completely removed from the system, along with its associated permission configuration.
              </p>
            </div>

            {/* Info Section */}
            <div className="p-4 sm:p-6 space-y-4 text-slate-700">
              <div className="space-y-3">
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Deleted Role Name</span>
                  <span className="text-slate-900 font-extrabold text-sm block mt-1 line-through decoration-red-500 decoration-2">
                    {deletedRoleName}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDeletedRoleName(null)}
                className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white text-xs font-bold uppercase py-3 px-6 rounded-full cursor-pointer tracking-wider transition-all shadow-md active:scale-95 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* ─── Delete Confirmation Modal ─── */}
      {mounted && typeof window !== "undefined" && deleteTarget ? createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-6 overflow-y-auto"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            {/* Header Warning Section */}
            <div className="bg-red-50 py-6 sm:py-8 px-4 sm:px-6 flex flex-col items-center border-b border-slate-100 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center text-white mb-3 sm:mb-4 shadow-lg shadow-red-200">
                <AlertTriangle size={28} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
              </div>
              <h3 className="text-slate-900 font-extrabold text-xl sm:text-2xl text-center">
                Delete Role
              </h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium max-w-xs text-center leading-relaxed">
                Are you sure you want to delete the "{deleteTarget.name}" role? This action cannot be undone.
              </p>
            </div>

            {/* Info Section */}
            <div className="p-4 sm:p-6 text-slate-700 text-center text-xs sm:text-sm font-medium leading-relaxed">
              <p className="text-slate-500">
                Deleting this role will permanently clear all its mapped permissions. Any users assigned to this role may lose their primary role access.
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse xs:flex-row sm:flex-row justify-end gap-2.5 sm:gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase py-3 sm:py-3.5 px-6 rounded-full cursor-pointer tracking-wider transition-all text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteRole(deleteTarget.id, deleteTarget.name);
                  setDeleteTarget(null);
                }}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase py-3 sm:py-3.5 px-6 rounded-full cursor-pointer tracking-wider transition-all shadow-md active:scale-95 animate-pulse-subtle text-center"
              >
                Delete Role
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
