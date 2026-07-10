"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function ScrollSection({
  sectionRef,
  title,
  children,
}: {
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  title: string;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollWidth > el.clientWidth);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  return (
    <section ref={sectionRef} className="mb-8">
      <div className="mb-3 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-lg font-bold text-[#1a1a1a]">{title}</h2>
        </div>
      </div>
      <div className="px-4 sm:px-6">
        <div className="relative mx-auto max-w-5xl">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
          >
            {children}
          </div>
          {canScrollLeft && (
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
              className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-white via-white/80 to-transparent flex items-center justify-start pl-2 cursor-pointer"
            >
              <svg className="w-5 h-5 text-[#737373] rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
              className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end pr-2 cursor-pointer"
            >
              <svg className="w-5 h-5 text-[#737373]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
