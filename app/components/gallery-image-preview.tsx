"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImagePreviewProps = {
  alt: string;
  className?: string;
  sizes: string;
  src: string;
};

export function GalleryImagePreview({
  alt,
  className = "",
  sizes,
  src,
}: GalleryImagePreviewProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f8efe9] px-5 text-center text-sm font-medium text-[#8c5751]">
        Preview unavailable
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => setHasError(true)}
      sizes={sizes}
      src={src}
      unoptimized
    />
  );
}
