"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";
import { useState } from "react";

export function DashboardNav({ user }: { user: User }) {
  const [query, setQuery] = useState("");
  const displayName = user.name ?? user.email ?? "You";
  const avatarLetter = displayName?.trim()?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex items-center gap-5">
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/dashboard/journal/new" className="text-slate-800 font-medium hover:text-slate-600">
          Journal
        </Link>
        <Link href="/dashboard#music" className="text-slate-800 font-medium hover:text-slate-600">
          Music
        </Link>
        <Link
          href="/dashboard/insights"
          className="text-slate-800 font-medium hover:text-slate-600"
        >
          Insights
        </Link>
      </nav>

      
      <div className="flex items-center gap-2">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={displayName}
            className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-semibold flex items-center justify-center border border-white shadow-sm">
            {avatarLetter}
          </div>
        )}
        <Link
          href="/dashboard/guide-settings"
          className="hidden md:inline text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4"
        >
          Guide settings
        </Link>
      </div>
      

      <button
        type="button"
        className="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-700"
        aria-label="Settings"
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Sign out"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M10 7V5a2 2 0 012-2h7v18h-7a2 2 0 01-2-2v-2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 12H3m0 0l3-3m-3 3l3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="sm:hidden text-sm font-medium text-slate-700 underline underline-offset-4"
      >
        Sign out
      </button>

      
    </div>
  );
}
