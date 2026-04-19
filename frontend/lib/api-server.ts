import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Threshold = "safe" | "warn" | "danger" | "breach";

export type FortnightlySummary = {
  hours_used: number;
  limit: number;
  hours_remaining: number;
  period_start: string;
  period_end: string;
  is_semester: boolean;
  days_remaining: number;
  percent_used: number;
  threshold: Threshold;
  rolling_hours_used: number;
  rolling_period_start: string;
  rolling_period_end: string;
  rolling_threshold: Threshold;
};

export type UserMe = {
  id: string;
  email: string;
  unique_inbox: string;
  university: string | null;
  calendar_sync_enabled: boolean;
  onboarded: boolean;
};

export type Shift = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hours_worked: string;
  source: "email" | "calendar" | "manual";
  employer_name: string | null;
};

export type CalendarStatus = {
  connected: boolean;
  ics_url_masked: string | null;
  last_synced_at: string | null;
};

export type SemesterPeriodIn = {
  start_date: string;
  end_date: string;
  is_semester: boolean;
  label?: string | null;
};

async function authHeaders(): Promise<HeadersInit> {
  const { getToken } = await auth();
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => apiFetch<UserMe>("/api/users/me"),
  setup: (body: { university: string; semester_periods: SemesterPeriodIn[] }) =>
    apiFetch<UserMe>("/api/users/setup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  fortnightly: () => apiFetch<FortnightlySummary>("/api/fortnightly/current"),
  listShifts: () => apiFetch<Shift[]>("/api/shifts"),
  createShift: (body: {
    employer_name: string;
    shift_date: string;
    start_time: string;
    end_time: string;
  }) =>
    apiFetch<Shift>("/api/shifts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteShift: (id: string) =>
    apiFetch<void>(`/api/shifts/${id}`, { method: "DELETE" }),
  calendarStatus: () =>
    apiFetch<CalendarStatus>("/api/calendar/status"),
  calendarSaveIcs: (url: string) =>
    apiFetch<{ saved: boolean; scanned?: number; inserted?: number; sync_error?: string }>(
      "/api/calendar/ics",
      { method: "POST", body: JSON.stringify({ url }) },
    ),
  calendarSync: () =>
    apiFetch<{ scanned: number; inserted: number }>("/api/calendar/sync", {
      method: "POST",
    }),
  calendarDisconnect: () =>
    apiFetch<{ status: string }>("/api/calendar/ics", { method: "DELETE" }),
};
