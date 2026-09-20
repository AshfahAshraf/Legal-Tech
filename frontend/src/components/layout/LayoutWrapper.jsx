"use client";

import { API_BASE_URL } from "@/utils/api";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import { getLoggedInUser } from "@/utils/auth";
import FloatingAIIcon from "@/components/common/FloatingAIIcon";

// Pages that should NOT show the sidebar/navbar
const AUTH_ROUTES = ["/login", "/register"];

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  // shared collapse state for sidebar & main content
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVerified, setIsVerified] = useState(isAuthPage);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true); // Auto-collapse on tablets (md to lg)
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false); // Expand on desktop
      }
    };

    handleResize(); // run on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isAuthPage) {
      setIsVerified(true);
      return;
    }

    const verifyUser = () => {
      const loggedIn = getLoggedInUser();
      if (!loggedIn) {
        setIsVerified(false);
        localStorage.removeItem("token");
        router.push("/login");
        return;
      } else {
        setIsVerified(true);
      }

      fetch(`${API_BASE_URL}/permissions/users/${loggedIn.id}`)
        .then((res) => {
          if (res.status === 404 || res.status === 401) {
            setIsVerified(false);
            localStorage.removeItem("token");
            router.push("/login");
          } else {
            setIsVerified(true);
          }
        })
        .catch((err) => {
          console.warn("Backend offline or unable to verify user status:", err.message);
        });
    };

    // Run verification on mount/navigation
    verifyUser();

    // Run verification periodically (every 10 seconds)
    const interval = setInterval(verifyUser, 10000);

    return () => clearInterval(interval);
  }, [pathname, isAuthPage, router]);

  // Auth pages render standalone — no sidebar or navbar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // If not verified, return blank container so they can't see anything
  if (!isVerified) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`flex-1 flex flex-col transition-[padding] duration-300 ease-in-out pl-0 ${isCollapsed ? "md:pl-[72px]" : "md:pl-[302px]"} min-h-screen min-w-0`}>
        <Navbar />
        <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 min-w-0 overflow-x-hidden">{children}</main>
      </div>
      <FloatingAIIcon />
    </div>
  );
}
