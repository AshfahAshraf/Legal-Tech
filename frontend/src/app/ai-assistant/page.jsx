"use client";

import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Bot, User, ArrowLeft, Loader2, X, Sparkles } from "lucide-react";

function AIAssistantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientName = searchParams ? searchParams.get("clientName") : null;

  const [clientName, setClientName] = useState(initialClientName || "");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: initialClientName 
        ? `Hello! I am your AI Legal Assistant. I've loaded the case history, billing status, and consultation records for client "${initialClientName}". How can I help you with their details today?`
        : "Hello! I am your AI Legal Assistant. How can I help you ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState({ role: "", advocateName: "" });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const user = getLoggedInUser();
    if (user) {
      setUserContext({
        role: user.role || "",
        advocateName: user.name || user.advocateName || user.username || ""
      });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/case-management/ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          query: userMessage.text,
          role: userContext.role,
          advocateName: userContext.advocateName,
          clientName: clientName || undefined
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.response }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I encountered an error while processing your request." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearContext = () => {
    setClientName("");
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: "Client context cleared. I am now in general assistant mode. How can I help you?" }
    ]);
  };

  const generalSuggestions = [
    "What hearings do I have tomorrow?",
    "Which advocates are handling which cases?",
    "Who is currently on leave or scheduled for leave?",
    "List the documents for my active cases",
    "Draft a legal notice based on my latest case"
  ];

  const clientSuggestions = [
    `Summarize cases for ${clientName}`,
    `Check outstanding billing for ${clientName}`,
    `Show latest consultation with ${clientName}`,
    `Draft case status update for ${clientName}`
  ];

  const suggestions = clientName ? clientSuggestions : generalSuggestions;

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
      
      {/* ──── MODERN GLASS HEADER ──── */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-all shrink-0 cursor-pointer shadow-xs"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C3AED] via-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles size={22} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#0F172A] font-extrabold text-base sm:text-lg tracking-tight">
                {clientName ? (
                  <>
                    AI Assistant <span className="text-indigo-600 font-bold">· {clientName}</span>
                  </>
                ) : (
                  "AI Legal Assistant"
                )}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Engine
              </span>
            </div>
            <p className="text-[#64748B] text-xs mt-0.5">
              {clientName
                ? `Intelligent assistant scoped to cases, billing & consultations for ${clientName}`
                : "Ask questions about court cases, legal documents, hearings & clients"}
            </p>
          </div>
        </div>

        {clientName && (
          <button
            onClick={handleClearContext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs transition cursor-pointer self-start sm:self-auto"
          >
            <X size={13} /> Clear Client Context
          </button>
        )}
      </div>

      {/* ──── MAIN CHAT CONTAINER ──── */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden min-h-0">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-[#F8FAFC] to-white">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}
            >
              <div
                className={`flex max-w-[90%] sm:max-w-[80%] gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#0F172A] text-white"
                      : "bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div
                  className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white font-medium rounded-tr-xs shadow-md shadow-indigo-500/10"
                      : "bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tl-xs shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex max-w-[80%] gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white flex items-center justify-center shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B] rounded-tl-xs shadow-sm flex items-center gap-2 text-xs font-semibold">
                  <Loader2 size={16} className="animate-spin text-[#7C3AED]" />
                  Analyzing legal context...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompts & Input Area */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E2E8F0] space-y-3 shrink-0">
          
          {/* Suggestion Chips */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border cursor-pointer bg-[#F8FAFC] hover:bg-indigo-50 border-[#E2E8F0] hover:border-indigo-200 text-[#475569] hover:text-indigo-700 shadow-2xs flex items-center gap-1.5"
              >
                <Sparkles size={12} className="text-indigo-500 flex-shrink-0" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Text Input Box */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] p-2 rounded-2xl border border-[#E2E8F0] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-xs">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                clientName
                  ? `Ask about cases or billing for ${clientName}...`
                  : "Ask a question (e.g., 'What hearings do I have tomorrow?')..."
              }
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-28 min-h-[40px] py-2 px-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:from-[#6d28d9] hover:to-[#4338CA] disabled:opacity-40 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex-shrink-0"
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen text-slate-500 text-sm gap-2">
        <Loader2 size={18} className="animate-spin text-indigo-600" /> Loading AI Legal Assistant...
      </div>
    }>
      <AIAssistantContent />
    </Suspense>
  );
}
