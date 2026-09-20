"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";

export default function CustomDatePicker({
  selected,
  onChange,
  minDate = new Date(),
  placeholder = "Select date",
  required = false,
  disabled = false,
  className = "",
  style = {},
  dateFormat = "yyyy-MM-dd",
}) {
  // Convert string (YYYY-MM-DD) to Date object if needed
  const dateValue = selected
    ? typeof selected === "string"
      ? new Date(selected + "T00:00:00")
      : selected
    : null;

  const handleChange = (date) => {
    if (!date) {
      onChange("");
      return;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
  };

  return (
    <div className={`relative flex items-center w-full ${className}`} style={style}>
      <DatePicker
        selected={dateValue}
        onChange={handleChange}
        minDate={minDate}
        placeholderText={placeholder}
        required={required}
        disabled={disabled}
        dateFormat={dateFormat}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all cursor-pointer shadow-sm hover:border-[#94A3B8]"
      />
      <Calendar className="absolute left-3 w-4 h-4 text-[#64748B] pointer-events-none" />
    </div>
  );
}
