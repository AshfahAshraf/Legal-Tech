"use client";
import { API_BASE_URL } from "@/utils/api";

import ProfileManagement from '@/views/UI/ProfileManagement/ProfileManagmentView'
import ProfileView from "@/views/UI/ProfileManagement/profileView";
import React, { useState, useEffect } from 'react'
import { getLoggedInUser } from "@/utils/auth";

const Page = () => {
  const [profile, setProfile] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = getLoggedInUser();
        if (!user || (!user.email && !user.username)) {
          setIsLoading(false);
          return;
        }

        const userKey = (user.email || user.username || "").toLowerCase().trim();
        const savedUserLocal = localStorage.getItem(`advocate_profile_${userKey}`);
        let initialLocal = null;

        if (savedUserLocal) {
          try {
            initialLocal = JSON.parse(savedUserLocal);
          } catch (e) {}
        } else {
          // Check global key ONLY if it matches the current user's email or name
          const savedGlobal = localStorage.getItem("advocate_profile");
          if (savedGlobal) {
            try {
              const parsed = JSON.parse(savedGlobal);
              const pEmail = (parsed.emailAddress || "").toLowerCase().trim();
              const pName = (parsed.advocateName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const uEmail = (user.email || "").toLowerCase().trim();
              const uName = (user.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");

              if ((uEmail && pEmail && pEmail === uEmail) || (uName && pName && pName === uName)) {
                initialLocal = parsed;
              }
            } catch (e) {}
          }
        }

        const res = await fetch(`${API_BASE_URL}/lawfirm-management/`).catch(() => null);
        if (res && res.ok) {
          const advocates = await res.json();
          const uEmail = (user.email || "").toLowerCase().trim();
          const uName = (user.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const uFull = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");

          const myAdvocate = advocates.find((adv) => {
            const advEmail = (adv.emailAddress || adv.email_address || "").toLowerCase().trim();
            const advName = (adv.advocateName || adv.advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return (
              (uEmail && advEmail && advEmail === uEmail) ||
              (uName && advName && (advName === uName || advName.includes(uName))) ||
              (uFull && advName && (uFull === advName || advName.includes(uFull)))
            );
          });

          if (myAdvocate) {
            setProfile(myAdvocate);
            localStorage.setItem(`advocate_profile_${userKey}`, JSON.stringify(myAdvocate));
            localStorage.setItem("advocate_profile", JSON.stringify(myAdvocate));
            setIsSubmitted(true);
            return;
          }
        }

        if (initialLocal) {
          if (user?.role?.toLowerCase() === "clerk" && initialLocal.advocateName) {
            initialLocal.advocateName = initialLocal.advocateName.replace(/\s+Advocate$/i, "");
          }
          setProfile(initialLocal);
          setIsSubmitted(true);
        } else {
          let cleanLastName = (user.lastName || "").trim();
          if (user?.role?.toLowerCase() === "clerk" && cleanLastName.toLowerCase() === "advocate") {
            cleanLastName = "";
          }
          let defaultName = `${user.firstName || ""} ${cleanLastName}`.trim() || user.username || "User";
          if (user?.role?.toLowerCase() === "clerk") {
            defaultName = defaultName.replace(/\s+Advocate$/i, "");
          }
          setProfile({
            advocateName: defaultName,
            emailAddress: user.email || "",
            phoneNumber: user.phone || "",
            role: user.role || "Client",
          });
        }
      } catch (e) {
        console.error("Error fetching profile from backend:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (updatedProfile) => {
    try {
      const user = getLoggedInUser();
      const userKey = (user?.email || user?.username || "").toLowerCase().trim();
      const userEmail = updatedProfile.emailAddress || user?.email || "";
      const userRole = updatedProfile.role || user?.role || "Client";
      let cleanLastName = (user?.lastName || "").trim();
      if (userRole.toLowerCase() === "clerk" && cleanLastName.toLowerCase() === "advocate") {
        cleanLastName = "";
      }
      let defaultName = `${user?.firstName || ""} ${cleanLastName}`.trim() || user?.username || "User";
      
      let cleanAdvName = updatedProfile.advocateName || defaultName;
      if (userRole.toLowerCase() === "clerk") {
        cleanAdvName = cleanAdvName.replace(/\s+Advocate$/i, "");
      }

      const payload = {
        ...updatedProfile,
        role: userRole,
        emailAddress: userEmail,
        advocateName: cleanAdvName,
      };

      // Clean empty strings for Pydantic validation
      if (payload.dateOfBirth === "") {
        payload.dateOfBirth = null;
      }
      if (payload.yearsOfExperience === "" || payload.yearsOfExperience === undefined) {
        payload.yearsOfExperience = null;
      }

      // Safety check: verify payload.id belongs to this user profile before PUTing
      if (payload.id && profile?.id && String(payload.id) !== String(profile.id)) {
        delete payload.id;
      }

      let savedData = null;
      try {
        let response;
        if (payload.id) {
          response = await fetch(`${API_BASE_URL}/lawfirm-management/${payload.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          response = await fetch(`${API_BASE_URL}/lawfirm-management/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        if (response && response.ok) {
          savedData = await response.json();
        } else if (response) {
          const errBody = await response.json().catch(() => ({}));
          console.warn("Backend profile save returned:", response.status, errBody);
        }
      } catch (fetchErr) {
        console.warn("Backend fetch failed, saving to local storage fallback:", fetchErr.message);
      }

      const finalProfile = savedData || payload;
      setProfile(finalProfile);
      try {
        if (userKey) {
          localStorage.setItem(`advocate_profile_${userKey}`, JSON.stringify(finalProfile));
        }
        localStorage.setItem("advocate_profile", JSON.stringify(finalProfile));
        
        // Sync logged-in user in localStorage if matching
        const currentUser = getLoggedInUser();
        if (currentUser) {
          const parts = (finalProfile.advocateName || "").split(" ");
          const updatedUserObj = {
            ...currentUser,
            firstName: parts[0] || currentUser.firstName,
            lastName: parts.slice(1).join(" ") || "",
            email: finalProfile.emailAddress || currentUser.email,
            phone: finalProfile.phoneNumber || currentUser.phone,
          };
          localStorage.setItem("user", JSON.stringify(updatedUserObj));
        }

        window.dispatchEvent(new Event("permissions_updated"));
      } catch (e) {
        console.warn("localStorage quota or write error:", e);
      }
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error saving profile.");
    }
  };

  const handleCancel = () => {
    if (profile) {
      setIsSubmitted(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-gray-500 font-medium animate-pulse">
          Loading Profile...
        </div>
      </div>
    );
  }

  return (
    <div>
      {isSubmitted ? (
        <ProfileView profile={profile} onEdit={() => setIsSubmitted(false)} />
      ) : (
        <ProfileManagement
          initialData={profile}
          onSubmit={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Page;
