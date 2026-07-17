"use client";

import { useMemo, useState } from "react";
import type { DestinationImage } from "@/utils/supabase/types";
import DestinationCard from "@/components/DestinationCard";
import PageHeader from "@/components/PageHeader";
import { useDestinationsByCategory, useDestinationImages } from "@/hooks/useSupabaseQuery";
import { useSearchContext } from "@/contexts/SearchContext";
import { useBookmarks } from "@/hooks/useBookmarks";

function filterBySearch(dest: { title: string; location?: string | null }, q: string) {
  if (!q) return true;
  const query = q.toLowerCase();
  return (
    dest.title.toLowerCase().includes(query) ||
    dest.location?.toLowerCase().includes(query)
  );
}

export default function CategoryPage({
  category,
}: {
  category: "wisata" | "kuliner" | "penginapan";
}) {
  const { query } = useSearchContext();
  const { data: destinations, isLoading: destLoading } = useDestinationsByCategory(category);
  const { data: images } = useDestinationImages();
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const { isBookmarked } = useBookmarks();

  const imagesByDestination = useMemo(() => {
    if (!images) return new Map<string, DestinationImage[]>();
    const map = new Map<string, DestinationImage[]>();
    for (const img of images) {
      const existing = map.get(img.destination_id);
      if (existing) {
        existing.push(img);
      } else {
        map.set(img.destination_id, [img]);
      }
    }
    return map;
  }, [images]);

  const subcategories = useMemo(() => {
    if (!destinations) return [];
    const set = new Set<string>();
    for (const d of destinations) {
      if (d.subcategory) set.add(d.subcategory);
    }
    return [...set].sort();
  }, [destinations]);

  const filtered = useMemo(
    () =>
      (destinations ?? []).filter(
        (d) =>
          filterBySearch(d, query) &&
          (activeSubcategory === null || d.subcategory === activeSubcategory)
      ),
    [destinations, query, activeSubcategory]
  );

  const titles: Record<string, string> = { wisata: "Wisata", kuliner: "Kuliner", penginapan: "Penginapan" };
  const colors: Record<string, string> = { wisata: "blue", kuliner: "orange", penginapan: "rose" };
  const icons: Record<string, string> = { wisata: "🏖️", kuliner: "🍜", penginapan: "🛏️" };
  const title = titles[category];
  const color = colors[category] as "blue" | "orange" | "rose";
  const icon = icons[category];

  if (destLoading) {
    return (
      <div className="py-6">
        <PageHeader title={title} color={color} icon={icon} />
        <div className="mb-6 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-zinc-200" />
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="aspect-[4/3] bg-zinc-200" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-zinc-200" />
                  <div className="h-3 w-1/3 rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <PageHeader title={title} color={color} icon={icon} />
      <div className="mb-6 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {subcategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveSubcategory(null)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeSubcategory === null
                    ? "bg-[#0066cc] text-white"
                    : "bg-zinc-100 text-[#737373] hover:bg-zinc-200"
                }`}
              >
                Semua
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubcategory(sub)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    activeSubcategory === sub
                      ? "bg-[#0066cc] text-white"
                      : "bg-zinc-100 text-[#737373] hover:bg-zinc-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-16 text-center text-[#737373]">
            <p className="text-lg font-medium">
              Belum ada destinasi {title.toLowerCase()}
            </p>
            <p className="mt-1 text-sm">
              Coba ubah kata kunci pencarian
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 pb-6">
          <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4">
            {filtered.map((dest) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                images={imagesByDestination.get(dest.id) ?? []}
                isBookmarked={isBookmarked(dest.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
