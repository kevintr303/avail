"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ThemeSelector from "@/components/theme-selector";
import DomainSearchPanel from "@/components/domain-search-panel";
import WhoisPanel from "@/components/whois-panel";
import SplitLayout from "@/components/split-layout";
import { DomainCheckResult } from "@/types";
import { WINDOW_CONFIG } from "@/config/constants";

interface WhoisWindow {
  id: string;
  result: DomainCheckResult;
}

export default function DomainChecker() {
  const [whoisWindows, setWhoisWindows] = useState<WhoisWindow[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const newKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < WINDOW_CONFIG.mobileBreakpoint;
      setIsMobile(mobile);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleResultClick = useCallback((result: DomainCheckResult) => {
    setWhoisWindows((prev) => {
      const existing = prev.find((w) => w.result.domain === result.domain);

      if (existing) {
        const idx = prev.indexOf(existing) + 1;
        setMobileActiveIndex(idx);
        return prev;
      }

      const id = `whois-${result.domain}`;
      newKeysRef.current.add(id);
      setNewKeys(new Set(newKeysRef.current));
      setTimeout(() => {
        newKeysRef.current.delete(id);
        setNewKeys(new Set(newKeysRef.current));
      }, 600);

      setMobileActiveIndex(prev.length + 1);
      return [...prev, { id, result }];
    });
  }, []);

  const handleCloseWhois = useCallback((id: string) => {
    setWhoisWindows((prev) => {
      const closingIndex = prev.findIndex((w) => w.id === id);
      const newWindows = prev.filter((w) => w.id !== id);

      setMobileActiveIndex((current) => {
        const panelIndex = closingIndex + 1;
        if (current >= panelIndex) {
          return Math.max(0, current - 1);
        }
        return current;
      });

      return newWindows;
    });
  }, []);

  const handleMobileNavigate = useCallback((index: number) => {
    setMobileActiveIndex(index);
  }, []);

  const panels = [
    {
      key: "search",
      node: <DomainSearchPanel onResultClick={handleResultClick} />,
    },
    ...whoisWindows.map((w) => ({
      key: w.id,
      node: <WhoisPanel result={w.result} onClose={() => handleCloseWhois(w.id)} />,
    })),
  ];

  return (
    <div
      className="w-full flex flex-col gap-3"
      style={{
        height: `calc(100vh - ${WINDOW_CONFIG.windowPadding} * 2)`,
      }}
    >
      <div className="flex items-center justify-between animate-fade-in shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: "var(--color-quinary)" }}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                color: "var(--color-icon-text)",
                opacity: "var(--color-icon-text-opacity)",
              }}
            >
              <g transform="translate(56, 56) scale(0.8)">
                <path
                  d="M100 400 L250 50"
                  stroke="currentColor"
                  strokeWidth="60"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M250 50 L400 400"
                  stroke="currentColor"
                  strokeWidth="60"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M140 250 L250 320 L420 150"
                  stroke="currentColor"
                  strokeWidth="60"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </div>
          <div>
            <h1
              className="text-base font-semibold leading-tight"
              style={{
                color: "var(--color-text)",
                opacity: "var(--color-text-opacity)",
              }}
            >
              Avail
            </h1>
            <p
              className="text-[10px] hidden sm:block"
              style={{
                color: "var(--color-text-muted)",
                opacity: "var(--color-text-muted-opacity)",
              }}
            >
              Domain Availability Checker
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {whoisWindows.length > 0 && (
            <button
              data-clickable
              onClick={() => {
                setWhoisWindows([]);
                setMobileActiveIndex(0);
              }}
              className="text-[10px] transition-colors px-2 py-1 glass-effect rounded-md"
              style={{
                color: "var(--color-text-muted)",
                opacity: "var(--color-text-muted-opacity)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "var(--color-text-muted-opacity)";
              }}
            >
              Close all ({whoisWindows.length})
            </button>
          )}
          <a
            href="https://github.com/kevintr303/avail"
            target="_blank"
            rel="noopener noreferrer"
            data-clickable
            className="text-[10px] transition-colors hidden sm:flex items-center gap-1"
            style={{
              color: "var(--color-text-muted)",
              opacity: "var(--color-text-muted-opacity)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "var(--color-text-muted-opacity)";
            }}
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            BOW.RED
          </a>
          <ThemeSelector />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <SplitLayout
          panels={panels}
          newKeys={newKeys}
          isMobile={isMobile}
          mobileActiveIndex={mobileActiveIndex}
          onMobileNavigate={handleMobileNavigate}
        />
      </div>
    </div>
  );
}
