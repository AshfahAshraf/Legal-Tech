"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";
import LawfirmAdd from "./LawfirmAdd";

export default function LawfirmTableView({ advocate }) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);

  if (!advocate) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <p className="text-red-500">Advocate not found</p>
      </div>
    );
  }

  // Edit in same page
  if (editMode) {
    return (
      <LawfirmAdd
        initialData={advocate}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <div className="w-full space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
        {/* Top buttons */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-12 h-12 rounded-full border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors shrink-0"
          >
            <ArrowLeft size={20} className="text-[#0F172A]" />
          </button>

          <button
            onClick={() => setEditMode(true)}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Pencil size={16} />
            Edit Profile
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center border-b border-[#F1F5F9] pb-8 mb-8">
          {/* Profile Image */}
          <div className="shrink-0">
            <img
              src={advocate.profileImage?.trim() ? advocate.profileImage : `https://ui-avatars.com/api/?name=${advocate.advocateName || (advocate.role === 'Clerk' ? 'Clerk' : 'Advocate')}&background=E2E8F0&color=64748B&rounded=true&bold=true&size=150`}
              alt="Profile"
              className="w-36 h-36 rounded-full object-cover border-[6px] border-white shadow-xl shadow-slate-300/50 bg-white"
            />
          </div>

          {/* Title Info */}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-[#0F172A] font-extrabold text-4xl tracking-tight">
              {advocate.advocateName}
            </h2>
            <p className="text-[#64748B] mt-2 text-lg font-medium">
              {advocate.role || "Junior Advocate"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${advocate.status === "Active" || !advocate.status
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                }`}>
                {advocate.status || "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm">👤</span>
              Personal Information
            </h3>
            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] space-y-4">
              <InfoRow label="Phone Number" value={advocate.phoneNumber} />
              <InfoRow label="Email Address" value={advocate.emailAddress} />
              <InfoRow label="Gender" value={advocate.gender} />
              <InfoRow label="City" value={advocate.city} />
              <InfoRow label="State" value={advocate.state} />
              <InfoRow label="Pincode" value={advocate.pincode} />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">⚖️</span>
              Professional Information
            </h3>
            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] space-y-4">
              <InfoRow label="Role" value={advocate.role || "Junior Advocate"} />
              {advocate.role !== "Clerk" && <InfoRow label="Bar Council ID" value={advocate.barCouncilId} />}
              {advocate.role !== "Clerk" && <InfoRow label="Practice Court" value={advocate.practiceCourt} />}
              <InfoRow label="Years of Experience" value={advocate.yearsOfExperience ? `${advocate.yearsOfExperience} Years`  : "-" } />
            </div>
          </div>
        </div>

        {/* Address */}
        {advocate.chambersAddress && (
          <div className="mt-8 border-t border-[#F1F5F9] pt-8">
            <h3 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">🏢</span>
              Chambers Address
            </h3>
            <p className="text-[#475569] whitespace-pre-line leading-relaxed text-sm bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0]">
              {advocate.chambersAddress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-4 py-3 border-b border-[#E2E8F0] last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
        {label}
      </span>

      <span className="text-sm font-medium text-[#0F172A] break-words">
        {value || "-"}
      </span>
    </div>
  );
}