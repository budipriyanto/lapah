"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchContextValue {
  inputValue: string;
  query: string;
  setInputValue: (v: string) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [inputValue, setInputValue] = useState("");
  const query = useDebounce(inputValue, 300);

  function clearSearch() {
    setInputValue("");
  }

  return (
    <SearchContext.Provider
      value={{ inputValue, query, setInputValue, clearSearch }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}
