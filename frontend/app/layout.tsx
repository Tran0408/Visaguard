import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VisaGuard",
  description: "Never accidentally breach your work-hour limit.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0f14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{ variables: { colorPrimary: "#22c55e" } }}
    >
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen font-sans antialiased">
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
            <div className="absolute right-[-10%] top-[30%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] left-[-10%] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[120px]" />
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
