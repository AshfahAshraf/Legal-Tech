"use client";

import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";
import { createPortal } from "react-dom";
/* ─── Icons ─── */
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function getStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: "Too Short", color: "bg-red-400" },
    { label: "Weak", color: "bg-red-400" },
    { label: "Fair", color: "bg-yellow-400" },
    { label: "Good", color: "bg-blue-400" },
    { label: "Strong", color: "bg-emerald-500" },
  ];
  return { score, ...map[score] };
}

/* ─── OTP Box ─── */
function OtpInput({ value, onChange }) {
  const digits = 6;
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const vals = value.split("").concat(Array(digits).fill("")).slice(0, digits);

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newVal = vals.map((v, idx) => (idx === i ? "" : v)).join("");
      onChange(newVal);
      if (i > 0) refs[i - 1].current?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    e.preventDefault();
    const newVal = [...vals];
    newVal[i] = e.key;
    onChange(newVal.join(""));
    if (i < digits - 1) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, digits);
    onChange(pasted.padEnd(digits, "").slice(0, digits).replace(/ /g, ""));
    refs[Math.min(pasted.length, digits - 1)].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {vals.map((v, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onChange={() => {}}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200
            ${v ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-[#E2E8F0] bg-white text-[#0F172A]"}
            focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100`}
        />
      ))}
    </div>
  );
}

/* ─── Step indicator ─── */
function StepIndicator({ step }) {
  const steps = ["Email", "OTP", "New Password"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${done ? "bg-emerald-500 text-white" : active ? "bg-[#2563EB] text-white ring-4 ring-blue-100" : "bg-slate-100 text-slate-400"}`}>
                {done ? "✓" : idx}
              </div>
              <span className={`text-[11px] font-semibold ${active ? "text-[#2563EB]" : done ? "text-emerald-600" : "text-slate-400"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-10 mb-4 rounded transition-all duration-300 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
   
  );
}

/* ────────────────────────────────────────────────────────── */
export default function ResetPasswordModal({ onClose }) {
  const [step, setStep] = useState(1);      // 1=email, 2=otp, 3=new-password
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(0);    // resend countdown
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [done, setDone] = useState(false);

  const strength = getStrength(password);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── countdown for resend ── */
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  /* ── Fetch logged-in user's email ── */
  useEffect(() => {
    setTimeout(() => {
      const loggedUser = getLoggedInUser();
      if (loggedUser?.email) {
        setEmail(loggedUser.email);
      }
    }, 0);
  }, []);

  if (!mounted) return null;

  /* ── Email validation ── */
  const validateEmail = (v) => {
    if (!v.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Please enter a valid email address";
    return "";
  };

  /* ── STEP 1: send OTP ── */
  const handleSendOtp = async () => {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    setGlobalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.detail || "Failed to send OTP.");
        return;
      }
      setStep(2);
      setTimer(60);
    } catch {
      setGlobalError("Cannot connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 2: verify OTP ── */
  const handleVerifyOtp = async () => {
    if (otp.replace(/\s/g, "").length < 6) {
      setOtpError("Please enter the full 6-digit OTP.");
      return;
    }
    setLoading(true);
    setGlobalError("");
    setOtpError("");
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.detail || "Invalid OTP.");
        return;
      }
      setStep(3);
    } catch {
      setGlobalError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 3: reset password ── */
  const handleReset = async () => {
    let valid = true;
    if (!password || password.length < 8) {
      setPwdError("Password must be at least 8 characters");
      valid = false;
    } else setPwdError("");

    if (!confirm) {
      setConfirmError("Please confirm your password");
      valid = false;
    } else if (confirm !== password) {
      setConfirmError("Passwords do not match");
      valid = false;
    } else setConfirmError("");

    if (!valid) return;

    setLoading(true);
    setGlobalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.detail || "Failed to reset password.");
        return;
      }
      setDone(true);
    } catch {
      setGlobalError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Backdrop click ── */
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ zIndex: 99999, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative animate-[fadeInScale_0.25s_ease]"
        style={{ animation: "fadeInScale 0.25s ease" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        {!done && (
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 text-2xl">🔐</div>
            <h2 className="text-2xl font-extrabold text-[#0F172A]">Reset Password</h2>
            <p className="text-[#64748B] text-sm mt-1">Follow the steps to securely reset your password</p>
          </div>
        )}

        {!done ? (
          <>
            <StepIndicator step={step} />

            {/* Global error */}
            {globalError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-start gap-2">
                <span className="mt-0.5">⚠️</span> {globalError}
              </div>
            )}

            {/* ── STEP 1: Email ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-[#0F172A]">Email Address</label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    disabled={true}
                    className="w-full rounded-xl border px-4 py-3 text-sm text-[#475569] bg-slate-50 border-[#E2E8F0] cursor-not-allowed outline-none transition-all duration-200"
                  />
                  {emailError && <p className="text-red-500 text-xs mt-1 font-medium">{emailError}</p>}
                  <p className="text-slate-400 text-xs mt-2">We&apos;ll send a 6-digit OTP to this address.</p>
                </div>
                <button
                  id="send-otp-btn"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Sending…</> : "Send OTP →"}
                </button>
              </div>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-[#64748B]">Enter the 6-digit code sent to</p>
                  <p className="font-bold text-[#2563EB] text-sm mt-0.5">{email}</p>
                </div>
                <OtpInput value={otp} onChange={setOtp} />
                {otpError && <p className="text-red-500 text-xs text-center font-medium">{otpError}</p>}

                {/* Resend */}
                <p className="text-center text-xs text-slate-400">
                  {timer > 0 ? (
                    <>Resend OTP in <span className="font-bold text-[#2563EB]">{timer}s</span></>
                  ) : (
                    <button
                      onClick={() => { setOtp(""); setOtpError(""); handleSendOtp(); }}
                      className="text-[#2563EB] font-semibold hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </p>

                <button
                  id="verify-otp-btn"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Verifying…</> : "Verify OTP →"}
                </button>
                <button onClick={() => { setStep(1); setOtp(""); setOtpError(""); }} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  ← Change email
                </button>
              </div>
            )}

            {/* ── STEP 3: New Password ── */}
            {step === 3 && (
              <div className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-[#0F172A]">New Password</label>
                  <div className="relative">
                    <input
                      id="new-pwd"
                      type={showPwd ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (pwdError) setPwdError(e.target.value.length >= 8 ? "" : "Password must be at least 8 characters");
                        if (confirm && confirmError) setConfirmError(e.target.value === confirm ? "" : "Passwords do not match");
                      }}
                      className={`w-full rounded-xl border pr-11 px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 outline-none transition-all duration-200 ${pwdError ? "border-red-400 focus:ring-red-200" : "border-[#E2E8F0] focus:ring-blue-100 focus:border-[#2563EB]"}`}
                    />
                    <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors" tabIndex={-1}>
                      {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${strength.score >= n ? strength.color : "bg-slate-200"}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${strength.score <= 1 ? "text-red-500" : strength.score === 2 ? "text-yellow-600" : strength.score === 3 ? "text-blue-600" : "text-emerald-600"}`}>{strength.label}</p>
                      <ul className="mt-1 space-y-0.5">
                        {[
                          { ok: password.length >= 8, label: "At least 8 characters" },
                          { ok: /[A-Z]/.test(password), label: "One uppercase letter" },
                          { ok: /[0-9]/.test(password), label: "One number" },
                          { ok: /[^A-Za-z0-9]/.test(password), label: "One special character" },
                        ].map(({ ok, label }) => (
                          <li key={label} className={`flex items-center gap-1 text-xs font-medium ${ok ? "text-emerald-600" : "text-slate-400"}`}>
                            {ok ? "✓" : "○"} {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pwdError && <p className="text-red-500 text-xs mt-1 font-medium">{pwdError}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-[#0F172A]">Confirm Password</label>
                  <div className="relative">
                    <input
                      id="confirm-pwd"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        if (confirmError) setConfirmError(e.target.value === password ? "" : "Passwords do not match");
                      }}
                      className={`w-full rounded-xl border pr-11 px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:ring-2 outline-none transition-all duration-200 ${confirmError ? "border-red-400 focus:ring-red-200" : confirm && password === confirm ? "border-emerald-400 focus:ring-emerald-100" : "border-[#E2E8F0] focus:ring-blue-100 focus:border-[#2563EB]"}`}
                    />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors" tabIndex={-1}>
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {confirm && (
                    <p className={`text-xs mt-1 font-semibold ${password === confirm ? "text-emerald-600" : "text-red-500"}`}>
                      {password === confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                  {confirmError && <p className="text-red-500 text-xs mt-0.5 font-medium">{confirmError}</p>}
                </div>

                <button
                  id="do-reset-btn"
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-bold tracking-wide transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Resetting…</> : "Reset Password ✓"}
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── Success ── */
          <div className="text-center space-y-5 py-4">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-4xl">✅</div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">Password Reset!</h3>
              <p className="text-[#64748B] text-sm mt-2">Your password has been reset successfully. You can now log in with your new password.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold tracking-wide transition-all shadow-md"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
     document.body
  );
}
