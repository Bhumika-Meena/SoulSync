"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { EmotionSlug } from "@/lib/theme/tokens";
import { RichTextEditor } from "@/components/journal/RichTextEditor";

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setEmotion: setThemeEmotion } = useTheme();

  async function handleSave(content: string, backgroundImage: string | null) {
    setError("");
    setLoading(true);

    // Extract plain text for emotion detection (strip HTML)
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";

    if (!plainText.trim()) {
      setError("Please write something in your entry.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: plainText, // Send plain text for emotion detection
          htmlContent: content, // Store HTML separately if needed
          backgroundImage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        return;
      }

      // Update theme based on detected emotion
      const slug = emotionLabelToSlug(data.emotion.primaryEmotion);
      setThemeEmotion(slug);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch {
      setLoading(false);
      setError("Something went wrong.");
    }
  }

  function emotionLabelToSlug(label: string): EmotionSlug {
    const l = label.toLowerCase();
    if (["calm", "peaceful", "relaxed"].some((e) => l.includes(e))) return "calm";
    if (["sad", "down", "grief", "lonely"].some((e) => l.includes(e))) return "sad";
    if (["happy", "joy", "excited", "grateful", "hopeful"].some((e) => l.includes(e))) return "happy";
    if (["anxious", "worried", "nervous", "stressed"].some((e) => l.includes(e))) return "anxious";
    if (["angry", "frustrated", "irritated", "mad"].some((e) => l.includes(e))) return "angry";
    return "neutral";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-soul-primary-text">
          Write Your Entry
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-soul-primary-text/70 hover:text-soul-primary-text transition-gentle"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="soul-card p-4 rounded-2xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        </div>
      )}

      <RichTextEditor
        onSave={handleSave}
        onCancel={() => router.back()}
      />

      {loading && (
        <div className="text-center text-soul-primary-text/70">
          Saving your entry...
        </div>
      )}
    </div>
  );
}
