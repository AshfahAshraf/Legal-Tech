"use client";

export default function Button({
  title,
  type = "button",
  variant = "primary",
  onClick,
  ...props
}) {
  const styles = {
    primary:
      "bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm",

    secondary:
      "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] shadow-sm",

    danger:
      "bg-[#DC2626]/90 hover:bg-[#DC2626] text-white shadow-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        px-6
        py-3
        rounded-lg
        font-medium
        text-sm
        transition-all
        duration-200
        ${styles[variant]}
      `}
      {...props}
    >
      {title}
    </button>
  );
}