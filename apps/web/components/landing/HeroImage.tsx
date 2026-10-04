"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const UNSPLASH_IMAGES = [
  { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", alt: "Calm mountains and lake" },
  { src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop", alt: "Serene misty landscape" },
  { src: "https://images.unsplash.com/photo-1469474968028-56643f7b42f8?w=600&h=400&fit=crop", alt: "Peaceful forest and hills" },
  { src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop", alt: "Sunlit path in nature" },
  { src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=400&fit=crop", alt: "Lake and evergreen trees" },
];

export function HeroImage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const i = Math.floor(Math.random() * UNSPLASH_IMAGES.length);
    setIndex(i);
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % UNSPLASH_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const { src, alt } = UNSPLASH_IMAGES[index];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg bg-slate-100 aspect-[3/2] max-w-md">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 500px"
      />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur rounded-b-2xl">
        <p className="text-slate-700 text-sm">
          &ldquo;The morning sunlight feels like a fresh start today. I&apos;m feeling grateful.&rdquo;
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">
            Personal reflection
          </span>
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}
