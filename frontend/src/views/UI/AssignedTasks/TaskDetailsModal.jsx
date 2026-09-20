"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  Briefcase,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Loader2,
  Pencil,
  Tag,
  Trash2,
  AlertTriangle,
  Pin,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { getLoggedInUser } from "@/utils/auth";

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "#64748B", bg: "#F1F5F9" },
  progress: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  review: { label: "Under Review", color: "#D97706", bg: "#FFFBEB" },
  completed: { label: "Completed", color: "#16A34A", bg: "#F0FDF4" },
};

const MESSAGE_TYPE_CONFIG = {
  general: { label: "Message", color: "#64748B", icon: MessageSquare },
  progress: { label: "Progress Update", color: "#2563EB", icon: Clock },
  review: { label: "Review Request", color: "#D97706", icon: Eye },
  completed: { label: "Completed", color: "#16A34A", icon: CheckCircle2 },
  todo: { label: "Todo Update", color: "#64748B", icon: Tag },
};

const PRIORITY_CONFIG = {
  Urgent: { color: "#DC2626", bg: "#FEF2F2" },
  High: { color: "#D97706", bg: "#FFFBEB" },
  Medium: { color: "#2563EB", bg: "#EFF6FF" },
  Low: { color: "#16A34A", bg: "#F0FDF4" },
};

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TaskDetailsModal({ task: initialTask, onClose, onStatusChange, isSenior, onEdit, perms, onDelete, onPinToggle }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [task, setTask] = useState(initialTask);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const [messages, setMessages] = useState(initialTask?.messages || []);
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const chatEndRef = useRef(null);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    onDelete && onDelete(task.id);
  };

  const handlePinClick = async () => {
    if (!perms?.edit || !onPinToggle) return;
    const nextPinned = !task.is_pinned;
    setTask(prev => ({ ...prev, is_pinned: nextPinned }));
    await onPinToggle(task.id, task.is_pinned);
  };

  const user = getLoggedInUser();

  useEffect(() => {
    if (!mounted || !task?.id) return;
    fetchMessages();
  }, [task?.id, mounted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const token = localStorage.getItem("token");
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE_URL}/advocate/tasks/${task.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const token = localStorage.getItem("token");
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/advocate/tasks/${task.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage.trim(), message_type: messageType }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
      }
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const token = localStorage.getItem("token");
    setChangingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/advocate/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        onStatusChange && onStatusChange(task.id, newStatus, true);
      }
    } catch (e) {
      console.error("Error changing status:", e);
    } finally {
      setChangingStatus(false);
    }
  };

  const status = STATUS_CONFIG[task?.status] || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task?.priority] || PRIORITY_CONFIG.Medium;

  const STATUSES = ["todo", "progress", "review", "completed"];

  const isOwnMessage = (msg) => msg.sender_id === user?.id;

  if (!mounted || typeof window === "undefined" || !task) return null;

  return (
    <>
      {createPortal(
        <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: "780px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#0F2A6B,#1E3A8A,#2563EB)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>Task #{task.id}</span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>·</span>
              <span style={{
                background: status.bg,
                color: status.color,
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "20px",
              }}>
                {status.label}
              </span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>·</span>
              <span style={{
                background: priority.bg,
                color: priority.color,
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "20px",
              }}>
                {task.priority}
              </span>
            </div>
            <h2 style={{ color: "#fff", fontSize: "17px", fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
              {task.title}
            </h2>
          </div>

          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            {perms?.edit && (
              <button
                onClick={handlePinClick}
                style={{
                  background: task.is_pinned ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: task.is_pinned ? "#F59E0B" : "#fff",
                  transform: task.is_pinned ? "rotate(-45deg)" : "none",
                  transition: "all 0.2s",
                }}
                title={task.is_pinned ? "Unpin Task" : "Pin Task"}
              >
                <Pin size={16} fill={task.is_pinned ? "#F59E0B" : "none"} />
              </button>
            )}
            {isSenior && perms?.edit && (
              <button
                onClick={() => onEdit && onEdit(task)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                }}
                title="Edit Task"
              >
                <Pencil size={16} />
              </button>
            )}
            {isSenior && perms?.delete && (
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: deleting ? "not-allowed" : "pointer",
                  color: "#ef4444",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.4)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.2)";
                  e.currentTarget.style.color = "#ef4444";
                }}
                title="Delete Task"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body: 2 columns */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Details panel */}
          <div style={{
            width: "280px",
            flexShrink: 0,
            borderRight: "1.5px solid #F1F5F9",
            overflowY: "auto",
            padding: "20px",
            background: "#FAFBFC",
          }}>
            {/* Description */}
            {task.description && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Description</h4>
                <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, margin: 0 }}>{task.description}</p>
              </div>
            )}

            {/* Meta info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {task.case_title && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F0F9FF", borderRadius: "8px", padding: "8px 10px" }}>
                  <Briefcase size={14} color="#0284C7" />
                  <div>
                    <div style={{ fontSize: "10px", color: "#7DD3FC", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Linked Case</div>
                    <div style={{ fontSize: "12.5px", color: "#0369A1", fontWeight: 600 }}>{task.case_title}</div>
                    {task.case_no && <div style={{ fontSize: "11px", color: "#7DD3FC" }}>{task.case_no}</div>}
                  </div>
                </div>
              )}

              {task.due_date && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={14} color="#64748B" />
                  <div>
                    <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>Due Date</div>
                    <div style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>
                      {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={14} color="#64748B" />
                <div>
                  <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>Assigned To</div>
                  <div style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>{task.junior_name || "Junior Advocate"}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={14} color="#64748B" />
                <div>
                  <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>Assigned By</div>
                  <div style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>{task.senior_name || "Senior Advocate"}</div>
                </div>
              </div>
            </div>

            {/* Status changer */}
            <div>
              <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                Update Status
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {STATUSES.map((s) => {
                  const sc = STATUS_CONFIG[s];
                  const isActive = task.status === s;
                  return (
                    <button
                      key={s}
                      disabled={changingStatus || isActive || !perms?.edit}
                      onClick={() => handleStatusChange(s)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: isActive ? `2px solid ${sc.color}` : "1.5px solid #E2E8F0",
                        background: isActive ? sc.bg : "#fff",
                        color: isActive ? sc.color : "#64748B",
                        fontSize: "12.5px",
                        fontWeight: isActive ? 700 : 500,
                        cursor: isActive ? "default" : "pointer",
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = "#fff")}
                    >
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: sc.color, flexShrink: 0 }} />
                      {sc.label}
                      {isActive && <span style={{ marginLeft: "auto", fontSize: "10px" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Chat feed */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Messages header */}
            <div style={{
              padding: "14px 20px",
              borderBottom: "1.5px solid #F1F5F9",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <MessageSquare size={16} color="#2563EB" />
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>Progress Feed</span>
              <span style={{
                background: "#EFF6FF",
                color: "#2563EB",
                fontSize: "11px",
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: "20px",
                marginLeft: "4px",
              }}>
                {messages.length}
              </span>
            </div>

            {/* Messages list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {loadingMessages ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#94A3B8" }}>
                  <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#CBD5E1" }}>
                  <MessageSquare size={32} style={{ margin: "0 auto 10px", display: "block" }} />
                  <p style={{ margin: 0, fontSize: "13px" }}>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const mine = isOwnMessage(msg);
                  const typeConfig = MESSAGE_TYPE_CONFIG[msg.message_type] || MESSAGE_TYPE_CONFIG.general;
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: mine ? "flex-end" : "flex-start",
                      }}
                    >
                      {/* Sender + time */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || "U")}&background=${mine ? "2563EB" : "D97706"}&color=fff&size=40&rounded=true&bold=true`}
                          alt={msg.sender_name}
                          style={{ width: "20px", height: "20px", borderRadius: "50%", order: mine ? 2 : 0 }}
                        />
                        <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                          {mine ? "You" : (msg.sender_name || "Advocate")}
                        </span>
                        <span style={{ fontSize: "10px", color: "#CBD5E1" }}>{formatTime(msg.created_at)}</span>
                      </div>

                      {/* Bubble */}
                      <div style={{
                        maxWidth: "80%",
                        background: mine ? "linear-gradient(135deg,#2563EB,#1d4ed8)" : "#F1F5F9",
                        color: mine ? "#fff" : "#1E293B",
                        borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                        padding: "10px 14px",
                        fontSize: "13px",
                        lineHeight: 1.55,
                      }}>
                        {/* Message type tag */}
                        {msg.message_type && msg.message_type !== "general" && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginBottom: "5px",
                            opacity: 0.8,
                          }}>
                            <TypeIcon size={10} />
                            <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {typeConfig.label}
                            </span>
                          </div>
                        )}
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <div style={{
              padding: "12px 16px",
              borderTop: "1.5px solid #F1F5F9",
              background: "#FAFBFC",
            }}>
              {/* Message type selector */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                {Object.entries(MESSAGE_TYPE_CONFIG).map(([key, conf]) => {
                  const Icon = conf.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setMessageType(key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        border: `1.5px solid ${messageType === key ? conf.color : "#E2E8F0"}`,
                        background: messageType === key ? conf.color : "#fff",
                        color: messageType === key ? "#fff" : "#64748B",
                        fontSize: "10.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={10} />
                      {conf.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder="Type a progress update, message... (Enter to send)"
                  style={{
                    flex: 1,
                    padding: "10px 13px",
                    border: "1.5px solid #E2E8F0",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#0F172A",
                    background: "#fff",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.4,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "none",
                    background: (sending || !newMessage.trim()) ? "#CBD5E1" : "linear-gradient(135deg,#2563EB,#1d4ed8)",
                    color: "#fff",
                    cursor: (sending || !newMessage.trim()) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    height: "56px",
                    width: "48px",
                    boxShadow: (sending || !newMessage.trim()) ? "none" : "0 4px 12px rgba(37,99,235,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  {sending ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={17} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  )}

  {showDeleteConfirm && createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.7)",
        backdropFilter: "blur(10px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={() => setShowDeleteConfirm(false)}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: "420px",
          padding: "32px 28px 28px",
          textAlign: "center",
          animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon Container */}
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#FEF2F2",
          color: "#EF4444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 0 0 8px #FEE2E2",
        }}>
          <AlertTriangle size={26} />
        </div>

        <h3 style={{
          fontSize: "19px",
          fontWeight: 800,
          color: "#1E293B",
          margin: "0 0 10px",
          letterSpacing: "-0.01em",
        }}>
          Delete Task
        </h3>
        <p style={{
          fontSize: "13.5px",
          color: "#64748B",
          lineHeight: 1.5,
          margin: "0 0 24px",
        }}>
          Are you sure you want to delete this task? This action cannot be undone and will also remove it from the junior advocate's task board.
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              flex: 1,
              padding: "11px 20px",
              borderRadius: "10px",
              border: "1.5px solid #E2E8F0",
              background: "#fff",
              color: "#64748B",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            style={{
              flex: 1,
              padding: "11px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
              transition: "all 0.2s",
            }}
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}
    </>
  );
}
