"use client";

export default function InputField({
  label,
  type = "text",
  placeholder,
  name,
  error,
  className = "",
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="block mb-2 text-sm font-medium text-[#0F172A]">
          {label}
        </label>
      )}

      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all duration-200 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/20 text-red-900"
            : "border-[#E2E8F0] bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1.5 animate-[fadeInError_0.2s_ease]">
          <span className="w-3.5 h-3.5 rounded-full bg-red-100 text-red-500 inline-flex items-center justify-center text-[10px] font-bold">!</span>
          {error}
        </p>
      )}
    </div>
  );
}