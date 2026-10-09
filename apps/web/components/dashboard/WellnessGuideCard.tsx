"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type WellnessGuideCardProps = {
  initialName?: string;
  initialVoiceId?: string | null;
};

export function WellnessGuideCard({ initialName, initialVoiceId }: WellnessGuideCardProps = {}) {
  const router = useRouter();
  const [name] = useState(initialName || "Wellness Companion");
  const [voiceId] = useState(initialVoiceId ?? "default");
  const [mode, setMode] = useState<"chat" | "listen">("chat");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [input, setInput] = useState("");

  const displayText =
    "I'm here to support your daily reflection journey. Let's explore your recent emotional patterns, review journal entries, or set healthy wellness goals together.";

  function handleSubmit() {
    router.push("/dashboard/guide");
  }

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const timer = setInterval(() => setIsSpeaking(synth.speaking), 200);
    return () => clearInterval(timer);
  }, []);

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
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-white/60">Online • AI Companion</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard/guide"
              className="text-xs font-semibold px-3 py-1 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors"
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
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm placeholder:text-white/40 outline-none focus:ring-1 focus:ring-amber-300"
              placeholder={`Talk with ${name}...`}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="w-10 h-10 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-500 transition-colors flex items-center justify-center shrink-0"
              aria-label="Start chat"
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
                speakIfPossible(displayText, voiceId);
              }}
              className="inline-flex items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 transition-colors"
            >
              {isSpeaking ? "Stop" : "Play voice"}
            </button>
            <span className="text-xs text-white/60">
              Voice: {voiceId === "default" ? "browser default" : voiceId}
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
