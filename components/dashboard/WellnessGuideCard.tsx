"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WellnessGuideCardProps = {
  initialName: string;
  initialVoiceId: string | null;
};

type Profile = {
  name: string;
  voiceId: string;
};

export function WellnessGuideCard({ initialName, initialVoiceId }: WellnessGuideCardProps) {
  const [profile, setProfile] = useState<Profile>({
    name: initialName || "Wellness Guide",
    voiceId: initialVoiceId ?? "default",
  });
  const [mode, setMode] = useState<"chat" | "listen">("chat");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/wellness-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      let data: { reply?: string; profile?: Profile; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON response (e.g. 500 HTML)
        data = { message: "Request failed." };
      }
      if (!res.ok) {
        setReply(
          "I ran into a technical issue reaching my AI brain, but I'm still here with you. You can try again in a moment."
        );
        setLoading(false);
        return;
      }
      const text: string = data.reply ?? "";
      const p: Profile | undefined = data.profile;
      if (p) setProfile({ name: p.name, voiceId: p.voiceId });
      if (text) {
        setReply(text);
        speakIfPossible(text, p?.voiceId ?? profile.voiceId);
      }
    } catch (e) {
      console.error("wellness guide error", e);
      setReply(
        "I ran into a technical issue reaching my AI brain, but I'm still here with you. You can try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }

  // Ensure voices are loaded on first mount for better selection later
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const timer = setInterval(() => setIsSpeaking(synth.speaking), 200);
    return () => clearInterval(timer);
  }, []);

  const displayText =
    reply ??
    `“I noticed your mood is particularly radiant & joyful today. Would you like to explore some creative exercises to channel this energy?”`;

  return (
    <div className="rounded-2xl bg-slate-900 text-white shadow-sm overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
            <span className="text-slate-900 font-bold" aria-hidden>
              ✦
            </span>
          </div>
          <div>
            <p className="font-semibold">{profile.name}</p>
            <p className="text-xs text-white/60">Online</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard/guide"
              className="text-xs font-semibold px-3 py-1 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/20"
            >
              Open chat
            </Link>
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                mode === "chat"
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMode("listen")}
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                mode === "listen"
                  ? "bg-white/10 border-white/15 text-white"
                  : "bg-transparent border-white/10 text-white/60 hover:text-white"
              }`}
            >
              Listen
            </button>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-white/80 text-sm leading-relaxed italic">{displayText}</p>
        {mode === "chat" ? (
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm placeholder:text-white/40 outline-none"
              placeholder={`Reply to ${profile.name}...`}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading}
              className="w-10 h-10 rounded-full bg-amber-400 text-slate-900 font-semibold disabled:opacity-70"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
                const synth = window.speechSynthesis;
                if (synth.speaking) {
                  synth.cancel();
                  setIsSpeaking(false);
                  return;
                }
                speakIfPossible(displayText.replace(/[“”]/g, ""), profile.voiceId);
              }}
              className="inline-flex items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 transition-colors"
            >
              {isSpeaking ? "Stop" : "Play voice"}
            </button>
            <span className="text-xs text-white/60">
              Voice: {profile.voiceId === "default" ? "browser default" : profile.voiceId}
            </span>
          </div>
        )}
      </div>
    </div>
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

