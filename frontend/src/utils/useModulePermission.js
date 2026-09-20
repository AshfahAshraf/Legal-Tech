"use client";

import { useState, useEffect, useCallback } from "react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";

const DEFAULT_PERMS = { view: true, add: true, edit: true, delete: true };

/**
 * Resolves effective permissions for a module for the logged-in user.
 * Priority:
 *   1. User's customPermissions[moduleKey]  (from /permissions/users/:id)
 *   2. Role defaults[role][moduleKey]        (from /permissions)
 *   3. All allowed (no config = no restriction)
 *
 * @param {string} moduleKey  e.g. "Documents", "Consultation", "Payments"
 * @returns {{ perms: {view,add,edit,delete}, loading: boolean, user: object|null }}
 */
export default function useModulePermission(moduleKey) {
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const resolve = useCallback(async () => {
    if (!moduleKey) {
      setLoading(false);
      return;
    }

    const loggedIn = getLoggedInUser();
    setUser(loggedIn);

    if (!loggedIn) {
      setLoading(false);
      return;
    }

    const roleNorm = (loggedIn.role || "").toLowerCase().replace(/\s+/g, "");

    // 1. Fetch role defaults first
    let roleDefaults = {};
    try {
      const resRole = await fetch(`${API_BASE_URL}/permissions`);
      if (resRole.ok) {
        const allPerms = await resRole.json();
        const roleKey = Object.keys(allPerms).find(
          (k) => k.toLowerCase().replace(/\s+/g, "") === roleNorm
        );
        if (roleKey) {
          roleDefaults = (allPerms[roleKey] || {})[moduleKey] || {};
        }
      }
    } catch (_) {}

    // 2. Fetch user's custom overrides (direct permissions)
    let customOverrides = {};
    try {
      const resUser = await fetch(`${API_BASE_URL}/permissions/users/${loggedIn.id}`);
      if (resUser.ok) {
        const data = await resUser.json();
        const custom = data.customPermissions || {};
        customOverrides = custom[moduleKey] || {};
        setUser({ ...loggedIn, ...data });
      }
    } catch (_) {}

    // 3. Layer permissions per action: Custom Direct Override > Role Matrix Default > True
    const effectivePerms = {
      view:
        customOverrides.view !== undefined
          ? !!customOverrides.view
          : roleDefaults.view !== undefined
          ? !!roleDefaults.view
          : true,
      add:
        customOverrides.add !== undefined
          ? !!customOverrides.add
          : roleDefaults.add !== undefined
          ? !!roleDefaults.add
          : true,
      edit:
        customOverrides.edit !== undefined
          ? !!customOverrides.edit
          : roleDefaults.edit !== undefined
          ? !!roleDefaults.edit
          : true,
      delete:
        customOverrides.delete !== undefined
          ? !!customOverrides.delete
          : roleDefaults.delete !== undefined
          ? !!roleDefaults.delete
          : true,
    };

    setPerms(effectivePerms);
    setLoading(false);
  }, [moduleKey]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  useEffect(() => {
    const handleUpdate = () => resolve();
    window.addEventListener("permissions_updated", handleUpdate);
    return () => window.removeEventListener("permissions_updated", handleUpdate);
  }, [resolve]);

  return { perms, loading, user };
}
