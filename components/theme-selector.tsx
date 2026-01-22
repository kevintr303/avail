"use client";

import { useEffect, useState } from "react";
import { themes, applyTheme } from "@/lib/theme";
import { storage } from "@/lib/storage";

export default function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      const saved = storage.getTheme();
      setSelectedTheme(saved);
      applyTheme(themes[saved]);
      window.dispatchEvent(new CustomEvent("themechange", { detail: { themeIndex: saved } }));
    }, 0);
  }, []);

  const handleThemeChange = (index: number) => {
    setSelectedTheme(index);
    storage.setTheme(index);
    applyTheme(themes[index]);
    window.dispatchEvent(new CustomEvent("themechange", { detail: { themeIndex: index } }));
    setOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      <button
        data-clickable
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 glass-effect rounded-lg px-2.5 py-1.5 transition-all"
        style={
          {
            background: "var(--panel-bg)",
          } as React.CSSProperties
        }
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--panel-hover-bg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--panel-bg)";
        }}
      >
        <div className="flex gap-0.5">
          {Object.values(themes[selectedTheme].colors).map((color, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        <svg
          className={`w-3 h-3 text-accessible-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 glass-effect-strong rounded-lg p-1.5 animate-slide-down z-50">
            {themes.map((theme, index) => (
              <button
                key={index}
                data-clickable
                onClick={() => handleThemeChange(index)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-all"
                style={{
                  background: selectedTheme === index ? "var(--panel-hover-bg)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (selectedTheme !== index) {
                    e.currentTarget.style.background = "var(--panel-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTheme !== index) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div className="flex gap-0.5">
                  {Object.values(theme.colors).map((color, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {selectedTheme === index && (
                  <svg
                    className="w-3 h-3 text-[var(--color-quinary)] ml-auto"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
