import { redirect } from "next/navigation";
import { api } from "@/lib/api-server";
import OnboardingForm from "./form";

export default async function OnboardingPage() {
  const me = await api.me();
  if (me.onboarded) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-2 inline-flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 font-bold text-black">
          V
        </span>
        <span className="font-semibold">VisaGuard</span>
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Welcome 👋
      </h1>
      <p className="mb-8 mt-2 text-slate-400">
        Tell us about your semester so we know when the 48-hour cap applies.
      </p>
      <OnboardingForm defaultEmail={me.email} />
    </main>
  );
}
