import { getRequiredSession } from "@/lib/auth/session";
import { streamEmpatheticResponse } from "@/lib/llm/client";

/** GET: Stream empathetic AI response based on today's entry + recent emotions + latest summary. */
export async function GET() {
  try {
    const session = await getRequiredSession();
    const userId = session.user.id;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        await streamEmpatheticResponse(userId, {
          onChunk(text) {
            controller.enqueue(encoder.encode(text));
          },
          onDone() {
            controller.close();
          },
          onError(err) {
            controller.enqueue(encoder.encode(`Sorry, I couldn't respond right now.`));
            controller.close();
          },
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return new Response("Unauthorized", { status: 401 });
    }
    console.error("AI response error:", e);
    return new Response("Something went wrong.", { status: 500 });
  }
}
