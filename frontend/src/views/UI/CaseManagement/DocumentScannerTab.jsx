"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/utils/api";
import { jsPDF } from "jspdf";
import {
  Upload,
  Camera,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Download,
  ArrowRight,
  Sliders,
  Sun,
  Contrast,
  Sparkles,
  Zap,
  CheckCircle2,
  Trash2,
  FileText,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Loader2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Save,
  Tag,
  Check
} from "lucide-react";

/**
 * DocumentScannerTab — Scanner Quality Document Preprocessing Component
 *
 * Features:
 * - Drag and drop file upload / Camera stream capture (JPG, PNG, WEBP, BMP, TIFF, PDF)
 * - Automatic document boundary & corner detection via OpenCV & PyPDFium2
 * - Interactive 4-corner quad handle dragging overlay
 * - Perspective warp transform
 * - Enhancement controls (Preset modes, Auto contrast, Brightness, Contrast, Sharpness, Noise reduction, Shadow removal)
 * - Document Type Selector for Case Document saving
 * - Side-by-side comparison (Original vs Scanned Document)
 * - Save to Case Documents & Export scanned result as PNG, JPG, PDF
 * - "Continue to OCR" button to feed preprocessed image into existing OCR pipeline
 */
export default function DocumentScannerTab({ onContinueToOCR, onSaveToDocuments, onScanUpdate, caseId = null }) {
  const [file, setFile] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [detectingCorners, setDetectingCorners] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [error, setError] = useState("");
  const [savedToDocs, setSavedToDocs] = useState(false);

  // Document Type selection state
  const [selectedDocType, setSelectedDocType] = useState("Vakalatnama");

  // Corner coordinates in percentages [{x, y}, ...] for TL, TR, BR, BL
  const [corners, setCorners] = useState([
    { x: 5, y: 5 },
    { x: 95, y: 5 },
    { x: 95, y: 95 },
    { x: 5, y: 95 },
  ]);

  const [activeCorner, setActiveCorner] = useState(null);

  // Enhancements State
  const [preset, setPreset] = useState("scanned"); // "original" | "scanned" | "bw" | "grayscale"
  const [autoContrast, setAutoContrast] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(20);
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [shadowRemoval, setShadowRemoval] = useState(true);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  // UI state
  const [showEnhancementDrawer, setShowEnhancementDrawer] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Refs
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Handle File Input
  const handleFileSelect = (selected) => {
    if (!selected) return;
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "application/pdf",
    ];

    if (!validTypes.includes(selected.type) && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Unsupported file format. Please upload JPG, PNG, WEBP, BMP, TIFF, or PDF.");
      return;
    }

    setFile(selected);
    setError("");
    setScannedResult(null);
    setRotation(0);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalPreview(e.target.result);
        autoDetectCorners(selected);
      };
      reader.readAsDataURL(selected);
    } else {
      // PDF File: Backend converts page 1 to base64 preview image
      setOriginalPreview(null);
      autoDetectCorners(selected);
    }
  };

  // Trigger Automatic Corner Detection via Backend OpenCV
  const autoDetectCorners = async (inputFile) => {
    setDetectingCorners(true);
    try {
      const fd = new FormData();
      fd.append("file", inputFile);

      const res = await fetch(`${API_BASE_URL}/ocr/detect-corners`, {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.corners && data.corners.length === 4) {
          setCorners(data.corners);
        }
        if (data.original_preview_b64) {
          setOriginalPreview(data.original_preview_b64);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn("Corner detection fallback:", errData?.detail);
        setCorners([
          { x: 5, y: 5 },
          { x: 95, y: 5 },
          { x: 95, y: 95 },
          { x: 5, y: 95 },
        ]);
      }
    } catch (e) {
      console.warn("Corner detection warning:", e);
      setCorners([
        { x: 5, y: 5 },
        { x: 95, y: 5 },
        { x: 95, y: 95 },
        { x: 5, y: 95 },
      ]);
    } finally {
      setDetectingCorners(false);
      // Run initial scan once corners are set
      runScanProcess(inputFile);
    }
  };

  // Execute Document Scan / Perspective Transform + Enhancement
  const runScanProcess = async (targetFile = file, customCorners = corners) => {
    const f = targetFile || file;
    if (!f) return;

    setScanning(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", f);
      if (customCorners) {
        fd.append("corners_json", JSON.stringify(customCorners));
      }
      fd.append("preset", preset);
      fd.append("auto_contrast", String(autoContrast));
      fd.append("brightness", String(brightness));
      fd.append("contrast", String(contrast));
      fd.append("sharpness", String(sharpness));
      fd.append("noise_reduction", String(noiseReduction));
      fd.append("shadow_removal", String(shadowRemoval));
      fd.append("rotation", String(rotation));

      const res = await fetch(`${API_BASE_URL}/ocr/scan`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Scanning failed.");
      }

      const data = await res.json();
      setScannedResult(data.scanned_image_b64);

      // Notify parent component of updated scanned image File object
      if (onScanUpdate) {
        const fetchRes = await fetch(data.scanned_image_b64);
        const blob = await fetchRes.blob();
        const scannedFile = new File(
          [blob],
          f ? `scanned_${f.name.replace(/\.pdf$/i, ".png")}` : "scanned_doc.png",
          { type: "image/png" }
        );
        onScanUpdate(scannedFile, data.scanned_image_b64, selectedDocType);
      }
    } catch (e) {
      setError(e.message || "Failed to scan document.");
    } finally {
      setScanning(false);
    }
  };

  // Re-scan when enhancements or rotation change
  useEffect(() => {
    if (file) {
      const timer = setTimeout(() => {
        runScanProcess(file, corners);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [preset, autoContrast, brightness, contrast, sharpness, noiseReduction, shadowRemoval, rotation]);

  // Handle Dragging Corner Handles on Image Canvas
  const handlePointerDown = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCorner(index);
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (activeCorner === null || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      let xPct = ((clientX - rect.left) / rect.width) * 100;
      let yPct = ((clientY - rect.top) / rect.height) * 100;

      // Clamp between 0 and 100%
      xPct = Math.max(0, Math.min(100, xPct));
      yPct = Math.max(0, Math.min(100, yPct));

      setCorners((prev) => {
        const next = [...prev];
        next[activeCorner] = { x: Math.round(xPct * 10) / 10, y: Math.round(yPct * 10) / 10 };
        return next;
      });
    },
    [activeCorner]
  );

  const handlePointerUp = useCallback(() => {
    if (activeCorner !== null) {
      setActiveCorner(null);
      // Trigger scan recalculation with updated corner positions
      runScanProcess(file, corners);
    }
  }, [activeCorner, file, corners]);

  useEffect(() => {
    if (activeCorner !== null) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove);
      window.addEventListener("touchend", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [activeCorner, handlePointerMove, handlePointerUp]);

  // Reset to default corners and enhancements
  const handleReset = () => {
    setPreset("scanned");
    setAutoContrast(false);
    setBrightness(0);
    setContrast(0);
    setSharpness(20);
    setNoiseReduction(false);
    setShadowRemoval(true);
    setRotation(0);
    if (file) {
      autoDetectCorners(file);
    }
  };

  // Rotate Image 90 degrees
  const handleRotate = (direction = "cw") => {
    setRotation((prev) => {
      if (direction === "cw") return (prev + 90) % 360;
      return (prev - 90 + 360) % 360;
    });
  };

  // Camera Capture Setup
  const startCamera = async () => {
    try {
      setCameraActive(true);
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Unable to access camera. Please allow camera permissions in your browser.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `camera_scan_${Date.now()}.png`, { type: "image/png" });
        stopCamera();
        handleFileSelect(capturedFile);
      }
    }, "image/png");
  };

  // Download Options (PNG, JPG, PDF)
  const downloadDocument = (format = "png") => {
    if (!scannedResult) return;

    const fileName = `scanned_doc_${Date.now()}`;

    if (format === "pdf") {
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(scannedResult);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(scannedResult, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
    } else {
      const link = document.createElement("a");
      link.href = scannedResult;
      link.download = `${fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Save Scanned Image directly to Case Documents
  const handleSaveToCaseClick = () => {
    if (!scannedResult || !onSaveToDocuments) return;
    onSaveToDocuments(
      scannedResult,
      file ? file.name : "scanned_document.png",
      selectedDocType || "Scanned Document",
      scannedResult
    );
    setSavedToDocs(true);
    setTimeout(() => setSavedToDocs(false), 2500);
  };

  // Transition to OCR
  const handleContinueToOCRClick = async () => {
    if (!scannedResult || !onContinueToOCR) return;

    // Convert Base64 Data URI to File object
    const res = await fetch(scannedResult);
    const blob = await res.blob();
    const scannedFile = new File([blob], file ? `scanned_${file.name.replace(/\.pdf$/i, ".png")}` : "scanned_doc.png", {
      type: "image/png",
    });

    onContinueToOCR(scannedFile, selectedDocType);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & File Drag-and-Drop Dropzone */}
      {!file && !cameraActive && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-[#2563EB]/40 hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-blue-50/50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group shadow-xs"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.pdf"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <div className="w-16 h-16 bg-blue-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Camera size={32} className="text-[#2563EB]" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Upload or Snap Document Image
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
              Drag & drop document photo (Aadhaar, PAN, Passport, Legal Form, Contract, Invoice, PDF) or click to browse.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startCamera();
                }}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <Camera size={15} /> Use Camera
              </button>
              <span className="text-xs text-slate-400 font-semibold">or select JPG, PNG, PDF</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Modal View */}
      {cameraActive && (
        <div className="border border-slate-200 rounded-2xl bg-black overflow-hidden p-4 relative text-center space-y-3">
          <div className="relative max-w-xl mx-auto rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <video ref={videoRef} autoPlay playsInline className="w-full h-80 object-cover" />
            <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-xs font-bold text-white/80 bg-black/60 px-3 py-1 rounded-full">
                Align document inside frame
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={capturePhoto}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Camera size={16} /> Snap Photo
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace (Side-by-Side Comparison & Adjustment Workspace) */}
      {file && (
        <div className="space-y-4">
          {/* Top Control Action Bar + Document Type Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-2xl">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="text-xs font-bold text-[#0F172A] truncate max-w-[150px] sm:max-w-xs">
                  {file.name}
                </span>
                {detectingCorners && (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-200">
                    <Loader2 size={11} className="animate-spin" /> Detecting boundaries...
                  </span>
                )}
              </div>

              {/* Document Type Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-xl shadow-2xs">
                <Tag size={13} className="text-[#2563EB]" />
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Doc Type:</span>
                <select
                  value={selectedDocType}
                  onChange={(e) => {
                    setSelectedDocType(e.target.value);
                    if (onScanUpdate && scannedResult) {
                      onScanUpdate(null, scannedResult, e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-[#0F172A] outline-none cursor-pointer pr-1"
                >
                  <option value="Vakalatnama">Vakalatnama</option>
                  <option value="Election ID Card">Election ID Card</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Court Petition">Court Petition</option>
                  <option value="Bail Application">Bail Application</option>
                  <option value="Affidavit">Affidavit</option>
                  <option value="Legal Notice">Legal Notice</option>
                  <option value="Court Order">Court Order</option>
                  <option value="Summons">Summons</option>
                  <option value="Proof Affidavit">Proof Affidavit</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Contract">Contract</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleRotate("ccw")}
                title="Rotate Left 90°"
                className="p-2 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleRotate("cw")}
                title="Rotate Right 90°"
                className="p-2 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCw size={14} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset Corners & Enhancements"
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw size={13} /> Reset
              </button>

              <button
                type="button"
                onClick={() => setShowEnhancementDrawer(!showEnhancementDrawer)}
                className={`px-3 py-1.5 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  showEnhancementDrawer
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal size={13} /> Enhancements
              </button>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setOriginalPreview(null);
                  setScannedResult(null);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                Re-upload
              </button>
            </div>
          </div>

          {/* Enhancement Drawer Controls */}
          {showEnhancementDrawer && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#2563EB]" /> Image Enhancements & Presets
                </h5>
                <button
                  onClick={() => setShowEnhancementDrawer(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Preset Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "scanned", label: "Scanned Clean", desc: "Preserves exact colors & logos" },
                  { id: "original", label: "Original Colors", desc: "Unenhanced crop" },
                  { id: "bw", label: "Crisp B&W", desc: "High contrast text" },
                  { id: "grayscale", label: "Grayscale", desc: "Monochrome tones" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={`p-2.5 text-left rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      preset === p.id
                        ? "bg-white border-[#2563EB] text-[#2563EB] shadow-xs"
                        : "bg-white/60 border-[#E2E8F0] text-slate-600 hover:bg-white"
                    }`}
                  >
                    <div>{p.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{p.desc}</div>
                  </button>
                ))}
              </div>

              {/* Sliders & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {/* Auto Contrast Toggle */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Contrast size={14} className="text-blue-600" /> Auto Contrast
                  </span>
                  <input
                    type="checkbox"
                    checked={autoContrast}
                    onChange={(e) => setAutoContrast(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>

                {/* Shadow Removal Toggle */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" /> Shadow Removal
                  </span>
                  <input
                    type="checkbox"
                    checked={shadowRemoval}
                    onChange={(e) => setShadowRemoval(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>

                {/* Noise Reduction Toggle */}
                <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" /> Noise Reduction
                  </span>
                  <input
                    type="checkbox"
                    checked={noiseReduction}
                    onChange={(e) => setNoiseReduction(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </label>

                {/* Brightness Slider */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl">
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span>Brightness</span>
                    <span>{brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Contrast Slider */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl">
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span>Contrast</span>
                    <span>{contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Sharpness Slider */}
                <div className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl">
                  <div className="flex justify-between text-[11px] font-bold text-slate-700">
                    <span>Sharpness</span>
                    <span>{sharpness}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={sharpness}
                    onChange={(e) => setSharpness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Canvas Workspace */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panel 1: Original Image + Interactive Drag Handles */}
            <div className="border border-[#E2E8F0] rounded-2xl bg-[#0F172A] p-3 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                <span>Original Document (Drag corners to adjust)</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  Interactive Boundary
                </span>
              </div>

              <div
                ref={imageContainerRef}
                className="relative w-full h-[360px] bg-black/40 rounded-xl overflow-hidden flex items-center justify-center select-none"
              >
                {originalPreview ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={originalPreview}
                      alt="Original Document"
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />

                    {/* SVG Polygon connecting 4 corner handles */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <polygon
                        points={`
                          ${(corners[0].x / 100) * 100}%,${(corners[0].y / 100) * 100}%
                          ${(corners[1].x / 100) * 100}%,${(corners[1].y / 100) * 100}%
                          ${(corners[2].x / 100) * 100}%,${(corners[2].y / 100) * 100}%
                          ${(corners[3].x / 100) * 100}%,${(corners[3].y / 100) * 100}%
                        `}
                        fill="rgba(37, 99, 235, 0.15)"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                      />
                    </svg>

                    {/* Draggable Handles for 4 Corners */}
                    {corners.map((pt, idx) => (
                      <div
                        key={idx}
                        onPointerDown={(e) => handlePointerDown(idx, e)}
                        style={{
                          left: `${pt.x}%`,
                          top: `${pt.y}%`,
                        }}
                        className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center text-[9px] font-extrabold text-white transition-transform ${
                          activeCorner === idx ? "scale-125 bg-amber-500 border-amber-300" : "bg-[#2563EB]"
                        }`}
                      >
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-400 text-xs">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                    Rendering document preview...
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Scanned / Cleaned Flat Document Result */}
            <div className="border border-[#E2E8F0] rounded-2xl bg-[#F8FAFC] p-3 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-[#0F172A] px-1">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 size={14} /> Scanned / Perspective-Corrected Output
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Scanner Quality
                </span>
              </div>

              <div className="relative w-full h-[360px] bg-slate-200/50 rounded-xl overflow-hidden flex items-center justify-center p-2">
                {scanning ? (
                  <div className="text-center space-y-2">
                    <Loader2 size={32} className="animate-spin text-[#2563EB] mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Correcting perspective & flattening...</p>
                  </div>
                ) : scannedResult ? (
                  <img
                    src={scannedResult}
                    alt="Scanned Document"
                    className="max-w-full max-h-full object-contain rounded shadow-md border border-white"
                  />
                ) : (
                  <div className="text-center text-slate-400 text-xs">
                    No scan generated yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Bottom Action Footer */}
          {scannedResult && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F172A] p-4 rounded-2xl text-white shadow-md">
              {/* Export & Save Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300">Download / Save:</span>
                <button
                  type="button"
                  onClick={() => downloadDocument("png")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                >
                  <Download size={13} /> PNG
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument("jpg")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                >
                  <Download size={13} /> JPG
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument("pdf")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
                >
                  <Download size={13} /> PDF
                </button>

                {onSaveToDocuments && (
                  <button
                    type="button"
                    onClick={handleSaveToCaseClick}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    {savedToDocs ? (
                      <><Check size={13} /> Saved to Case Docs!</>
                    ) : (
                      <><Save size={13} /> Save to Case Docs</>
                    )}
                  </button>
                )}
              </div>

              {/* Continue to OCR Action Button */}
              {onContinueToOCR && (
                <button
                  type="button"
                  onClick={handleContinueToOCRClick}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-xl group"
                >
                  <span>Continue to OCR</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
