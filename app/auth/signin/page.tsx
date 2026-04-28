"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    if (res?.ok) window.location.href = "/dashboard";
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
        <Link
          href="/"
          className="text-slate-800 hover:text-slate-600 text-sm font-medium transition-colors"
        >
          Back to Home
        </Link>
      </header>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 lg:p-10">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 text-center mb-2">
            Welcome Back to Your Sanctuary
          </h1>
          <p className="text-slate-600 text-center text-sm mb-8">
            Sign in to continue your wellness journey
          </p>

          <form onSubmit={handleCredentials} className="space-y-5">
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
                placeholder="name@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                  Password
                </label>
                <Link
                  href="/#features"
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Login to Sanctuary"}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <a
              href="#"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-400 font-medium cursor-not-allowed opacity-75"
              aria-disabled
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1DB954" aria-hidden>
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.3.42-.84.6-1.254.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.62.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify
            </a>
          </div>

          <p className="mt-8 text-center text-sm text-slate-600">
            New to SoulSync?{" "}
            <Link href="/auth/signup" className="text-amber-600 hover:text-amber-700 font-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 flex justify-center gap-6 text-sm text-slate-500">
        <Link href="/#features" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
        <Link href="/#features" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
        <Link href="/#features" className="hover:text-slate-700 transition-colors">Support</Link>
      </footer>
    </main>
  );
}
