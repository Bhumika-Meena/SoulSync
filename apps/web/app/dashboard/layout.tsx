import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/auth/signin");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--soul-bg)]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2C8 2 5 5 5 9c0 4 3 7 7 11 4-4 7-7 7-11 0-4-3-7-7-7zm0 9a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-slate-800">SoulSync</span>
          </Link>
          <DashboardNav user={session.user} />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 pb-24">
        {children}
      </main>
    </div>
  );
}
