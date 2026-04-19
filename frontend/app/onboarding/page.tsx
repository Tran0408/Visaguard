import { redirect } from "next/navigation";
import { api } from "@/lib/api-server";
import OnboardingForm from "./form";

export default async function OnboardingPage() {
  const me = await api.me();
  if (me.onboarded) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Welcome to VisaGuard</h1>
      <p className="mb-8 text-slate-400">
        Tell us about your semester so we know when the 48-hour limit applies.
      </p>
      <OnboardingForm defaultEmail={me.email} />
    </main>
  );
}
