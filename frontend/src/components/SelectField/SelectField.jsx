"use client";

export default function SelectField({
  label,
  options,
  name,
  ...props
}) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-[#0F172A]">
        {label}
      </label>

      <select
        name={name}
        className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all duration-200"
        {...props}
      >
        <option value="">Select {label}</option>

        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}