import { useState, useEffect } from "react";
import { getLoggedInUser } from "./auth";
import { API_BASE_URL } from "./api";

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [customPermissions, setCustomPermissions] = useState({});
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = getLoggedInUser();
    setUser(loggedIn);

    if (loggedIn && loggedIn.id) {
      Promise.all([
        fetch(`${API_BASE_URL}/permissions/users/${loggedIn.id}`)
          .then((res) => (res.status === 200 ? res.json() : { customPermissions: {} }))
          .catch(() => ({ customPermissions: {} })),
        fetch(`${API_BASE_URL}/permissions`)
          .then((res) => (res.status === 200 ? res.json() : {}))
          .catch(() => ({}))
      ])
        .then(([userData, matrix]) => {
          setCustomPermissions(userData?.customPermissions || {});
          
          if (matrix && loggedIn.role) {
            const roleNorm = loggedIn.role.toLowerCase().replace(/\s+/g, "");
            const roleKey = Object.keys(matrix).find(
              (k) => k.toLowerCase().replace(/\s+/g, "") === roleNorm
            );
            if (roleKey) {
              setRolePermissions(matrix[roleKey] || {});
            } else {
              setRolePermissions(matrix[loggedIn.role] || {});
            }
          }
        })
        .catch((err) => {
          console.warn("Permissions hook network fallback active:", err?.message || err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const hasPermission = (moduleKey, action) => {
    if (!moduleKey) return true;

    // 1. Check custom permissions (direct overrides) first
    if (customPermissions && customPermissions[moduleKey] !== undefined) {
      if (customPermissions[moduleKey][action] !== undefined) {
        return !!customPermissions[moduleKey][action];
      }
    }

    // 2. Check role-wide permissions next
    if (rolePermissions && rolePermissions[moduleKey] !== undefined) {
      return !!rolePermissions[moduleKey][action];
    }

    return true; // fallback — allow access by default if no explicit restriction rule is matched
  };

  return { user, hasPermission, loading };
}
