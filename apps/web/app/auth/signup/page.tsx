"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mood, setMood] = useState<string>("neutral");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Sign up failed.");
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      setLoading(false);
      if (signInRes?.ok) window.location.href = "/dashboard";
      else setError("Account created. Please sign in.");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-50/50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2C8 2 5 5 5 9c0 4 3 7 7 11 4-4 7-7 7-11 0-4-3-7-7-7zm0 9a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-slate-800">SoulSync</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 text-sm hidden sm:inline">Already have an account?</span>
          <Link
            href="/auth/signin"
            className="bg-amber-100 hover:bg-amber-200 text-slate-800 font-medium px-4 py-2 rounded-xl transition-colors text-sm"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center p-6 pb-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 lg:p-10">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 text-center mb-2">
            Begin Your Journey to Peace
          </h1>
          <p className="text-slate-600 text-center text-sm mb-8">
            Create your sanctuary for emotional wellness today.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-800 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors"
                placeholder="Alex Johnson"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors"
                placeholder="alex@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-800 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors"
                placeholder="••••••••"
              />
            </div>

            

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Creating account…" : "Start Your Journey"}
              <span aria-hidden>→</span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-amber-600 hover:text-amber-700 font-semibold">
              Sign in instead
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-emerald-600 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Your data is encrypted and private. We never share your emotions.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 flex flex-col items-center gap-2">
        <div className="flex gap-6 text-sm text-slate-500">
          <Link href="/#features" className="hover:text-slate-700 transition-colors">Privacy</Link>
          <Link href="/#features" className="hover:text-slate-700 transition-colors">Terms</Link>
          <Link href="/#features" className="hover:text-slate-700 transition-colors">Support</Link>
        </div>
        <p className="text-xs text-slate-400">© 2024 SoulSync. All rights reserved.</p>
      </footer>
    </main>
  );
}
