import { getRequiredSession } from "@/lib/auth/session";
import { listDiaryEntriesSince } from "@/lib/db/queries";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";

export default async function InsightsPage() {
  const session = await getRequiredSession();
  const userId = session.user.id;

  // Fetch enough data for 30-day charts + heatmap alignment.
  const since = new Date();
  since.setDate(since.getDate() - 45);

  const entries = await listDiaryEntriesSince(userId, since, 250);

  const normalized = entries.map((e) => {
    const emo = e.emotionAnalyses?.[0];
    return {
      id: e.id,
      createdAt: e.createdAt,
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

