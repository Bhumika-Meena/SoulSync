"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type EntryWithEmotions = {
  id: string;
  createdAt: Date | string;
  content: string;
  emotionAnalyses: Array<{
    primaryEmotion: string;
    secondaryEmotion?: string | null;
    intensity: number;
  }>;
};

export function RecentEntriesBook({ entries }: { entries: EntryWithEmotions[] }) {
  const [index, setIndex] = useState(0);

  const normalized = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        createdAt: typeof e.createdAt === "string" ? new Date(e.createdAt) : e.createdAt,
      })),
    [entries]
  );

  const entry = normalized[index];
  const emotion = entry?.emotionAnalyses?.[0];

  const dateKey = entry ? new Date(entry.createdAt).toLocaleDateString() : "";

  const groupForDay = useMemo(() => {
    if (!entry) return [];
    const key = dateKey;
    return normalized.filter((e) => new Date(e.createdAt).toLocaleDateString() === key);
  }, [dateKey, entry, normalized]);

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    setIndex((i) => Math.min(normalized.length - 1, i + 1));
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recent Entries</h1>
          <p className="text-sm text-slate-500 mt-1">
            {normalized.length === 0
              ? "No entries yet."
              : `Showing ${index + 1} of ${normalized.length} · ${dateKey}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 hover:bg-slate-50 transition-colors"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index >= normalized.length - 1}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {entry ? (
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Detected mood</p>
              <p className="text-lg font-semibold text-slate-900">
                {emotion?.primaryEmotion ?? "neutral"}
                {emotion?.secondaryEmotion ? ` / ${emotion.secondaryEmotion}` : ""}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Intensity: {emotion ? Math.round(emotion.intensity * 100) : 0}%
              </p>
            </div>
            <div className="text-sm text-slate-500">
              In this day: {groupForDay.length}
            </div>
          </div>

          <div className="soul-card p-5 rounded-2xl bg-[var(--soul-card)]">
            <p className="text-slate-800 whitespace-pre-wrap">{entry.content}</p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/dashboard/entries/${entry.id}`}
              className="text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              Open full entry →
            </Link>

            <div className="text-xs text-slate-500">
              Tip: Use Prev/Next like flipping book pages.
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <p className="text-slate-600">Start journaling to see your recent entries here.</p>
        </div>
      )}
    </div>
  );
}

