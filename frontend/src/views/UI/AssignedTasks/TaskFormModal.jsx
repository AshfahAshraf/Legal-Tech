"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, AlertCircle, Loader2, Briefcase, User, Calendar, FileText } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { getTodayDateString } from "@/utils/dateUtils";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { getLoggedInUser } from "@/utils/auth";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const inputStyle = {
  width: "100%",
  padding: "10px 13px",
  border: "1.5px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#0F172A",
  background: "#FAFBFC",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748B",
  marginBottom: "5px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export default function TaskFormModal({ onClose, onSaved, editTask = null }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [juniors, setJuniors] = useState([]);
  const [cases, setCases] = useState([]);
  const [assignedCases, setAssignedCases] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [workflowDocuments, setWorkflowDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoFilledAdv, setAutoFilledAdv] = useState("");
  const [form, setForm] = useState({
    title: editTask?.title || "",
    description: editTask?.description || "",
    priority: editTask?.priority || "Medium",
    due_date: editTask?.due_date || "",
    junior_advocate_id: editTask?.junior_advocate_id || "",
    case_id: editTask?.case_id || "",
    case_title: editTask?.case_title || "",
    case_no: editTask?.case_no || "",
    workflow_document_id: editTask?.workflow_document_id || "",
  });

  useEffect(() => {
    fetchJuniors();
    fetchCases();
    fetchAssignedCases();
    fetchLeaveRequests();
    if (editTask?.junior_advocate_id) {
      fetchWorkflowDocumentsForJunior(editTask.junior_advocate_id);
    }
  }, []);

  const fetchLeaveRequests = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/leaves?status=Approved&scope=all&view_mode=senior`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data);
      }
    } catch (e) {
      console.error("Error fetching leave requests:", e);
    }
  };

  const fetchAssignedCases = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/lawfirm-management/assigned-cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedCases(data);
      }
    } catch (e) {
      console.error("Error fetching assigned cases:", e);
    }
  };

  const fetchJuniors = async () => {
    const token = localStorage.getItem("token");
    try {
      let staffList = [];
      const res = await fetch(`${API_BASE_URL}/permissions/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const users = await res.json();
        staffList = users.filter((u) => u.role && (u.role.toLowerCase().includes("junior") || u.role.toLowerCase().includes("clerk") || u.role.toLowerCase().includes("advocate")));
      }

      // Also fetch from lawfirm-management/ to ensure all newly added Clerks & Advocates are included
      try {
        const resAdv = await fetch(`${API_BASE_URL}/lawfirm-management/`);
        if (resAdv.ok) {
          const advs = await resAdv.json();
          advs.forEach((adv) => {
            const advName = adv.advocateName || adv.advocate_name || "";
            if (
              advName &&
              !staffList.some(
                (s) =>
                  (s.username || "").toLowerCase() === advName.toLowerCase() ||
                  (s.email || "").toLowerCase() === (adv.emailAddress || adv.email_address || "").toLowerCase()
              )
            ) {
              staffList.push({
                id: adv.id,
                username: advName,
                first_name: advName,
                last_name: `(${adv.role || "Staff"})`,
                role: adv.role || "Advocate",
              });
            }
          });
        }
      } catch (err) {
        console.error("Error fetching lawfirm members:", err);
      }

      setJuniors(staffList);
    } catch (e) {
      console.error("Error fetching juniors and clerks:", e);
    }
  };

  const fetchCases = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (e) {
      console.error("Error fetching cases:", e);
    }
  };

  const fetchWorkflowDocumentsForJunior = async (juniorId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/case-management/workflow/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(d => String(d.junior_id) === String(juniorId));
        setWorkflowDocuments(filtered);
      }
    } catch (e) {
      console.error("Error fetching workflow docs:", e);
    }
  };

  const isCurrentUser = (staff) => {
    const loggedIn = getLoggedInUser();
    if (!loggedIn || !staff) return false;

    if (staff.id && loggedIn.id && String(staff.id) === String(loggedIn.id)) {
      return true;
    }

    const curName = (loggedIn.sub || loggedIn.username || loggedIn.name || "").trim().toLowerCase();
    const uName = (staff.username || "").trim().toLowerCase();
    const fName = (staff.firstName || staff.first_name || "").trim().toLowerCase();
    const lName = (staff.lastName || staff.last_name || "").trim().toLowerCase();
    const fullName = `${fName} ${lName}`.trim().toLowerCase();

    if (curName && (uName === curName || fName === curName || fullName === curName)) {
      return true;
    }

    const curEmail = (loggedIn.email || "").trim().toLowerCase();
    const staffEmail = (staff.email || "").trim().toLowerCase();
    if (curEmail && staffEmail && curEmail === staffEmail) {
      return true;
    }

    return false;
  };

  const checkIsOnLeave = (staff) => {
    if (!staff || !leaveRequests || leaveRequests.length === 0) return false;
    const today = getTodayDateString();
    const staffUsername = (staff.username || "").trim().toLowerCase();
    const staffFirstName = (staff.firstName || staff.first_name || "").trim().toLowerCase();
    const staffLastName = (staff.lastName || staff.last_name || "").trim().toLowerCase();
    const staffFullName = `${staffFirstName} ${staffLastName}`.trim().toLowerCase();

    return leaveRequests.some((lr) => {
      const isApproved = String(lr.status || "").toLowerCase() === "approved";
      
      const matchId = String(lr.user_id) === String(staff.id);
      const appName = (lr.applicant_name || "").trim().toLowerCase();
      const matchName = Boolean(
        appName &&
        (appName.includes(staffUsername) ||
         (staffUsername && appName.includes(staffUsername)) ||
         (staffFirstName && appName.includes(staffFirstName)) ||
         (staffFullName && appName.includes(staffFullName)))
      );

      const matchesUser = matchId || matchName;
      const inDateRange = (!lr.from_date || lr.from_date <= today) && (!lr.to_date || today <= lr.to_date);
      return isApproved && matchesUser && inDateRange;
    });
  };

  const getAssignedStaffForCase = (caseId) => {
    if (!caseId) return [];
    const found = cases.find((c) => String(c.id) === String(caseId));
    const matchedAssigned = assignedCases.find((ac) =>
      (found?.id && String(ac.case_id) === String(found.id)) ||
      (found?.case_no && ac.case_number && String(ac.case_number).trim().toLowerCase() === String(found.case_no).trim().toLowerCase()) ||
      (found?.case_title && ac.case_name && String(ac.case_name).trim().toLowerCase() === String(found.case_title).trim().toLowerCase())
    );

    const matchedList = [];
    const seenUserKeys = new Set();

    const processCandidate = (staffObjOrName, roleTag) => {
      if (!staffObjOrName) return;

      let matchedUser = null;
      let displayName = "";

      if (typeof staffObjOrName === "object" && staffObjOrName?.id) {
        matchedUser = staffObjOrName;
        displayName = staffObjOrName.username || `${staffObjOrName.firstName || staffObjOrName.first_name || ""} ${staffObjOrName.lastName || staffObjOrName.last_name || ""}`.trim();
      } else if (typeof staffObjOrName === "string" && staffObjOrName.trim()) {
        displayName = staffObjOrName.trim();
        const lower = displayName.toLowerCase();
        matchedUser = juniors.find((j) => {
          const uName = (j.username || "").toLowerCase();
          const fName = (j.firstName || j.first_name || "").toLowerCase();
          const lName = (j.lastName || j.last_name || "").toLowerCase();
          const fullName = `${fName} ${lName}`.trim();
          return uName === lower || fName === lower || fullName === lower || uName.includes(lower) || lower.includes(uName);
        });
      }

      if (matchedUser) {
        const uKey = `user-${matchedUser.id}`;
        if (!seenUserKeys.has(uKey)) {
          seenUserKeys.add(uKey);
          matchedList.push({
            ...matchedUser,
            id: matchedUser.id,
            uniqueKey: uKey,
            username: matchedUser.username || displayName,
            first_name: matchedUser.firstName || matchedUser.first_name || displayName,
            last_name: matchedUser.lastName || matchedUser.last_name || "",
            roleTag,
            role: matchedUser.role || "Advocate",
            isOnLeave: checkIsOnLeave(matchedUser),
          });
        }
      } else if (displayName) {
        const syntheticKey = `name-${displayName.toLowerCase()}`;
        if (!seenUserKeys.has(syntheticKey)) {
          seenUserKeys.add(syntheticKey);
          // Search juniors by partial match or fallback
          const fallbackUser = juniors.find((j) => {
            const uName = (j.username || "").toLowerCase();
            const fName = (j.firstName || j.first_name || "").toLowerCase();
            return uName.includes(displayName.toLowerCase()) || displayName.toLowerCase().includes(uName) || fName.includes(displayName.toLowerCase());
          });

          matchedList.push({
            id: fallbackUser?.id || juniors[0]?.id || 1,
            uniqueKey: syntheticKey,
            username: displayName,
            first_name: displayName,
            last_name: "",
            roleTag,
            role: "Advocate",
            isOnLeave: checkIsOnLeave({ username: displayName, first_name: displayName }),
          });
        }
      }
    };

    // 1. Lead / Primary advocate
    const leadName = (matchedAssigned?.advocate_name || matchedAssigned?.advocateName || "").trim();
    if (matchedAssigned?.advocate_id) {
      const s = juniors.find((j) => String(j.id) === String(matchedAssigned.advocate_id));
      processCandidate(s || leadName, "Lead Advocate");
    } else if (leadName) {
      processCandidate(leadName, "Lead Advocate");
    }

    // 2. Secondary / Backup advocate
    const secName = (matchedAssigned?.secondary_advocate_name || matchedAssigned?.secondaryAdvocateName || "").trim();
    if (secName) {
      processCandidate(secName, "Secondary Advocate");
    }

    // 3. Junior advocate
    const junName = (matchedAssigned?.junior_advocate_name || matchedAssigned?.juniorAdvocateName || "").trim();
    if (matchedAssigned?.junior_advocate_id) {
      const s = juniors.find((j) => String(j.id) === String(matchedAssigned.junior_advocate_id));
      processCandidate(s || junName, "Junior Advocate");
    } else if (junName) {
      processCandidate(junName, "Junior Advocate");
    }

    // 4. Appearances Advocates
    if (matchedAssigned?.appearances) {
      let appList = matchedAssigned.appearances;
      if (typeof appList === "string") {
        try { appList = JSON.parse(appList); } catch (e) { appList = []; }
      }
      if (Array.isArray(appList)) {
        appList.forEach((app) => {
          const appAdv = (app.advocate_name || app.advocateName || "").trim();
          if (appAdv) {
            processCandidate(appAdv, "Appearance Advocate");
          }
        });
      }
    }

    // 5. Case level selected advocate
    if (found?.selected_advocate) {
      processCandidate(found.selected_advocate, "Assigned Advocate");
    }

    return matchedList;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "case_id") {
      if (!value) {
        setForm((f) => ({ ...f, case_id: "", case_title: "", case_no: "" }));
        setAutoFilledAdv("");
      } else {
        const found = cases.find((c) => String(c.id) === String(value));
        const caseStaff = getAssignedStaffForCase(value).filter((s) => !isCurrentUser(s));
        
        const activeStaff = caseStaff.find((s) => !s.isOnLeave) || caseStaff[0];

        setForm((f) => ({
          ...f,
          case_id: value,
          case_title: found ? found.case_title : "",
          case_no: found ? found.case_no : "",
          ...(activeStaff ? { junior_advocate_id: String(activeStaff.id || "") } : {}),
        }));

        if (activeStaff) {
          const staffName = activeStaff.username || `${activeStaff.firstName || activeStaff.first_name || ""} ${activeStaff.lastName || activeStaff.last_name || ""}`.trim();
          const roleLabel = activeStaff.roleTag || activeStaff.role || "Advocate";
          const leaveNotice = activeStaff.isOnLeave ? " [ON LEAVE TODAY]" : "";
          const primaryOnLeaveWarning = caseStaff[0] && caseStaff[0].isOnLeave && activeStaff.id !== caseStaff[0].id ? " (Primary Advocate on Leave)" : "";
          
          setAutoFilledAdv(`Auto-filled: ${staffName} (${roleLabel})${primaryOnLeaveWarning}${leaveNotice}`);
          fetchWorkflowDocumentsForJunior(activeStaff.id);
        } else {
          setAutoFilledAdv("");
        }
      }
    } else if (name === "junior_advocate_id") {
      setForm((f) => ({
        ...f,
        junior_advocate_id: value,
        workflow_document_id: "",
      }));
      setAutoFilledAdv("");
      if (value) {
        const isCaseSelected = Boolean(form.case_id);
        const pool = isCaseSelected ? getAssignedStaffForCase(form.case_id) : juniors;
        const selected = pool.find((s) => String(s.id) === String(value));
        if (selected && (selected.isOnLeave || checkIsOnLeave(selected))) {
          const advName = selected.username || `${selected.firstName || selected.first_name || ""} ${selected.lastName || selected.last_name || ""}`.trim() || "Advocate";
          setError(`Cannot assign task to ${advName} because they are currently on leave today.`);
        } else {
          setError("");
        }
        fetchWorkflowDocumentsForJunior(value);
      } else {
        setError("");
        setWorkflowDocuments([]);
      }
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Task title is required."); return; }
    if (!form.junior_advocate_id) { setError("Please select an Assignee."); return; }

    const isCaseSelected = Boolean(form.case_id);
    const pool = isCaseSelected ? getAssignedStaffForCase(form.case_id) : juniors;
    const selected = pool.find((s) => String(s.id) === String(form.junior_advocate_id));

    if (selected && (selected.isOnLeave || checkIsOnLeave(selected))) {
      const advName = selected.username || `${selected.firstName || selected.first_name || ""} ${selected.lastName || selected.last_name || ""}`.trim() || "Selected Advocate";
      setError(`Cannot assign task to ${advName} because they are currently on leave today.`);
      return;
    }

    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        due_date: form.due_date || null,
        junior_advocate_id: parseInt(form.junior_advocate_id, 10),
        case_id: form.case_id ? parseInt(form.case_id, 10) : null,
        case_title: form.case_title || null,
        case_no: form.case_no || null,
        workflow_document_id: form.workflow_document_id ? parseInt(form.workflow_document_id, 10) : null,
      };

      const url = editTask
        ? `${API_BASE_URL}/advocate/tasks/${editTask.id}`
        : `${API_BASE_URL}/advocate/tasks/`;
      const method = editTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      if (!res.ok) {
        let detail = `Server error (${res.status})`;
        try {
          const data = JSON.parse(responseText);
          detail = data.detail || detail;
        } catch {}
        setError(detail);
        return;
      }

      const saved = JSON.parse(responseText);
      onSaved(saved, !!editTask);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || typeof window === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.18)",
          width: "100%",
          maxWidth: "780px",
          maxHeight: "92vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{
          background: "linear-gradient(135deg,#1E3A8A,#2563EB)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 }}>
              {editTask ? "Edit Task" : "Assign New Task"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: "2px 0 0" }}>
              {editTask ? "Update task details below" : "Create and assign a task"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px", overflowY: "auto" }}>
          {/* Center Alert Popup Modal */}
          {error && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.65)",
                backdropFilter: "blur(4px)",
                zIndex: 1200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                animation: "fadeIn 0.2s ease-out",
              }}
              onClick={() => setError("")}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                  width: "100%",
                  maxWidth: "420px",
                  padding: "24px",
                  textAlign: "center",
                  animation: "slideUp 0.2s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#FEF2F2",
                    border: "2px solid #FCA5A5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    color: "#DC2626",
                  }}
                >
                  <AlertCircle size={26} />
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
                  Assignment Notice
                </h3>

                <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.5, margin: "0 0 20px" }}>
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => setError("")}
                  style={{
                    width: "100%",
                    padding: "11px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg,#DC2626,#B91C1C)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(220,38,38,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  OK, I Understand
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Task Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., Prepare Vakalatnama draft"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add detailed instructions..."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>
                  <AlertCircle size={10} style={{ marginRight: "4px", display: "inline" }} />
                  Priority
                </label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  <Calendar size={10} style={{ marginRight: "4px", display: "inline" }} />
                  Due Date
                </label>
                <CustomDatePicker
                  selected={form.due_date}
                  onChange={(dateStr) => setForm({ ...form, due_date: dateStr })}
                  minDate={new Date()}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                <Briefcase size={10} style={{ marginRight: "4px", display: "inline" }} />
                Link to Case (Optional)
              </label>
              <select
                name="case_id"
                value={form.case_id}
                onChange={handleChange}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              >
                <option value="">— Standalone Task (No Case Link) —</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_title} ({c.case_no})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <User size={10} style={{ marginRight: "4px", display: "inline" }} />
                  Assign To *
                </label>
              </div>
              {(() => {
                const isCaseSelected = Boolean(form.case_id);
                const filterAssignee = (j) => {
                  if (editTask && String(j.id) === String(editTask?.junior_advocate_id)) return true;
                  return !isCurrentUser(j);
                };
                const caseStaff = getAssignedStaffForCase(form.case_id).filter(filterAssignee);
                const availableJuniors = juniors.filter(filterAssignee);

                return (
                  <select
                    name="junior_advocate_id"
                    value={form.junior_advocate_id}
                    onChange={handleChange}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                    onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                  >
                    <option value="">— Select Assignee —</option>

                    {isCaseSelected ? (
                      caseStaff.map((j) => (
                        <option key={j.uniqueKey || j.id} value={j.id} style={{ color: j.isOnLeave ? "#DC2626" : "#0F172A", fontWeight: "bold" }}>
                          {j.isOnLeave ? "[ON LEAVE TODAY] " : ""}
                          {j.username || `${j.firstName || j.first_name || ""} ${j.lastName || j.last_name || ""}`.trim() || `User #${j.id}`} ({j.roleTag || j.role || "Assigned Advocate"})
                        </option>
                      ))
                    ) : (
                      availableJuniors.map((j) => {
                        const onLeave = checkIsOnLeave(j);
                        return (
                          <option key={j.id} value={j.id} style={{ color: onLeave ? "#DC2626" : "#0F172A" }}>
                            {onLeave ? "[ON LEAVE TODAY] " : ""}
                            {j.username || `${j.firstName || j.first_name || ""} ${j.lastName || j.last_name || ""}`.trim() || `User #${j.id}`} ({j.role || "Staff"})
                          </option>
                        );
                      })
                    )}
                  </select>
                );
              })()}
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "9px",
                border: "1.5px solid #E2E8F0",
                background: "#fff",
                color: "#64748B",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 24px",
                borderRadius: "9px",
                border: "none",
                background: loading ? "#94A3B8" : "linear-gradient(135deg,#2563EB,#1d4ed8)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: loading ? "none" : "0 4px 12px rgba(37,99,235,0.3)",
                transition: "all 0.2s",
              }}
            >
              {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
              {loading ? "Saving..." : (editTask ? "Update Task" : "Assign Task")}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
}
