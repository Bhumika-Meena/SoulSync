import { getRequiredSession } from "@/lib/auth/session";
import { api } from "@/lib/api";
import { RecentEntriesBook } from "@/components/dashboard/RecentEntriesBook";

export default async function RecentEntriesPage() {
  const session = await getRequiredSession();
  const { entries } = await api.journal.list(
    { limit: 80 },
    { userId: session.user.id, token: session.accessToken }
  );

  return (
    <div className="max-w-4xl mx-auto">
      <RecentEntriesBook entries={entries as any} />
    </div>
  );
}

