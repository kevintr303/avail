"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { DomainCheckResult } from "@/types";
import { storage } from "@/lib/storage";
import SearchHistory from "@/components/search-history";
import SafariWindow from "@/components/safari-window";
import { SEARCH_CONFIG, ANIMATION_CONFIG } from "@/config/constants";

interface DomainSearchPanelProps {
  onResultClick: (result: DomainCheckResult) => void;
}

const MAX_SELECTED_TLDS = 10;

export default function DomainSearchPanel({ onResultClick }: DomainSearchPanelProps) {
  const [domain, setDomain] = useState("");
  const [selectedTlds, setSelectedTlds] = useState<string[]>([]);
  const [results, setResults] = useState<DomainCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showTldPicker, setShowTldPicker] = useState(false);
  const [tlds, setTlds] = useState<string[]>([]);
  const [popularTlds, setPopularTlds] = useState<string[]>([]);
  const [tldSearchQuery, setTldSearchQuery] = useState("");
  const [loadingTlds, setLoadingTlds] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const tldSearchRef = useRef<HTMLInputElement>(null);

  const apiBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  useEffect(() => {
    const fetchTlds = async () => {
      try {
        const response = await fetch(`${apiBasePath}/api/tlds`);
        const data = await response.json();
        const fetchedTlds = data.tlds || [];
        const fetchedPopular = data.popular || [];

        setTlds(fetchedTlds);
        setPopularTlds(fetchedPopular);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch TLDs:", error);
        }
        setTlds(SEARCH_CONFIG.defaultTlds);
        setPopularTlds(SEARCH_CONFIG.defaultTlds);
      } finally {
        setLoadingTlds(false);
      }
    };

    fetchTlds();

    const saved = storage.getTlds();
    setSelectedTlds(saved.length > 0 ? saved.slice(0, MAX_SELECTED_TLDS) : []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleTldToggle = (tld: string) => {
    setSelectedTlds((prev) => {
      if (prev.includes(tld)) {
        const updated = prev.filter((t) => t !== tld);
        storage.setTlds(updated);
        return updated;
      } else {
        if (prev.length >= MAX_SELECTED_TLDS) {
          return prev;
        }
        const updated = [...prev, tld];
        storage.setTlds(updated);
        return updated;
      }
    });
  };

  const handleSelectPopular = () => {
    const popular = popularTlds.slice(0, MAX_SELECTED_TLDS);
    setSelectedTlds(popular);
    storage.setTlds(popular);
  };

  const handleSelectNone = () => {
    setSelectedTlds([]);
    storage.setTlds([]);
  };

  const handleSearch = async () => {
    if (!domain.trim()) return;

    const cleanedInput = domain
      .trim()
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, "");

    const parts = cleanedInput.split(".");
    const hasTld = parts.length > 1;

    let searchDomain: string;
    let searchTlds: string[];

    if (hasTld) {
      let foundTld = "";
      let domainParts: string[] = [];
      
      for (let i = parts.length - 1; i >= 1; i--) {
        const potentialTld = parts.slice(i).join(".");
        if (tlds.includes(potentialTld)) {
          foundTld = potentialTld;
          domainParts = parts.slice(0, i);
          break;
        }
      }

      if (foundTld) {
        searchDomain = domainParts.join(".");
        searchTlds = [foundTld];
      } else {
        searchDomain = parts.slice(0, -1).join(".");
        const tld = parts.slice(-1)[0];
        searchTlds = [tld];
      }
    } else {
      if (selectedTlds.length === 0) return;
      searchDomain = cleanedInput;
      searchTlds = selectedTlds;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch(`${apiBasePath}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: searchDomain, tlds: searchTlds }),
      });

      const data = await response.json();
      setResults(data.results || []);

      storage.addToHistory({
        timestamp: Date.now(),
        query: hasTld ? cleanedInput : searchDomain,
        results: data.results || [],
      });

      setHistoryRefresh((prev) => prev + 1);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafariWindow url="avail.bow.red">
      <div className="h-full flex flex-col">
        <div className="p-4 space-y-3 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                id="domain-input"
                name="domain"
                type="text"
                placeholder="Domain name..."
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[var(--color-quinary)]/50 focus:ring-[var(--color-quinary)]/20 h-10 text-sm pl-3 pr-10 rounded-lg transition-all"
              />
              {domain && (
                <button
                  data-clickable
                  onClick={() => setDomain("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <button
              data-clickable
              onClick={handleSearch}
              disabled={loading || !domain.trim() || (!domain.includes(".") && selectedTlds.length === 0)}
              className="h-10 px-4 rounded-lg bg-[var(--color-quinary)] text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-30 flex items-center gap-1.5 shrink-0"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-clickable
              onClick={() => {
                setShowTldPicker(!showTldPicker);
                if (!showTldPicker) {
                  setTimeout(() => tldSearchRef.current?.focus(), 100);
                }
              }}
              className="text-[11px] text-white/35 hover:text-white/55 transition-colors flex items-center gap-1.5 px-2 py-1 glass-effect rounded-md"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showTldPicker ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-medium">
                {selectedTlds.length}/{MAX_SELECTED_TLDS} TLDs
              </span>
            </button>
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {selectedTlds.map((tld) => (
                <button
                  key={tld}
                  data-clickable
                  onClick={() => handleTldToggle(tld)}
                  className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-quinary)]/20 text-[var(--color-quinary)] border border-[var(--color-quinary)]/30 hover:bg-[var(--color-quinary)]/30 transition-all flex items-center gap-1 group"
                >
                  <span>.{tld}</span>
                  <svg
                    className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {showTldPicker && (
            <div className="glass-effect-strong rounded-lg p-3 animate-slide-down space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white/60">Select Extensions</span>
                <div className="flex gap-2">
                  <button
                    data-clickable
                    onClick={handleSelectPopular}
                    className="text-[10px] text-[var(--color-quinary)] hover:underline px-2 py-0.5"
                  >
                    Popular
                  </button>
                  <button
                    data-clickable
                    onClick={handleSelectNone}
                    className="text-[10px] text-white/30 hover:underline px-2 py-0.5"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Input
                  ref={tldSearchRef}
                  type="text"
                  placeholder="Search TLDs..."
                  value={tldSearchQuery}
                  onChange={(e) => setTldSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[var(--color-quinary)]/50 focus:ring-[var(--color-quinary)]/20 h-8 text-xs pl-2.5 pr-8 rounded-md transition-all"
                />
                {tldSearchQuery && (
                  <button
                    data-clickable
                    onClick={() => setTldSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {loadingTlds ? (
                <div className="flex items-center justify-center py-4">
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[var(--color-quinary)] animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[var(--color-quinary)] animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[var(--color-quinary)] animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                  {(() => {
                    const filtered = tlds.filter((tld) =>
                      tld.toLowerCase().includes(tldSearchQuery.toLowerCase())
                    );

                    const popular = filtered.filter((tld) => popularTlds.includes(tld));
                    const others = filtered.filter((tld) => !popularTlds.includes(tld));

                    return (
                      <>
                        {popular.length > 0 && (
                          <div>
                            <div className="text-[10px] text-white/40 mb-1.5 px-1">Popular</div>
                            <div className="flex flex-wrap gap-1.5">
                              {popular.map((tld) => {
                                const isSelected = selectedTlds.includes(tld);
                                const isDisabled =
                                  !isSelected && selectedTlds.length >= MAX_SELECTED_TLDS;
                                return (
                                  <button
                                    key={tld}
                                    data-clickable
                                    onClick={() => !isDisabled && handleTldToggle(tld)}
                                    disabled={isDisabled}
                                    className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all ${isSelected
                                      ? "bg-[var(--color-quinary)]/20 text-[var(--color-quinary)] border border-[var(--color-quinary)]/30"
                                      : isDisabled
                                        ? "bg-white/3 text-white/15 border border-white/5 cursor-not-allowed"
                                        : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white/60"
                                      }`}
                                  >
                                    .{tld}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {others.length > 0 && (
                          <div>
                            {popular.length > 0 && (
                              <div className="text-[10px] text-white/40 mb-1.5 px-1 mt-3">
                                All TLDs
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              {others.map((tld) => {
                                const isSelected = selectedTlds.includes(tld);
                                const isDisabled =
                                  !isSelected && selectedTlds.length >= MAX_SELECTED_TLDS;
                                return (
                                  <button
                                    key={tld}
                                    data-clickable
                                    onClick={() => !isDisabled && handleTldToggle(tld)}
                                    disabled={isDisabled}
                                    className={`text-[11px] px-2.5 py-1.5 rounded-md transition-all ${isSelected
                                      ? "bg-[var(--color-quinary)]/20 text-[var(--color-quinary)] border border-[var(--color-quinary)]/30"
                                      : isDisabled
                                        ? "bg-white/3 text-white/15 border border-white/5 cursor-not-allowed"
                                        : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white/60"
                                      }`}
                                  >
                                    .{tld}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {filtered.length === 0 && (
                          <div className="text-center py-4 text-white/30 text-xs">
                            No TLDs found
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {selectedTlds.length >= MAX_SELECTED_TLDS && (
                <div className="text-[10px] text-yellow-400/70 text-center pt-1 border-t border-white/5">
                  Maximum {MAX_SELECTED_TLDS} TLDs selected. Remove one to add another.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {loading && (
            <div className="p-6 flex items-center justify-center animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-quinary)] animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-quinary)] animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-quinary)] animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-xs text-white/40">Checking...</span>
              </div>
            </div>
          )}

          {results.length > 0 && !loading && (
            <div className="px-4 pb-3 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-white/30">
                  {results.filter((r) => r.available && !r.error).length}/{results.length} available
                </span>
              </div>
              <div className="space-y-1">
                {results.map((result, index) => (
                  <button
                    key={index}
                    data-clickable
                    onClick={() => onResultClick(result)}
                    className="hover-lift w-full glass-effect rounded-lg p-2.5 flex items-center justify-between group result-stagger text-left"
                    style={{ animationDelay: `${index * ANIMATION_CONFIG.staggerDelay}ms` }}
                  >
                    <span className="text-xs font-medium text-white/80">{result.domain}</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${result.error
                          ? "bg-yellow-400"
                          : result.available
                            ? "bg-green-400"
                            : "bg-red-400"
                          }`}
                      />
                      <svg
                        className="w-3 h-3 text-white/15 group-hover:text-white/40 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center text-white/15">
                <svg
                  className="w-10 h-10 mx-auto mb-2 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <p className="text-[11px]">Search for a domain</p>
              </div>
            </div>
          )}
        </div>

        <SearchHistory refresh={historyRefresh} onResultClick={onResultClick} />
      </div>
    </SafariWindow>
  );
}
