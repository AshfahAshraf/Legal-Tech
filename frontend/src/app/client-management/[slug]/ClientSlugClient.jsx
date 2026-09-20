"use client";

import React from "react";
import Link from "next/link";

import CaseTracking from "@/views/UI/ClientManagement/CaseTracking";
import ClientHistory from "@/views/UI/ClientManagement/ClientHistory";

import ClientEdit from "@/views/UI/ClientManagement/ClientEdit";

export default function ClientSlugClient({ slug }) {
  // 1. Render Client Add
  
  // 2. Render Client Edit
  if (slug === "edit-client") {
    return <ClientEdit />;
  }

  // 3. Render Client History
  if (slug === "view-history") {
    return <ClientHistory />;
  }

  // 4. Render Case Tracking
  if (slug === "case-tracking") {
    return <CaseTracking />;
  }

  // Default fallback if unknown slug
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold">Unknown Action</h1>
      <Link href="/client-management" className="text-blue-600 underline">
        Back to Client Management
      </Link>
    </div>
  );
}
