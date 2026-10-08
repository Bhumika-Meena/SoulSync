"use client";

import type { ConversationThreadResponseDTO } from "@soulsync/contracts";

interface AgentThreadListProps {
  threads: ConversationThreadResponseDTO[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string | null) => void;
  onNewThread: () => void;
  isLoading?: boolean;
}

export function AgentThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  isLoading = false,
}: AgentThreadListProps) {
  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200/80 p-4 shrink-0">
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Reflections</h3>
          <p className="text-xs text-slate-500">Conversation history</p>
        </div>
        <button
          type="button"
          onClick={onNewThread}
          className="inline-flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors shadow-xs"
        >
          <span>+</span>
          <span>New</span>
        </button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 max-h-[220px] md:max-h-[600px] pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            Loading conversations...
          </div>
        ) : threads.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 leading-relaxed px-2">
            No previous reflections yet. Start a new conversation with your companion.
          </div>
        ) : (
          threads.map((t) => {
            const isActive = t.id === activeThreadId;
            const updatedDate = new Date(t.updatedAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectThread(t.id)}
                className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 border ${
                  isActive
                    ? "bg-amber-100/80 border-amber-300/80 text-slate-900 font-semibold shadow-xs"
                    : "bg-white/60 hover:bg-white border-transparent text-slate-700 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate flex-1">
                    {t.title || "Wellness Reflection"}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                    {updatedDate}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
