import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getLoggedInUser } from "@/utils/auth";
import {
  Home,
  Scale,
  Folder,
  Users,
  Calendar,
  CreditCard,
  BookOpen,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  ClipboardList,
  FileText,
  Key,
  Briefcase,
  Layers,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer overlay state
  const [activeModuleId, setActiveModuleId] = useState("advocate");
  const [user, setUser] = useState(null);
  const [customPermissions, setCustomPermissions] = useState({});
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);

  const fetchPermissions = () => {
    const loggedIn = getLoggedInUser();
    if (loggedIn && loggedIn.id) {
      Promise.all([
        fetch(`${API_BASE_URL}/permissions/users/${loggedIn.id}`)
          .then((res) => (res.status === 200 ? res.json() : { customPermissions: {} }))
          .catch(() => ({ customPermissions: {} })),
        fetch(`${API_BASE_URL}/permissions`)
          .then((res) => (res.status === 200 ? res.json() : {}))
          .catch(() => ({})),
      ])
        .then(([userData, matrix]) => {
          setCustomPermissions(userData.customPermissions || {});

          const roleKey = Object.keys(matrix).find(
            (k) =>
              k.toLowerCase().replace(/\s+/g, "") ===
              (loggedIn.role || "").toLowerCase().replace(/\s+/g, "")
          );
          if (roleKey) {
            setRolePermissions(matrix[roleKey] || {});
          } else {
            setRolePermissions(matrix[loggedIn.role] || {});
          }
        })
        .catch((err) => {
          console.warn("Sidebar: could not load permissions —", err?.message || err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  };

  const loadSidebarUser = async () => {
    const loggedIn = getLoggedInUser();
    setUser(loggedIn);

    if (!loggedIn) return;

    const userKey = (loggedIn?.email || loggedIn?.username || "").toLowerCase().trim();
    const uEmail = (loggedIn?.email || "").toLowerCase().trim();
    const uName = (loggedIn?.username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const uFull = `${loggedIn?.firstName || ""} ${loggedIn?.lastName || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");

    const savedUserLocal = typeof window !== "undefined" && userKey ? localStorage.getItem(`advocate_profile_${userKey}`) : null;
    
    let savedProfileData = null;
    if (savedUserLocal) {
      try {
        savedProfileData = JSON.parse(savedUserLocal);
      } catch (e) {}
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
        } catch (e) {}
      }
    }

    let img = savedProfileData?.profileImage || null;

    if (!img) {
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

          if (myAdvocate && myAdvocate.profileImage) {
            img = myAdvocate.profileImage;
            if (userKey) {
              localStorage.setItem(`advocate_profile_${userKey}`, JSON.stringify(myAdvocate));
            }
          }
        }
      } catch (e) {}
    }

    setProfileImage(img);
  };

  useEffect(() => {
    loadSidebarUser();
    setIsOpen(false);
    fetchPermissions();
  }, [pathname]);

  useEffect(() => {
    const handleUpdate = () => {
      loadSidebarUser();
      fetchPermissions();
    };
    window.addEventListener("permissions_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("permissions_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const hasViewPermission = (moduleKey) => {
    if (!moduleKey) return true;

    // Check custom permissions (direct permissions) first
    if (customPermissions && customPermissions[moduleKey] !== undefined) {
      if (customPermissions[moduleKey].view !== undefined) {
        return !!customPermissions[moduleKey].view;
      }
    }

    // Check role permissions next
    if (rolePermissions && rolePermissions[moduleKey] !== undefined) {
      return !!rolePermissions[moduleKey].view;
    }

    // Default fallback for Clerk and Senior Advocate roles so new modules are visible by default
    const userRoleStr = (user?.role || "").toLowerCase().replace(/\s+/g, "");
    if (userRoleStr.includes("clerk") || userRoleStr.includes("senior")) {
      return true;
    }

    return false; // fallback — hide item if no permission rule is found
  };

  // Define 2-Tier Modules with sub-items
  const modules = useMemo(() => [
    {
      id: "advocate",
      title: "Advocate Section",
      shortLabel: "Admin",
      icon: Scale,
      items: [
        { name: "Dashboard", path: "/", icon: Home, moduleKey: "Dashboard" },
        { name: "Case Management", path: "/case-management", icon: Folder, moduleKey: "Case Management" },
        { name: "Client Management", path: "/client-management", icon: Users, moduleKey: "Client Management" },
        { name: "Law Firm Management", path: "/lawfirm-management", icon: Scale, moduleKey: "Law Firm Management" },
        { name: "Case Discussion", path: "/consultations", icon: BookOpen, moduleKey: "Consultations" },
        { name: "Billing", path: "/finance-management", icon: CreditCard, moduleKey: "Finance Management" },
        { name: "Calendar", path: "/calendar", icon: Calendar, moduleKey: "Calendar" },
        { name: "eCourts Services", path: "/ecourts", icon: Scale, moduleKey: "eCourts Integration" },
        { name: "Assigned Tasks", path: "/assigned-tasks", icon: ClipboardList, moduleKey: "Assigned Tasks" },
        { name: "Leave Management", path: "/leave-management", icon: Calendar, moduleKey: "Leave Management" },
      ],
    },
    {
      id: "junior",
      title: "Junior Advocate",
      shortLabel: "Junior",
      icon: Briefcase,
      items: [
        { name: "Dashboard", path: "/junior-dashboard", icon: Home, moduleKey: "Junior Dashboard" },
        { name: "Assigned Cases", path: "/assigned-cases", icon: Folder, moduleKey: "Assigned Cases" },
        { name: "Assigned Tasks", path: "/junior-assigned-tasks", icon: ClipboardList, moduleKey: "Junior Assigned Tasks" },
        { name: "Calendar", path: "/junior-calendar", icon: Calendar, moduleKey: "Junior Calendar" },
        { name: "Leave", path: "/junior-leave", icon: Calendar, moduleKey: "Junior Leave" },
      ],
    },
    {
      id: "clerk",
      title: "Clerk Section",
      shortLabel: "Clerk",
      icon: ClipboardList,
      items: [
        { name: "Dashboard", path: "/clerk/dashboard", icon: Home, moduleKey: "Clerk Dashboard" },
        { name: "Court Visit", path: "/clerk/court-visit", icon: Scale, moduleKey: "Court Visit" },
        { name: "Format Physical File", path: "/clerk/format-physical-file", icon: Folder, moduleKey: "Format Physical File" },
        { name: "Documents", path: "/clerk/documents", icon: FileText, moduleKey: "Clerk Documents" },
        { name: "Leave", path: "/clerk/leave", icon: Calendar, moduleKey: "Clerk Leave" },
      ],
    },
    {
      id: "client",
      title: "Client Section",
      shortLabel: "Client",
      icon: Users,
      items: [
        { name: "Dashboard", path: "/client-dashboard", icon: Home, moduleKey: "Client Dashboard" },
        { name: "Case Discussion", path: "/client-consultation", icon: BookOpen, moduleKey: "Consultation" },
        { name: "Case Tracking", path: "/client-case-tracking", icon: Folder, moduleKey: "Case Tracking" },
        { name: "Documents", path: "/client-documents", icon: Settings, moduleKey: "Documents" },
        { name: "Payments", path: "/client-payments", icon: CreditCard, moduleKey: "Payments" },
      ],
    },
    {
      id: "system",
      title: "System & Roles",
      shortLabel: "Permissions",
      icon: Shield,
      items: [
        { name: "Roles", path: "/permissions/roles", icon: Shield, moduleKey: "Roles" },
        { name: "Users Management", path: "/permissions/users", icon: Users, moduleKey: "Users" },
        { name: "Permissions", path: "/permissions", icon: Key, moduleKey: "Permissions" },
      ],
    },
  ], []);

  // Filter items based on permissions
  const filteredModules = useMemo(() => {
    return modules
      .map((mod) => {
        const allowedItems = mod.items.filter((item) => hasViewPermission(item.moduleKey));
        return { ...mod, items: allowedItems };
      })
      .filter((mod) => mod.items.length > 0);
  }, [modules, customPermissions, rolePermissions, user]);

  // Auto-detect current active module based on URL pathname
  useEffect(() => {
    if (!pathname) return;
    for (const mod of filteredModules) {
      const match = mod.items.some(
        (item) =>
          item.path === pathname ||
          (item.path !== "/" &&
            item.path !== "/permissions" &&
            pathname.startsWith(item.path + "/"))
      );
      if (match) {
        setActiveModuleId(mod.id);
        break;
      }
    }
  }, [pathname, filteredModules]);

  const activeModule = filteredModules.find((m) => m.id === activeModuleId) || filteredModules[0];

  const handleModuleClick = (modId) => {
    setActiveModuleId(modId);
    if (isCollapsed) {
      setIsCollapsed(false); // Expand secondary drawer when module is clicked
    }

    const targetMod = filteredModules.find((m) => m.id === modId);
    if (targetMod && targetMod.items && targetMod.items.length > 0) {
      // Check if current pathname is already part of the target module's items
      const isAlreadyInModule = targetMod.items.some(
        (item) =>
          item.path === pathname ||
          (item.path !== "/" &&
            item.path !== "/permissions" &&
            pathname?.startsWith(item.path + "/"))
      );
      if (!isAlreadyInModule) {
        // Find dashboard item or fallback to first item
        const dashboardItem =
          targetMod.items.find((item) =>
            item.name.toLowerCase().includes("dashboard")
          ) || targetMod.items[0];

        if (dashboardItem && dashboardItem.path) {
          router.push(dashboardItem.path);
        }
      }
    }
  };

  if (loading) {
    return (
      <aside className="fixed top-0 left-0 h-screen bg-[#0F172A] border-r border-slate-800 z-50 w-[72px] flex items-center justify-center">
        <span className="animate-pulse text-xs text-blue-400">...</span>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Hamburger Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-[60] flex items-center justify-center w-10 h-10 bg-[#0F172A] text-white rounded-lg shadow-lg md:hidden transition-colors duration-200"
        aria-label="Toggle Navigation"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Container for 2-Tier Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 flex transition-transform duration-300 ease-in-out font-poppins ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Tier 1: Primary Icon Rail (Width 72px) */}
        <aside className="w-[72px] h-screen bg-[#0F172A] text-slate-300 flex flex-col justify-between items-center py-4 border-r border-slate-800 flex-shrink-0 z-20 select-none font-poppins">
          {/* Logo Mark */}
          <div className="flex flex-col items-center gap-1 mb-4">
            <Link
              href="/"
              className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
              title="Legal Tech Enterprise"
            >
              <Scale size={24} />
            </Link>
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 font-legaltech">LT</span>
          </div>

          {/* Module Icons Navigation */}
          <nav className="flex-1 flex flex-col gap-3 items-center w-full px-2 overflow-y-auto no-scrollbar py-2">
            {filteredModules.map((mod) => {
              const isActive = activeModuleId === mod.id;
              const IconComp = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => handleModuleClick(mod.id)}
                  className={`group relative w-12 flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/80 font-semibold"
                  }`}
                  title={mod.title}
                >
                  <IconComp size={20} className={isActive ? "text-white" : "group-hover:scale-110 transition-transform"} />
                  <span className="text-[10.5px] tracking-tight mt-1 truncate max-w-full font-poppins font-semibold">
                    {mod.shortLabel}
                  </span>

                  {/* Active Indicator Bar on left edge */}
                  {isActive && (
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-400 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Avatar at Bottom */}
          <div className="pt-2 border-t border-slate-800/80 w-full flex flex-col items-center">
            <Link
              href="/profile-management"
              className="group relative p-1 rounded-full hover:ring-2 hover:ring-blue-500 transition-all"
              title={user ? `${user.username} (${user.role})` : "Profile"}
            >
              {user ? (
                <img
                  src={
                    profileImage ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent([user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(" ") || user.username)}&background=2563EB&color=fff&rounded=true&bold=true&size=150`
                  }
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                  ?
                </div>
              )}
            </Link>
          </div>
        </aside>

        {/* Tier 2: Secondary Expandable Drawer (Width 230px) */}
        <aside
          className={`h-screen bg-white border-r border-[#E2E8F0] shadow-sm flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-10 font-poppins ${
            isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-[230px] opacity-100"
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-slate-50/50">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase font-legaltech mb-0.5">
                LEGAL TECH
              </span>
              <h3 className="text-sm font-extrabold text-[#0F172A] truncate tracking-tight font-poppins">
                {activeModule?.title || "Workspace"}
              </h3>
            </div>

            {/* Collapse Toggle Button */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
              title="Collapse sub-menu"
              aria-label="Collapse sub-menu"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Drawer Links List */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1.5 font-poppins">
            {activeModule?.items.map((item) => {
              const isPathActive =
                pathname === item.path ||
                (item.path !== "/" &&
                  item.path !== "/permissions" &&
                  pathname?.startsWith(item.path + "/"));
              const SubIcon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-[14px] transition-all duration-150 overflow-hidden ${
                    isPathActive
                      ? "bg-[#EFF6FF] text-[#2563EB] font-extrabold shadow-xs"
                      : "text-slate-800 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                  }`}
                >
                  {/* Active Left Indicator Bar matching user photo */}
                  {isPathActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#2563EB] rounded-r-full" />
                  )}

                  <SubIcon
                    size={20}
                    className={`shrink-0 transition-colors ${
                      isPathActive ? "text-[#2563EB]" : "text-slate-500 group-hover:text-slate-700"
                    }`}
                  />
                  <span className="truncate tracking-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Drawer Footer Status */}
          {user && (
            <div className="p-3.5 border-t border-[#E2E8F0] bg-slate-50/60 font-poppins">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-medium truncate max-w-[130px]">
                  {(() => {
                    let name = user.username;
                    try {
                      const userKey = (user.email || user.username || "").toLowerCase().trim();
                      const savedUserLocal = typeof window !== "undefined" && userKey ? localStorage.getItem(`advocate_profile_${userKey}`) : null;
                      const savedGlobal = typeof window !== "undefined" ? localStorage.getItem("advocate_profile") : null;
                      const savedProfile = savedUserLocal || savedGlobal;
                      if (savedProfile) {
                        const parsed = JSON.parse(savedProfile);
                        if (parsed.advocateName || parsed.advocate_name) {
                          name = parsed.advocateName || parsed.advocate_name;
                        }
                      }
                    } catch (e) {}
                    if ((user.role || "").toLowerCase() === "clerk" && name) {
                      name = name.replace(/\s+Advocate$/i, "");
                    }
                    return name;
                  })()}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Expand Button Floating Trigger when Collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed bottom-6 left-[84px] z-40 hidden md:flex items-center gap-1.5 px-3 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-full shadow-xl hover:bg-blue-600 transition-all border border-slate-700"
          title="Expand sub-menu"
        >
          <Layers size={14} />
          <span>{activeModule?.shortLabel || "Menu"}</span>
          <ChevronRight size={14} />
        </button>
      )}
    </>
  );
}