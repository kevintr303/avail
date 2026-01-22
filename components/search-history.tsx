"use client";

import { useEffect, useState } from "react";
import { CheckHistory, DomainCheckResult } from "@/types";
import { storage } from "@/lib/storage";
import { SEARCH_CONFIG } from "@/config/constants";

interface SearchHistoryProps {
  refresh: number;
  onResultClick: (result: DomainCheckResult) => void;
}

export default function SearchHistory({ refresh, onResultClick }: SearchHistoryProps) {
  const [history, setHistory] = useState<CheckHistory[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setHistory(storage.getHistory());
    }, 0);
  }, [refresh]);

  const handleClear = () => {
    storage.clearHistory();
    setHistory([]);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (history.length === 0) return null;

  return (
    <div className="border-t border-white/5 p-3 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <button
          data-clickable
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
        >
          <svg
            className={`w-2.5 h-2.5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          History
        </button>
        <button
          data-clickable
          onClick={handleClear}
          className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
        >
          Clear
        </button>
      </div>
      {!isCollapsed && (
        <div className="space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin">
          {history.slice(0, SEARCH_CONFIG.maxHistoryDisplay).map((item, index) => (
            <div key={index}>
              <button
                data-clickable
                onClick={() => setExpanded(expanded === index ? null : index)}
                className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">{item.query}</span>
                  <div className="flex gap-0.5">
                    {item.results.slice(0, SEARCH_CONFIG.maxHistoryDots).map((result, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          result.error
                            ? "bg-yellow-400"
                            : result.available
                              ? "bg-green-400"
                              : "bg-red-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/20">{formatTime(item.timestamp)}</span>
                  <svg
                    className={`w-2.5 h-2.5 text-white/20 transition-transform duration-200 ${expanded === index ? "rotate-90" : ""}`}
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
                </div>
              </button>
              {expanded === index && (
                <div className="pl-2 py-1 space-y-0.5 animate-slide-down">
                  {item.results.map((result, i) => (
                    <button
                      key={i}
                      data-clickable
                      onClick={() => onResultClick(result)}
                      className="w-full flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="text-[11px] text-white/60">{result.domain}</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            result.error
                              ? "bg-yellow-400"
                              : result.available
                                ? "bg-green-400"
                                : "bg-red-400"
                          }`}
                        />
                        <svg
                          className="w-2.5 h-2.5 text-white/15"
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
