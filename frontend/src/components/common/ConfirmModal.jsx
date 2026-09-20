"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, Info, X, Loader2 } from "lucide-react";

/**
 * ConfirmModal — Premium, fully-centered confirmation modal that covers sidebar and navbar.
 *
 * Props:
 *   isOpen       {boolean}  Whether the modal is open.
 *   title        {string}   Modal heading (e.g., "Delete Invoice").
 *   message      {string}   Modal body description.
 *   confirmText  {string}   Text for the primary confirm button (default: "Delete").
 *   cancelText   {string}   Text for the cancel button (default: "Cancel").
 *   variant      {string}   "danger" | "warning" | "info" (default: "danger").
 *   loading      {boolean}  Loading spinner state during async action execution.
 *   onConfirm    {function} Action to execute on confirmation.
 *   onClose      {function} Close modal action.
 */
export default function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const iconConfig = {
    danger: {
      bg: "bg-red-50 text-red-600 border-red-100",
      btn: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-600/20",
      icon: <Trash2 className="w-8 h-8 text-red-600" />,
    },
    warning: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      btn: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/20",
      icon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
    },
    info: {
      bg: "bg-blue-50 text-blue-600 border-blue-100",
      btn: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/20",
      icon: <Info className="w-8 h-8 text-blue-600" />,
    },
  };

  const currentConfig = iconConfig[variant] || iconConfig.danger;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in select-none">
      {/* Click outside backdrop */}
      <div
        className="absolute inset-0"
        onClick={() => !loading && onClose && onClose()}
      />

      {/* Modal Card Container */}
      <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center z-10 animate-scale-in transform transition-all">
        {/* Close Icon */}
        <button
          type="button"
          onClick={() => !loading && onClose && onClose()}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Top Badge Icon */}
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-5 shadow-xs ${currentConfig.bg}`}
        >
          {currentConfig.icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-[#0F172A] tracking-tight mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm font-medium text-[#64748B] leading-relaxed mb-6">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => !loading && onClose && onClose()}
            disabled={loading}
            className="flex-1 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${currentConfig.btn}`}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
