import Link from "next/link";
import { HeroImage } from "@/components/landing/HeroImage";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Our Mission", href: "#mission" },
  { label: "Testimonials", href: "#testimonials" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2C8 2 5 5 5 9c0 4 3 7 7 11 4-4 7-7 7-11 0-4-3-7-7-7zm0 9a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-slate-800">SoulSync</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-slate-800 hover:text-slate-600 text-sm font-medium transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="text-slate-800 hover:text-slate-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-medium text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 lg:pt-32 lg:pb-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="bg-amber-50/80 rounded-3xl p-8 lg:p-12">
            <p className="text-slate-800 text-sm font-medium mb-4 flex items-center gap-2">
              AI-Powered Emotional Support
              <span className="text-amber-500" aria-hidden>→</span>
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 leading-tight mb-6">
              Find Your Inner Peace with AI-Guided Wellness
            </h1>
            <p className="text-slate-700 text-lg mb-8 max-w-xl">
              Experience a sanctuary for your mind. Our empathetic AI companion helps you navigate your emotions, build healthy habits, and discover daily tranquility.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                Start Your Free Journey
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center bg-white border-2 border-slate-800 text-slate-800 font-semibold px-6 py-3.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Explore Features
              </Link>
            </div>
            <div className="flex items-center gap-3 text-slate-700 text-sm">
              <div className="flex -space-x-2">
                <span className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white" />
                <span className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white" />
              </div>
              <span>Joined by 2,000+ peaceful seekers</span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroImage />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 text-center mb-3">
            Holistic Care for Your Mind
          </h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-14">
            Our tools are designed to nurture your mental well-being throughout the day.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">AI-Powered Journaling</h3>
              <p className="text-slate-600 mb-6">
                Voice-to-text journaling with AI insights that help you spot patterns in your emotional landscape.
              </p>
              <Link href="/auth/signup" className="text-amber-600 font-medium hover:underline inline-flex items-center gap-1">
                Learn more →
              </Link>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-sky-200 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Mood-Synced Playlists</h3>
              <p className="text-slate-600 mb-6">
                Personalized soundscapes and music that adapt to your current emotional state for focus or relaxation.
              </p>
              <Link href="/auth/signup" className="text-amber-600 font-medium hover:underline inline-flex items-center gap-1">
                Learn more →
              </Link>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-emerald-200 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Empathetic AI Companion</h3>
              <p className="text-slate-600 mb-6">
                A judgment-free listener available 24/7 to talk through your stress and celebrate your wins.
              </p>
              <Link href="/auth/signup" className="text-amber-600 font-medium hover:underline inline-flex items-center gap-1">
                Learn more →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div id="mission" className="bg-white p-8 lg:p-10 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center">
              <span className="text-3xl" aria-hidden>☺</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">How are you feeling right now?</h2>
              <blockquote className="text-slate-700 text-lg mb-4">
                SoulSync helped me understand that my Tuesday anxiety was actually linked to my sleep cycle. Now I feel more in control than ever.
              </blockquote>
              <p className="text-slate-600 text-sm">— Sarah J., Member since 2023</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <p className="text-xl font-semibold mb-4">SoulSync</p>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Redefining emotional wellness through the power of empathetic artificial intelligence. Your journey to peace begins here.
            </p>
            <p className="text-slate-500 text-xs">© 2024 SoulSync. All rights reserved.</p>
          </div>
          <div>
            <p className="font-semibold mb-4">Company</p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link href="/#features" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4">Connect</p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Twitter</a></li>
              <li><Link href="/#testimonials" className="hover:text-white transition-colors">Community</Link></li>
              <li><Link href="/auth/signup" className="hover:text-white transition-colors">Newsletter</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-700 flex flex-wrap justify-end gap-6 text-xs text-slate-500">
          <Link href="/#features" className="hover:text-slate-300 transition-colors">Privacy</Link>
          <Link href="/#features" className="hover:text-slate-300 transition-colors">Security</Link>
          <Link href="/#features" className="hover:text-slate-300 transition-colors">Sitemap</Link>
        </div>
      </footer>
    </main>
  );
}
