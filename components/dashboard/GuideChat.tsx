"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Role = "user" | "assistant";

export type GuideMessage = {
  role: Role;
  content: string;
  createdAt: string;
};

type Profile = { name: string; voiceId: string };

export function GuideChat({
  initialProfile,
  initialMessages,
}: {
  initialProfile: Profile;
  initialMessages: GuideMessage[];
}) {
  const [profile] = useState(initialProfile);
  const [mode, setMode] = useState<"chat" | "listen">("chat");
  const [messages, setMessages] = useState<GuideMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant")?.content,
    [messages]
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput("");
    setLoading(true);
    const nowIso = new Date().toISOString();
    setMessages((prev) => [...prev, { role: "user", content, createdAt: nowIso }]);

    try {
      const res = await fetch("/api/wellness-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I’m having trouble responding right now. Give me a moment and try again—I'm still here with you.",
            createdAt: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }
      const reply = typeof data.reply === "string" ? data.reply : "I’m here with you.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, createdAt: new Date().toISOString() },
      ]);
      if (mode === "listen") speakIfPossible(reply, profile.voiceId);
    } catch (e) {
      console.error("guide chat send error", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into a technical hiccup. If you try again in a minute, I’ll be right here.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{profile.name}</h1>
          <p className="text-sm text-slate-600">A private space to talk things through.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/guide-settings"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4"
          >
            Settings
          </Link>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                mode === "chat" ? "bg-amber-100 text-slate-900" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMode("listen")}
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                mode === "listen" ? "bg-amber-100 text-slate-900" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Listen
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
        <div ref={listRef} className="h-[60vh] overflow-auto p-4 space-y-3 bg-slate-50/60">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-600">
              Start by telling your guide what’s on your mind. If you’ve been journaling, it already
              has some context from your recent entries.
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={`${m.createdAt}-${idx}`}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-amber-100 text-slate-900"
                    : "mr-auto bg-white border border-slate-200 text-slate-800"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200/70">
          {mode === "listen" && (
            <div className="flex items-center justify-between gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  if (!lastAssistant) return;
                  speakIfPossible(lastAssistant, profile.voiceId);
                }}
                className="inline-flex items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 transition-colors disabled:opacity-60"
                disabled={!lastAssistant}
              >
                Play last reply
              </button>
              <span className="text-xs text-slate-500">
                Voice: {profile.voiceId === "default" ? "browser default" : profile.voiceId}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              className="flex-1 px-4 py-3 rounded-full border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
              placeholder="Type your message…"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-slate-900 text-white font-semibold disabled:opacity-60"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Your guide uses your recent diary entries and emotion trends to respond.
          </p>
        </div>
      </section>
    </main>
  );
}

function speakIfPossible(text: string, voiceId?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  if (voiceId && voiceId !== "default") {
    const v = voices.find((voice) => voice.name === voiceId);
    if (v) utterance.voice = v;
  }
  utterance.rate = 1;
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
}

