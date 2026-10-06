import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { api } from "@/lib/api";
import { createEmotionAnalysis } from "@/lib/db/queries";
import { detectEmotionFromText } from "@/lib/llm/detect-emotion";
import { z } from "zod";

const createEntrySchema = z.object({
  content: z.string().min(1).max(50000),
  htmlContent: z.string().optional(),
  backgroundImage: z.string().nullable().optional(),
});

/** POST: Create today's diary entry, run emotion analysis, return entry + emotion. */
export async function POST(req: Request) {
  try {
    const session = await getRequiredSession();
    const userId = session.user.id;

    const body = await req.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const entry = await api.journal.create(
      {
        content: parsed.data.content,
        htmlContent: parsed.data.htmlContent ?? null,
        backgroundImage: parsed.data.backgroundImage ?? null,
        plainText: parsed.data.content,
      },
      { userId, token: session.accessToken }
    );
    const emotion = await detectEmotionFromText(parsed.data.content);
    await createEmotionAnalysis(userId, entry.id, {
      primaryEmotion: emotion.primaryEmotion,
      secondaryEmotion: emotion.secondaryEmotion,
      intensity: emotion.intensity,
    });

    return NextResponse.json({
      entry: {
        id: entry.id,
        content: entry.content,
        createdAt: entry.createdAt,
      },
      emotion: {
        primaryEmotion: emotion.primaryEmotion,
        secondaryEmotion: emotion.secondaryEmotion,
        intensity: emotion.intensity,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("Diary POST error:", e);
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}

/** GET: List user's diary entries (recent first). */
export async function GET() {
  try {
    const session = await getRequiredSession();
    const result = await api.journal.list(
      { limit: 50 },
      { userId: session.user.id, token: session.accessToken }
    );
    return NextResponse.json({ entries: result.entries });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("Diary GET error:", e);
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}
