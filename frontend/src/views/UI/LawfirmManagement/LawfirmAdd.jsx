"use client";

import { API_BASE_URL } from "@/utils/api";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputField/InputField";
import SelectField from "@/components/SelectField/SelectField";
import { DISTRICT_COURTS } from "@/utils/districtCourts";

export default function LawfirmAdd({ onCancel, initialData }) {
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [existingUsers, setExistingUsers] = useState([]);
  const [existingAdvocates, setExistingAdvocates] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, advRes] = await Promise.all([
          fetch(`${API_BASE_URL}/permissions/users`),
          fetch(`${API_BASE_URL}/lawfirm-management/`),
        ]);
        if (usersRes.ok) {
          setExistingUsers(await usersRes.json());
        }
        if (advRes.ok) {
          setExistingAdvocates(await advRes.json());
        }
      } catch (err) {
        console.error("Failed to load existing users/advocates for validation:", err);
      }
    };
    fetchData();
  }, []);

  // Convert null values in initialData to empty strings to avoid controlled input warnings
  const sanitizedInitialData = {};
  if (initialData) {
    Object.keys(initialData).forEach((key) => {
      sanitizedInitialData[key] = initialData[key] ?? "";
    });
  }





  const [formData, setFormData] = useState({
    id: null,
    advocateName: "",
    barCouncilId: "",
    phoneNumber: "",
    emailAddress: "",
    gender: "",
    practiceCourt: "",
    yearsOfExperience: "",
    city: "",
    state: "",
    pincode: "",
    chambersAddress: "",
    profileImage: "",
    status: "Active",
    tempPassword: "",
    role: "Clerk",
    ...sanitizedInitialData,
  });

  const [practiceDistrict, setPracticeDistrict] = useState(() => {
    const pc = sanitizedInitialData.practiceCourt || "";
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

  const [isSubmitting, setIsSubmitting] = useState(false);


  function validateField(name, value) {
    switch (name) {
      case "advocateName":
        if (!value.trim()) {
          return formData.role === "Clerk" ? "Clerk Name is required" : "Advocate Name is required";
        }
        const generatedUsername = value.trim().toLowerCase().replace(/\s+/g, "");
        const isNameNew = !formData.id;
        const isNameChanged = initialData && initialData.advocateName !== value.trim();
        const activeAdvUsernames = existingAdvocates.map(a => (a.advocateName || a.advocate_name || "").toLowerCase().replace(/\s+/g, ""));
        const activeAdvEmails = existingAdvocates.map(a => (a.emailAddress || a.email_address || "").toLowerCase().trim());
        if (
          (isNameNew || isNameChanged) &&
          existingUsers.some(u => {
            const uName = u.username?.toLowerCase();
            const uEmail = u.email?.toLowerCase();
            return uName === generatedUsername && (activeAdvUsernames.includes(uName) || activeAdvEmails.includes(uEmail));
          })
        ) {
          return "This name/username is already in use.";
        }
        return "";
      case "role":
        if (!value) return "Role is required";
        return "";

      case "barCouncilId":
        if (formData.role === "Clerk") return "";
        if (!value.trim()) return "Bar Council ID is required";
        if (!/^[A-Z]{1,5}\/\d{1,6}\/\d{4}$/i.test(value.trim())) {
          return "Invalid Bar Council ID format (e.g., K/1234/2023)";
        }
        const cleanBarId = value.trim().toLowerCase();
        const isBarIdNew = !formData.id;
        const isBarIdChanged = initialData && initialData.barCouncilId?.trim().toLowerCase() !== cleanBarId;
        if (
          (isBarIdNew || isBarIdChanged) &&
          existingAdvocates.some(
            (a) => String(a.id) !== String(formData.id) && a.barCouncilId?.trim().toLowerCase() === cleanBarId
          )
        ) {
          return "This Bar Council ID is already registered.";
        }
        return "";

      case "phoneNumber":
        if (!value.trim()) return "Phone Number is required";
        if (!/^\d{10}$/.test(value))
          return "Phone Number must be 10 digits";
        return "";



      case "emailAddress":
        if (!value.trim()) return "Email Address is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Invalid email address";
        
        const isEmailNew = !formData.id;
        const isEmailChanged = initialData && initialData.emailAddress !== value.trim();
        const activeEmails = existingAdvocates.map(a => (a.emailAddress || a.email_address || "").toLowerCase().trim());
        const activeUsernames = existingAdvocates.map(a => (a.advocateName || a.advocate_name || "").toLowerCase().replace(/\s+/g, ""));
        if (
          (isEmailNew || isEmailChanged) &&
          existingUsers.some(u => {
            const uEmail = u.email?.toLowerCase();
            const uName = u.username?.toLowerCase();
            return uEmail === value.trim().toLowerCase() && (activeEmails.includes(uEmail) || activeUsernames.includes(uName));
          })
        ) {
          return "This email address is already in use.";
        }
        return "";



      case "tempPassword":
        if (!formData.id && !value.trim()) return "Temporary password is required";
        return "";

      case "practiceCourt":
        if (formData.role === "Clerk") return "";
        if (!value.trim()) return "Practice Court is required";
        return "";

      case "yearsOfExperience":
        if (value && (isNaN(value) || Number(value) < 0))
          return "Years of Experience must be a positive number";
        return "";

      default:
        return "";
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    let val = value;
    if (name === "barCouncilId") {
      val = value.toUpperCase();
    }

    const numberFields = [
      "phoneNumber",
      "pincode",
      "yearsOfExperience",
    ];

    if (numberFields.includes(name)) {
      if (!/^\d*$/.test(val)) return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));

    const error = validateField(name, val);

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          profileImage: reader.result,
        }));
      };

      reader.readAsDataURL(file);
    }
  };

  function validateAll() {
    const fields = [
      "advocateName",
      "phoneNumber",
      "emailAddress",
      "yearsOfExperience",
    ];

    if (formData.role !== "Clerk") {
      fields.push("barCouncilId", "practiceCourt");
    }

    if (!formData.id) {
      fields.push("tempPassword");
    }

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


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateAll()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        advocateName: formData.advocateName,
        barCouncilId: formData.role === "Clerk" ? "" : formData.barCouncilId,
        phoneNumber: formData.phoneNumber,
        emailAddress: formData.emailAddress,
        gender: formData.gender,
        practiceCourt: formData.role === "Clerk" ? "" : formData.practiceCourt,
        yearsOfExperience: formData.yearsOfExperience
          ? Number(formData.yearsOfExperience)
          : null,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        chambersAddress: formData.chambersAddress,
        profileImage: formData.profileImage,
        status: formData.status || "Active",
        password: formData.tempPassword || null,
        confirmPassword: formData.tempPassword || null,
        role: formData.role,
      };

      let response;

      if (formData.id) {
        response = await fetch(
          `${API_BASE_URL}/lawfirm-management/${formData.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(`${API_BASE_URL}/lawfirm-management/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.detail || "";
        
        if (
          errMsg.toLowerCase().includes("bar council id") ||
          errMsg.toLowerCase().includes("already registered")
        ) {
          setErrors((prev) => ({
            ...prev,
            barCouncilId: "This Bar Council ID is already registered.",
          }));
          setTouched((prev) => ({
            ...prev,
            barCouncilId: true,
          }));
        } else if (errMsg.toLowerCase().includes("email")) {
          setErrors((prev) => ({
            ...prev,
            emailAddress: "This email address is already in use.",
          }));
          setTouched((prev) => ({
            ...prev,
            emailAddress: true,
          }));
        } else if (errMsg.toLowerCase().includes("username") || errMsg.toLowerCase().includes("name")) {
          setErrors((prev) => ({
            ...prev,
            advocateName: "This name/username is already in use.",
          }));
          setTouched((prev) => ({
            ...prev,
            advocateName: true,
          }));
        } else {
          alert(errMsg || "Failed to save advocate/clerk profile");
        }
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      console.log("Saved:", data);

      setSuccessMessage(
        formData.id
          ? "Profile updated successfully!"
          : "Profile saved successfully!"
      );

      setShowSuccessModal(true);


    } catch (error) {
      console.error("Save failed:", error);
      alert(error.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <form
        id="profile-form"
        className="space-y-8"
        onSubmit={handleSubmit}
      >
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-10 shadow-xl shadow-slate-200/40 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-6 top-6 flex items-center justify-center w-12 h-12 rounded-full border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft size={20} className="text-[#0F172A]" />
          </button>
          <div className="flex flex-col items-center">
            <div className="relative group">
              <img
                src={
                  formData.profileImage ||
                  `https://ui-avatars.com/api/?name=${formData.role === "Clerk" ? "Clerk" : "Advocate"}&background=E2E8F0&color=64748B&rounded=true&bold=true&size=150`
                }
                alt="profile"
                className="w-36 h-36 rounded-full object-cover border-[6px] border-white shadow-xl shadow-slate-300/50 transition-transform group-hover:scale-105"
              />

              <label className="absolute bottom-1 right-1 bg-[#0F172A] hover:bg-[#1E293B] text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <h2 className="mt-6 text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Law Firm Profile
            </h2>
            <p className="text-[#64748B] text-sm mt-1 font-medium">
              Upload a professional photo for this {formData.role === "Clerk" ? "clerk" : "advocate"}
            </p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 md:p-10 shadow-xl shadow-slate-200/40">
          <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              👤
            </span>
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* Role select */}
            <SelectField
              label="Role"
              options={["Clerk", "Junior Advocate"]}
              name="role"
              value={formData.role}
              onChange={handleChange}
            />            {/* Name */}
            <div>
              <InputField
                label={formData.role === "Clerk" ? "Clerk Name" : "Advocate Name"}
                name="advocateName"
                placeholder={formData.role === "Clerk" ? "e.g. John" : "e.g. Adv. John"}
                value={formData.advocateName}
                onChange={handleChange}
                error={touched.advocateName ? errors.advocateName : ""}
              />
            </div>

            {/* Bar Council ID */}
            {formData.role !== "Clerk" && (
              <div>
                <InputField
                  label="Bar Council ID"
                  name="barCouncilId"
                  placeholder="e.g. K/1234/2023"
                  value={formData.barCouncilId}
                  onChange={handleChange}
                  error={touched.barCouncilId ? errors.barCouncilId : ""}
                />
              </div>
            )}

            {/* Years of Experience */}
            <div>
              <InputField
                label="Years of Experience (Optional)"
                type="number"
                name="yearsOfExperience"
                placeholder="Enter Experience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                error={touched.yearsOfExperience ? errors.yearsOfExperience : ""}
              />
            </div>

            {/* Phone Number */}
            <div>
              <InputField
                label="Phone Number"
                placeholder="e.g. 9876543210"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                maxLength={10}
                error={touched.phoneNumber ? errors.phoneNumber : ""}
              />
            </div>

            {/* Email */}
            <div>
              <InputField
                label="Email Address"
                type="email"
                placeholder="e.g. example@email.com"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
                error={touched.emailAddress ? errors.emailAddress : ""}
              />
            </div>



            {/* Gender */}
            <SelectField
              label="Gender"
              options={["Male", "Female", "Other"]}
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            />


            {/* Temporary Password */}
            {!formData.id && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[#0F172A]">
                    Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                      let password = "temp_";
                      for (let i = 0; i < 8; i++) {
                        password += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setFormData((prev) => ({ ...prev, tempPassword: password }));
                      setErrors((prev) => ({ ...prev, tempPassword: "" }));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    Generate Password
                  </button>
                </div>
                <input
                  type="text"
                  name="tempPassword"
                  placeholder="e.g. temp_1aT47b6w"
                  value={formData.tempPassword || ""}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
                />
                {touched.tempPassword && errors.tempPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.tempPassword}</p>
                )}
              </div>
            )}

            {/* Status */}
            <div>
              <SelectField
                label="Status"
                options={["Active", "Inactive"]}
                name="status"
                value={formData.status || "Active"}
                onChange={handleChange}
              />
            </div>

          </div>
        </div>

        {/* Professional Information */}
        {formData.role !== "Clerk" && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 md:p-10 shadow-xl shadow-slate-200/40">
            <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                ⚖️
              </span>
              Professional Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* Practice District */}
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

              {/* Practice Court */}
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
                {touched.practiceCourt && errors.practiceCourt && (
                  <p className="text-red-500 text-sm mt-1">{errors.practiceCourt}</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Address Information */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-8 md:p-10 shadow-xl shadow-slate-200/40">
          <h2 className="text-xl font-extrabold text-[#0F172A] mb-8 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              🏢
            </span>
            Address Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* City */}
            <div>
              <InputField
                label="City (Optional)"
                name="city"
                placeholder="Enter City"
                value={formData.city}
                onChange={handleChange}
              />
              {touched.city && errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            {/* State */}
            <div>
              <InputField
                label="State (Optional)"
                name="state"
                placeholder="Enter State"
                value={formData.state}
                onChange={handleChange}
              />
              {touched.state && errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state}</p>
              )}
            </div>

            {/* Pincode */}
            <div>
              <InputField
                label="Pincode (Optional)"
                name="pincode"
                placeholder="Enter Pincode"
                value={formData.pincode}
                onChange={handleChange}
                maxLength={6}
              />
              {touched.pincode && errors.pincode && (
                <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>
              )}
            </div>

          </div>

          {/* Chambers Address */}
          <div className="mt-8">
            <label className="block mb-2 text-sm font-medium text-[#0F172A]">
              Chambers Address (Optional)
            </label>

            <textarea
              rows="4"
              placeholder="Enter Chambers Address"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 outline-none transition-all duration-200 ${touched.chambersAddress && errors.chambersAddress
                ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                : "border-[#E2E8F0] focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                }`}
              name="chambersAddress"
              value={formData.chambersAddress}
              onChange={handleChange}
            />

            {touched.chambersAddress && errors.chambersAddress && (
              <p className="text-red-500 text-sm mt-1">
                {errors.chambersAddress}
              </p>
            )}
          </div>
        </div>


        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-12">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-3.5 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-[0.98] w-full sm:w-auto ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "Saving..." : (formData.id ? "Update Profile" : "Save Profile")}
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
      {showSuccessModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 w-full max-w-sm text-center transform transition-all duration-300 scale-100 animate-in zoom-in-95">
            {/* Icon Container */}
            <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-100/60 animate-ping opacity-25" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100/80 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 stroke-[2.2]" />
              </div>
            </div>

            {/* Title & Message */}
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Success!
            </h2>

            <p className="text-sm font-medium text-slate-500 mt-2 mb-7 leading-relaxed">
              {successMessage || "Profile saved successfully!"}
            </p>

            {/* Action Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/lawfirm-management");
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 text-sm tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              OK, Continue
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}