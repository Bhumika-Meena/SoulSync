"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JournalPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/journal/new");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-soul-primary-text/70">Redirecting to editor...</p>
    </div>
  );
}
