/**
 * External LLM client (streaming).
 * Uses OpenAI API by default; set OPENAI_API_KEY.
 * Can be swapped for another provider (Anthropic, etc.) with same interface.
 */

import { buildContextForUser, serializeContextForPrompt } from "./context";

export type StreamCallbacks = {
  onChunk?: (text: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
};

/** Generate empathetic response stream. Context is built from today's entry + last emotions + latest summary only. */
export async function streamEmpatheticResponse(
  userId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onChunk, onDone, onError } = callbacks;
  try {
    const ctx = await buildContextForUser(userId);
    const contextBlock = serializeContextForPrompt(ctx);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: no LLM, return a short static message
      const fallback = "I'm here with you. When you're ready, you can share more in your next entry.";
      onChunk?.(fallback);
      onDone?.();
      return;
    }

    const systemContent = `You are a warm, empathetic journaling companion for SoulSync. You are NOT a therapist or medical professional. You respond briefly and supportively based only on the following context. Do not diagnose or give medical advice. If someone seems in crisis, gently suggest reaching out to a professional.

Context (only use this—never assume other diary history):
${contextBlock}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: systemContent },
          {
            role: "user",
            content:
              "Based on today's entry and recent emotions, write a short, empathetic response (2–4 sentences). Be warm and supportive.",
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM request failed: ${res.status} ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onChunk?.("I'm here for you.");
      onDone?.();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = json.choices?.[0]?.delta?.content;
            if (content) onChunk?.(content);
          } catch {
            // ignore parse errors for incomplete chunks
          }
        }
      }
    }

    onDone?.();
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
