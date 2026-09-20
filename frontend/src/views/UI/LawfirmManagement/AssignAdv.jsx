"use client";

import { API_BASE_URL } from "@/utils/api";
import { DISTRICT_COURTS } from "@/utils/districtCourts";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, ArrowLeft } from "lucide-react";

// Helper function to resolve district from a court name string
const findDistrictForCourt = (courtName) => {
  if (!courtName) return "";
  for (const [district, courts] of Object.entries(DISTRICT_COURTS)) {
    if (courts.includes(courtName)) {
      return district;
    }
  }
  // Partial match fallback
  for (const [district, courts] of Object.entries(DISTRICT_COURTS)) {
    if (courts.some(c => c.toLowerCase().includes(courtName.toLowerCase()) || courtName.toLowerCase().includes(district.toLowerCase()))) {
      return district;
    }
  }
  return "";
};

export default function AssignAdv({ isOpen, onClose }) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id");
  const directCaseId = searchParams.get("directCaseId");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    caseName: "",
    caseNumber: "",
    district: "",
    courtName: "",
    advocateName: "",
    secondaryAdvocateName: "",
    assignmentNotes: "",
    status: "Active",
    clientName: "",
    caseIdVal: "",
  });

  useEffect(() => {
    if (!caseId) return;

    const fetchCase = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/lawfirm-management/assigned-cases/${caseId}`
        );

        const data = await res.json();
        const courtNameVal = data.practiceCourt || data.practice_court || "";
        const districtVal = data.district || data.client_district || findDistrictForCourt(courtNameVal);

        setFormData({
          caseName: data.case_name || "",
          caseNumber: data.case_number || "",
          advocateName: data.advocate_name || "",
          secondaryAdvocateName: data.secondary_advocate_name || data.secondaryAdvocateName || "",
          district: districtVal,
          courtName: courtNameVal,
          assignmentNotes: data.assignment_notes || "",
          status: data.status || "Active",
          clientName: data.client_name || "",
          caseIdVal: data.case_id || "",
        });
      } catch (error) {
        console.error("Error fetching case:", error);
      }
    };

    fetchCase();
  }, [caseId]);

  const [advocates, setAdvocates] = useState([]);

  useEffect(() => {
    const fetchAdvocates = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/lawfirm-management/`
        );

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const advocateOnlyList = list.filter((adv) => {
          const role = (adv.role || "").toLowerCase().trim();
          return role !== "clerk" && role !== "client";
        });
        setAdvocates(advocateOnlyList);
      } catch (error) {
        console.error("Error fetching advocates:", error);
      }
    };

    fetchAdvocates();
  }, []);

  const [cases, setCases] = useState([]);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const [casesRes, assignedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/case-management/`),
          fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases`).catch(() => null),
        ]);

        let assignedList = [];
        if (assignedRes && assignedRes.ok) {
          try {
            assignedList = await assignedRes.json();
          } catch (e) {}
        }

        if (casesRes.ok) {
          const data = await casesRes.json();
          const mappedCases = data.map((c) => {
            const courtName = c.court_name || "";
            const district = c.client_district || c.district || findDistrictForCourt(courtName);

            const assigned = (Array.isArray(assignedList) ? assignedList : []).find(
              (ac) =>
                (ac.case_number && c.case_no && String(ac.case_number).trim().toLowerCase() === String(c.case_no).trim().toLowerCase()) ||
                (ac.case_name && c.case_title && String(ac.case_name).trim().toLowerCase() === String(c.case_title).trim().toLowerCase()) ||
                (ac.case_title && c.case_title && String(ac.case_title).trim().toLowerCase() === String(c.case_title).trim().toLowerCase()) ||
                (ac.case_id && (ac.case_id === c.id || String(ac.case_id) === String(c.id)))
            );

            return {
              id: c.id,
              name: c.case_title || `Case ${c.id}`,
              caseNumber: c.case_no || `CASE-${c.id}`,
              caseTitle: c.case_title || `Case ${c.id}`,
              clientName: c.client_name || "",
              district: district,
              courtName: courtName,
              isAssigned: !!assigned,
              assignedTo: assigned ? (assigned.advocate_name || assigned.advocateName || "Advocate") : null,
            };
          });
          setCases(mappedCases);

          // Handle auto-preselection when directCaseId is passed
          if (directCaseId) {
            const selected = mappedCases.find((c) => String(c.id) === String(directCaseId));
            if (selected) {
              setFormData((prev) => ({
                ...prev,
                caseName: selected.name,
                caseNumber: selected.caseNumber,
                district: selected.district || "",
                courtName: selected.courtName || "", 
                clientName: selected.clientName,
                caseIdVal: selected.id,
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching cases:", error);
      }
    };

    fetchCases();
  }, [directCaseId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle case select
  const handleCaseSelect = (e) => {
    const selectedValue = e.target.value;

    const selectedCase = cases.find(
      (item) => item.name === selectedValue
    );

    if (selectedCase) {
      setFormData({
        ...formData,
        caseName: selectedValue,
        caseNumber: selectedCase.caseNumber,
        clientName: selectedCase.clientName,
        caseIdVal: selectedCase.id,
        district: selectedCase.district || "",
        courtName: selectedCase.courtName || "",
        advocateName: "",
        secondaryAdvocateName: "",
      });
    } else {
      // Reset when "Select Case" chosen
        setFormData({
          ...formData,
          caseName: "",
          caseNumber: "",
          district: "",
          courtName: "", 
          advocateName: "",
          secondaryAdvocateName: "",
          clientName: "",
          caseIdVal: "",
        });
    }
  };

  const handleUnassign = async () => {
    if (!caseId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases/${caseId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        if (onClose) onClose();
        else router.back();
      } else {
        alert("Failed to unassign case.");
      }
    } catch (error) {
      console.error("Error unassigning case:", error);
      alert("Error unassigning case.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      case_id: formData.caseIdVal ? parseInt(formData.caseIdVal, 10) : null,
      case_name: formData.caseName,
      case_number: formData.caseNumber,
      advocate_name: formData.advocateName,
      secondary_advocate_name: formData.secondaryAdvocateName || null,
      secondaryAdvocateName: formData.secondaryAdvocateName || null,

      district: formData.district,
      practice_court: formData.courtName,
      assignment_notes: formData.assignmentNotes,
      status: formData.status,
      client_name: formData.clientName,
    };

    try {
      const url = caseId
        ? `${API_BASE_URL}/lawfirm-management/assigned-cases/${caseId}`
        : `${API_BASE_URL}/lawfirm-management/assign-case`;
      const method = caseId ? "PUT" : "POST";

      const response = await fetch(
        url,
        {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Reset form
        setFormData({
          caseName: "",
          caseNumber: "",
          district: "",
          courtName: "", 
          advocateName: "",
          secondaryAdvocateName: "",
          assignmentNotes: "",
          status: "Active",
          clientName: "",
          caseIdVal: "",
        });

        setShowSuccess(true);
      } else {
        console.log("Error:", data);
        alert(`Failed to save assignment: ${data.detail || "Server error"}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert(`Error submitting assignment: ${error.message || "Network error"}`);
    }

  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#E2E8F0] transform transition-all duration-300 scale-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">
            {caseId ? "Update Successful" : "Assign Successful"}
          </h3>
          <p className="text-[#64748B] text-sm mb-6">
            The case has been successfully {caseId ? "updated" : "assigned to the advocate"}.
          </p>
          <button
            onClick={() => {
              setShowSuccess(false);
              if (onClose) onClose();
              else router.back();
            }}
            className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const filteredAdvocates = advocates.filter((adv) => {
    const role = (adv.role || "").toLowerCase().trim();
    if (role === "clerk" || role === "client") return false;

    const advCourt = (adv.practiceCourt || adv.practice_court || "").trim();
    const advCity = (adv.city || "").trim();
    const selectedCourt = (formData.courtName || "").trim();
    const selectedDistrict = (formData.district || "").trim();

    if (!selectedCourt && !selectedDistrict) return true;

    if (selectedCourt) {
      if (advCourt.toLowerCase() === selectedCourt.toLowerCase()) return true;
      if (advCourt && (selectedCourt.toLowerCase().includes(advCourt.toLowerCase()) || advCourt.toLowerCase().includes(selectedCourt.toLowerCase()))) return true;
    }

    if (selectedDistrict) {
      const distLower = selectedDistrict.toLowerCase();
      if (advCourt && advCourt.toLowerCase().includes(distLower)) return true;
      if (advCity && advCity.toLowerCase().includes(distLower)) return true;
      const districtCourtsList = DISTRICT_COURTS[selectedDistrict] || [];
      if (advCourt && districtCourtsList.some(c => c.toLowerCase() === advCourt.toLowerCase())) return true;
    }

    return false;
  });

  const displayAdvocates = filteredAdvocates.length > 0 ? filteredAdvocates : advocates;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-4 flex-shrink-0">
          <button
            onClick={onClose || (() => router.back())}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F8FAFC] text-[#64748B] hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-[#0F172A] flex-1">
            {caseId ? "Update Assigned Case" : "Assign Case to Advocate"}
          </h2>
          <button
            onClick={onClose || (() => router.back())}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F8FAFC] text-[#64748B] hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <span className="text-lg font-bold">✕</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

            {/* Case Name */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Case Name
              </label>
              {directCaseId || caseId ? (
                <input
                  type="text"
                  value={formData.caseName}
                  readOnly
                  className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 bg-slate-100 text-[#475569] text-xs font-medium outline-none cursor-not-allowed"
                />
              ) : (
                <select
                  value={formData.caseName}
                  onChange={handleCaseSelect}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
                  required
                >
                  <option value="">Select Case</option>
                  {cases.filter((item) => !item.isAssigned).length === 0 ? (
                    <option value="" disabled>No unassigned cases available</option>
                  ) : (
                    cases
                      .filter((item) => !item.isAssigned)
                      .map((item, index) => (
                        <option key={`${item.caseNumber}-${index}`} value={item.name}>
                          {item.name}
                        </option>
                      ))
                  )}
                </select>
              )}
            </div>

            {/* Case Number */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Case Number
              </label>
              <input
                type="text"
                value={formData.caseNumber}
                readOnly
                className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 bg-slate-100 text-[#475569] text-xs font-medium outline-none cursor-not-allowed"
              />
            </div>

            {/* District */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                District
              </label>
              <input
                type="text"
                value={formData.district || "N/A"}
                readOnly
                className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 bg-slate-100 text-[#475569] text-xs font-medium outline-none cursor-not-allowed"
              />
            </div>

            {/* Court Name */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Court Name
              </label>
              <input
                type="text"
                value={formData.courtName || "N/A"}
                readOnly
                className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 bg-slate-100 text-[#475569] text-xs font-medium outline-none cursor-not-allowed"
              />
            </div>

            {/* Primary Advocate Name */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Primary Advocate *
              </label>
              <select
                name="advocateName"
                value={formData.advocateName}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
                required
              >
                <option value="">Select Primary Advocate</option>
                {displayAdvocates.map((adv) => (
                  <option key={adv.id} value={adv.advocateName}>
                    {adv.advocateName} ({adv.role || "Advocate"}){adv.practiceCourt ? ` - ${adv.practiceCourt}` : ''}
                  </option>
                ))}
              </select>
              {(formData.courtName || formData.district) && (
                <span className={`text-[11px] font-medium mt-1 block ${filteredAdvocates.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {filteredAdvocates.length > 0 
                    ? `Showing ${filteredAdvocates.length} advocate(s) matching ${formData.courtName || formData.district}`
                    : `No exact advocate matches for ${formData.courtName || formData.district}; showing all advocates`}
                </span>
              )}
            </div>

            {/* Secondary / Standby Advocate (Optional) */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Secondary / Standby Advocate (Optional)
              </label>
              <select
                name="secondaryAdvocateName"
                value={formData.secondaryAdvocateName}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              >
                <option value="">None (No Standby Advocate)</option>
                {displayAdvocates
                  .filter(adv => adv.advocateName !== formData.advocateName)
                  .map((adv) => (
                    <option key={adv.id} value={adv.advocateName}>
                      {adv.advocateName} ({adv.role || "Advocate"}){adv.practiceCourt ? ` - ${adv.practiceCourt}` : ''}
                    </option>
                  ))}
              </select>
              <span className="text-[11px] text-[#64748B] font-medium mt-1 block">
                Proxy / backup if Primary Advocate is absent on hearing date
              </span>
            </div>

            {/* Status */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-medium text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold text-[#475569] uppercase tracking-wider">
              Assignment Notes / Instructions
            </label>
            <textarea
              name="assignmentNotes"
              value={formData.assignmentNotes}
              onChange={handleChange}
              rows="3"
              placeholder="Enter instructions for the advocate..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs font-medium text-[#0F172A] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
            ></textarea>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between gap-4">
            {caseId ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 size={14} />
                Unassign Case
              </button>
            ) : <div></div>}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose || (() => router.back())}
                className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-[#475569] font-semibold text-xs transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                {caseId ? "UPDATE ASSIGNMENT" : "ASSIGN CASE"}
              </button>
            </div>
          </div>


        </form>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center shadow-2xl border border-[#E2E8F0]">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] mb-2">Unassign Case?</h3>
            <p className="text-[#64748B] text-sm mb-6">
              Are you sure you want to remove this advocate assignment?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnassign}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Yes, Unassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}