"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { useAgentChat } from "@/lib/hooks/useAgentChat";
import { AgentThreadList } from "./AgentThreadList";
import { AgentMessageBubble } from "./AgentMessageBubble";
import type { ConversationThreadResponseDTO } from "@soulsync/contracts";

interface AgentChatContainerProps {
  initialThreads?: ConversationThreadResponseDTO[];
}

export function AgentChatContainer({ initialThreads = [] }: AgentChatContainerProps) {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [threads, setThreads] = useState<ConversationThreadResponseDTO[]>(initialThreads);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    threadId,
    isStreaming,
    isLoadingThread,
    currentActivity,
    pendingApproval,
    error,
    sendMessage,
    approveAction,
    stop,
    switchThread,
    clearError,
  } = useAgentChat();

  // Scroll to bottom when messages change or activity updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentActivity]);

  // Load threads on mount if not provided
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function fetchThreads() {
      setLoadingThreads(true);
      try {
        const fetched = await api.agent.listThreads({ token });
        if (isMounted) setThreads(fetched);
      } catch (e) {
        console.error("Failed to fetch threads:", e);
      } finally {
        if (isMounted) setLoadingThreads(false);
      }
    }

    if (initialThreads.length === 0) {
      fetchThreads();
    }

    return () => {
      isMounted = false;
    };
  }, [token, initialThreads.length]);

  // When a new thread is created by the agent, refresh the thread list
  useEffect(() => {
    if (!token || !threadId) return;

    const exists = threads.some((t) => t.id === threadId);
    if (!exists) {
      api.agent
        .listThreads({ token })
        .then((fetched) => setThreads(fetched))
        .catch(() => {});
    }
  }, [threadId, token, threads]);

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row h-[82vh] max-h-[850px]">
      {/* Sidebar Thread List */}
      <AgentThreadList
        threads={threads}
        activeThreadId={threadId}
        onSelectThread={(tId) => switchThread(tId)}
        onNewThread={() => switchThread(null)}
        isLoading={loadingThreads}
      />

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Header */}
        <header className="p-4 sm:px-6 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Dashboard
              </Link>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <span>Wellness Companion</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
            </h2>
            <p className="text-xs text-slate-500">
              Private, reflective space attuned to your wellbeing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/guide-settings"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Preferences
            </Link>
          </div>
        </header>

        {/* Messages Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoadingThread ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
              Loading conversation history...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl shadow-xs">
                ✦
              </div>
              <h3 className="text-base font-bold text-slate-800">
                How can I support your wellbeing today?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                I can help you reflect on your recent journal entries, explore emotional patterns, or guide you toward healthy, sustainable goals.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => sendMessage("How has my emotional trend looked over the past week?")}
                  className="text-xs bg-white hover:bg-amber-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  &quot;Check my emotional trend&quot;
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage("I would like to set a daily evening walk goal.")}
                  className="text-xs bg-white hover:bg-amber-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  &quot;Set an evening walk goal&quot;
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage("Reflect on what I wrote in my recent journal entries.")}
                  className="text-xs bg-white hover:bg-amber-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  &quot;Review recent journal thoughts&quot;
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <AgentMessageBubble
                  key={m.id}
                  message={m}
                  onConfirmApproval={(actId) => approveAction(actId, true)}
                  onDeclineApproval={(actId) => approveAction(actId, false)}
                  isApprovalSubmitting={isStreaming}
                />
              ))}

              {/* Streaming active tool indicator (if no message bubble has claimed it yet) */}
              {isStreaming && currentActivity && currentActivity.status === "running" && (
                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100/70 border border-amber-200/80 px-3 py-1.5 rounded-full w-fit animate-pulse">
                  <span className="font-bold">✦</span>
                  <span>{currentActivity.message || "Companion is reflecting..."}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error Notification Bar */}
        {error && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="font-bold hover:text-rose-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Footer */}
        <footer className="p-4 sm:px-6 bg-white border-t border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={isStreaming}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 focus:bg-white text-sm transition-all disabled:opacity-60"
              placeholder={
                isStreaming
                  ? "Companion is responding..."
                  : "Share a thought, feeling, or reflection..."
              }
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="px-4 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors shrink-0"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim()}
                className="w-11 h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
                aria-label="Send message"
              >
                ➤
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 text-center sm:text-left">
            Your companion draws context from your journal reflections and emotion patterns safely.
          </p>
        </footer>
      </div>
    </div>
  );
}
