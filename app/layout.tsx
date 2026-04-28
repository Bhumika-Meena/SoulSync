import type { Metadata } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SafetyDisclaimer } from "@/components/layout/SafetyDisclaimer";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { ThemeTransition } from "@/components/layout/ThemeTransition";

export const metadata: Metadata = {
  title: "SoulSync — Emotional Journaling",
  description: "AI-powered emotional journaling. Track emotions, get empathetic responses, and weekly summaries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <ThemeProvider>
            <ThemeTransition />
            {children}
            <SafetyDisclaimer />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
