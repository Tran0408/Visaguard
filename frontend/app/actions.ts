"use server";

import { revalidatePath } from "next/cache";
import { api, type SemesterPeriodIn } from "@/lib/api-server";

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

export async function saveIcsUrlAction(url: string) {
  const result = await api.calendarSaveIcs(url);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return result;
}

export async function syncCalendarAction() {
  const result = await api.calendarSync();
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return result;
}

export async function disconnectCalendarAction() {
  await api.calendarDisconnect();
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
