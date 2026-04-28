import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const userId = session.user.id;

    const profile = await prisma.wellnessAgentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const conversation = await prisma.wellnessConversation.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      profile: { name: profile.name, voiceId: profile.voiceId },
      messages: (conversation?.messages as unknown) ?? [],
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("conversation GET error:", e);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

