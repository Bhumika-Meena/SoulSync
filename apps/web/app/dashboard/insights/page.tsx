import { getRequiredSession } from "@/lib/auth/session";
import { api } from "@/lib/api";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";
import type { JournalEntryResponseDTO } from "@soulsync/contracts";

export default async function InsightsPage() {
  const session = await getRequiredSession();
  const userId = session.user.id;

  // Calculate the 45-day window matching the legacy implementation
  const since = new Date();
  since.setDate(since.getDate() - 45);
  const startDate = since.toISOString();

  // Retrieve entries across the 45-day window using the API pagination architecture (up to 250 max)
  const entries: JournalEntryResponseDTO[] = [];
  let page = 1;
  const maxEntries = 250;

  while (entries.length < maxEntries) {
    const result = await api.journal.list(
      { startDate, page, limit: 50 },
      { userId, token: session.accessToken }
    );
    entries.push(...result.entries);

    if (!result.pagination.hasNext || result.entries.length === 0) {
      break;
    }
    page += 1;
  }

  const normalized = entries.map((e) => {
    const emo = e.emotionAnalyses?.[0];
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

