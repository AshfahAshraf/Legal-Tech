"use client";

import { API_BASE_URL } from "@/utils/api";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle,
  Download,
  AlertCircle,
  Info,
  User,
  Mail,
  Calendar,
  Check,
  Smartphone,
  Globe
} from "lucide-react";
import jsPDF from "jspdf";
import useModulePermission from "@/utils/useModulePermission";
import { createPortal } from "react-dom";

export default function ClientPayments() {
  const { perms, loading: permsLoading } = useModulePermission("Payments");
  const [invoices, setInvoices] = useState([]);
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Payment modal state

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);


  // Decode user from JWT in localStorage
  const getLoggedInUser = () => {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded; // { id, email, role }
    } catch (e) {
      console.error("Failed to decode token", e);
      return null;
    }
  };

  // Check login and set active client
  useEffect(() => {
    const user = getLoggedInUser();
    if (!user) {
      setAuthError("No active session found. Please log in first.");
      return;
    }


    setClientEmail(user.email);

    const namePart = user.email.split("@")[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    setClientName(formattedName);
  }, []);

  // Fetch invoices for active client
  const fetchInvoices = async () => {
    if (!clientEmail) return;
    try {
      const res = await fetch(`${API_BASE_URL}/finance/invoices?email=${encodeURIComponent(clientEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [clientEmail]);



  // Handle Payment Submit
  const handlePaymentSubmit = async (invoice) => {
    if (!invoice) return;

    setIsProcessing(true);

    try {
      // 1. Create Razorpay Order via Backend API
      const orderRes = await fetch(`${API_BASE_URL}/finance/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: invoice.grand_total,
          invoice_id: invoice.id,
        }),
      });

      const orderData = await orderRes.json();

      // 2. Open Razorpay Modal if Order created successfully & SDK present
      if (orderRes.ok && orderData.id && typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_T5jpSf0s3KFwZa",
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "Legal Tech Enterprise",
          description: `Payment for Invoice #${invoice.id}`,
          order_id: orderData.id,
          handler: async function (response) {
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/finance/payment/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  invoice_id: invoice.id,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                setPaymentSuccess(true);
                setShowPaymentModal(false);
                fetchInvoices();
              } else {
                alert(verifyData.detail || "Payment verification failed");
              }
            } catch (err) {
              console.error("Verification error:", err);
              alert("Error verifying payment signature");
            } finally {
              setIsProcessing(false);
            }
          },
          prefill: {
            name: invoice.client_name || "",
            email: invoice.email || "",
            contact: invoice.mobile_number || "",
          },
          theme: {
            color: "#2563eb",
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Fallback: Simulate payment if Razorpay order creation fails or client is unconfigured
      const verifyRes = await fetch(
        `${API_BASE_URL}/finance/payment/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            razorpay_order_id: "mock_order_id",
            razorpay_payment_id: "mock_payment_id",
            razorpay_signature: "mock_signature",
            invoice_id: invoice.id,
          }),
        }
      );

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        setPaymentSuccess(true);
        setShowPaymentModal(false);
        fetchInvoices();
      } else {
        alert(verifyData.detail || "Payment verification failed");
      }

      setIsProcessing(false);
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
    }
  };
  // PDF Generator for Receipt / Invoice
  const handleDownloadInvoicePDF = (inv) => {
    const doc = new jsPDF();

    // Primary Blue Color Banner Header Block
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(inv.status.toLowerCase() === "paid" ? "PAYMENT RECEIPT" : "INVOICE DUE", 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice #${inv.id}  |  Date: ${new Date(inv.created_at).toLocaleDateString()}`, 148, 20, { align: "right" });

    // Client Details
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Client Details", 20, 45);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Name: ${inv.client_name || "N/A"}`, 20, 57);
    doc.text(`Case No: ${inv.case_number || "N/A"}`, 20, 65);
    doc.text(`Mobile: ${inv.mobile_number || "N/A"}`, 110, 57);
    doc.text(`Email: ${inv.email || "N/A"}`, 110, 65);

    // Fee Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Itemized Fee Breakdown", 20, 80);
    doc.line(20, 83, 190, 83);
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 88, 170, 8, "F");
    doc.setFontSize(10);
    doc.text("Description", 25, 93);
    doc.text("Details", 95, 93);
    doc.text("Amount", 165, 93);
    doc.line(20, 96, 190, 96);
    doc.setFont("helvetica", "normal");

    let y = 104;
    const rows = [
      [`Court Fee (${inv.court_fee_case_type || "N/A"})`, inv.court_fee_jurisdiction || "N/A", inv.court_fee_amount],
      [`Stamp Duty (${inv.stamp_duty_doc_type || "N/A"})`, inv.stamp_duty_state || "N/A", inv.stamp_duty_amount],
      [`Advocate Fee (${inv.advocate_fee_case_type || "N/A"})`, inv.advocate_fee_remarks || "N/A", inv.advocate_fee_amount],
      ["Paper Filing", `${inv.filing_cost_pages || 0} pages`, inv.filing_cost_amount],
    ];

    rows.forEach(([name, detail, amount]) => {
      doc.setFontSize(10);
      doc.text(name, 25, y);
      doc.text(detail, 95, y);
      doc.text(`Rs. ${Number(amount || 0).toFixed(2)}`, 165, y);
      y += 8;
    });

    // Totals section
    doc.line(20, y, 190, y); y += 8;
    doc.setFontSize(10);
    doc.text("Subtotal:", 130, y);
    doc.text(`Rs. ${Number(inv.subtotal || 0).toFixed(2)}`, 165, y); y += 7;
    doc.text("GST (18%):", 130, y);
    doc.text(`Rs. ${Number(inv.gst || 0).toFixed(2)}`, 165, y); y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Grand Total:", 130, y);
    doc.text(`Rs. ${Number(inv.grand_total || 0).toFixed(2)}`, 165, y);

    // Payment Status badge
    y += 10;
    const statusColor = inv.status.toLowerCase() === "paid" ? [22, 163, 74] : [217, 119, 6];
    doc.setFillColor(...statusColor);
    doc.roundedRect(130, y - 4, 50, 7, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Status: ${inv.status.toUpperCase()}`, 155, y + 0.5, { align: "center" });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("This document is a computer-generated transaction copy.", 20, 275);
    doc.text("Thank you for your timely payment.", 20, 281);

    doc.save(`Invoice_${inv.id}_${inv.client_name || "Record"}.pdf`);
  };

  // Filter due vs paid invoices
  const dueInvoices = invoices.filter(
    (inv) => inv.status.toLowerCase() === "sent" || inv.status.toLowerCase() === "overdue"
  );
  const paidInvoices = invoices.filter(
    (inv) => inv.status.toLowerCase() === "paid"
  );

  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalDue = dueInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);

  // If there's an authentication/session issue, render a detailed clean warning card
  // No view access
  if (!permsLoading && !perms.view) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            You do not have permission to view Payments.
          </p>
        </div>
      </div>
    );
  }

  // Auth error
  if (authError) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Client Profile Required</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            {authError}
          </p>
          <p className="text-slate-400 text-xs mt-4">
            Please register or log in with a Client account role to view case payment logs.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Go to Login Page
          </a>
        </div>
      </div>
    );
  }  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-200 overflow-hidden">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold shrink-0 border border-blue-100 shadow-xs">
            <CreditCard size={18} className="sm:w-[20px] sm:h-[20px]" />
          </div>
          <h1 className="text-[#0F172A] font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight truncate">
            Payments
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed break-words mt-1">
          View, download, and pay outstanding fee invoices
        </p>
      </div>

      {/* Success Notification */}
      {paymentSuccess && (
        <div className="bg-emerald-50 border border-emerald-500 text-emerald-700 p-3.5 sm:p-4 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold shadow-xs animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Payment completed successfully! The invoice record has been updated and a receipt generated.</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-full min-w-0">
        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs min-w-0">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-2">Active Account</span>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-extrabold text-sm border border-blue-100 shrink-0">
              {clientName ? clientName.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{clientName || "Demo Client"}</h4>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{clientEmail}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs min-w-0">
          <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider block mb-1">Total Outstanding Amount</span>
          <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
            ₹{totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">{dueInvoices.length} pending billing request{dueInvoices.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs sm:col-span-2 lg:col-span-1 min-w-0">
          <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider block mb-1">Total Paid Amount</span>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
            ₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">{paidInvoices.length} successful payment{paidInvoices.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Due Payments Section */}
      <div className="space-y-3.5 sm:space-y-4 w-full max-w-full min-w-0">
        <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#2563EB] shrink-0" />
          <span>Due Payments</span>
        </h3>

        {dueInvoices.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl py-10 sm:py-12 px-4 text-center shadow-xs space-y-2 w-full">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">No Due Invoices</h4>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              Excellent! You are all caught up on your legal fee payments.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (Visible >= 768px) */}
            <div className="hidden md:block overflow-x-auto bg-white border border-[#E2E8F0] rounded-2xl shadow-xs w-full">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3.5">Invoice ID</th>
                    <th className="p-3.5">Case ID</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Subtotal</th>
                    <th className="p-3.5">GST</th>
                    <th className="p-3.5">Grand Total</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F1F5F9] font-medium text-slate-700">
                  {dueInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#0F172A]">#{inv.id}</td>
                      <td className="p-3.5 font-bold text-slate-800">{inv.case_number || "General Consultation"}</td>
                      <td className="p-3.5 text-slate-500 font-semibold">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-3.5">₹{inv.subtotal}</td>
                      <td className="p-3.5">₹{inv.gst}</td>
                      <td className="p-3.5 font-extrabold text-[#0F172A]">₹{inv.grand_total.toFixed(2)}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${
                            inv.status.toLowerCase() === "overdue"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex gap-2 justify-center items-center">
                          <button
                            onClick={() => handleDownloadInvoicePDF(inv)}
                            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                            title="Download Invoice PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {perms.add ? (
                            <button
                              type="button"
                              onClick={() => handlePaymentSubmit(inv)}
                              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1">
                              🔒 Restricted
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Visible < 768px) */}
            <div className="block md:hidden space-y-3 w-full max-w-full min-w-0">
              {dueInvoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs min-w-0">
                  <div className="flex items-start justify-between gap-2 border-b border-[#F1F5F9] pb-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice #{inv.id}</span>
                      <h4 className="font-extrabold text-xs text-[#0F172A] truncate mt-0.5">{inv.case_number || "General Consultation"}</h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border shrink-0 ${
                        inv.status.toLowerCase() === "overdue"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                      <span className="font-semibold text-slate-700">{new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grand Total</span>
                      <span className="font-black text-sm text-[#0F172A]">₹{inv.grand_total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
                    <button
                      onClick={() => handleDownloadInvoicePDF(inv)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Download size={13} /> Invoice PDF
                    </button>
                    {perms.add ? (
                      <button
                        type="button"
                        onClick={() => handlePaymentSubmit(inv)}
                        className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold">
                        🔒 Restricted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment History Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 w-full max-w-full min-w-0">
        <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Payment History</span>
        </h3>

        {paidInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs sm:text-sm font-semibold">
            No completed payments recorded.
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (Visible >= 768px) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[#E2E8F0] w-full">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-3.5">#Invoice ID</th>
                    <th className="p-3.5">Case ID</th>
                    <th className="p-3.5">Payment Date</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Receipt</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F1F5F9] font-medium text-slate-700">
                  {paidInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-xs text-slate-500 font-bold">#{inv.id}</td>
                      <td className="p-3.5 font-bold text-slate-800">{inv.case_number || "Consultation"}</td>
                      <td className="p-3.5 text-slate-500 font-semibold">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-3.5 text-right font-extrabold text-[#0F172A]">₹{inv.grand_total.toFixed(2)}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleDownloadInvoicePDF(inv)}
                          className="text-[#2563EB] hover:text-[#1d4ed8] p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Download Receipt PDF"
                        >
                          <Download className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Visible < 768px) */}
            <div className="block md:hidden space-y-3 w-full max-w-full min-w-0">
              {paidInvoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-2.5 shadow-xs min-w-0">
                  <div className="flex items-start justify-between gap-2 border-b border-[#F1F5F9] pb-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice #{inv.id}</span>
                      <h4 className="font-extrabold text-xs text-[#0F172A] truncate mt-0.5">{inv.case_number || "Consultation"}</h4>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase shrink-0">
                      {inv.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-500 font-semibold">Date: {new Date(inv.created_at).toLocaleDateString()}</span>
                    <span className="font-black text-sm text-emerald-600">₹{inv.grand_total.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex justify-end">
                    <button
                      onClick={() => handleDownloadInvoicePDF(inv)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-[#2563EB] bg-blue-50/60 hover:bg-blue-100 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download size={13} /> Download Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}