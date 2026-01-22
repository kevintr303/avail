"use client";

import { ReactNode } from "react";

interface SafariWindowProps {
  url: string;
  title?: string;
  closable?: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export default function SafariWindow({
  url,
  closable = false,
  onClose,
  children,
  className,
}: SafariWindowProps) {
  return (
    <div className={`safari-window overflow-hidden flex flex-col h-full ${className || ""}`}>
      <div className="safari-toolbar px-3 py-2 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          {closable ? (
            <button
              data-clickable
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all group relative"
            >
              <svg
                className="w-1.5 h-1.5 absolute inset-0 m-auto text-[#4a0000] opacity-0 group-hover:opacity-100 transition-opacity"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]/50" />
          )}
          <div className="w-3 h-3 rounded-full bg-[#febc2e]/50" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]/50" />
        </div>
        <div className="flex-1 mx-2 min-w-0">
          <div className="safari-address-bar px-3 py-1 flex items-center justify-center min-w-0">
            <svg
              className="w-2.5 h-2.5 mr-1.5 text-white/30 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-[11px] text-white/40 truncate min-w-0">{url}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
