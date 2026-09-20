"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

export default function ClientEdit({ onSave, onCancel }) {
  const router = useRouter();

  const [originalName, setOriginalName] = useState("");
  const [formData, setFormData] = useState({
    clientId: "",
    fullName: "",
    email: "",
    phone: "",
    altPhone: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("clientData");

    if (data) {
      try {
        const parsed = JSON.parse(data);

        setFormData({
          clientId: parsed.clientId || "",
          fullName: parsed.fullName || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
          altPhone: parsed.altPhone || "",
        });
        setOriginalName(parsed.fullName || "");
      } catch (err) {
        console.error("Failed to parse client data:", err);
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.clientId ||
      !formData.fullName ||
      !formData.email ||
      !formData.phone
    ) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const payload = {
        original_name: originalName,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        alt_phone: formData.altPhone || null,
      };

      const res = await fetch(`${API_BASE_URL}/clients/${formData.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        localStorage.setItem("clientData", JSON.stringify(formData));
        setShowSuccess(true);
      } else {
        const errorData = await res.json();
        alert(`Failed to update client: ${errorData.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error updating client:", err);
      alert("Error connecting to server");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center gap-4 border-b border-[#F1F5F9] pb-4 mb-6">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center w-9 h-9 bg-white border border-[#E2E8F0] rounded-lg shadow-sm text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <Link
            href="/client-management"
            className="flex items-center justify-center w-9 h-9 bg-white border border-[#E2E8F0] rounded-lg shadow-sm text-[#64748B] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">
            Edit Client Details
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Modify client demographics and contact information.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">



          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Full Name *
            </label>

            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              placeholder="Enter Full Name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Email Address *
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              placeholder="Enter Email Address"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Mobile Number *
            </label>

            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength={10}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              placeholder="Enter Mobile Number"
            />
          </div>

          {/* Alt Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Alternative Mobile No.
            </label>

            <input
              type="text"
              name="altPhone"
              value={formData.altPhone || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData(prev => ({ ...prev, altPhone: val }));
              }}
              maxLength={10}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              placeholder="e.g. 9123456789 (optional)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                router.push("/client-management");
              }
            }}
            className="bg-[#DC2626]/90 hover:bg-[#DC2626] text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-6 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all duration-200 cursor-pointer"
          >
            Update Client
          </button>
        </div>
      </form>

      {showSuccess && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[10001] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center animate-scale-up">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-500 mb-4 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Client Updated Successfully
            </h3>
            <p className="text-xs text-slate-500 mb-6 px-2">
              The profile information and contact details for this client have been successfully saved to the system.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccess(false);
                if (onSave) {
                  onSave(formData);
                } else {
                  router.push("/client-management");
                }
              }}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}