import { getRequiredSession } from "@/lib/auth/session";
import { AgentChatContainer } from "@/components/agent/AgentChatContainer";
import { api } from "@/lib/api";

import type { ConversationThreadResponseDTO } from "@soulsync/contracts";

export default async function GuidePage() {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const token = session.accessToken;

  let initialThreads: ConversationThreadResponseDTO[] = [];
  try {
    initialThreads = await api.agent.listThreads({ userId, token });
  } catch {
    initialThreads = [];
  }

  return (
    <main className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
      <AgentChatContainer initialThreads={initialThreads} />
    </main>
  );
}
