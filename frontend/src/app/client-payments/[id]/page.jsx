"use client";
import { API_BASE_URL } from "@/utils/api";
import { useEffect, useState, use } from "react";
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Loading invoice details...");
  const [alertConfig, setAlertConfig] = useState(null);

  const showAlert = (type, title, message, onClose = null) => {
    setAlertConfig({ type, title, message, onClose });
  };

  useEffect(() => {
    const startPaymentFlow = async () => {
      try {
        setStatusMsg("Loading invoice details...");
        const invoiceRes = await fetch(
          `${API_BASE_URL}/finance/invoices/${resolvedParams.id}`
        );

        if (!invoiceRes.ok) {
          setError("Invoice not found or failed to fetch details.");
          setLoading(false);
          return;
        }

        const invoiceData = await invoiceRes.json();
        setInvoice(invoiceData);

        if (invoiceData.status?.toLowerCase() === "paid") {
          setStatusMsg("Invoice is already paid.");
          setLoading(false);
          return;
        }

        // Trigger Razorpay Order Creation
        setStatusMsg("Initiating Razorpay checkout...");
        await initiateRazorpayCheckout(invoiceData);
      } catch (err) {
        console.error("Payment error:", err);
        setError("Something went wrong while setting up the payment.");
        setLoading(false);
      }
    };

    startPaymentFlow();
  }, [resolvedParams.id]);

  const initiateRazorpayCheckout = async (invoiceData) => {
    try {
      const orderRes = await fetch(`${API_BASE_URL}/finance/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: invoiceData.grand_total,
          invoice_id: invoiceData.id,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.id) {
        console.warn("Failed to create Razorpay order, offering fallback option:", orderData);
        setStatusMsg("Could not initiate live Razorpay order.");
        setLoading(false);
        return;
      }

      // Check if Razorpay script is present
      if (typeof window === "undefined" || !window.Razorpay) {
        setError("Razorpay SDK not loaded. Please refresh the page.");
        setLoading(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_T5jpSf0s3KFwZa",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Legal Tech Enterprise",
        description: `Payment for Invoice #${invoiceData.id}`,
        order_id: orderData.id,
        handler: async function (response) {
          setStatusMsg("Verifying payment signature...");
          setLoading(true);
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/finance/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: invoiceData.id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              showAlert(
                "success",
                "Payment Successful!",
                "Your payment signature has been verified successfully.",
                () => { window.location.href = "/client-payments"; }
              );
            } else {
              showAlert("error", "Verification Failed", verifyData.detail || "Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            showAlert("error", "Verification Error", "Error verifying payment signature.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: invoiceData.client_name || "",
          email: invoiceData.email || "",
          contact: invoiceData.mobile_number || "",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function () {
            setStatusMsg("Payment process cancelled.");
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      console.error("Razorpay initiation error:", err);
      setStatusMsg("Failed to open Razorpay checkout modal.");
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!invoice) return;
    try {
      setLoading(true);
      const verifyRes = await fetch(`${API_BASE_URL}/finance/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: "mock_order_id",
          razorpay_payment_id: "mock_payment_id",
          razorpay_signature: "mock_signature",
          invoice_id: invoice.id,
        }),
      });
      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        showAlert(
          "success",
          "Mock Payment Successful!",
          "Invoice status updated to Paid.",
          () => { window.location.href = "/client-payments"; }
        );
      } else {
        showAlert("error", "Simulation Failed", "Mock payment process failed.");
      }
    } catch (err) {
      showAlert("error", "Error", "Error simulating payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 relative">
      {/* Custom Alert Modal */}
      {alertConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl border border-slate-100">
            {alertConfig.type === "success" && (
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            )}
            {alertConfig.type === "error" && (
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-rose-50">
                <XCircle className="w-10 h-10" />
              </div>
            )}
            {alertConfig.type === "info" && (
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-blue-50">
                <AlertCircle className="w-10 h-10" />
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-800">
                {alertConfig.title}
              </h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {alertConfig.message}
              </p>
            </div>

            <button
              onClick={() => {
                const action = alertConfig.onClose;
                setAlertConfig(null);
                if (action) action();
              }}
              className={`w-full py-3 rounded-xl text-white font-semibold shadow-md transition-all active:scale-[0.98] ${
                alertConfig.type === "success"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  : alertConfig.type === "error"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              {alertConfig.type === "success" ? "Continue to Dashboard" : "OK"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure SSL Encrypted</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Complete Invoice Payment</h2>
          <p className="text-sm text-slate-500">Legal Tech Gateway</p>
        </div>

        {invoice && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice ID:</span>
              <span className="font-semibold text-slate-800">#{invoice.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Client Name:</span>
              <span className="font-semibold text-slate-800">{invoice.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Due:</span>
              <span className="font-bold text-lg text-blue-600">₹{invoice.grand_total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span
                className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                  invoice.status?.toLowerCase() === "paid"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-blue-600"></div>
            <p className="text-xs text-slate-600 font-medium">{statusMsg}</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {invoice?.status?.toLowerCase() !== "paid" && (
              <>
                <button
                  type="button"
                  onClick={() => initiateRazorpayCheckout(invoice)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow transition active:scale-[0.98]"
                >
                  Pay with Razorpay
                </button>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl border border-slate-300 transition active:scale-[0.98]"
                >
                  Simulate Payment (Bypass Razorpay)
                </button>
              </>
            )}

            {invoice?.status?.toLowerCase() === "paid" && (
              <button
                type="button"
                onClick={() => (window.location.href = "/client-payments")}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow transition active:scale-[0.98]"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
