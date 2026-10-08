import Link from "next/link";
import { getRequiredSession } from "@/lib/auth/session";
import { api } from "@/lib/api";
import { DashboardSceneImage } from "@/components/dashboard/DashboardSceneImage";
import { ThemeSync } from "@/components/theme/ThemeSync";
import { WellnessGuideCard } from "@/components/dashboard/WellnessGuideCard";
import type { EmotionSlug } from "@/lib/theme/tokens";

function emotionLabelToSlug(label?: string): EmotionSlug {
  const l = (label ?? "").toLowerCase();
  if (["calm", "peaceful", "relaxed"].some((e) => l.includes(e))) return "calm";
  if (["sad", "down", "grief", "lonely"].some((e) => l.includes(e))) return "sad";
  if (["happy", "joy", "excited", "grateful", "hopeful"].some((e) => l.includes(e))) return "happy";
  if (["anxious", "worried", "nervous", "stressed"].some((e) => l.includes(e))) return "anxious";
  if (["angry", "frustrated", "irritated", "mad"].some((e) => l.includes(e))) return "angry";
  return "neutral";
}

const MOOD_CARD: Record<EmotionSlug, { label: string; tone: string }> = {
  neutral: { label: "Steady & Clear", tone: "0% change since yesterday" },
  calm: { label: "Radiant & Calm", tone: "+12% focus since yesterday" },
  happy: { label: "Radiant & Joyful", tone: "+9% positivity since yesterday" },
  sad: { label: "Gentle & Reflective", tone: "+6% clarity since yesterday" },
  anxious: { label: "Uneasy & Aware", tone: "+4% calm since yesterday" },
  angry: { label: "Tense & Grounding", tone: "+3% patience since yesterday" },
};

type PlaylistConfig = {
  title: string;
  selectedFor: string;
  openUrl: string;
  items: { name: string; artist: string; duration: string; isPlaying?: boolean }[];
};

function getSpotifyPlaylistId(openUrl: string) {
  // Example: https://open.spotify.com/playlist/<id>?...
  const match = openUrl.match(/\/playlist\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? "";
}

function getMoodPathPlaylist(mood: EmotionSlug, intensity: number) {
  // Intensity is 0..1 (from emotion analysis).
  const t = Number.isFinite(intensity) ? intensity : 0.5;

  // “Slowly calming down” / “chill vibes” behavior by selecting a playlist tier.
  if (mood === "angry") {
    if (t >= 0.7) return { playlist: MOOD_PLAYLISTS.angry, path: "Start with release, then downshift…" };
    if (t >= 0.45) return { playlist: MOOD_PLAYLISTS.anxious, path: "Steadying breaths, easing the edge…" };
    return { playlist: MOOD_PLAYLISTS.sad, path: "Soft landing—gentle reflection…" };
  }
  if (mood === "anxious") {
    if (t >= 0.7) return { playlist: MOOD_PLAYLISTS.anxious, path: "Ground first, then soften…" };
    if (t >= 0.45) return { playlist: MOOD_PLAYLISTS.calm, path: "Calm is coming online…" };
    return { playlist: MOOD_PLAYLISTS.neutral, path: "Smooth focus and steady calm…" };
  }
  if (mood === "happy") {
    if (t >= 0.7) return { playlist: MOOD_PLAYLISTS.happy, path: "Uplift first—let it move through you…" };
    if (t >= 0.45) return { playlist: MOOD_PLAYLISTS.calm, path: "Chill the energy gently…" };
    return { playlist: MOOD_PLAYLISTS.neutral, path: "Comfortable calm—easygoing vibes…" };
  }
  if (mood === "sad") {
    if (t >= 0.7) return { playlist: MOOD_PLAYLISTS.sad, path: "Hold the feeling with care…" };
    if (t >= 0.45) return { playlist: MOOD_PLAYLISTS.anxious, path: "A little lift to help you breathe…" };
    return { playlist: MOOD_PLAYLISTS.calm, path: "Warm comfort—soft recovery…" };
  }
  if (mood === "calm") {
    if (t >= 0.7) return { playlist: MOOD_PLAYLISTS.calm, path: "Keep the calm steady…" };
    if (t >= 0.45) return { playlist: MOOD_PLAYLISTS.neutral, path: "Transition into gentle focus…" };
    return { playlist: MOOD_PLAYLISTS.neutral, path: "Light, steady background sound…" };
  }
  return { playlist: MOOD_PLAYLISTS.neutral, path: "Steady, easygoing vibes…" };
}

const MOOD_PLAYLISTS: Record<EmotionSlug, PlaylistConfig> = {
  calm: {
    title: "Mood Playlist",
    selectedFor: "calm",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    items: [
      { name: "Morning Calm", artist: "Ambient Dreams", duration: "3:45" },
      { name: "Gentle Awakening", artist: "The Solace Collective", duration: "4:12" },
      { name: "Sunlight Through Glass", artist: "Lofi Haze", duration: "3:12", isPlaying: true },
    ],
  },
  happy: {
    title: "Mood Playlist",
    selectedFor: "uplifting",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC",
    items: [
      { name: "Sunlight Through Glass", artist: "Lofi Haze", duration: "3:12" },
      { name: "Bright Horizon", artist: "Good Vibes", duration: "3:41" },
      { name: "Gentle Rise", artist: "Feel-Good Indie", duration: "4:05", isPlaying: true },
    ],
  },
  sad: {
    title: "Mood Playlist",
    selectedFor: "reflective",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWVrtsSlLKzro",
    items: [
      { name: "Soft Rain Notes", artist: "Quiet Skies", duration: "3:58" },
      { name: "Blue Hour", artist: "Evening Lanterns", duration: "4:06" },
      { name: "Hold Still", artist: "The Solace Collective", duration: "3:44", isPlaying: true },
    ],
  },
  anxious: {
    title: "Mood Playlist",
    selectedFor: "grounding",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWU0ScTcjJBdj",
    items: [
      { name: "Breathing Room", artist: "Calm Vibes", duration: "3:35" },
      { name: "Still Water", artist: "Ambient Dreams", duration: "4:01" },
      { name: "Grounded", artist: "Peaceful Piano", duration: "3:49", isPlaying: true },
    ],
  },
  angry: {
    title: "Mood Playlist",
    selectedFor: "reset",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
    items: [
      { name: "Lower the Noise", artist: "Deep Focus", duration: "3:38" },
      { name: "Clear Edges", artist: "Night Library", duration: "4:02" },
      { name: "Back to Center", artist: "Ambient Dreams", duration: "3:54", isPlaying: true },
    ],
  },
  neutral: {
    title: "Mood Playlist",
    selectedFor: "focus",
    openUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
    items: [
      { name: "Soft Focus", artist: "Lofi Haze", duration: "3:22" },
      { name: "Study Lanterns", artist: "Night Library", duration: "3:57" },
      { name: "Warm Pages", artist: "Acoustic Chill", duration: "4:09", isPlaying: true },
    ],
  },
};

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const journalData = await api.journal.list(
    { limit: 10 },
    { userId, token: session.accessToken }
  );
  const entries = journalData.entries as any[];

  const latestEmotion = entries[0]?.emotionAnalyses[0];
  const themeEmotion = emotionLabelToSlug(latestEmotion?.primaryEmotion);
  const latestIntensity = latestEmotion?.intensity ?? 0.5;
  const moodPath = getMoodPathPlaylist(themeEmotion, latestIntensity);
  const playlist = moodPath.playlist;
  const playlistPathLabel = moodPath.path;

  const spotifyPlaylistId = getSpotifyPlaylistId(playlist.openUrl);
  const spotifyEmbedSrc = spotifyPlaylistId
    ? `https://open.spotify.com/embed/playlist/${spotifyPlaylistId}`
    : null;

  const userName =
    session.user.name?.split(" ")[0] || session.user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8">
      <ThemeSync emotion={themeEmotion} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Good Morning, {userName}
          </h1>
          <p className="mt-3 text-slate-600 text-lg">
            The sun is out and it&apos;s a beautiful day for self-care.
          </p>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200/50 shadow-sm">
            <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
              Current Mood
            </p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-900">{MOOD_CARD[themeEmotion].label}</p>
                <p className="mt-1 text-sm text-emerald-700 font-medium">
                  {MOOD_CARD[themeEmotion].tone}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-200/70 flex items-center justify-center">
                <span className="text-xl" aria-hidden>
                  ☺
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm overflow-hidden">
            <DashboardSceneImage />
            <div className="p-6 border-t border-slate-200/70">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Daily Reflection</span>
              </div>
              <p className="mt-2 text-slate-600">
                Capture your thoughts for today. How did the soft sunlight make you feel when you
                first woke up?
              </p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-400 italic">Started recently…</p>
                <Link
                  href="/dashboard/journal/new"
                  className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-3 rounded-full transition-colors"
                >
                  Continue Journaling →
                </Link>
              </div>
            </div>
          </div>

          <div id="community">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Past Memories</h2>
              <Link
                href="/dashboard/recent"
                className="text-sm font-semibold text-amber-700 hover:text-amber-800"
              >
                View All
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entries.slice(0, 2).map((entry: any) => {
                const emotion = entry.emotionAnalyses?.[0];
                const primary = emotion?.primaryEmotion?.toLowerCase() ?? "";
                const icon = primary.includes("happy")
                  ? "☀"
                  : primary.includes("sad")
                    ? "☁"
                    : primary.includes("anx")
                      ? "⚡"
                      : primary.includes("calm")
                        ? "🌿"
                        : "✦";

                return (
                  <Link
                    key={entry.id}
                    href={`/dashboard/entries/${entry.id}`}
                    className="group rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <span className="text-lg" aria-hidden>
                          {icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {emotion?.primaryEmotion ?? "Reflection"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 line-clamp-2 group-hover:text-slate-700">
                      {entry.content}
                    </p>
                  </Link>
                );
              })}

              {entries.length === 0 && (
                <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:col-span-2">
                  <p className="text-slate-600">No entries yet. Start with your first reflection.</p>
                </div>
              )}
            </div>

            {/* Recent entries are now available in /dashboard/recent */}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <WellnessGuideCard />

          <div id="music" className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="font-bold text-slate-900">{playlist.title}</p>
                  <p className="text-[11px] text-amber-600 font-semibold">{playlistPathLabel}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Selected for: {playlist.selectedFor}
              </p>
            </div>

            {spotifyEmbedSrc && (
              <div className="p-3">
                <iframe
                  title="Spotify Mood Player"
                  src={spotifyEmbedSrc}
                  width="100%"
                  height="340"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}

    

            <div className="p-5 border-t border-slate-200/70">
              <a
                href={playlist.openUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M14 3h7v7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 14L21 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 14v7H3V3h7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Open in Spotify
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="insights"
        className="rounded-2xl bg-amber-50/70 border border-amber-200/60 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-200/70 flex items-center justify-center">
            <span className="text-xl" aria-hidden>
              💡
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-900">Weekly Insight</p>
            <p className="text-slate-700 text-sm">
              You&apos;re more likely to report a &ldquo;{MOOD_CARD[themeEmotion].label.split(" ")[0]}&rdquo; mood on
              days when you complete a morning reflection before 9:00 AM. Keep up the great routine!
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/insights"
          className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-5 py-2.5 font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          Full Analysis
        </Link>
      </section>
    </div>
  );
}
