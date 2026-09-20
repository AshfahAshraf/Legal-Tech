"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FileText, Download, ExternalLink, X, Lock } from "lucide-react";
import { getLoggedInUser } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/api";
import ReactMarkdown from "react-markdown";

export default function DocumentViewerModal({ fileUrl, title, badge, onClose }) {
  const [viewerUrl, setViewerUrl] = useState("");
  const [isPdf, setIsPdf] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [isAudio, setIsAudio] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch logged-in user and detect if Junior Advocate
  const loggedInUser = typeof window !== "undefined" ? getLoggedInUser() : null;
  const isJunior = loggedInUser && (loggedInUser.role || "").toLowerCase().replace(/\s+/g, "") === "junioradvocate";

  const cleanTitle = (title || "").replace(/[\/\\]/g, "_");

  const normalizeUrl = (url) => {
    if (!url) return "";
    if (typeof window !== "undefined") {
      if (window.location.hostname === "127.0.0.1") {
        return url.replace("localhost:8000", "127.0.0.1:8000");
      } else {
        return url.replace("127.0.0.1:8000", "localhost:8000");
      }
    }
    return url;
  };

  const getEffectiveUrl = () => {
    if (fileUrl) {
      if (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) return fileUrl;
      if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
      if (fileUrl.startsWith("/")) return `${API_BASE_URL}${fileUrl}`;
      return `${API_BASE_URL}/uploads/${encodeURIComponent(fileUrl)}`;
    }
    if (cleanTitle) {
      return `${API_BASE_URL}/uploads/${encodeURIComponent(cleanTitle)}`;
    }
    return "";
  };

  const effectiveUrl = getEffectiveUrl();
  const normalizedUrl = normalizeUrl(effectiveUrl);

  useEffect(() => {
    if (!effectiveUrl) return;

    // Detect data: URLs (Base64 encoded text or binary files)
    if (effectiveUrl.startsWith("data:")) {
      const mime = effectiveUrl.split(";")[0].split(":")[1] || "";
      const isTextData =
        mime.startsWith("text/") ||
        mime.includes("markdown") ||
        mime.includes("json") ||
        (cleanTitle && (cleanTitle.endsWith(".txt") || cleanTitle.endsWith(".md")));

      setIsImage(mime.startsWith("image/"));
      setIsPdf(mime === "application/pdf");
      setIsAudio(mime.startsWith("audio/"));
      setIsVideo(mime.startsWith("video/"));

      if (isTextData) {
        setIsMarkdown(true);
        setLoadingContent(false);
        try {
          const parts = effectiveUrl.split(",");
          const base64Str = parts[1] || "";
          const decodedText = decodeURIComponent(escape(atob(base64Str)));
          setMarkdownContent(decodedText || "*(Empty Document)*");
        } catch (err) {
          setMarkdownContent("*(Unable to decode document content)*");
        }
        setViewerUrl(effectiveUrl);
      } else {
        try {
          const parts = effectiveUrl.split(",");
          const mimeType = parts[0].match(/:(.*?);/)[1];
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mimeType });
          const bUrl = URL.createObjectURL(blob);
          setViewerUrl(bUrl);
          return () => {
            URL.revokeObjectURL(bUrl);
          };
        } catch (e) {
          setViewerUrl(effectiveUrl);
        }
      }
    } else {
      let ext = (effectiveUrl || "").split(".").pop().toLowerCase().split("?")[0];
      if (effectiveUrl.startsWith("blob:") || ext.length > 5) {
        ext = (cleanTitle || "").split(".").pop().toLowerCase().split("?")[0];
      }

      setIsImage(["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(ext));
      setIsPdf(ext === "pdf");
      setIsAudio(["mp3", "wav", "ogg", "aac", "m4a", "wma", "flac"].includes(ext));
      setIsVideo(["mp4", "webm", "ogg", "mov", "avi", "mkv", "3gp"].includes(ext));
      
      const isMd = ext === "md" || ext === "txt" || ext === "json" || ext === "log";
      setIsMarkdown(isMd);
      setViewerUrl(normalizedUrl);

      if (isMd && normalizedUrl) {
        setLoadingContent(true);
        fetch(normalizedUrl)
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const text = await res.text();
            if (text.includes('"detail":') && (text.includes("Not Found") || text.includes("not found"))) {
              throw new Error("File not found on server");
            }
            setMarkdownContent(text);
          })
          .catch(() => {
            setMarkdownContent(
              `### ⚠️ Document File Not Found\n\nThe requested document **\`${cleanTitle || "Document"}\`** is not available on the server. If this document was generated earlier without a saved text link, please regenerate or re-save it.`
            );
          })
          .finally(() => {
            setLoadingContent(false);
          });
      }
    }
  }, [effectiveUrl, normalizedUrl]);

  // Synchronous DOM manipulation to black out content BEFORE OS capture can process
  const forceBlackout = () => {
    const bodyEl = document.getElementById("secure-viewer-body");
    const overlayEl = document.getElementById("secure-blackout-overlay");
    if (bodyEl) {
      bodyEl.style.setProperty("display", "none", "important");
    }
    if (overlayEl) {
      overlayEl.style.setProperty("display", "flex", "important");
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
    const bodyEl = document.getElementById("secure-viewer-body");
    const overlayEl = document.getElementById("secure-blackout-overlay");
    if (bodyEl) {
      bodyEl.style.display = "";
    }
    if (overlayEl) {
      overlayEl.style.display = "";
    }
  };

  // Screen protection listeners for Junior Advocates
  useEffect(() => {
    if (!isJunior) return;

    const handleKeyDown = (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        forceBlackout();
        setIsLocked(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        forceBlackout();
        setIsLocked(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        forceBlackout();
        setIsLocked(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        forceBlackout();
        setIsLocked(true);
      }
    };

    const handleBlur = () => {
      forceBlackout();
      setIsLocked(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        forceBlackout();
        setIsLocked(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur, true);
    document.addEventListener("visibilitychange", handleVisibilityChange, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange, true);
    };
  }, [isJunior]);

  const handleDownload = () => {
    if (!normalizedUrl) return;

    if (isJunior) {
      alert("Downloading confidential files is restricted for Junior Advocates.");
      return;
    }

    if (normalizedUrl.startsWith("data:")) {
      try {
        const parts = normalizedUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = cleanTitle || "document";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Base64 download failed, fallback to direct open:", err);
        window.open(normalizedUrl, "_blank");
      }
    } else {
      window.location.href = normalizedUrl + "?download=true";
    }
  };

  const watermarkText = loggedInUser 
    ? `CONFIDENTIAL - ${loggedInUser.email || loggedInUser.username} - DO NOT SHARE`
    : "CONFIDENTIAL - JUNIOR ADVOCATE ACCESS";

  const svgWatermark = `
    <svg xmlns="http://www.w3.org/2000/svg" width="350" height="250" viewBox="0 0 350 250">
      <text x="50%" y="50%" fill="rgba(148, 163, 184, 0.12)" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle" transform="rotate(-25 175 125)">
        ${watermarkText}
      </text>
    </svg>
  `;
  
  const watermarkStyle = isJunior ? {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svgWatermark)}")`,
    backgroundRepeat: 'repeat',
    pointerEvents: 'none',
  } : {};

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 select-none"
         onContextMenu={isJunior ? (e) => e.preventDefault() : undefined}>
      {isJunior && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body { display: none !important; }
            .secure-document-viewer { display: none !important; }
          }
        `}} />
      )}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden secure-document-viewer">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-tight">{cleanTitle || "Document"}</h3>
              {badge && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isJunior && (
              <>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Download size={13} /> Download
                </button>
                {normalizedUrl && (
                  <a href={normalizedUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg transition">
                    <ExternalLink size={13} /> Open in Tab
                  </a>
                )}
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center min-h-[400px] relative">
          
          {/* Blackout Locked Overlay */}
          <div 
            id="secure-blackout-overlay" 
            className="absolute inset-0 bg-black z-[60] flex flex-col items-center justify-center p-8 text-center text-red-500 gap-4 min-h-[500px]"
            style={{ display: (isLocked && isJunior) ? "flex" : "none" }}
          >
            <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
              <Lock size={32} className="text-red-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-red-500 uppercase tracking-widest">⚠️ Document Locked</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Access was suspended because screen capture, print, dev tools, or focus loss was detected.
              </p>
            </div>
            <button
              onClick={handleUnlock}
              className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
            >
              Unlock Document
            </button>
          </div>

          {/* Secure Document Content */}
          <div 
            id="secure-viewer-body" 
            className="w-full h-full flex items-center justify-center relative"
            style={{ display: (isLocked && isJunior) ? "none" : "flex" }}
          >
            {isJunior && (
              <div className="absolute inset-0 z-50 pointer-events-none" style={watermarkStyle} />
            )}
            {!viewerUrl ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center">
                  <FileText size={32} />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">No preview available</p>
                  <p className="text-xs text-slate-500 mt-1">This document has no uploaded file data to preview.</p>
                </div>
              </div>
            ) : isPdf ? (
              <iframe src={viewerUrl} className="w-full h-full min-h-[600px] border-0" title={cleanTitle || "Document"} />
            ) : isMarkdown ? (
              <div className="w-full h-full p-6 md:p-8 overflow-auto bg-[#FFFDF5] flex flex-col justify-start items-start select-text border border-amber-200/40">
                {loadingContent ? (
                  <div className="flex items-center justify-center w-full h-full py-8 text-slate-400 font-semibold">
                    Loading content...
                  </div>
                ) : (/<[a-z][\s\S]*>/i.test(markdownContent) || (cleanTitle && cleanTitle.endsWith(".html"))) ? (
                  <div
                    className="prose max-w-none text-[#0F172A] font-serif leading-relaxed text-sm w-full"
                    dangerouslySetInnerHTML={{ __html: markdownContent }}
                  />
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-sm w-full font-serif whitespace-pre-wrap">
                    <ReactMarkdown>{markdownContent}</ReactMarkdown>
                  </div>
                )}
              </div>
            ) : isImage ? (
              <div className="p-6">
                <img src={viewerUrl} alt={cleanTitle || "Document"} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg" />
              </div>
            ) : isAudio ? (
              <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white rounded-xl border border-slate-200 w-full max-w-md mx-auto my-8 shadow-sm">
                <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-full flex items-center justify-center shadow-xs">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <p className="font-bold text-slate-700 text-sm text-center truncate max-w-full">{cleanTitle}</p>
                <audio controls src={viewerUrl} className="w-full mt-2 focus:outline-none" />
              </div>
            ) : isVideo ? (
              <div className="p-6 flex items-center justify-center max-w-full w-full h-full">
                <video controls src={viewerUrl} className="max-w-full max-h-[70vh] rounded-xl shadow-lg border border-slate-200" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center">
                  <FileText size={32} />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">Preview not available</p>
                  <p className="text-xs text-slate-500 mt-1">This file type cannot be previewed in the browser.</p>
                </div>
                {!isJunior && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    <Download size={14} /> Download File
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
