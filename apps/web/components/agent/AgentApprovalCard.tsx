"use client";

import type { PendingApproval } from "@/lib/hooks/useAgentChat";

interface AgentApprovalCardProps {
  approval: PendingApproval;
  onConfirm: () => void;
  onDecline: () => void;
  isSubmitting?: boolean;
}

export function AgentApprovalCard({
  approval,
  onConfirm,
  onDecline,
  isSubmitting = false,
}: AgentApprovalCardProps) {
  const { proposedAction, message } = approval;
  const title = (proposedAction?.title as string) || "New Wellness Goal";
  const description = proposedAction?.description as string | undefined;
  const targetDate = proposedAction?.targetDate as string | undefined;

  return (
    <div className="mt-3 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 sm:p-5 shadow-sm text-slate-800">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-400/90 text-slate-900 flex items-center justify-center font-bold text-sm shrink-0">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
              Action Approval Required
            </span>
          </div>

          <h4 className="mt-2 text-base font-bold text-slate-900">
            {title}
          </h4>

          {description && (
            <p className="mt-1 text-sm text-slate-700 leading-relaxed">
              {description}
            </p>
          )}

          {targetDate && (
            <p className="mt-1 text-xs text-slate-500">
              Target date: {new Date(targetDate).toLocaleDateString()}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-500 italic">
            {message || "Would you like me to activate this wellness goal for you?"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Activating..." : "Confirm & Activate"}
            </button>
            <button
              type="button"
              onClick={onDecline}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
