"use client";
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLoggedInUser } from '@/utils/auth'
import AdvDashboardView from '@/views/UI/AdvDashboard/AdvDashboardView'

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = getLoggedInUser();
    if (loggedIn) {
      setUser(loggedIn);
      const roleName = (loggedIn.role || "").toLowerCase().replace(/\s+/g, "");
      if (roleName === "client") {
        router.push("/client-dashboard");
        return;
      }
      if (roleName === "junioradvocate") {
        router.push("/junior-dashboard");
        return;
      }
      if (roleName === "clerk") {
        router.push("/clerk/dashboard");
        return;
      }
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2563EB]"></div>
        <p className="text-[#64748B] text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return <AdvDashboardView />;
}
