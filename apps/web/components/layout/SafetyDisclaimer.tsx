"use client";

import { useState } from "react";

export function SafetyDisclaimer() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 p-3 bg-soul-surface/90 backdrop-blur rounded-t-2xl border-t border-soul-primary/30 text-center text-sm text-soul-primary-text/90">
      <p>
        SoulSync is not a medical or therapeutic tool. If you&apos;re in distress,
        please reach out to a qualified professional.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-2 text-soul-primary-text/70 underline hover:no-underline transition-gentle"
      >
        Dismiss
      </button>
    </footer>
  );
}
