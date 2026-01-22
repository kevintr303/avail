"use client";

import { DomainCheckResult } from "@/types";
import SafariWindow from "@/components/safari-window";

interface WhoisPanelProps {
  result: DomainCheckResult;
  onClose: () => void;
}

export default function WhoisPanel({ result, onClose }: WhoisPanelProps) {
  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .replace(/_/g, " ");
  };

  const renderValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <SafariWindow url={`whois.com/${result.domain}`} closable onClose={onClose}>
      <div className="h-full overflow-y-auto scrollbar-thin p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                result.error ? "bg-yellow-400" : result.available ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <h3 className="text-sm font-semibold truncate text-white">{result.domain}</h3>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
              result.error
                ? "bg-yellow-500/20 text-yellow-300"
                : result.available
                  ? "bg-green-500/20 text-green-300"
                  : "bg-red-500/20 text-red-300"
            }`}
          >
            {result.error ? "Error" : result.available ? "Available" : "Taken"}
          </span>
        </div>

        {result.whoisData && Object.keys(result.whoisData).length > 0 ? (
          <div className="space-y-0.5">
            {Object.entries(result.whoisData)
              .filter(([, value]) => value !== null && value !== undefined && value !== "")
              .map(([key, value], index) => (
                <div
                  key={key}
                  className="py-1.5 px-2 rounded hover:bg-white/5 transition-colors result-stagger"
                  style={{ animationDelay: `${index * 15}ms` }}
                >
                  <div className="text-[10px] text-white/35 font-medium mb-0.5">
                    {formatKey(key)}
                  </div>
                  <div className="text-xs text-white/80 break-all leading-relaxed">
                    {renderValue(value)}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[calc(100%-60px)]">
            <div className="text-center text-white/30">
              <svg
                className="w-8 h-8 mx-auto mb-2 opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <p className="text-xs">No WHOIS data</p>
              <p className="text-[10px] mt-1 text-white/20">Domain may be available</p>
            </div>
          </div>
        )}
      </div>
    </SafariWindow>
  );
}
