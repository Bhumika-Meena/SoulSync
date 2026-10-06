import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/auth/session";
import { api, isApiClientError } from "@/lib/api";
import { EntryContentView } from "./EntryContentView";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getRequiredSession();
  const { id } = await params;

  let entry: any;
  try {
    entry = await api.journal.get(id, {
      userId: session.user.id,
      token: session.accessToken,
    });
  } catch (err) {
    if (isApiClientError(err) && (err.statusCode === 404 || err.code === "ENTRY_NOT_FOUND")) {
      notFound();
    }
    throw err;
  }

  if (!entry) notFound();

  const emotion = entry.emotionAnalyses?.[0];
  const createdAtIso =
    typeof entry.createdAt === "string"
      ? entry.createdAt
      : new Date(entry.createdAt).toISOString();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="text-soul-primary-text/70 hover:text-soul-primary-text transition-gentle text-sm"
      >
        ← Back to journal
      </Link>
      <article className="soul-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between p-6 pb-0 text-sm text-soul-primary-text/60">
          <time dateTime={createdAtIso}>
            {new Date(entry.createdAt).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </time>
          {emotion && (
            <span className="text-soul-primary-text/70">
              {emotion.primaryEmotion}
              {emotion.secondaryEmotion ? ` / ${emotion.secondaryEmotion}` : ""} · {(emotion.intensity * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <EntryContentView
          htmlContent={entry.htmlContent}
          plainContent={entry.content}
          backgroundImage={entry.backgroundImage}
        />
      </article>
    </div>
  );
}
