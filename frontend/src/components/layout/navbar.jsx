"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";
import { Bell, ChevronDown, LoaderCircle, CheckCheck, X } from "lucide-react";

export default function Navbar() {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifFilter, setNotifFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const router = useRouter();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const loadUserData = useCallback(async () => {
    const loggedInUser = getLoggedInUser();
    setUser(loggedInUser);

    if (!loggedInUser) return;

    let name = "";
    let img = null;

    const userKey = (loggedInUser?.email || loggedInUser?.username || "").toLowerCase().trim();
    const uEmail = (loggedInUser?.email || "").toLowerCase().trim();
    const uName = (loggedInUser?.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const uFull = `${loggedInUser?.firstName || ""} ${loggedInUser?.lastName || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");

    const savedUserLocal = typeof window !== "undefined" && userKey ? localStorage.getItem(`advocate_profile_${userKey}`) : null;

    let savedProfileData = null;
    if (savedUserLocal) {
      try {
        savedProfileData = JSON.parse(savedUserLocal);
      } catch (e) { }
    } else if (typeof window !== "undefined") {
      const savedGlobal = localStorage.getItem("advocate_profile");
      if (savedGlobal) {
        try {
          const parsed = JSON.parse(savedGlobal);
          const pEmail = (parsed.emailAddress || parsed.email_address || "").toLowerCase().trim();
          const pName = (parsed.advocateName || parsed.advocate_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (
            (uEmail && pEmail && pEmail === uEmail) ||
            (uName && pName && (pName === uName || uName.includes(pName))) ||
            (uFull && pName && (pName === uFull || uFull.includes(pName)))
          ) {
            savedProfileData = parsed;
          }
        } catch (e) { }
      }
    }

    if (savedProfileData) {
      if (savedProfileData.profileImage) {
        img = savedProfileData.profileImage;
      }
      if (savedProfileData.advocateName || savedProfileData.advocate_name) {
        name = savedProfileData.advocateName || savedProfileData.advocate_name;
      }
    }

    // Fetch from backend DB if missing local image/profile
    if (!img || !name) {
      try {
        const res = await fetch(`${API_BASE_URL}/lawfirm-management/`);
        if (res.ok) {
          const advocates = await res.json();
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
            if (!img && myAdvocate.profileImage) img = myAdvocate.profileImage;
            if (!name && (myAdvocate.advocateName || myAdvocate.advocate_name)) {
              name = myAdvocate.advocateName || myAdvocate.advocate_name;
            }
            if (userKey) {
              localStorage.setItem(`advocate_profile_${userKey}`, JSON.stringify(myAdvocate));
            }
          }
        }
      } catch (e) {
        console.warn("Navbar: Could not fetch advocate profile from backend —", e?.message || e);
      }
    }

    if (!name && loggedInUser) {
      name = [loggedInUser.firstName || loggedInUser.first_name, loggedInUser.lastName || loggedInUser.last_name].filter(Boolean).join(" ") || loggedInUser.username;
    }

    if ((loggedInUser?.role || "").toLowerCase() === "clerk" && name) {
      name = name.replace(/\s+Advocate$/i, "");
    }

    setDisplayName(name || loggedInUser?.username || "Guest User");
    setProfileImage(img);

    if (loggedInUser) {
      fetchNotifications(loggedInUser);
    }
  }, []);

  useEffect(() => {
    loadUserData();

    const handleProfileUpdate = () => {
      loadUserData();
    };

    window.addEventListener("permissions_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("permissions_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [loadUserData]);

  const fetchNotifications = async (loggedInUser) => {
    setLoadingNotifs(true);
    try {
      const params = new URLSearchParams();
      if (loggedInUser.id) params.set("user_id", loggedInUser.id);
      if (loggedInUser.role) params.set("role", loggedInUser.role);

      const res = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Backend now returns is_read field per notification
        setNotifications(data);
      }
    } catch (err) {
      // Quietly ignore transient network/dev-server reload errors
    } finally {
      setLoadingNotifs(false);
    }
  };

  /**
   * Mark one notification as read — persisted in MySQL via backend API.
   */
  const markAsRead = useCallback(async (notifId) => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser?.id) return;

    // Optimistic UI update immediately
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );

    try {
      await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: loggedInUser.id,
          notification_ids: [notifId],
        }),
      });
    } catch (err) {
      console.warn("Could not mark notification as read:", err.message);
    }
  }, []);

  /**
   * Mark ALL notifications as read — persisted in MySQL via backend API.
   */
  const markAllAsRead = useCallback(async () => {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser?.id) return;

    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic UI update immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: loggedInUser.id,
          notification_ids: unreadIds,
        }),
      });
    } catch (err) {
      console.warn("Could not mark all notifications as read:", err.message);
    }
  }, [notifications]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setShowProfile(false);
    router.push("/login");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 md:px-6 pl-14 md:pl-6 py-3 flex justify-between items-center font-sans shadow-xs">
      {/* Left Side: Legal Tech Futuristic Brand Header */}
      <div className="flex items-center gap-3">
        <span className="font-legaltech text-base md:text-lg font-black tracking-wider bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 bg-clip-text text-transparent uppercase">
          LEGAL TECH
        </span>
        <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 tracking-wider font-sans uppercase">
          Enterprise
        </span>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <style>{`
            @keyframes bellShake {
              0%, 100% { transform: rotate(0deg); }
              10% { transform: rotate(16deg); }
              20% { transform: rotate(-14deg); }
              30% { transform: rotate(14deg); }
              40% { transform: rotate(-10deg); }
              50% { transform: rotate(6deg); }
              60% { transform: rotate(-4deg); }
              70% { transform: rotate(0deg); }
            }
            .animate-bell-shake {
              animation: bellShake 2.2s ease-in-out infinite;
              transform-origin: top center;
            }
          `}</style>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-lg hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
          >
            <Bell
              size={20}
              className={`${unreadCount > 0
                  ? "text-[#0F172A] animate-bell-shake"
                  : "text-[#64748B]"
                }`}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[10px] font-semibold h-[18px] w-[18px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-88 sm:w-[420px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-300/40 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
              {/* Header matching requested style */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">
                      Notifications
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-0.5">
                      {unreadCount} UNREAD MESSAGES
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="w-8 h-8 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="w-8 h-8 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Filter Pill Tabs */}
                <div className="flex bg-slate-100/80 p-1 rounded-2xl">
                  <button
                    onClick={() => setNotifFilter("all")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${notifFilter === "all"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setNotifFilter("unread")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${notifFilter === "unread"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setNotifFilter("read")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${notifFilter === "read"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    Read
                  </button>
                </div>
              </div>

              {/* Body list */}
              <div className="max-h-[390px] overflow-y-auto p-2.5 space-y-2 divide-y divide-transparent">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-xs font-medium">
                    <LoaderCircle size={16} className="animate-spin text-blue-600" />
                    <span>Fetching latest alerts...</span>
                  </div>
                ) : (
                  (() => {
                    const displayList = notifications.filter((n) => {
                      if (notifFilter === "unread") return !n.is_read;
                      if (notifFilter === "read") return n.is_read;
                      return true;
                    });

                    if (displayList.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                            <Bell size={20} className="text-slate-300" />
                          </div>
                          <p className="text-xs font-semibold text-slate-500">No notifications found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Nothing to display for this filter</p>
                        </div>
                      );
                    }

                    return displayList.map((item) => {
                      const isRead = item.is_read;

                      const titleText = item.title || "";
                      const tLower = titleText.toLowerCase();

                      let badge = { label: "ALERT", bg: "bg-slate-100 text-slate-600 border-slate-200" };
                      if (tLower.includes("hearing today")) {
                        badge = { label: "HEARING TODAY", bg: "bg-rose-100 text-rose-700 border-rose-200" };
                      } else if (tLower.includes("hearing in")) {
                        badge = { label: "HEARING UPCOMING", bg: "bg-amber-100 text-amber-800 border-amber-200" };
                      } else if (tLower.includes("status changed") || tLower.includes("status updated")) {
                        badge = { label: "CASE STATUS", bg: "bg-emerald-100 text-emerald-700 border-emerald-200" };
                      } else if (tLower.includes("meeting scheduled") || tLower.includes("meeting with")) {
                        badge = { label: "MEETING", bg: "bg-blue-100 text-blue-700 border-blue-200" };
                      } else if (tLower.includes("meeting cancelled")) {
                        badge = { label: "CANCELLED", bg: "bg-rose-100 text-rose-700 border-rose-200" };
                      } else if (tLower.includes("payment")) {
                        badge = { label: "PAYMENT", bg: "bg-emerald-100 text-emerald-700 border-emerald-200" };
                      } else if (tLower.includes("overdue")) {
                        badge = { label: "OVERDUE", bg: "bg-rose-100 text-rose-700 border-rose-200" };
                      } else if (tLower.includes("action required") || tLower.includes("requested")) {
                        badge = { label: "ACTION REQ", bg: "bg-purple-100 text-purple-700 border-purple-200" };
                      } else if (tLower.includes("task due")) {
                        badge = { label: "TASK DUE", bg: "bg-amber-100 text-amber-700 border-amber-200" };
                      } else if (tLower.includes("clerk task") || tLower.includes("task assigned")) {
                        badge = { label: "TASK", bg: "bg-indigo-100 text-indigo-700 border-indigo-200" };
                      } else if (tLower.includes("document") || tLower.includes("file")) {
                        badge = { label: "DOCUMENT", bg: "bg-purple-100 text-purple-700 border-purple-200" };
                      }

                      const cleanedTitle = titleText.replace(/\s*[X\*\-]{3,}\s*\([^)]*\)/gi, "");

                      return (
                        <div
                          key={item.id}
                          onClick={() => !isRead && markAsRead(item.id)}
                          className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-150 relative group ${isRead
                              ? "bg-slate-50/60 border-slate-100/80 opacity-75 hover:opacity-100 hover:bg-white"
                              : "bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-white border-blue-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs cursor-pointer"
                            }`}
                        >
                          <div
                            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-base shadow-2xs mt-0.5 transition-transform duration-200 group-hover:scale-105 ${item.bg} ${item.color}`}
                          >
                            {item.icon}
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {item.time}
                              </span>
                            </div>

                            <p
                              className={`text-xs leading-snug transition-colors ${isRead
                                  ? "font-normal text-slate-600"
                                  : "font-semibold text-slate-900 group-hover:text-blue-900"
                                } line-clamp-2`}
                              title={cleanedTitle}
                            >
                              {cleanedTitle}
                            </p>
                          </div>

                          {!isRead && (
                            <span
                              className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2 animate-pulse shadow-xs"
                              title="Unread"
                            />
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && unreadCount === 0 && (
                <div className="px-5 py-2.5 border-t border-slate-100 text-center bg-slate-50/70">
                  <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
                    <CheckCheck size={13} className="text-emerald-500" />
                    All caught up!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors duration-200"
          >
            {user ? (
              <img
                src={profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || user.firstName || user.username)}&background=2563EB&color=fff&rounded=true&bold=true&size=150`}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-100 shadow-sm transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold ring-2 ring-slate-200">
                ?
              </div>
            )}

            <div className="text-left hidden sm:block">
              <h4 className="font-semibold text-sm text-[#0F172A] capitalize">
                {displayName}
              </h4>
              <p className="text-xs text-[#64748B]">
                {user ? user.role : "Viewer"}
              </p>
            </div>

            <ChevronDown size={16} className="text-[#94A3B8]" />
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
              <button
                onClick={() => router.push("/profile-management")}
                className="w-full text-left px-4 py-3 text-sm text-[#0F172A] hover:bg-slate-50 transition-colors duration-150"
              >
                My Profile
              </button>
              <div className="border-t border-[#F1F5F9]">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-[#DC2626] hover:bg-red-50 transition-colors duration-150"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
