import { getRequiredSession } from "@/lib/auth/session";
import { listDiaryEntries } from "@/lib/db/queries";
import { RecentEntriesBook } from "@/components/dashboard/RecentEntriesBook";

type EntryWithEmotions = Awaited<ReturnType<typeof listDiaryEntries>>[number];

export default async function RecentEntriesPage() {
  const session = await getRequiredSession();
  const entries: EntryWithEmotions[] = await listDiaryEntries(session.user.id, 80);

  return (
    <div className="max-w-4xl mx-auto">
      <RecentEntriesBook entries={entries} />
    </div>
  );
}

