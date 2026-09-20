"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Plus, Search, Folder, PrinterCheck, Camera, Edit2, Trash2, Save, X, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";
import { getTodayDateString } from "@/utils/dateUtils";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

export default function ClerkFormatPhysicalFile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;
  const [activeLabelFile, setActiveLabelFile] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState(null);

  const [formData, setFormData] = useState({
    fileNumber: "",
    caseTitle: "",
    cabinet: "Cabinet A",
    shelf: "Shelf 1",
    dateFiled: new Date().toISOString().split("T")[0],
    status: "Active"
  });

  // Check if current file number is a duplicate of any existing record
  const isDuplicateFileNumber = React.useMemo(() => {
    const fn = formData.fileNumber.trim().toLowerCase();
    if (!fn) return false;
    return files.some(
      (f) =>
        f.fileNumber &&
        f.fileNumber.trim().toLowerCase() === fn &&
        f.id !== editingFileId
    );
  }, [formData.fileNumber, files, editingFileId]);

  const deduplicateFiles = (fileList) => {
    const unique = [];
    const seen = new Set();
    for (const f of fileList) {
      const key = `${f.id}-${f.fileNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(f);
      }
    }
    return unique;
  };

  const fetchPhysicalFiles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clerk/format-physical-file/`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const mapped = data.map((b) => ({
            id: b.id,
            fileNumber: b.file_number,
            caseTitle: b.notes || b.case_number || b.client_name || "Physical File",
            cabinet: b.cabinet_location || "Cabinet A",
            shelf: b.shelf_index || "Shelf 1",
            dateFiled: b.created_at ? b.created_at.split("T")[0] : new Date().toISOString().split("T")[0]
          }));
          const deduped = deduplicateFiles(mapped);
          setFiles(deduped);
          localStorage.setItem("clerk_physical_files", JSON.stringify(deduped));
          return;
        }
      }
    } catch (e) {
      console.warn("Backend physical files fetch error, using local cache:", e);
    }

    // Fallback to localStorage
    const saved = localStorage.getItem("clerk_physical_files");
    if (saved) {
      try {
        setFiles(deduplicateFiles(JSON.parse(saved)));
      } catch (e) {}
    } else {
      // Default seed sample
      const initialSeed = [
        { id: 1, fileNumber: "PF-2026-001", caseTitle: "Mary Joseph v. BSNL", cabinet: "Cabinet A", shelf: "Shelf 1", dateFiled: new Date().toISOString().split("T")[0] }
      ];
      setFiles(initialSeed);
      localStorage.setItem("clerk_physical_files", JSON.stringify(initialSeed));
    }
  };

  useEffect(() => {
    setMounted(true);
    const loggedIn = getLoggedInUser();
    if (!loggedIn) {
      router.push("/login");
    } else {
      setUser(loggedIn);
      fetchPhysicalFiles();
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fileNumber || !formData.caseTitle) {
      alert("Please fill in File Number and Case Title.");
      return;
    }

    if (isDuplicateFileNumber) {
      alert("Physical File Number already registered! Please enter a unique file number.");
      return;
    }

    if (editingFileId) {
      // Update record
      try {
        if (typeof editingFileId === "number" && editingFileId < 1000000) {
          await fetch(`${API_BASE_URL}/clerk/format-physical-file/${editingFileId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_number: formData.fileNumber,
              case_number: formData.fileNumber,
              client_name: formData.caseTitle,
              cabinet_location: formData.cabinet,
              shelf_index: formData.shelf,
              notes: formData.caseTitle
            })
          });
        }
      } catch (e) {}

      setFiles((prev) => {
        const updated = prev.map((f) => (f.id === editingFileId ? { ...f, ...formData } : f));
        localStorage.setItem("clerk_physical_files", JSON.stringify(updated));
        return updated;
      });

      setEditingFileId(null);
    } else {
      // Create new record - Place at the top
      let newId = Date.now();
      try {
        const res = await fetch(`${API_BASE_URL}/clerk/format-physical-file/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_number: formData.fileNumber,
            case_number: formData.fileNumber,
            client_name: formData.caseTitle,
            cabinet_location: formData.cabinet,
            shelf_index: formData.shelf,
            notes: formData.caseTitle
          })
        });
        if (res.ok) {
          const created = await res.json();
          newId = created.id;
        }
      } catch (e) {}

      const newFile = { id: newId, ...formData };
      setFiles((prev) => {
        const updated = [newFile, ...prev];
        localStorage.setItem("clerk_physical_files", JSON.stringify(updated));
        return updated;
      });
      setCurrentPage(1); // Jump to first page to show newly added item at top
    }

    setFormData({
      fileNumber: "",
      caseTitle: "",
      cabinet: "Cabinet A",
      shelf: "Shelf 1",
      dateFiled: new Date().toISOString().split("T")[0],
      status: "Active"
    });
  };

  const handleEdit = (file) => {
    setEditingFileId(file.id);
    setFormData({
      fileNumber: file.fileNumber,
      caseTitle: file.caseTitle,
      cabinet: file.cabinet || "Cabinet A",
      shelf: file.shelf || "Shelf 1",
      dateFiled: file.dateFiled || new Date().toISOString().split("T")[0],
      status: "Active"
    });
  };

  const handleCancelEdit = () => {
    setEditingFileId(null);
    setFormData({
      fileNumber: "",
      caseTitle: "",
      cabinet: "Cabinet A",
      shelf: "Shelf 1",
      dateFiled: new Date().toISOString().split("T")[0],
      status: "Active"
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmFile) return;
    const id = deleteConfirmFile.id;

    try {
      if (typeof id === "number" && id < 1000000) {
        await fetch(`${API_BASE_URL}/clerk/format-physical-file/${id}`, {
          method: "DELETE"
        });
      }
    } catch (e) {}

    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      localStorage.setItem("clerk_physical_files", JSON.stringify(updated));
      return updated;
    });

    if (editingFileId === id) {
      handleCancelEdit();
    }

    setDeleteConfirmFile(null);
  };

  const handleScreenshot = () => {
    if (!activeLabelFile) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = 440;
      const height = 680;
      canvas.width = width;
      canvas.height = height;

      // Outer background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Card Container with rounded corners
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 10;
      if (ctx.roundRect) {
        ctx.roundRect(20, 20, width - 40, height - 40, 24);
      } else {
        ctx.rect(20, 20, width - 40, height - 40);
      }
      ctx.stroke();

      // Top Icon Header
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PHYSICAL RECORD", width / 2, 85);

      // File Number (Large bold header)
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 42px sans-serif";
      ctx.fillText(activeLabelFile.fileNumber || "PF-000", width / 2, 230);

      // Case Title
      ctx.fillStyle = "#334155";
      ctx.font = "bold 20px sans-serif";
      const titleText = activeLabelFile.caseTitle || "";
      const truncatedTitle = titleText.length > 28 ? titleText.substring(0, 28) + "..." : titleText;
      ctx.fillText(truncatedTitle, width / 2, 290);

      // Horizontal Divider
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 500);
      ctx.lineTo(width - 60, 500);
      ctx.stroke();

      // Cabinet Location
      ctx.fillStyle = "#475569";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(activeLabelFile.cabinet || "Cabinet A", width / 2, 550);

      // Shelf Location (Emerald Accent)
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(activeLabelFile.shelf || "Shelf 1", width / 2, 595);

      // Download PNG file
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Spine_Label_${(activeLabelFile.fileNumber || "sticker").replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Canvas screenshot error:", err);
      alert("Could not generate screenshot.");
    }
  };

  // Sort files with newest / recent added at the top
  const sortedFiles = React.useMemo(() => {
    return [...files].sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });
  }, [files]);

  const filteredFiles = React.useMemo(() => {
    return sortedFiles.filter(
      (f) =>
        f.fileNumber.toLowerCase().includes(search.toLowerCase()) ||
        f.caseTitle.toLowerCase().includes(search.toLowerCase()) ||
        f.cabinet.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedFiles, search]);

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE) || 1;
  const activeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedFiles = React.useMemo(() => {
    const start = (activeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredFiles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFiles, activeCurrentPage, ITEMS_PER_PAGE]);

  if (!user) {
    return (
      <div className="w-full h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 text-sm animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Label Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #label-print-area, #label-print-area * {
            visibility: visible;
          }
          #label-print-area {
            position: absolute;
            left: 50%;
            top: 20%;
            transform: translate(-50%, -20%);
            width: 250px;
            height: 400px;
            border: 4px solid #000;
            padding: 20px;
            font-family: 'Inter', -apple-system, sans-serif;
            text-align: center;
            background: #fff;
            color: #000;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/clerk/dashboard")}
          className="w-10 h-10 rounded-full bg-white border border-[#E2E8F0] hover:bg-slate-50 flex items-center justify-center transition active:scale-95 shadow-sm"
        >
          <ArrowLeft size={16} className="text-[#475569]" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Physical File Indexer</h1>
          <p className="text-[#64748B] text-sm font-medium">Log shelving indexes and print spine stickers/labels.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Log File Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm space-y-5 h-fit"
        >
          <h2 className="text-lg font-extrabold text-[#0F172A] border-b pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Folder size={18} className="text-blue-600" /> {editingFileId ? "Edit Physical File" : "Log Physical File"}
            </span>
            {editingFileId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1"
              >
                <X size={14} /> Cancel
              </button>
            )}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Physical File No. *</label>
              <input
                type="text"
                value={formData.fileNumber}
                onChange={(e) => setFormData({ ...formData, fileNumber: e.target.value })}
                placeholder="e.g. PF-2026-003"
                className={`w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition ${
                  isDuplicateFileNumber
                    ? "border-red-500 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-500/20"
                    : "border-[#E2E8F0] text-[#0F172A] focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                }`}
              />
              {isDuplicateFileNumber && (
                <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 text-red-500" />
                  <span>Physical File Number already exists! Please enter a unique file number.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Case Title *</label>
              <input
                type="text"
                value={formData.caseTitle}
                onChange={(e) => setFormData({ ...formData, caseTitle: e.target.value })}
                placeholder="e.g. Mary Joseph v. BSNL"
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#0F172A] font-medium outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cabinet</label>
                <select
                  value={formData.cabinet}
                  onChange={(e) => setFormData({ ...formData, cabinet: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
                >
                  {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((letter) => (
                    <option key={letter} value={`Cabinet ${letter}`}>
                      Cabinet {letter}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Shelf Rack</label>
                <select
                  value={formData.shelf}
                  onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] font-semibold outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={`Shelf ${num}`}>
                      Shelf {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Date Logged</label>
              <CustomDatePicker
                selected={formData.dateFiled}
                onChange={(dateStr) => setFormData({ ...formData, dateFiled: dateStr })}
                minDate={new Date()}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isDuplicateFileNumber || !formData.fileNumber.trim() || !formData.caseTitle.trim()}
              className={`w-full font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 ${
                isDuplicateFileNumber || !formData.fileNumber.trim() || !formData.caseTitle.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-300/60"
                  : editingFileId
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-[0.99] cursor-pointer"
              }`}
            >
              {editingFileId ? <Save size={16} /> : <Plus size={16} />}
              {editingFileId ? "Update Record" : "Register File Record"}
            </button>
          </div>
        </form>

        {/* Index Table Pane */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden">
          {/* Table Header / Search */}
          <div className="p-6 border-b border-[#F1F5F9] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#F8FAFC]/50">
            <h2 className="text-lg font-extrabold text-[#0F172A]">Physical Archive Index</h2>
            <div className="flex items-center border border-[#E2E8F0] rounded-full px-4 py-2 bg-white w-full sm:w-64 focus-within:ring-2 focus-within:ring-emerald-600/20 focus-within:border-emerald-600 transition">
              <Search className="w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search file index..."
                className="w-full ml-2 bg-transparent outline-none text-xs text-[#0F172A] placeholder:text-[#94A3B8]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Desktop Table View (hidden on mobile & tablet) */}
          <div className="hidden md:block overflow-x-auto flex-1 w-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B] whitespace-nowrap">File Number</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B] whitespace-nowrap">Case Title</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B] whitespace-nowrap">Location</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[#64748B] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {paginatedFiles.map((file, idx) => (
                  <tr key={`${file.id}-${file.fileNumber}-${idx}`} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 whitespace-nowrap">{file.fileNumber}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 max-w-[240px] leading-snug">{file.caseTitle}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 border border-slate-200/60 font-semibold">{file.cabinet}</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200/60 font-bold">{file.shelf}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActiveLabelFile(file)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition cursor-pointer shadow-sm shadow-blue-600/20"
                          title="View Spine Sticker Label & Location"
                        >
                          <PrinterCheck size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(file)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-2 rounded-lg border border-amber-200 transition cursor-pointer"
                          title="Edit File Record"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmFile(file)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg border border-red-200 transition cursor-pointer"
                          title="Delete File Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">No matching physical files found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Responsive Card View (visible on mobile & tablet) */}
          <div className="block md:hidden p-4 space-y-3.5 bg-slate-50/50 flex-1">
            {paginatedFiles.map((file, idx) => (
              <div key={`${file.id}-${file.fileNumber}-${idx}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="font-extrabold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    {file.fileNumber}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{file.cabinet}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">{file.shelf}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">{file.caseTitle}</h4>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setActiveLabelFile(file)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    <PrinterCheck size={14} /> Sticker Label
                  </button>
                  <button
                    onClick={() => handleEdit(file)}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold border border-amber-200 transition cursor-pointer"
                    title="Edit File"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmFile(file)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 transition cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">No matching physical files found.</div>
            )}
          </div>

          {/* Table Pagination Footer */}
          {filteredFiles.length > 0 && (
            <div className="px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC]/50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{(activeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                <span className="font-bold text-slate-800">{Math.min(activeCurrentPage * ITEMS_PER_PAGE, filteredFiles.length)}</span> of{" "}
                <span className="font-bold text-slate-800">{filteredFiles.length}</span> physical records
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activeCurrentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span className="text-xs font-bold text-slate-700 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-xs">
                  {activeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activeCurrentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Custom Modal */}
      {mounted && deleteConfirmFile && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 my-auto text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner border border-red-100">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Delete Physical File?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-800">{deleteConfirmFile.fileNumber}</span> ({deleteConfirmFile.caseTitle})? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmFile(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete Record
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Spine Label Print Modal - Portal to document.body with top z-index covering sidebar & navbar */}
      {mounted && activeLabelFile && createPortal(
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div id="label-modal-content" className="bg-white rounded-3xl border border-[#E2E8F0] p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            <h3 className="text-lg font-extrabold text-[#0F172A] mb-4 border-b pb-2">Spine Label & Location Layout</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6">
              {/* Print Sticker Frame */}
              <div className="flex justify-center">
                <div
                  id="label-print-area"
                  className="w-[200px] h-[320px] border-4 border-solid border-slate-900 bg-white p-6 flex flex-col justify-between items-center text-center rounded-xl shadow-inner select-none"
                >
                  <div className="space-y-1">
                    <Folder className="w-8 h-8 text-slate-800 mx-auto" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Physical Record</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">{activeLabelFile.fileNumber}</h4>
                    <p className="text-xs font-bold text-slate-700 max-h-[80px] overflow-hidden leading-snug px-2">
                      {activeLabelFile.caseTitle}
                    </p>
                  </div>

                  <div className="w-full border-t border-slate-300 pt-3 text-[11px] font-bold text-slate-600">
                    <p>{activeLabelFile.cabinet}</p>
                    <p className="text-[#10B981]">{activeLabelFile.shelf}</p>
                  </div>
                </div>
              </div>

              {/* Shelf Grid Map Visualizer */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 h-full flex flex-col justify-center max-h-[340px]">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Cabinet Shelf Layout ({activeLabelFile.cabinet})
                </h4>
                <div className="space-y-1.5 max-w-[180px] mx-auto w-full overflow-y-auto max-h-[250px] pr-1">
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => {
                    const s = `Shelf ${num}`;
                    const isCurrent = activeLabelFile.shelf === s;
                    return (
                      <div
                        key={s}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition duration-200 ${
                          isCurrent
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-md font-bold scale-105"
                            : "bg-white text-slate-400 border-slate-200/80 opacity-60"
                        }`}
                      >
                        {s} {isCurrent && "📍 (Target)"}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveLabelFile(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleScreenshot}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                Screenshot
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
