import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { GuideChat } from "@/components/dashboard/GuideChat";

export default async function GuidePage() {
  const session = await getRequiredSession();
  const userId = session.user.id;

  const [profile, conversation] = await Promise.all([
    prisma.wellnessAgentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    }),
    prisma.wellnessConversation.findUnique({ where: { userId } }),
  ]);

  return (
    <GuideChat
      initialProfile={{ name: profile.name, voiceId: profile.voiceId }}
      initialMessages={(conversation?.messages as any[]) ?? []}
    />
  );
}

