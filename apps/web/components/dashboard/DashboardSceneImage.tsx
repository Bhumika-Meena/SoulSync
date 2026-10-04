"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const UNSPLASH_SCENES = [
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&h=800&fit=crop",
    alt: "Calm mountains and lake",
  },
  {
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1400&h=800&fit=crop",
    alt: "Serene misty landscape",
  },
  {
    src: "https://images.unsplash.com/photo-1469474968028-56643f7b42f8?w=1400&h=800&fit=crop",
    alt: "Peaceful forest and hills",
  },
  {
    src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1400&h=800&fit=crop",
    alt: "Lake and evergreen trees",
  },
];

export function DashboardSceneImage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * UNSPLASH_SCENES.length));
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % UNSPLASH_SCENES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const img = UNSPLASH_SCENES[index];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 aspect-[16/9]">
      <Image
        src={img.src}
        alt={img.alt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 900px"
        priority
      />
    </div>
  );
}

