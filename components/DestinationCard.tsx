"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Destination, DestinationImage } from "@/utils/types";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface DestinationCardProps {
  destination: Destination;
  images: DestinationImage[];
  isBookmarked?: boolean;
  compact?: boolean;
  priority?: boolean;
}

function getHeroImages(images: DestinationImage[]): string[] {
  const heroes = images.filter((img) => img.is_hero).map((img) => img.image_url);
  return heroes.length > 0 ? heroes : images.map((img) => img.image_url);
}

export default function DestinationCard({
  destination,
  images,
  isBookmarked = false,
  compact = false,
  priority = false,
}: DestinationCardProps) {
  const heroImages = useMemo(() => getHeroImages(images), [images]);
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [imgIndex, setImgIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const useFallback = imgFailed || heroImages.length === 0;
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [heroImages.length]);

  if (compact) {
    return (
      <Link
        href={`/destinasi/${destination.slug}`}
        className="group w-56 shrink-0 snap-start overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md"
      >
        <div suppressHydrationWarning className="relative aspect-[3/2] overflow-hidden bg-zinc-100">
          {useFallback ? (
            <Image
              src="/lamtim.jpeg"
              alt={destination.title}
              fill
              className="object-cover"
              sizes="224px"
              priority={priority}
            />
          ) : mounted && heroImages.length > 1 ? (
            heroImages.map((url, i) => (
              <Image
                key={i}
                src={url}
                alt={destination.title}
                fill
                onError={() => setImgFailed(true)}
                className={`object-cover transition-all duration-500 ${
                  i === imgIndex ? "opacity-100" : "opacity-0"
                } group-hover:scale-105`}
                sizes="224px"
                priority={priority}
              />
            ))
          ) : (
            <Image
              src={heroImages[0]}
              alt={destination.title}
              fill
              onError={() => setImgFailed(true)}
              className="object-cover group-hover:scale-105"
              sizes="224px"
              priority={priority}
            />
          )}
          {isBookmarked && (
            <div className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#0066cc"
                stroke="#0066cc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="text-sm font-semibold text-[#1a1a1a] truncate leading-tight">
            {destination.title}
          </h3>
          {destination.location && (
            <p className="mt-0.5 text-xs text-[#737373] truncate">
              {destination.location}
            </p>
          )}
          {destination.review_count > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[#737373]">
              <svg className="shrink-0 text-amber-500" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="font-medium text-[#1a1a1a]">
                {Number(destination.rating_avg).toFixed(1)}
              </span>
              <span>({destination.review_count} ulasan)</span>
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/destinasi/${destination.slug}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div suppressHydrationWarning className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        {useFallback ? (
          <Image
            src="/lamtim.jpeg"
            alt={destination.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        ) : mounted && heroImages.length > 1 ? (
          heroImages.map((url, i) => (
            <Image
              key={i}
              src={url}
              alt={destination.title}
              fill
              onError={() => setImgFailed(true)}
              className={`object-cover transition-all duration-500 ${
                i === imgIndex ? "opacity-100" : "opacity-0"
              } group-hover:scale-105`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
            />
          ))
        ) : (
          <Image
            src={heroImages[0]}
            alt={destination.title}
            fill
            onError={() => setImgFailed(true)}
            className="object-cover group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        )}
        {isBookmarked && (
          <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#0066cc"
              stroke="#0066cc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[#1a1a1a] truncate">
          {destination.title}
        </h3>
        {destination.location && (
          <p className="mt-0.5 text-sm text-[#737373]">
            {destination.location}
          </p>
        )}
        {destination.review_count > 0 && (
          <p className="mt-1 flex items-center gap-1 text-sm text-[#737373]">
            <svg className="shrink-0 text-amber-500" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="font-medium text-[#1a1a1a]">
              {Number(destination.rating_avg).toFixed(1)}
            </span>
            <span>({destination.review_count} ulasan)</span>
          </p>
        )}
      </div>
    </Link>
  );
}
