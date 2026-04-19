import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-black">
            V
          </span>
          VisaGuard
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="rounded-full px-4 py-1.5 text-sm text-slate-300 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-slate-200"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mt-14 flex flex-col items-center text-center sm:mt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Built for subclass 500 students
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
          Never breach your{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            48-hour limit
          </span>{" "}
          again.
        </h1>
        <p className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
          Forward your roster, plug in a calendar feed, and VisaGuard tracks
          every shift so you don&apos;t have to.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="w-full rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 sm:w-auto"
          >
            Start tracking — free
          </Link>
          <Link
            href="/sign-in"
            className="w-full rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-200 backdrop-blur hover:bg-white/10 sm:w-auto"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:mt-24 sm:grid-cols-3">
        {[
          {
            emoji: "📨",
            title: "Forward rosters",
            body: "Every forwarded email is parsed into shifts automatically.",
          },
          {
            emoji: "📅",
            title: "Sync calendars",
            body: "Drop in a Humanforce, Deputy, or Google ICS link.",
          },
          {
            emoji: "🛟",
            title: "Stay compliant",
            body: "Live fortnightly + rolling 14-day views with safe-zone alerts.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="glass rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-white/20"
          >
            <div className="text-2xl">{f.emoji}</div>
            <div className="mt-3 font-semibold">{f.title}</div>
            <div className="mt-1 text-sm text-slate-400">{f.body}</div>
          </div>
        ))}
      </section>

      <footer className="mt-auto pt-16 text-center text-xs text-slate-500">
        Not legal advice. Always confirm your work hours against Home Affairs
        guidance.
      </footer>
    </main>
  );
}
