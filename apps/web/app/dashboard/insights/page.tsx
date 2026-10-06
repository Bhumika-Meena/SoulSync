import { getRequiredSession } from "@/lib/auth/session";
import { api } from "@/lib/api";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";

export default async function InsightsPage() {
  const session = await getRequiredSession();
  const userId = session.user.id;

  // Fetch entries for insights charts and timeline
  const { entries } = await api.journal.list({ limit: 50 }, { userId });

  const normalized = entries.map((e) => {
    const emo = (e as any).emotionAnalyses?.[0];
    return {
      id: e.id,
      createdAt: typeof e.createdAt === "string" ? new Date(e.createdAt) : e.createdAt,
      content: e.content,
      emotionAnalyses: [
        {
          primaryEmotion: emo?.primaryEmotion ?? "neutral",
          secondaryEmotion: emo?.secondaryEmotion ?? null,
          intensity: typeof emo?.intensity === "number" ? emo.intensity : 0,
        },
      ],
    };
  });

  return <InsightsDashboard entries={normalized as any} />;
}

