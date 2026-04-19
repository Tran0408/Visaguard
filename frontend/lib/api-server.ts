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
  break_minutes: number;
  break_overridden: boolean;
  source: "email" | "calendar" | "manual";
  employer_name: string | null;
};

export type ShiftUpdateInput = {
  start_time?: string;
  end_time?: string;
  break_minutes?: number | null;
};

export type EmailLogItem = {
  id: string;
  received_at: string;
  from_address: string | null;
  subject: string | null;
  status: string | null;
  shifts_extracted: number;
  error_message: string | null;
};

export type Employer = {
  id: string;
  name: string;
  display_name: string | null;
  resolved_name: string;
  shift_count: number;
};

export type BreakRule = {
  id: string;
  min_shift_hours: string;
  unpaid_break_minutes: number;
};

export type BreakRuleInput = {
  min_shift_hours: number;
  unpaid_break_minutes: number;
};

export type BreakRulesReplaceResult = {
  rules: BreakRule[];
  shifts_recomputed: number;
};

export type CalendarFeed = {
  id: string;
  ics_url_masked: string;
  employer_label: string;
  last_synced_at: string | null;
  created_at: string;
};

export type CalendarFeedCreateResult = {
  saved: boolean;
  feed: CalendarFeed;
  scanned?: number;
  inserted?: number;
  sync_error?: string;
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
  fortnightly: (offset: number = 0) =>
    apiFetch<FortnightlySummary>(`/api/fortnightly/current?offset=${offset}`),
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
  updateShift: (id: string, body: ShiftUpdateInput) =>
    apiFetch<Shift>(`/api/shifts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteShift: (id: string) =>
    apiFetch<void>(`/api/shifts/${id}`, { method: "DELETE" }),
  listCalendarFeeds: () =>
    apiFetch<CalendarFeed[]>("/api/calendar/feeds"),
  createCalendarFeed: (url: string, employer_label: string) =>
    apiFetch<CalendarFeedCreateResult>("/api/calendar/feeds", {
      method: "POST",
      body: JSON.stringify({ url, employer_label }),
    }),
  updateCalendarFeed: (id: string, employer_label: string) =>
    apiFetch<CalendarFeed>(`/api/calendar/feeds/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ employer_label }),
    }),
  syncCalendarFeed: (id: string) =>
    apiFetch<{ scanned: number; inserted: number }>(
      `/api/calendar/feeds/${id}/sync`,
      { method: "POST" },
    ),
  syncAllCalendarFeeds: () =>
    apiFetch<{
      scanned: number;
      inserted: number;
      feeds: number;
      errors: { feed_id: string; error: string }[];
    }>("/api/calendar/feeds/sync-all", { method: "POST" }),
  deleteCalendarFeed: (id: string) =>
    apiFetch<{ status: string }>(`/api/calendar/feeds/${id}`, {
      method: "DELETE",
    }),
  recentEmailLogs: () =>
    apiFetch<EmailLogItem[]>("/api/email-logs/recent"),
  listEmployers: () => apiFetch<Employer[]>("/api/employers"),
  renameEmployer: (id: string, display_name: string | null) =>
    apiFetch<Employer>(`/api/employers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ display_name }),
    }),
  listBreakRules: (id: string) =>
    apiFetch<BreakRule[]>(`/api/employers/${id}/break-rules`),
  replaceBreakRules: (id: string, rules: BreakRuleInput[]) =>
    apiFetch<BreakRulesReplaceResult>(`/api/employers/${id}/break-rules`, {
      method: "PUT",
      body: JSON.stringify({ rules }),
    }),
};
