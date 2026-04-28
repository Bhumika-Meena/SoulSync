import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const userId = session.user.id;

    const db = prisma as { wellnessAgentProfile?: { upsert: (args: unknown) => Promise<unknown> } };
    if (!db.wellnessAgentProfile) {
      return NextResponse.json(
        { message: "Wellness Guide database is not ready. Run: npx prisma generate && npx prisma db push" },
        { status: 503 }
      );
    }

    const profile = await db.wellnessAgentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return NextResponse.json(profile);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("wellness-guide profile GET error:", e);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getRequiredSession();
    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : "Wellness Guide";
    const voiceId = typeof body.voiceId === "string" && body.voiceId.trim().length > 0 ? body.voiceId.trim() : "default";

    const db = prisma as { wellnessAgentProfile?: { upsert: (args: unknown) => Promise<unknown> } };
    if (!db.wellnessAgentProfile) {
      return NextResponse.json(
        { message: "Wellness Guide database is not ready. Run: npx prisma generate && npx prisma db push" },
        { status: 503 }
      );
    }

    const profile = await db.wellnessAgentProfile.upsert({
      where: { userId },
      update: { name, voiceId },
      create: { userId, name, voiceId },
    });

    return NextResponse.json(profile);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("wellness-guide profile POST error:", e);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

