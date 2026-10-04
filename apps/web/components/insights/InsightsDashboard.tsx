"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

type EmotionSlug = "neutral" | "calm" | "sad" | "happy" | "anxious" | "angry";

type Entry = {
  id: string;
  createdAt: Date;
  content: string;
  emotionAnalyses: Array<{
    primaryEmotion: string;
    secondaryEmotion?: string | null;
    intensity: number;
  }>;
};

const EMOTION_COLORS: Record<EmotionSlug, string> = {
  happy: "#f4d34c",
  calm: "#34d399",
  anxious: "#60a5fa",
  sad: "#a78bfa",
  angry: "#fb7185",
  neutral: "#cbd5e1",
};

function emotionLabelToSlug(label?: string | null): EmotionSlug {
  const l = (label ?? "").toLowerCase();
  if (["calm", "peaceful", "relaxed"].some((e) => l.includes(e))) return "calm";
  if (["sad", "down", "grief", "lonely"].some((e) => l.includes(e))) return "sad";
  if (["happy", "joy", "excited", "grateful", "hopeful"].some((e) => l.includes(e))) return "happy";
  if (["anxious", "worried", "nervous", "stressed"].some((e) => l.includes(e))) return "anxious";
  if (["angry", "frustrated", "irritated", "mad"].some((e) => l.includes(e))) return "angry";
  return "neutral";
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toLocalDate(d: Date) {
  // Keep grouping by local date (feels more natural for journaling).
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function computeConsecutiveStreak(daysWithEntries: Set<string>) {
  // Count consecutive days ending yesterday/today (whichever has entry).
  const now = new Date();
  const today = toLocalDate(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let start = daysWithEntries.has(dayKey(today)) ? today : yesterday;
  let count = 0;
  while (daysWithEntries.has(dayKey(start))) {
    count += 1;
    start = new Date(start);
    start.setDate(start.getDate() - 1);
  }
  return count;
}

export function InsightsDashboard({ entries }: { entries: Entry[] }) {
  const [range, setRange] = useState<7 | 30>(30);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const normalizedEntries = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        createdAt: toLocalDate(new Date(e.createdAt)),
      })),
    [entries]
  );

  const { daySeries, dailyBest } = useMemo(() => {
    const end = toLocalDate(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - (range - 1));

    const map = new Map<
      string,
      {
        bestIntensity: number;
        bestEmotion: EmotionSlug;
        bestPrimaryEmotion: string;
        entry: Entry | null;
        entriesCount: number;
      }
    >();

    for (const e of normalizedEntries) {
      if (e.createdAt < start || e.createdAt > end) continue;
      const k = dayKey(e.createdAt);
      const emo = e.emotionAnalyses[0];
      const slug = emotionLabelToSlug(emo?.primaryEmotion ?? null);
      const intensity = clamp01(emo?.intensity ?? 0);

      const prev = map.get(k);
      const better = !prev || intensity > prev.bestIntensity;

      if (!prev) {
        map.set(k, {
          bestIntensity: intensity,
          bestEmotion: slug,
          bestPrimaryEmotion: emo?.primaryEmotion ?? "neutral",
          entry: e,
          entriesCount: 1,
        });
      } else {
        map.set(k, {
          ...prev,
          entriesCount: prev.entriesCount + 1,
          ...(better
            ? {
                bestIntensity: intensity,
                bestEmotion: slug,
                bestPrimaryEmotion: emo?.primaryEmotion ?? prev.bestPrimaryEmotion,
                entry: e,
              }
            : null),
        });
      }
    }

    const series: Array<{
      key: string;
      date: Date;
      intensity: number;
      emotion: EmotionSlug;
      entriesCount: number;
      primaryEmotion: string;
      entry: Entry | null;
    }> = [];

    const cursor = new Date(start);
    while (cursor <= end) {
      const k = dayKey(cursor);
      const bucket = map.get(k);
      series.push({
        key: k,
        date: new Date(cursor),
        intensity: bucket?.bestIntensity ?? 0,
        emotion: bucket?.bestEmotion ?? "neutral",
        entriesCount: bucket?.entriesCount ?? 0,
        primaryEmotion: bucket?.bestPrimaryEmotion ?? "",
        entry: bucket?.entry ?? null,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      daySeries: series,
      dailyBest: map,
    };
  }, [normalizedEntries, range]);

  const moodDistribution = useMemo(() => {
    const counts: Record<EmotionSlug, number> = {
      neutral: 0,
      calm: 0,
      sad: 0,
      happy: 0,
      anxious: 0,
      angry: 0,
    };

    for (const d of daySeries) {
      if (d.entriesCount <= 0) continue;
      counts[d.emotion] += 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const items = (Object.keys(counts) as EmotionSlug[]).map((k) => ({
      key: k,
      count: counts[k],
      pct: counts[k] / total,
    }));

    // Sort: biggest first, keep neutral last if ties
    items.sort((a, b) => b.pct - a.pct);
    return items;
  }, [daySeries]);

  const daysWithEntries = useMemo(() => {
    const s = new Set<string>();
    for (const d of daySeries) if (d.entriesCount > 0) s.add(d.key);
    return s;
  }, [daySeries]);

  const streak = useMemo(() => computeConsecutiveStreak(daysWithEntries), [daysWithEntries]);

  const selected = useMemo(() => {
    if (!selectedDay) return null;
    return daySeries.find((d) => d.key === selectedDay) ?? null;
  }, [selectedDay, daySeries]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Full Emotion Analysis</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your emotional patterns and journaling rhythm across days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRange(7);
              setSelectedDay(null);
            }}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              range === 7 ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => {
              setRange(30);
              setSelectedDay(null);
            }}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              range === 30 ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Intensity + Heatmap row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-bold text-slate-900">Intensity Flow</h2>
              <p className="text-sm text-slate-500">Weekly emotional frequency tracking</p>
            </div>
            <div className="text-xs text-slate-500">
              Streak: <span className="font-semibold text-slate-700">{streak}</span> day{streak === 1 ? "" : "s"}
            </div>
          </div>

          <IntensityLineChart
            points={daySeries.map((d) => d.intensity)}
            labels={daySeries.map((d) => d.key)}
            selected={selectedDay}
            onSelect={(k) => setSelectedDay(k)}
          />
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Emotional Balance</h2>
              <p className="text-sm text-slate-500">Where your days fell</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <DonutChart items={moodDistribution} />
            <div className="space-y-2">
              {moodDistribution.map((it) => (
                <div key={it.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: EMOTION_COLORS[it.key] }} />
                    <span className="text-sm text-slate-700 capitalize">{it.key}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{Math.round(it.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap + details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-bold text-slate-900">Mood Heatmap</h2>
              <p className="text-sm text-slate-500">Click a day to see details</p>
            </div>
          </div>
          <MoodHeatmap
            series={daySeries}
            selectedDay={selectedDay}
            onSelect={(k) => setSelectedDay(k)}
          />
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden p-5">
          <h2 className="font-bold text-slate-900">Day Details</h2>
          {!selected ? (
            <p className="text-sm text-slate-600 mt-2">
              Select a day from the heatmap.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                <p className="font-semibold text-slate-900">{selected.key}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Mood</p>
                <p className="font-semibold text-slate-900">
                  {selected.primaryEmotion || selected.emotion}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Intensity: {Math.round(selected.intensity * 100)}%
                </p>
              </div>

              {selected.entry ? (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Your note</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-5">
                    {selected.entry.content}
                  </p>
                  <div>
                    <Link
                      href={`/dashboard/entries/${selected.entry.id}`}
                      className="inline-flex items-center justify-center mt-3 rounded-xl bg-slate-900 text-white font-semibold px-4 py-2 text-sm hover:bg-slate-800 transition-colors"
                    >
                      Open full entry
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">No diary entry on this day.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">Activity Breakdown</h2>
            <p className="text-sm text-slate-500">Journaling activity across the selected range</p>
          </div>

          <button
            type="button"
            onClick={() => {
              const report = generateReport({
                range,
                moodDistribution,
                streak,
                selectedDay: selectedDay ?? "",
                daySeries,
              });
              const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `SoulSync-Full-Analysis-${range}days.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-sm text-slate-800"
          >
            Download Full Report
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActivityBarChart series={daySeries} />
          <div className="space-y-3">
            {moodDistribution.slice(0, 4).map((it) => (
              <div key={it.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: EMOTION_COLORS[it.key] }} />
                  <span className="text-sm text-slate-700 capitalize">{it.key}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{it.count} days</span>
              </div>
            ))}

            <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4 mt-2">
              <p className="text-sm font-semibold text-slate-900">Quick insight</p>
              <p className="text-sm text-slate-600 mt-1">
                {selected
                  ? `On ${selected.key}, your intensity was ${Math.round(selected.intensity * 100)}% (${selected.emotion}).`
                  : "Select a day to get a grounded insight for that day."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateReport({
  range,
  moodDistribution,
  streak,
  selectedDay,
  daySeries,
}: {
  range: number;
  moodDistribution: Array<{ key: EmotionSlug; pct: number; count: number }>;
  streak: number;
  selectedDay: string;
  daySeries: Array<{ key: string; intensity: number; emotion: EmotionSlug; entriesCount: number }>;
}) {
  const top = moodDistribution[0];
  const best = daySeries
    .filter((d) => d.entriesCount > 0)
    .sort((a, b) => b.intensity - a.intensity)[0];
  const worst = daySeries
    .filter((d) => d.entriesCount > 0)
    .sort((a, b) => a.intensity - b.intensity)[0];

  const lines: string[] = [];
  lines.push(`SoulSync — Full Emotion Analysis (${range} days)`);
  lines.push(``);
  lines.push(`Top mood category: ${top ? top.key : "neutral"} (${top ? Math.round(top.pct * 100) : 0}%)`);
  lines.push(`Current journaling streak: ${streak} day(s)`);
  lines.push(``);
  if (best) lines.push(`Most intense day: ${best.key} (${best.emotion}) — ${Math.round(best.intensity * 100)}%`);
  if (worst) lines.push(`Least intense day: ${worst.key} (${worst.emotion}) — ${Math.round(worst.intensity * 100)}%`);
  if (selectedDay) lines.push(`Selected day: ${selectedDay}`);
  lines.push(``);
  lines.push(`Mood breakdown (days with entries):`);
  for (const it of moodDistribution) {
    lines.push(`- ${it.key}: ${it.count} days (${Math.round(it.pct * 100)}%)`);
  }
  return lines.join("\n");
}

function IntensityLineChart({
  points,
  labels,
  selected,
  onSelect,
}: {
  points: number[];
  labels: string[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const safePoints = points.map((p) => clamp01(p));

  const max = Math.max(0.001, ...safePoints);
  const min = Math.min(...safePoints);
  const normalized = safePoints.map((p) => (max - min < 0.00001 ? 0.5 : (p - min) / (max - min)));

  const w = 640;
  const h = 160;
  const padding = 14;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;

  const poly = normalized
    .map((val, i) => {
      const x = padding + (innerW * (safePoints.length === 1 ? 0 : i / (safePoints.length - 1)));
      const y = padding + (innerH * (1 - val));
      return `${x},${y}`;
    })
    .join(" ");

  const idx = hoverIdx ?? (selected ? labels.findIndex((k) => k === selected) : -1);
  const tooltip = idx >= 0 ? { label: labels[idx], value: safePoints[idx] } : null;

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[180px] block"
        onMouseMove={(e) => {
          const el = ref.current?.querySelector("svg");
          if (!el) return;
          const rect = (el as SVGElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const t = Math.max(0, Math.min(1, x / rect.width));
          const raw = Math.round(t * (labels.length - 1));
          setHoverIdx(raw);
        }}
        onMouseLeave={() => setHoverIdx(null)}
        onClick={() => {
          const i = idx >= 0 ? idx : 0;
          onSelect(labels[i]);
        }}
      >
        <polyline points={poly} fill="none" stroke="#f4d34c" strokeWidth="3" strokeLinecap="round" />
        {normalized.map((val, i) => {
          const x = padding + (innerW * (safePoints.length === 1 ? 0 : i / (safePoints.length - 1)));
          const y = padding + (innerH * (1 - val));
          const isActive = idx >= 0 && i === idx;
          return (
            <g key={labels[i]}>
              <circle cx={x} cy={y} r={isActive ? 5 : 3} fill={isActive ? "#fb7185" : "#f4d34c"} />
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="absolute top-2 right-2 bg-white/95 border border-slate-200 shadow-sm rounded-xl px-3 py-2"
          style={{ maxWidth: 220 }}
        >
          <p className="text-xs text-slate-500 uppercase tracking-wider">Day</p>
          <p className="text-sm font-semibold text-slate-900">{tooltip.label}</p>
          <p className="text-xs text-slate-600 mt-1">Intensity: {Math.round(tooltip.value * 100)}%</p>
          <p className="text-[11px] text-slate-400 mt-1">Click chart to select day</p>
        </div>
      )}
    </div>
  );
}

function DonutChart({
  items,
}: {
  items: Array<{ key: EmotionSlug; pct: number; count: number }>;
}) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const stroke = 16;

  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const top = items[0];

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
        {items.map((it) => {
          const dash = circumference * it.pct;
          const dashArray = `${dash} ${circumference - dash}`;
          const color = EMOTION_COLORS[it.key];
          const el = (
            <circle
              key={it.key}
              cx={cx}
              cy={cy}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              opacity={it.pct === 0 ? 0 : 1}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute text-center">
        <div className="relative -mt-36">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Top mood</p>
          <p className="text-2xl font-bold text-slate-900 capitalize">{top?.key ?? "neutral"}</p>
          <p className="text-xs text-slate-600 mt-1">{top ? Math.round(top.pct * 100) : 0}%</p>
        </div>
      </div>
    </div>
  );
}

function MoodHeatmap({
  series,
  selectedDay,
  onSelect,
}: {
  series: Array<{
    key: string;
    date: Date;
    intensity: number;
    emotion: EmotionSlug;
    entriesCount: number;
    primaryEmotion: string;
    entry: Entry | null;
  }>;
  selectedDay: string | null;
  onSelect: (key: string) => void;
}) {
  // Build a grid aligned to weeks (Mon..Sun).
  const dayIndex = (d: Date) => {
    // JS: Sun=0..Sat=6. Convert to Mon=0..Sun=6.
    const js = d.getDay();
    return (js + 6) % 7;
  };

  const start = series[0]?.date ?? new Date();
  const end = series[series.length - 1]?.date ?? start;

  const startShift = dayIndex(start);
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startShift);

  const totalDays = Math.ceil(((end.getTime() - gridStart.getTime()) / 86400000) + 1);
  const weeks = Math.ceil(totalDays / 7);

  const lookup = new Map(series.map((s) => [s.key, s]));

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 text-[11px] text-slate-500 mb-3">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
        {Array.from({ length: weeks * 7 }).map((_, i) => {
          const cellDate = new Date(gridStart);
          cellDate.setDate(gridStart.getDate() + i);
          const k = dayKey(cellDate);
          const d = lookup.get(k);

          const has = !!d && d.entriesCount > 0;
          const intensity = d ? clamp01(d.intensity) : 0;
          const color = has ? EMOTION_COLORS[d!.emotion] : "#f1f5f9";
          const opacity = has ? 0.25 + intensity * 0.75 : 1;
          const isSelected = selectedDay === k;

          return (
            <button
              key={k + i}
              type="button"
              onClick={() => onSelect(k)}
              disabled={!has}
              className={`h-9 rounded-xl border transition-colors ${
                isSelected ? "border-slate-900 ring-2 ring-amber-200" : "border-slate-200"
              } ${has ? "hover:opacity-90" : "opacity-60 cursor-not-allowed"}`}
              style={{
                background: has ? color : "#f8fafc",
                opacity: has ? opacity : 0.7,
              }}
              title={
                has
                  ? `${k}\n${d?.primaryEmotion}\nIntensity ${Math.round((d?.intensity ?? 0) * 100)}%`
                  : `${k}\nNo entry`
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function ActivityBarChart({ series }: { series: Array<{ key: string; entriesCount: number }> }) {
  const max = Math.max(1, ...series.map((d) => d.entriesCount));
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4">
      <p className="text-sm font-semibold text-slate-900">Journaling frequency</p>
      <p className="text-xs text-slate-500 mt-1">Number of diary entries per day</p>
      <div className="mt-4 flex gap-1 items-end h-28">
        {series.map((d) => {
          const h = Math.round((d.entriesCount / max) * 100);
          return (
            <div
              key={d.key}
              className="flex-1 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors cursor-default"
              style={{ height: `${Math.max(6, h)}%` }}
              title={`${d.key}: ${d.entriesCount} entries`}
            />
          );
        })}
      </div>
    </div>
  );
}

