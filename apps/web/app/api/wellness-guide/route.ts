import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listDiaryEntries, getLastEmotionsForContext, getLatestWeeklySummary } from "@/lib/db/queries";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

type Role = "user" | "assistant";

type StoredMessage = {
  role: Role;
  content: string;
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const session = await getRequiredSession();
    const userId = session.user.id;

    const { message } = await req.json().catch(() => ({}));
    if (!message || typeof message !== "string") {
      return NextResponse.json({ message: "Message is required." }, { status: 400 });
    }

    const db = prisma as {
      wellnessAgentProfile?: { upsert: (args: unknown) => Promise<{ name: string; voiceId: string }> };
      wellnessConversation?: {
        findUnique: (args: unknown) => Promise<{ messages?: StoredMessage[] } | null>;
        upsert: (args: unknown) => Promise<unknown>;
      };
    };
    if (!db.wellnessAgentProfile || !db.wellnessConversation) {
      return NextResponse.json(
        {
          message:
            "Wellness Guide database is not ready. Stop the dev server, run: npx prisma generate && npx prisma db push, then restart.",
        },
        { status: 503 }
      );
    }

    // Ensure base profile exists
    const profile = await db.wellnessAgentProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Recent conversation, diary, and emotion context
    const [conversation, entries, emotions, weeklySummary] = await Promise.all([
      db.wellnessConversation.findUnique({ where: { userId } }),
      listDiaryEntries(userId, 5),
      getLastEmotionsForContext(userId, 12),
      getLatestWeeklySummary(userId),
    ]);

    const history = (conversation?.messages as StoredMessage[] | null) ?? [];
    const trimmedHistory = history.slice(-16);

    const diaryContext = entries
      .map((e) => {
        const emo = e.emotionAnalyses[0];
        const intensity = emo ? `${Math.round((emo.intensity ?? 0) * 100)}%` : "n/a";
        return `• ${e.createdAt.toISOString().slice(0, 10)} — ${emo?.primaryEmotion ?? "unknown"} (${intensity})\n  ${e.content.slice(0, 220)}`;
      })
      .join("\n");

    const emotionTimeline = emotions
      .map(
        (e) =>
          `${e.createdAt.toISOString().slice(0, 10)}: ${e.primaryEmotion}${
            e.secondaryEmotion ? ` / ${e.secondaryEmotion}` : ""
          } (${Math.round(e.intensity * 100)}%)`
      )
      .join("\n");

    const weekly = weeklySummary
      ? `Latest weekly reflection (${weeklySummary.weekStart.toISOString().slice(0, 10)}):\n${weeklySummary.content}`
      : "No weekly summaries yet.";

    const systemPrompt = `
You are ${profile.name}.

Role & vibe:
- You are a warm, emotionally-attuned wellness guide: caring, grounded, human, and supportive.
- You talk like a real person (natural tone, contractions, no corporate/robotic phrasing).
- You do NOT say you are an AI. Never mention policies, "as an AI", or model names.
- You are not a therapist or doctor; don’t diagnose. You can suggest gentle, everyday coping ideas.

What you do:
- Reflect feelings back with specificity (name the emotion + what might be underneath it).
- Notice patterns across the last week and gently connect dots (\"last Monday looked hectic and you felt angry…\").
- Offer 1 practical micro-step that fits the user’s life (10 minutes, low effort).
- Ask at most 1 open question at the end.

How you write:
- 2–4 short paragraphs. Each paragraph 1–2 sentences.
- No bullet lists unless the user explicitly asks.
- Avoid generic advice; anchor everything in the provided context.

Safety:
- If the user mentions self-harm, suicide, or crisis: be caring, encourage reaching out to local emergency services or a trusted person immediately.

Context (use this, don’t invent):
Recent diary entries:
${diaryContext || "No diary entries yet."}

Recent emotion timeline:
${emotionTimeline || "No emotion data yet."}

Weekly progress:
${weekly}
`;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      const fallback =
        "I'm here with you. Once my AI brain is configured, I'll be able to respond in more detail, but for now I just want you to know you're not alone.";
      return NextResponse.json({
        reply: fallback,
        profile: { name: profile.name, voiceId: profile.voiceId },
      });
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...trimmedHistory.map((m) => ({ role: m.role as Role, content: m.content })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Groq error:", text);
      return NextResponse.json({ message: "AI request failed." }, { status: 500 });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim() || "I'm here with you.";

    const nowIso = new Date().toISOString();
    const updatedMessages: StoredMessage[] = [
      ...trimmedHistory,
      { role: "user" as const, content: message, createdAt: nowIso },
      { role: "assistant" as const, content: reply, createdAt: nowIso },
    ].slice(-30);

    await db.wellnessConversation.upsert({
      where: { userId },
      update: { messages: updatedMessages },
      create: { userId, messages: updatedMessages },
    });

    return NextResponse.json({
      reply,
      profile: { name: profile.name, voiceId: profile.voiceId },
    });
  } catch (e) {
    console.error("wellness-guide POST error:", e);
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

