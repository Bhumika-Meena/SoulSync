"use client";

import type { AgentChatMessage } from "@/lib/hooks/useAgentChat";
import { AgentApprovalCard } from "./AgentApprovalCard";

interface AgentMessageBubbleProps {
  message: AgentChatMessage;
  onConfirmApproval?: (actionId: string) => void;
  onDeclineApproval?: (actionId: string) => void;
  isApprovalSubmitting?: boolean;
}

/**
 * Format internal tool identifiers into safe, user-friendly activity labels.
 * Strictly prevents exposure of private implementation details or raw CoT.
 */
function getSafeToolLabel(tool: string, message?: string): string {
  if (message && !message.includes("{") && !message.includes("userId")) {
    return message;
  }
  switch (tool) {
    case "search_memory":
      return "Reflecting on past memories";
    case "get_emotion_trends":
      return "Checking emotional trends";
    case "get_recent_journal_entries":
      return "Reviewing recent journal reflections";
    case "create_wellness_goal":
      return "Creating wellness goal";
    default:
      return "Processing reflection";
  }
}

function speakIfPossible(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  if (synth.speaking) {
    synth.cancel();
    return;
  }
  const clean = text.replace(/[*_#`~]/g, "");
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1;
  utterance.pitch = 1.02;
  synth.speak(utterance);
}

export function AgentMessageBubble({
  message,
  onConfirmApproval,
  onDeclineApproval,
  isApprovalSubmitting = false,
}: AgentMessageBubbleProps) {
  const isUser = message.role === "user";
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%] ml-auto">
        <div className="rounded-2xl rounded-tr-sm bg-amber-100 text-slate-900 px-4 py-3 text-sm leading-relaxed shadow-xs">
          {message.content}
        </div>
        <span className="text-[11px] text-slate-400 mr-1">{formattedTime}</span>
      </div>
    );
  }

  // Assistant message bubble
  return (
    <div className="flex flex-col items-start gap-1 max-w-[92%] sm:max-w-[82%] mr-auto">
      <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200/80 text-slate-800 p-4 sm:p-5 text-sm leading-relaxed shadow-sm space-y-3 w-full">
        {/* Safe Tool Activities */}
        {message.activity && message.activity.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-100">
            {message.activity.map((act, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                  act.status === "running"
                    ? "bg-amber-100 text-amber-900 animate-pulse"
                    : act.status === "failed"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-50 text-slate-600 border border-slate-200"
                }`}
              >
                <span className="text-amber-500 font-bold">✦</span>
                <span>{getSafeToolLabel(act.tool, act.message)}</span>
                {act.status === "completed" && (
                  <span className="text-emerald-600 text-[11px] font-bold">✓</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Message content or streaming indicator */}
        {message.content ? (
          <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
            {message.content}
          </div>
        ) : message.status === "streaming" ? (
          <div className="flex items-center gap-2 text-slate-500 italic py-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Companion is reflecting...</span>
          </div>
        ) : null}

        {/* Error state */}
        {message.status === "error" && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-xs">
            {message.content || "An error occurred while generating a response."}
          </div>
        )}

        {/* Human-in-the-Loop pending approval card */}
        {message.approval && (
          <AgentApprovalCard
            approval={message.approval}
            onConfirm={() => onConfirmApproval?.(message.approval!.actionId)}
            onDecline={() => onDeclineApproval?.(message.approval!.actionId)}
            isSubmitting={isApprovalSubmitting}
          />
        )}

        {/* Footer controls: speech playback & timestamp */}
        {message.status === "complete" && message.content && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => speakIfPossible(message.content)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
              title="Read aloud"
            >
              <span>🔊</span>
              <span>Listen</span>
            </button>
            <span>{formattedTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}
