"use server";

import { revalidatePath } from "next/cache";
import {
  api,
  type BreakRule,
  type BreakRuleInput,
  type BreakRulesReplaceResult,
  type EmailLogItem,
  type SemesterPeriodIn,
  type ShiftUpdateInput,
} from "@/lib/api-server";

export async function completeSetupAction(input: {
  university: string;
  semester_periods: SemesterPeriodIn[];
}) {
  const user = await api.setup(input);
  revalidatePath("/dashboard");
  return user;
}

export async function createShiftAction(input: {
  employer_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}) {
  const shift = await api.createShift(input);
  revalidatePath("/dashboard");
  return shift;
}

export async function deleteShiftAction(id: string) {
  await api.deleteShift(id);
  revalidatePath("/dashboard");
}

export async function updateShiftAction(id: string, input: ShiftUpdateInput) {
  const shift = await api.updateShift(id, input);
  revalidatePath("/dashboard");
  return shift;
}

export async function addCalendarFeedAction(input: {
  url: string;
  employer_label: string;
}) {
  const result = await api.createCalendarFeed(input.url, input.employer_label);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return result;
}

export async function updateCalendarFeedAction(
  id: string,
  employer_label: string,
) {
  const result = await api.updateCalendarFeed(id, employer_label);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return result;
}

export async function syncCalendarFeedAction(id: string) {
  const result = await api.syncCalendarFeed(id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return result;
}

export async function syncAllCalendarFeedsAction() {
  const result = await api.syncAllCalendarFeeds();
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return result;
}

export async function deleteCalendarFeedAction(id: string) {
  await api.deleteCalendarFeed(id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function getRecentEmailLogsAction(): Promise<EmailLogItem[]> {
  return api.recentEmailLogs();
}

export async function renameEmployerAction(
  id: string,
  display_name: string | null,
) {
  const updated = await api.renameEmployer(id, display_name);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return updated;
}

export async function getBreakRulesAction(id: string): Promise<BreakRule[]> {
  return api.listBreakRules(id);
}

export async function saveBreakRulesAction(
  id: string,
  rules: BreakRuleInput[],
): Promise<BreakRulesReplaceResult> {
  const result = await api.replaceBreakRules(id, rules);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return result;
}
