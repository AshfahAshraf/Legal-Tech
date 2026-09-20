"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const ACTIONS = ["view", "add", "edit", "delete"];

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

export default function UserEdit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const res = await fetch(
        `${API_BASE_URL}/permissions/users/${userId}`
      );
      const data = await res.json();
      setUser(data);
    };

    if (userId) loadUser();
  }, [userId]);

  const handlePermissionToggle = (module, action) => {
    setUser((prev) => ({
      ...prev,
      customPermissions: {
        ...prev.customPermissions,
        [module]: {
          ...prev.customPermissions?.[module],
          [action]:
            !prev.customPermissions?.[module]?.[action],
        },
      },
    }));
  };

  const handleSave = async () => {
    await fetch(`${API_BASE_URL}/permissions/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    router.push("/UI/Permission/UserView");
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="w-full space-y-8">
      <div className="bg-white rounded-3xl p-8 border shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Edit User</h1>

        <div className="grid grid-cols-2 gap-4">
          <input
            value={user.firstName || ""}
            onChange={(e) =>
              setUser({ ...user, firstName: e.target.value })
            }
            className="border rounded-xl p-3"
          />

          <input
            value={user.lastName || ""}
            onChange={(e) =>
              setUser({ ...user, lastName: e.target.value })
            }
            className="border rounded-xl p-3"
          />

          <input
            value={user.email || ""}
            onChange={(e) =>
              setUser({ ...user, email: e.target.value })
            }
            className="border rounded-xl p-3"
          />

          <input
            value={user.phone || ""}
            onChange={(e) =>
              setUser({ ...user, phone: e.target.value })
            }
            className="border rounded-xl p-3"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-8">
        <h2 className="text-xl font-bold mb-4">Direct Permissions</h2>

        <table className="w-full">
          <thead>
            <tr>
              <th>Module</th>
              {ACTIONS.map((act) => (
                <th key={act}>{act}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ALL_MODULES.map((module) => (
              <tr key={module} className="border-t">
                <td className="p-4">{module}</td>

                {ACTIONS.map((action) => (
                  <td key={action} className="text-center">
                    <input
                      type="checkbox"
                      checked={
                        user.customPermissions?.[module]?.[action] || false
                      }
                      onChange={() =>
                        handlePermissionToggle(module, action)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-4 mt-6">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-slate-100 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-3 bg-black text-white rounded-xl"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}