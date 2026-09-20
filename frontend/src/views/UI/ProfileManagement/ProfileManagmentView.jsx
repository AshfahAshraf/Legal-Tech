"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import SelectField from "@/components/SelectField/SelectField";
import { getLoggedInUser } from "@/utils/auth";
import { DISTRICT_COURTS } from "@/utils/districtCourts";
import { API_BASE_URL } from "@/utils/api";
import ResetPasswordModal from "./ResetPasswordModal";


export default function ProfileManagmentView({ onSubmit, onCancel, initialData }) {
  const specializationOptionsMap = {
    "Civil Law": ["Property Disputes", "Contracts", "Torts", "Consumer Protection"],
    "Criminal Law": ["Bail Matters", "Cyber Crime", "White Collar Crime", "Narcotics"],
    "Corporate Law": ["Mergers & Acquisitions", "Intellectual Property", "Taxation", "Compliance"],
    "Family Law": ["Divorce", "Child Custody", "Alimony", "Domestic Violence"],
    "Property Law": ["Real Estate", "Land Disputes", "Tenant Rights", "Wills & Estates"],
  };

  const cleanInitialData = initialData
    ? Object.fromEntries(Object.entries(initialData).map(([k, v]) => [k, v === null ? "" : v]))
    : {};

  /* ── Profile form state ── */
  const [formData, setFormData] = useState({
    advocateName: "",
    barCouncilId: "",
    enrollmentNumber: "",
    phoneNumber: "",
    emailAddress: "",
    gender: "",
    panNumber: "",
    practiceCourt: "",
    courtType: "",
    yearsOfExperience: "",
    specialization: "",
    city: "",
    state: "",
    pincode: "",
    chambersAddress: "",
    profileImage: "",
    ...cleanInitialData,
  });

  const [practiceDistrict, setPracticeDistrict] = useState(() => {
    const pc = cleanInitialData.practiceCourt || "";
    if (pc.includes(" - ")) {
      return pc.split(" - ")[0];
    }
    for (const [dist, courts] of Object.entries(DISTRICT_COURTS)) {
      if (courts.includes(pc)) {
        return dist;
      }
    }
    return "";
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /* ── Reset-Password modal state ── */
  const [showResetModal, setShowResetModal] = useState(false);

  const [user, setUser] = useState(null);
  const roleLower = (user?.role || "").toLowerCase();
  const isClient = roleLower === "client";
  const isClerk = roleLower === "clerk";
  const [existingAdvocates, setExistingAdvocates] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      setUser(getLoggedInUser());
    }, 0);

    const fetchAdvocates = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/lawfirm-management/`);
        if (res.ok) {
          setExistingAdvocates(await res.json());
        }
      } catch (err) {
        console.error("Failed to load existing advocates for validation:", err);
      }
    };
    fetchAdvocates();
  }, []);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const clean = Object.fromEntries(
        Object.entries(initialData).map(([k, v]) => [k, v === null ? "" : v])
      );
      if (isClerk && clean.advocateName) {
        clean.advocateName = clean.advocateName.replace(/\s+Advocate$/i, "");
      }
      setFormData((prev) => ({
        ...prev,
        ...clean,
      }));
    }
  }, [initialData, isClerk]);

  /* ── Profile validation ── */
  function validateField(name, value) {
    switch (name) {
      case "advocateName": if (!value.trim()) return isClient ? "Full Name is required" : isClerk ? "Clerk Name is required" : "Advocate Name is required"; return "";
      case "barCouncilId":
        if (!isClient && !isClerk) {
          if (!value.trim()) return "Bar Council ID is required";
          if (!/^[A-Z]{1,5}\/\d{1,6}\/\d{4}$/i.test(value.trim())) {
            return "Invalid Bar Council ID format (e.g., K/1234/2023)";
          }
          const cleanBarId = value.trim().toLowerCase();
          const currentId = formData.id || cleanInitialData.id;
          const isBarIdNew = !currentId;
          const isBarIdChanged = cleanInitialData && cleanInitialData.barCouncilId?.trim().toLowerCase() !== cleanBarId;
          if (
            (isBarIdNew || isBarIdChanged) &&
            existingAdvocates.some(
              (a) => String(a.id) !== String(currentId) && a.barCouncilId?.trim().toLowerCase() === cleanBarId
            )
          ) {
            return "This Bar Council ID is already registered.";
          }
        }
        return "";
      case "phoneNumber": if (value && !/^\d{10}$/.test(value)) return "Phone Number must be 10 digits"; return "";
      case "emailAddress": if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address"; return "";
      case "practiceCourt": if (!isClient && !isClerk && !value.trim()) return "Practice Court is required"; return "";
      case "city": return "";      
      case "state": return "";
      case "pincode": if (value && !/^\d{6}$/.test(value)) return "Pincode must be 6 digits"; return "";
      case "chambersAddress": return "";      
      case "yearsOfExperience": if (value && (isNaN(value) || Number(value) < 0)) return "Experience must be positive"; return "";
      default: return "";
    }
  }

  function validateAll() {
    const fields = ["advocateName", ...(isClient || isClerk ? [] : ["barCouncilId", "practiceCourt"]), "phoneNumber", "emailAddress", "yearsOfExperience"];
    const newErrors = {};
    const newTouched = {};
    let valid = true;
    fields.forEach((field) => {
      const err = validateField(field, formData[field] || "");
      newErrors[field] = err;
      newTouched[field] = true;
      if (err) valid = false;
    });
    setErrors(newErrors);
    setTouched(newTouched);
    return valid;
  }

  /* ── Profile change/submit ── */


  const handleChange = (e) => {
    const { name, value } = e.target;
    const numberFields = ["phoneNumber", "pincode", "yearsOfExperience"];
    if (numberFields.includes(name)) {
      if (!/^\d*$/.test(value)) return;
    }
    let finalValue = value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
      ...(name === "practiceCourt" ? { specialization: "" } : {}),
    }));
    const error = validateField(name, finalValue);
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setFormData((prev) => ({ ...prev, profileImage: compressedBase64 }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    if (onSubmit) onSubmit(formData);
  };

  /* ── Render ── */
  return (
    <div className="w-full space-y-8 max-w-6xl mx-auto">
      <form id="profile-form" className="space-y-8" onSubmit={handleSubmit}>
        {/* Profile Photo Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-10 flex flex-col items-center">
          {/* Header Action Row inside Card */}
          <div className="w-full flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E2E8F0] hover:bg-slate-50 text-[#64748B] hover:text-[#0F172A] text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>
            <button
              type="submit"
              className="px-8 py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-[0.98] shrink-0 cursor-pointer"
            >
              Save Profile
            </button>
          </div>

          <div className="relative group">
            <img
              src={formData.profileImage || (user ? `https://ui-avatars.com/api/?name=${user.firstName || user.username}&background=2563EB&color=fff&rounded=true&bold=true&size=150` : "https://ui-avatars.com/api/?name=?&background=E2E8F0&color=64748B&rounded=true&bold=true&size=150")}
              alt="profile"
              className="w-36 h-36 rounded-full object-cover border-[6px] border-white shadow-xl shadow-slate-300/50 transition-transform group-hover:scale-105"
            />
            <label className="absolute bottom-1 right-1 bg-[#0F172A] hover:bg-[#1E293B] text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-[#0F172A] tracking-tight">Profile Photo</h2>
          <p className="text-[#64748B] text-sm mt-1 font-medium">Upload a professional photo for your profile</p>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
          <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">👤</span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div>
              <InputField
                label={isClient ? "Full Name" : isClerk ? "Clerk Name" : "Advocate Name"}
                placeholder={isClient ? "Enter Full Name" : isClerk ? "Enter Clerk Name" : "Enter Advocate Name"}
                name="advocateName"
                value={formData.advocateName}
                onChange={handleChange}
              />
              {touched.advocateName && errors.advocateName && (
                <p className="text-red-500 text-sm mt-1">{errors.advocateName}</p>
              )}
            </div>

            {!isClient && !isClerk && (
              <>
                <div>
                  <InputField label="Bar Council ID" placeholder="e.g. K/1234/2023" name="barCouncilId" value={formData.barCouncilId} onChange={handleChange} />
                  {touched.barCouncilId && errors.barCouncilId && <p className="text-red-500 text-sm mt-1">{errors.barCouncilId}</p>}
                </div>
              </>
            )}

            <div>
              <InputField label="Phone Number" placeholder="Enter Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
              {touched.phoneNumber && errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
            </div>
            <div>
              <InputField label="Email Address" type="email" placeholder="e.g. example@email.com" name="emailAddress" value={formData.emailAddress} onChange={handleChange} />
              {touched.emailAddress && errors.emailAddress && <p className="text-red-500 text-sm mt-1">{errors.emailAddress}</p>}
            </div>

            <div>
              <SelectField label="Gender" options={["Male", "Female", "Other"]} name="gender" value={formData.gender} onChange={handleChange} />
              {touched.gender && errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
            </div>
          </div>
        </div>

        {/* Professional Information */}
        {!isClient && !isClerk && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
            <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">⚖️</span>
              Professional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div>
                <SelectField
                  label="Practice District"
                  options={Object.keys(DISTRICT_COURTS)}
                  name="practiceDistrict"
                  value={practiceDistrict}
                  onChange={(e) => {
                    const dist = e.target.value;
                    setPracticeDistrict(dist);
                    setFormData(prev => ({ ...prev, practiceCourt: "" }));
                  }}
                />
              </div>

              <div>
                <SelectField
                  label="Practice Court"
                  options={practiceDistrict ? DISTRICT_COURTS[practiceDistrict] : []}
                  name="practiceCourt"
                  value={formData.practiceCourt.includes(" - ") ? formData.practiceCourt.split(" - ")[1] : formData.practiceCourt}
                  disabled={!practiceDistrict}
                  onChange={(e) => {
                    const court = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      practiceCourt: practiceDistrict ? `${practiceDistrict} - ${court}` : court
                    }));
                    const error = validateField("practiceCourt", practiceDistrict ? `${practiceDistrict} - ${court}` : court);
                    setErrors(prev => ({ ...prev, practiceCourt: error }));
                    setTouched(prev => ({ ...prev, practiceCourt: true }));
                  }}
                />
                {touched.practiceCourt && errors.practiceCourt && <p className="text-red-500 text-sm mt-1">{errors.practiceCourt}</p>}
              </div>

              <div>
                <InputField label="Years of Experience" type="number" placeholder="Enter Experience" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} />
                {touched.yearsOfExperience && errors.yearsOfExperience && <p className="text-red-500 text-sm mt-1">{errors.yearsOfExperience}</p>}
              </div>
              
            </div>
          </div>
        )}

        {/* Address Information */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
          <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">🏢</span>
            Address Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div>
              <InputField label="City (Optional)" placeholder="Enter City" name="city" value={formData.city} onChange={handleChange} />
              {touched.city && errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>
            <div>
              <InputField label="State (Optional)" placeholder="Enter State" name="state" value={formData.state} onChange={handleChange} />
              {touched.state && errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
            </div>
            <div>
              <InputField label="Pincode" placeholder="Enter Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
              {touched.pincode && errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
            </div>
          </div>
          <div className="mt-8">
            <label className="block mb-2 text-sm font-medium text-[#0F172A]">
              {isClient ? "Residential Address (Optional)" : isClerk ? "Office / Residential Address (Optional)" : "Chambers Address (Optional)"}
            </label>
            <div>
              <textarea
                rows="4"
                placeholder={isClient ? "Enter Residential Address" : isClerk ? "Enter Office / Residential Address" : "Enter Chambers Address"}
                className={`w-full rounded-xl border px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 outline-none transition-all duration-200 ${touched.chambersAddress && errors.chambersAddress ? "border-red-500 focus:ring-red-500/20" : "border-[#E2E8F0] focus:ring-[#2563EB]/20 focus:border-[#2563EB]"}`}
                name="chambersAddress"
                value={formData.chambersAddress}
                onChange={handleChange}
              />
              {touched.chambersAddress && errors.chambersAddress && <p className="text-red-500 text-sm mt-1">{errors.chambersAddress}</p>}
            </div>
          </div>
        </div>

        {/* About Section */}
        {isClient && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
            <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">📝</span>
              About Me
            </h2>
            <textarea
              rows="5"
              placeholder="Write a short professional bio..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              name="about"
              value={formData.about}
              onChange={handleChange}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-8">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-[0.98] w-full sm:w-auto"
          >
            Save Profile
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#475569] text-xs font-bold uppercase tracking-wider transition-colors w-full sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* ── Reset Password Card (opens modal) ── */}
      {user && (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-[#E2E8F0] p-8 md:p-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-base">🔒</span>
                Reset Password
              </h2>
              <p className="text-[#64748B] text-sm mt-1 ml-11">
                Change your password securely using email OTP verification.
              </p>
            </div>
            <button
              type="button"
              id="open-reset-modal-btn"
              onClick={() => setShowResetModal(true)}
              className="px-7 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Reset Password
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showResetModal && (
        <ResetPasswordModal onClose={() => setShowResetModal(false)} />
      )}
    </div>
  );
}