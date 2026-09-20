"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";

export default function ProfileView({ profile = {}, onEdit }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleStatusMessage, setGoogleStatusMessage] = useState(null);

  const fetchGoogleStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/google/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
        setGoogleEmail(data.email);
      }
    } catch (e) {
      console.error("Error fetching Google integration status:", e);
    }
  };

  useEffect(() => {
    const loggedIn = getLoggedInUser();
    setUser(loggedIn);
    fetchGoogleStatus();

    // Check URL parameters for status alerts
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const googleParam = urlParams.get("google");
      if (googleParam === "success") {
        setGoogleStatusMessage({ type: "success", text: "Successfully connected to Google Calendar!" });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (googleParam === "error") {
        const detail = urlParams.get("detail") || "Authentication failed";
        setGoogleStatusMessage({ type: "error", text: `Failed to connect: ${detail}` });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleConnectGoogle = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    window.location.href = `${API_BASE_URL}/google/login?token=${token}`;
  };

  const handleDisconnectGoogle = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!confirm("Are you sure you want to disconnect Google Calendar integration?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/google/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setGoogleConnected(false);
        setGoogleEmail("");
        setGoogleStatusMessage({ type: "success", text: "Successfully disconnected Google Calendar integration." });
      }
    } catch (e) {
      console.error(e);
      setGoogleStatusMessage({ type: "error", text: "Failed to disconnect Google Calendar." });
    }
  };

  const roleLower = (user?.role || "").toLowerCase();
  const isClient = roleLower === "client";
  const isClerk = roleLower === "clerk";
  const isJuniorAdvocate = roleLower.replace(" ", "") === "junioradvocate";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(isClerk ? "/clerk/dashboard" : isClient ? "/client-dashboard" : "/adv-dashboard");
    }
  };

  // Full name: prefer firstName+lastName from JWT (always accurate), then
  // profile.advocateName as fallback (may contain system username like "admin").
  const rawLastName = (user?.lastName || "").trim();
  const cleanedLastName =
    isClerk && rawLastName.toLowerCase() === "advocate"
      ? ""
      : isClient && (rawLastName.toLowerCase() === "advocate" || rawLastName.toLowerCase() === "clerk")
      ? ""
      : rawLastName;

  const userFullName = user
    ? [user.firstName, cleanedLastName].filter(Boolean).join(" ") || user.username
    : null;

  let headerDisplayName = profile.advocateName || profile.clientName || userFullName || (isClient ? "Client Name" : isClerk ? "Clerk Name" : "Advocate Name");
  if (isClerk && headerDisplayName) {
    headerDisplayName = headerDisplayName.replace(/\s+Advocate$/i, "");
  }

  // Resolve profile image: API record first, then localStorage cache (keeps
  // navbar and profile page in sync), then ui-avatars initials fallback.
  const resolvedProfileImage = (() => {
    if (profile?.profileImage) return profile.profileImage;
    try {
      const saved = typeof window !== "undefined" && localStorage.getItem("advocate_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profileImage) return parsed.profileImage;
      }
    } catch (e) {}
    return null;
  })();

  const roleLabel = isClient
    ? "Client"
    : isClerk
    ? "Clerk"
    : profile.practiceCourt || "Advocate";

  return (
    <div className="w-full space-y-8 max-w-6xl mx-auto">
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#64748B] hover:text-[#0F172A] text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Google Status Alert Banners */}
        {googleStatusMessage && (
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
            googleStatusMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-950" 
              : "bg-rose-50 border-rose-200 text-rose-950"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{googleStatusMessage.type === "success" ? "✅" : "⚠️"}</span>
              <p className="font-semibold text-sm">{googleStatusMessage.text}</p>
            </div>
            <button 
              onClick={() => setGoogleStatusMessage(null)}
              className="text-gray-400 hover:text-gray-700 font-bold focus:outline-none cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>
        )}
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-8 items-center flex-1">
              {/* Profile Image */}
              <div className="shrink-0">
                <img
                  src={resolvedProfileImage || (user ? `https://ui-avatars.com/api/?name=${encodeURIComponent(headerDisplayName || user.firstName || user.username)}&background=2563EB&color=fff&rounded=true&bold=true&size=150` : "https://ui-avatars.com/api/?name=?&background=E2E8F0&color=64748B&rounded=true&bold=true&size=150")}
                  alt="Profile"
                  className="w-36 h-36 rounded-full object-cover border-[6px] border-white shadow-xl shadow-slate-300/50 bg-white"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h1 className="text-[#0F172A] font-extrabold text-4xl tracking-tight">
                  {headerDisplayName}
                </h1>

                {/* Role badge */}
                {user?.role && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold uppercase tracking-wider border border-blue-100">
                    {user.role}
                  </span>
                )}

                <p className="text-[#64748B] mt-2 text-lg font-medium">
                  {roleLabel}
                </p>

                {isClient && (
                  <p className="text-[#475569] mt-4 max-w-2xl text-sm leading-relaxed whitespace-pre-wrap">
                    {profile.about || "No professional bio provided."}
                  </p>
                )}
              </div>
            </div>

            {onEdit && (
              <div className="mt-6 md:mt-0">
                <button
                  onClick={onEdit}
                  className="px-8 py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer shrink-0"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid (Balanced 2 Columns for all roles) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
            <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">👤</span>
              Personal Information
            </h2>

            <div className="space-y-5">
              <InfoRow label="Phone" value={profile.phoneNumber} />
              <InfoRow label="Email" value={profile.emailAddress} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="City" value={profile.city} />
              <InfoRow label="State" value={profile.state} />
              <InfoRow label="Pincode" value={profile.pincode} />
            </div>
          </div>

          {/* Professional Information (Advocates Only) */}
          {!isClient && !isClerk && (
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
              <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">⚖️</span>
                Professional Information
              </h2>

              <div className="space-y-5">
                <InfoRow label="Bar Council ID" value={profile.barCouncilId} />
                <InfoRow label="Years of Experience" value={ profile.yearsOfExperience  ? `${profile.yearsOfExperience} Years`  : "-"  }/>
                <InfoRow label="Practice Court" value={profile.practiceCourt} />
              </div>
            </div>
          )}

          {/* Address Information (Right column for Clerks/Clients, or Full row below for Advocates) */}
          <div className={`bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10 ${!isClient && !isClerk ? "lg:col-span-2" : ""}`}>
            <h2 className="text-xl font-extrabold text-[#0F172A] mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">🏢</span>
              {isClient ? "Residential Address" : isClerk ? "Office / Residential Address" : "Chambers Address"}
            </h2>

            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0]">
              <p className="text-[#334155] font-medium text-sm leading-relaxed whitespace-pre-wrap">
                {profile.chambersAddress || (isClient ? "No residential address provided." : isClerk ? "No address provided." : "No chambers address provided.")}
              </p>
            </div>
          </div>
        </div>

        {/* Google Calendar Connection Card */}
        {!isJuniorAdvocate && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
            <h2 className="text-xl font-extrabold text-[#0F172A] mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">📅</span>
              Google Calendar Integration
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0]">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {googleConnected 
                    ? `Connected to Google Calendar (${googleEmail || user?.email || ""})` 
                    : "Google Calendar not connected"
                  }
                </p>
                <p className="text-[#64748B] text-xs mt-1 font-medium">
                  {googleConnected 
                    ? "Your consultations will automatically schedule and create Google Meet links in your Google Calendar." 
                    : "Connect your Google account to automatically generate Google Meet conference links when scheduling Video Call consultations."
                  }
                </p>
              </div>
              {googleConnected ? (
                <button
                  onClick={handleDisconnectGoogle}
                  className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-95 whitespace-nowrap"
                >
                  Connect Calendar
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
      <span className="font-bold text-[11px] uppercase tracking-widest text-[#64748B]">
        {label}
      </span>

      <span className="text-sm font-semibold text-[#0F172A] text-right max-w-[60%] truncate">
        {value || "-"}
      </span>
    </div>
  );
}