"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/utils/api";
import { 
    Bot, 
    FileText, 
    Send, 
    Download, 
    ArrowLeft, 
    History, 
    Edit3, 
    Trash2, 
    Check, 
    X, 
    FileType, 
    Sparkles, 
    Clock, 
    Search,
    Save,
    Eye,
    RefreshCw,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

export default function DocumentGenerationView() {
    const router = useRouter();
    const documentRef = useRef(null);

    // Form & Active document state
    const [cases, setCases] = useState([]);
    const [selectedCase, setSelectedCase] = useState("");
    const [prompt, setPrompt] = useState("");
    const [generatedDoc, setGeneratedDoc] = useState("");
    const [activeHistoryId, setActiveHistoryId] = useState(null);
    const [activeCaseTitle, setActiveCaseTitle] = useState("");
    const [activeCaseNo, setActiveCaseNo] = useState("");
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [activeTab, setActiveTab] = useState("generate"); // "generate" | "history" | "view_detail"

    // History state
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState("");

    // Pagination state (6 items per page)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        setCurrentPage(1);
    }, [historySearch]);

    // Custom Modal State
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        fetchCases();
        fetchHistory();
    }, []);

    const fetchCases = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/case-management/`);
            if (response.ok) {
                const data = await response.json();
                setCases(data);
            }
        } catch (err) {
            console.error("Error fetching cases", err);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const response = await fetch(`${API_BASE_URL}/case-management/ai-documents/history`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Error fetching document history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!selectedCase || !prompt) {
            setError("Please select a case and provide instructions.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);
        setGeneratedDoc("");
        setIsEditing(false);
        setActiveHistoryId(null);

        const targetCase = cases.find(c => String(c.id) === String(selectedCase));

        try {
            const response = await fetch(`${API_BASE_URL}/case-management/${selectedCase}/generate-document`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Failed to generate document");
            }

            const data = await response.json();
            setGeneratedDoc(data.document);
            setEditedContent(data.document);
            setActiveHistoryId(data.id || null);
            setActiveCaseTitle(targetCase?.case_title || data.case_title || "");
            setActiveCaseNo(targetCase?.case_no || data.case_no || "");
            setSuccess(true);
            
            // Refresh history list
            fetchHistory();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectHistoryItem = (item) => {
        setActiveHistoryId(item.id);
        setGeneratedDoc(item.content);
        setEditedContent(item.content);
        setActiveCaseTitle(item.case_title || "");
        setActiveCaseNo(item.case_no || "");
        setPrompt(item.prompt || "");
        setIsEditing(false);
        setSuccess(true);
        setActiveTab("view_detail");
    };

    const handleSaveEdit = async () => {
        if (!activeHistoryId) {
            setGeneratedDoc(editedContent);
            setIsEditing(false);
            return;
        }

        setIsSavingEdit(true);
        try {
            const response = await fetch(`${API_BASE_URL}/case-management/ai-documents/history/${activeHistoryId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: editedContent })
            });

            if (!response.ok) {
                throw new Error("Failed to save changes to backend");
            }

            const updatedDoc = await response.json();
            setGeneratedDoc(updatedDoc.content);
            setEditedContent(updatedDoc.content);
            setIsEditing(false);
            
            setHistory(prev => prev.map(h => h.id === activeHistoryId ? updatedDoc : h));
        } catch (err) {
            console.error("Save edit error:", err);
            alert("Error saving edits: " + err.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const triggerDeleteHistoryItem = (e, id) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setDeleteConfirmId(id);
    };

    const confirmDeleteHistoryItem = async () => {
        if (!deleteConfirmId) return;
        setDeleteLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/case-management/ai-documents/history/${deleteConfirmId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                setHistory(prev => prev.filter(h => h.id !== deleteConfirmId));
                if (activeHistoryId === deleteConfirmId) {
                    setGeneratedDoc("");
                    setEditedContent("");
                    setActiveHistoryId(null);
                    setSuccess(false);
                    if (activeTab === "view_detail") {
                        setActiveTab("history");
                    }
                }
                setDeleteConfirmId(null);
            } else {
                setError("Failed to delete history item");
            }
        } catch (err) {
            console.error("Delete history item error:", err);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDownloadPdf = (docText, title) => {
        const textToExport = docText || generatedDoc;
        if (!textToExport) return;
        
        const doc = new jsPDF();
        const docTitle = title || activeCaseTitle || 'legal_document';

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(docTitle.toUpperCase(), 15, 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const cleanText = textToExport
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#/g, '');

        const splitText = doc.splitTextToSize(cleanText, 180);
        
        let y = 25;
        for (let i = 0; i < splitText.length; i++) {
            if (y > 280) {
                doc.addPage();
                y = 15;
            }
            doc.text(splitText[i], 15, y);
            y += 6;
        }

        doc.save(`${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    };

    const handleDownloadWord = (docText, title, caseNo) => {
        const textToExport = docText || generatedDoc;
        if (!textToExport) return;

        const docTitle = title || activeCaseTitle || "Legal_Document";
        const cNo = caseNo || activeCaseNo || "";

        const formattedHtml = `
            <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>${docTitle}</title>
                <style>
                    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; padding: 30px; }
                    h1 { font-size: 18pt; font-weight: bold; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
                    h2 { font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-top: 18px; margin-bottom: 8px; }
                    h3 { font-size: 12pt; font-weight: bold; color: #334155; margin-top: 14px; margin-bottom: 6px; }
                    p { margin-bottom: 10px; text-align: justify; }
                    strong { font-weight: bold; color: #0f172a; }
                    .header-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 20px; font-size: 10pt; }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <strong>DOCUMENT TITLE:</strong> ${docTitle.toUpperCase()}<br/>
                    ${cNo ? `<strong>CASE NO:</strong> ${cNo}<br/>` : ''}
                    <strong>GENERATED DATE:</strong> ${new Date().toLocaleDateString('en-IN')}
                </div>
                <div>
                    ${textToExport
                        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/\n/g, '<br/>')}
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', formattedHtml], {
            type: 'application/msword'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const filteredHistory = history.filter(item => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
            (item.case_title && item.case_title.toLowerCase().includes(q)) ||
            (item.case_no && item.case_no.toLowerCase().includes(q)) ||
            (item.prompt && item.prompt.toLowerCase().includes(q))
        );
    });

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Top Header */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => {
                            if (activeTab === "view_detail") {
                                setActiveTab("history");
                            } else {
                                router.back();
                            }
                        }} 
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>

                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                        <Bot className="w-6 h-6" />
                    </div>

                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
                                AI Document Generation
                            </h1>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 border border-indigo-200/60 hidden sm:inline-block">
                                Gemini AI Engine
                            </span>
                        </div>
                        <p className="text-slate-500 mt-0.5 font-medium text-xs md:text-sm">
                            Draft legal documents instantly, save history, edit content, and export as PDF or Word.
                        </p>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="flex items-center bg-[#F8FAFC] p-1.5 rounded-2xl border border-[#E2E8F0] self-stretch md:self-auto">
                    <button
                        onClick={() => setActiveTab("generate")}
                        className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === "generate"
                                ? "bg-white text-indigo-600 shadow-sm border border-[#E2E8F0]"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Generate New
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                            activeTab === "history" || activeTab === "view_detail"
                                ? "bg-white text-indigo-600 shadow-sm border border-[#E2E8F0]"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <History className="w-4 h-4 text-indigo-500" />
                        Document History
                        {history.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                                {history.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: GENERATE NEW DOCUMENT VIEW */}
            {activeTab === "generate" && (
                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 flex flex-col min-h-[550px] lg:h-[720px]">
                        <h2 className="text-base font-extrabold text-[#0F172A] mb-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                <FileText className="w-4 h-4" />
                            </div>
                            Instructions & Case Setup
                        </h2>
                        
                        <form onSubmit={handleGenerate} className="space-y-4 flex-1 flex flex-col">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Select Case
                                </label>
                                <select
                                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all cursor-pointer"
                                    value={selectedCase}
                                    onChange={(e) => setSelectedCase(e.target.value)}
                                >
                                    <option value="">-- Choose a case --</option>
                                    {cases.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.case_no} - {c.case_title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Prompt / Instructions
                                </label>
                                <textarea
                                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-xs font-medium rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 block p-3.5 outline-none transition-all flex-1 min-h-[140px] resize-none leading-relaxed placeholder:text-slate-400"
                                    placeholder="e.g. Draft a bail petition for this case focusing on the client's medical condition..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                
                                <div className="mt-4">
                                    <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Quick Examples:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            "Draft a standard Bail Petition.",
                                            "Write a Legal Notice for breach of contract.",
                                            "Generate a sworn Affidavit for the client.",
                                            "Draft an application for an adjournment of hearing."
                                        ].map((example, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setPrompt(example)}
                                                className="text-xs bg-[#F8FAFC] hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 font-semibold px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:border-indigo-200 transition-all cursor-pointer text-left flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <Sparkles size={12} className="text-indigo-500 flex-shrink-0" />
                                                <span>{example}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-sm"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        <span>Drafting Legal Document...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Generate Document
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Column: Live Output Viewer */}
                    <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden min-h-[550px] lg:h-[720px]">
                        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-4 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <h2 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                                    Generated Output
                                </h2>
                                {activeCaseTitle && (
                                    <span className="text-xs bg-indigo-100/80 text-indigo-800 font-bold px-3 py-0.5 rounded-full border border-indigo-200/60">
                                        {activeCaseTitle} {activeCaseNo ? `(${activeCaseNo})` : ''}
                                    </span>
                                )}
                            </div>

                            {generatedDoc && (
                                <div className="flex items-center flex-wrap gap-2">
                                    {isEditing ? (
                                        <button 
                                            onClick={handleSaveEdit}
                                            disabled={isSavingEdit}
                                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            {isSavingEdit ? "Saving..." : "Save Changes"}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                            Edit Content
                                        </button>
                                    )}

                                    {isEditing && (
                                        <button 
                                            onClick={() => {
                                                setEditedContent(generatedDoc);
                                                setIsEditing(false);
                                            }}
                                            className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Cancel
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => handleDownloadPdf(generatedDoc, activeCaseTitle)}
                                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-200"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download PDF
                                    </button>

                                    <button 
                                        onClick={() => handleDownloadWord(generatedDoc, activeCaseTitle, activeCaseNo)}
                                        className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-indigo-200"
                                    >
                                        <FileType className="w-3.5 h-3.5" />
                                        Download Word (.docx)
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto bg-[#F8FAFC]/50">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-16">
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-75" />
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-bold text-slate-800 text-sm animate-pulse">AI is drafting your legal document...</p>
                                        <p className="text-xs text-slate-400">Formatting clause structures, legal arguments & case details.</p>
                                    </div>
                                </div>
                            ) : generatedDoc ? (
                                isEditing ? (
                                    <div className="h-full flex flex-col space-y-2">
                                        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                                            <span>Editing Mode (Markdown supported)</span>
                                            <span>Click "Save Changes" to update history</span>
                                        </div>
                                        <textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="w-full flex-1 p-4 bg-white border border-indigo-300 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono text-xs text-slate-800 leading-relaxed resize-none shadow-inner"
                                        />
                                    </div>
                                ) : (
                                    <div ref={documentRef} className="prose prose-slate max-w-none text-slate-800 p-6 md:p-8 bg-white rounded-2xl border border border-slate-200/80 shadow-xs min-h-full">
                                        <ReactMarkdown>{generatedDoc}</ReactMarkdown>
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-16 text-center">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-inner">
                                        <FileText className="w-8 h-8 opacity-40" />
                                    </div>
                                    <div className="max-w-xs space-y-1">
                                        <h3 className="font-bold text-slate-700 text-sm">No Document Drafted Yet</h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Select a case from the left panel and provide prompt instructions to generate a legal document.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: FULL TABLE VIEW FOR DOCUMENT HISTORY */}
            {activeTab === "history" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
                    {/* Header & Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <History className="w-6 h-6 text-blue-600" />
                                Generated Documents History
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Browse, edit, delete, and download all previously AI-generated legal documents.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 self-stretch sm:self-auto">
                            <button
                                onClick={fetchHistory}
                                className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                                title="Refresh History"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                        <input
                            type="text"
                            placeholder="Search by case title, case number, or instructions prompt..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs font-medium"
                        />
                    </div>

                    {/* Mobile Card List View (< 768px) */}
                    <div className="block md:hidden space-y-3">
                        {loadingHistory ? (
                            <div className="py-12 text-center text-slate-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto mb-2" />
                                <span className="font-medium text-xs">Loading document history...</span>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200">
                                <Clock className="w-10 h-10 opacity-20 mx-auto mb-2" />
                                <p className="font-semibold text-slate-600 text-sm">No saved documents found</p>
                                <span className="text-xs text-slate-400">
                                    {historySearch ? "Try clearing your search query." : "Generate a new document to start building your history."}
                                </span>
                            </div>
                        ) : (
                            paginatedHistory.map((item, index) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleSelectHistoryItem(item)}
                                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 active:scale-[0.99] transition cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                                {item.case_title || "Untitled Case"}
                                            </h3>
                                            {item.case_no && (
                                                <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold mt-1">
                                                    {item.case_no}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            #{startIndex + index + 1}
                                        </span>
                                    </div>

                                    {item.prompt && (
                                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 italic font-medium">
                                            "{item.prompt}"
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 gap-2 flex-wrap">
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                                            }) : '-'}
                                        </span>

                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleSelectHistoryItem(item)}
                                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition font-bold text-xs flex items-center gap-1"
                                                title="View & Edit"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> View
                                            </button>

                                            <button
                                                onClick={() => handleDownloadPdf(item.content, item.case_title)}
                                                className="p-1.5 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition"
                                                title="PDF"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleDownloadWord(item.content, item.case_title, item.case_no)}
                                                className="p-1.5 bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition"
                                                title="Word"
                                            >
                                                <FileType className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={(e) => triggerDeleteHistoryItem(e, item.id)}
                                                className="p-1.5 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop/Tablet Table View (≥ 768px) */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-extrabold tracking-wider">
                                    <th className="py-4 px-4 text-center w-12">#</th>
                                    <th className="py-4 px-6">Case Details</th>
                                    <th className="py-4 px-6">Prompt / Instructions</th>
                                    <th className="py-4 px-6">Date Generated</th>
                                    <th className="py-4 px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loadingHistory ? (
                                    <tr>
                                        <td colSpan="5" className="py-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                                                <span className="font-medium text-xs">Loading document history...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-16 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Clock className="w-12 h-12 opacity-20" />
                                                <span className="font-semibold text-slate-600 text-base">No saved documents found</span>
                                                <span className="text-xs text-slate-400">
                                                    {historySearch ? "Try clearing your search query." : "Generate a new document to start building your history."}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedHistory.map((item, index) => (
                                        <tr 
                                            key={item.id} 
                                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            onClick={() => handleSelectHistoryItem(item)}
                                        >
                                            <td className="py-4 px-4 text-center font-bold text-slate-400 text-xs">
                                                {startIndex + index + 1}
                                            </td>

                                            <td className="py-4 px-6">
                                                <div className="font-bold text-slate-900">
                                                    {item.case_title || "Untitled Case"}
                                                </div>
                                                {item.case_no && (
                                                    <span className="inline-block text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono mt-1 font-semibold">
                                                        {item.case_no}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6 max-w-xs md:max-w-md">
                                                <p className="text-slate-700 text-xs line-clamp-2 font-medium">
                                                    {item.prompt}
                                                </p>
                                            </td>

                                            <td className="py-4 px-6 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                }) : '-'}
                                            </td>

                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {/* View / Edit button */}
                                                    <button
                                                        onClick={() => handleSelectHistoryItem(item)}
                                                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
                                                        title="View & Edit Document"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View / Edit
                                                    </button>

                                                    {/* PDF Download */}
                                                    <button
                                                        onClick={() => handleDownloadPdf(item.content, item.case_title)}
                                                        className="p-2 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Word Download */}
                                                    <button
                                                        onClick={() => handleDownloadWord(item.content, item.case_title, item.case_no)}
                                                        className="p-2 bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all cursor-pointer"
                                                        title="Download Word (.docx)"
                                                    >
                                                        <FileType className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={(e) => triggerDeleteHistoryItem(e, item.id)}
                                                        className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                                                        title="Delete Document"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {filteredHistory.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                            <div>
                                Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
                                <span className="font-bold text-slate-900">
                                    {Math.min(startIndex + itemsPerPage, filteredHistory.length)}
                                </span>{" "}
                                of <span className="font-bold text-slate-900">{filteredHistory.length}</span> documents
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    Previous
                                </button>
                                
                                <span className="px-3 py-1.5 font-bold text-slate-800 bg-slate-100 rounded-xl">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
                                >
                                    Next
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: DETAIL VIEW & EDITOR FOR SELECTED HISTORY ITEM */}
            {activeTab === "view_detail" && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[750px]">
                    {/* Top Detail Header Bar */}
                    <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setActiveTab("history")}
                                className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to History Table
                            </button>

                            <div>
                                <h2 className="text-base md:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                    {activeCaseTitle || "Document Preview"}
                                </h2>
                                {activeCaseNo && (
                                    <span className="text-xs text-slate-500 font-mono font-medium">
                                        Case No: {activeCaseNo}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                            {/* Edit / Save Toggle Button */}
                            {isEditing ? (
                                <button 
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit}
                                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                    <Edit3 className="w-4 h-4 text-blue-600" />
                                    Edit Content
                                </button>
                            )}

                            {isEditing && (
                                <button 
                                    onClick={() => {
                                        setEditedContent(generatedDoc);
                                        setIsEditing(false);
                                    }}
                                    className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel Edit
                                </button>
                            )}

                            <button 
                                onClick={() => handleDownloadPdf(generatedDoc, activeCaseTitle)}
                                className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-200"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF
                            </button>

                            <button 
                                onClick={() => handleDownloadWord(generatedDoc, activeCaseTitle, activeCaseNo)}
                                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-indigo-200"
                            >
                                <FileType className="w-4 h-4" />
                                Download Word (.docx)
                            </button>

                            {activeHistoryId && (
                                <button 
                                    onClick={(e) => triggerDeleteHistoryItem(e, activeHistoryId)}
                                    className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-red-200"
                                    title="Delete from History"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Prompt banner */}
                    {prompt && (
                        <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-3 text-xs text-slate-700">
                            <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mr-2 bg-slate-200 px-2 py-0.5 rounded">Prompt Used:</span>
                            <span className="italic font-medium">{prompt}</span>
                        </div>
                    )}
                    
                    {/* Content area */}
                    <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
                        {isEditing ? (
                            <div className="h-full flex flex-col space-y-2">
                                <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                                    <span>Editing Mode (Markdown supported)</span>
                                    <span>Click "Save Changes" to update history</span>
                                </div>
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="w-full flex-1 p-6 bg-white border border-blue-400 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm text-slate-800 leading-relaxed resize-none shadow-inner"
                                />
                            </div>
                        ) : (
                            <div ref={documentRef} className="prose prose-slate max-w-none text-slate-800 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-full">
                                <ReactMarkdown>{generatedDoc}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmId && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl z-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-xs">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-[#0F172A] mb-1.5">Delete Document?</h3>
                        <p className="text-xs text-[#64748B] leading-relaxed mb-6">
                            Are you sure you want to delete this document from history? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-xs hover:bg-[#F8FAFC] transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteHistoryItem}
                                disabled={deleteLoading}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold text-xs transition shadow-md shadow-rose-500/20 disabled:opacity-70 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {deleteLoading ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
