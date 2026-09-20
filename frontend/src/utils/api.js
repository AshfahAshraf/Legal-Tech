/**
 * Central API configuration.
 *
 * In development  → NEXT_PUBLIC_API_URL is unset → falls back to http://localhost:8000
 * In production   → NEXT_PUBLIC_API_URL is injected at build time via Docker --build-arg
 *
 * Usage:
 *   import { API_BASE_URL } from "@/utils/api";
 *   const res = await fetch(`${API_BASE_URL}/your-endpoint`);
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

