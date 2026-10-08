"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function fetchBookmarks() {
      try {
        const res = await fetch("/api/bookmarks");
        if (res.status === 401) {
          if (!cancelled) setBookmarks(new Set());
          return;
        }
        const data = await res.json();
        if (!cancelled && data.success) {
          const ids = new Set<string>(
            data.data.map((b: { destination_id: string }) => b.destination_id)
          );
          setBookmarks(ids);
        }
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
      }
    }

    fetchBookmarks();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isBookmarked = useCallback(
    (destinationId: string): boolean => !!user && bookmarks.has(destinationId),
    [user, bookmarks]
  );

  const toggleBookmark = async (destinationId: string): Promise<boolean> => {
    try {
      const isCurrentlyBookmarked = bookmarks.has(destinationId);
      const method = isCurrentlyBookmarked ? "DELETE" : "POST";
      const url =
        method === "DELETE"
          ? `/api/bookmarks?destinationId=${encodeURIComponent(destinationId)}`
          : "/api/bookmarks";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify({ destinationId }) : undefined,
      });

      if (response.status === 401) {
        return false;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle bookmark");
      }

      setBookmarks((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyBookmarked) {
          newSet.delete(destinationId);
        } else {
          newSet.add(destinationId);
        }
        return newSet;
      });

      return true;
    } catch (error) {
      console.error("Toggle bookmark error:", error);
      return false;
    }
  };

  const toggle = toggleBookmark;

  return {
    bookmarks: [...bookmarks],
    isBookmarked,
    toggleBookmark,
    toggle,
  };
}
