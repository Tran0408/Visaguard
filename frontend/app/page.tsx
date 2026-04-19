import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">VisaGuard</h1>
        <p className="mt-3 text-slate-400">
          Never accidentally breach your 48-hour fortnightly work limit.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/sign-in"
          className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-black hover:bg-emerald-400"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-slate-700 px-4 py-2 font-medium hover:border-slate-500"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
