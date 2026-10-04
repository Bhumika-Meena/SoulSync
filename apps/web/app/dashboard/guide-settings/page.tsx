import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { GuideSettingsForm } from "@/components/dashboard/GuideSettingsForm";

async function getProfile(userId: string) {
  const profile = await (prisma as any).wellnessAgentProfile?.findUnique?.({ where: { userId } });
  return profile ?? { name: "Wellness Guide", voiceId: "default" };
}

export default async function GuideSettingsPage() {
  const session = await getRequiredSession();
  const profile = await getProfile(session.user.id);

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to dashboard
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Your Wellness Guide</h1>
        <p className="text-sm text-slate-600 mb-6">
          Personalize how your AI guide appears and sounds. This doesn&apos;t change any of your
          diary data or analysis.
        </p>

        <GuideSettingsForm initialName={profile.name} initialVoiceId={profile.voiceId} />
      </div>
    </main>
  );
}
