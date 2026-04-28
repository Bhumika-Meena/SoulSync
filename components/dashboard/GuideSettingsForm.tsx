"use client";

import { useEffect, useState } from "react";

export function GuideSettingsForm({
  initialName,
  initialVoiceId,
}: {
  initialName: string;
  initialVoiceId: string;
}) {
  const [name, setName] = useState(initialName);
  const [voiceId, setVoiceId] = useState(initialVoiceId || "default");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    function loadVoices() {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/wellness-guide/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, voiceId }),
      });
      if (res.ok) setSaved(true);
    } catch (err) {
      console.error("guide settings error", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-800 mb-1">Guide name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors"
          placeholder="e.g. Aurora, Sol, Kai"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-800 mb-1">Voice</label>
        <select
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors"
        >
          <option value="default">Use browser default</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} {v.lang ? `(${v.lang})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Voices come from your device&apos;s built-in speech system, so they may vary by browser.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-2.5 transition-colors disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>

      {saved && (
        <p className="text-xs text-emerald-600">
          Saved. Your next conversation with your guide will use these settings.
        </p>
      )}
    </form>
  );
}
