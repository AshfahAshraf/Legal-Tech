"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/utils/api";
import { getTodayDateString, getCurrentTimeString } from "@/utils/dateUtils";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { CheckCircle, XCircle } from "lucide-react";

function ClientActionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const action = searchParams.get("action");
    const id = searchParams.get("id");
    
    const [status, setStatus] = useState("loading"); // loading, success, error, input
    const [message, setMessage] = useState("Processing your request...");
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");
    const [rescheduleReason, setRescheduleReason] = useState("");

    useEffect(() => {
        if (!id || !action) {
            setStatus("error");
            setMessage("Invalid link. Missing consultation ID or action.");
            return;
        }

        if (action === "approve") {
            handleApprove();
        } else if (action === "reschedule") {
            setStatus("input");
            setMessage("Please provide a reason or suggest a new time.");
        } else {
            setStatus("error");
            setMessage("Unknown action.");
        }
    }, [id, action]);

    const handleApprove = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/consultations/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Approved" })
            });

            if (res.ok) {
                setStatus("success");
                setMessage("Thank you! The consultation has been successfully approved.");
            } else {
                setStatus("error");
                setMessage("Failed to approve the consultation. It may have been deleted or already processed.");
            }
        } catch (err) {
            console.error(err);
            setStatus("error");
            setMessage("Network error occurred. Please try again later.");
        }
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        
        if (!rescheduleReason && (!rescheduleDate || !rescheduleTime)) {
            alert("Please provide either a reason or a suggested new date and time.");
            return;
        }

        let finalReason = "Rescheduled by client";
        if (rescheduleReason) {
            finalReason += `: ${rescheduleReason}`;
        }
        if (rescheduleDate && rescheduleTime) {
            finalReason += ` (Suggested: ${rescheduleDate} at ${rescheduleTime})`;
        }

        try {
            // Send the exact current date/time to avoid breaking backend schemas if they strictly require it, 
            // since we don't have the original date on the frontend without fetching it first.
            // But the backend schema requires `date` and `time` for reschedule.
            // Let's just use the suggested date, or today's date as a placeholder.
            const payload = {
                date: rescheduleDate || new Date().toISOString().split('T')[0],
                time: rescheduleTime || "TBD",
                reason: finalReason
            };

            const res = await fetch(`${API_BASE_URL}/consultations/${id}/reschedule`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStatus("success");
                setMessage("Your reschedule request has been sent to the advocate.");
            } else {
                setStatus("error");
                setMessage("Failed to submit reschedule request.");
            }
        } catch (err) {
            console.error(err);
            setStatus("error");
            setMessage("Network error occurred. Please try again later.");
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8 max-w-md w-full">
                
                {status === "loading" && (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-[#0F172A]">{message}</h2>
                    </div>
                )}

                {status === "success" && (
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Success!</h2>
                        <p className="text-[#64748B]">{message}</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Oops!</h2>
                        <p className="text-[#64748B]">{message}</p>
                    </div>
                )}

                {status === "input" && (
                    <div>
                        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Reschedule Consultation</h2>
                        <p className="text-sm text-[#64748B] mb-6">{message}</p>
                        
                        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#475569] uppercase mb-2">Suggested Date (Optional)</label>
                                <CustomDatePicker
                                    selected={rescheduleDate}
                                    onChange={(dateStr) => setRescheduleDate(dateStr)}
                                    minDate={new Date()}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#475569] uppercase mb-2">Suggested Time (Optional)</label>
                                <input 
                                    type="time"
                                    min={rescheduleDate === getTodayDateString() ? getCurrentTimeString() : undefined}
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="w-full border border-[#E2E8F0] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2563EB]/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#475569] uppercase mb-2">Reason</label>
                                <textarea 
                                    value={rescheduleReason}
                                    onChange={(e) => setRescheduleReason(e.target.value)}
                                    placeholder="Please let us know why you need to reschedule..."
                                    className="w-full border border-[#E2E8F0] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#2563EB]/20 outline-none min-h-[100px]"
                                />
                            </div>
                            <button 
                                type="submit"
                                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition-colors"
                            >
                                Submit Request
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ClientActionPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ClientActionContent />
        </Suspense>
    );
}
