"use client";

import { ReactNode, useRef, useState, useEffect, useCallback } from "react";
import { ANIMATION_CONFIG, WINDOW_CONFIG } from "@/config/constants";

interface PanelEntry {
  key: string;
  node: ReactNode;
}

interface SplitLayoutProps {
  panels: PanelEntry[];
  newKeys: Set<string>;
  isMobile: boolean;
  mobileActiveIndex: number;
  onMobileNavigate: (index: number) => void;
}

interface PanelRect {
  left: string;
  top: string;
  width: string;
  height: string;
}

function computeLayout(count: number, gap: number): PanelRect[] {
  if (count === 0) return [];

  const g = gap;
  const halfG = g / 2;

  if (count === 1) {
    return [{ left: "0px", top: "0px", width: "100%", height: "100%" }];
  }

  if (count === 2) {
    return [
      { left: "0px", top: "0px", width: `calc(50% - ${halfG}px)`, height: "100%" },
      {
        left: `calc(50% + ${halfG}px)`,
        top: "0px",
        width: `calc(50% - ${halfG}px)`,
        height: "100%",
      },
    ];
  }

  if (count === 3) {
    return [
      { left: "0px", top: "0px", width: `calc(50% - ${halfG}px)`, height: "100%" },
      {
        left: `calc(50% + ${halfG}px)`,
        top: "0px",
        width: `calc(50% - ${halfG}px)`,
        height: `calc(50% - ${halfG}px)`,
      },
      {
        left: `calc(50% + ${halfG}px)`,
        top: `calc(50% + ${halfG}px)`,
        width: `calc(50% - ${halfG}px)`,
        height: `calc(50% - ${halfG}px)`,
      },
    ];
  }

  if (count === 4) {
    return [
      {
        left: "0px",
        top: "0px",
        width: `calc(50% - ${halfG}px)`,
        height: `calc(50% - ${halfG}px)`,
      },
      {
        left: `calc(50% + ${halfG}px)`,
        top: "0px",
        width: `calc(50% - ${halfG}px)`,
        height: `calc(50% - ${halfG}px)`,
      },
      {
        left: "0px",
        top: `calc(50% + ${halfG}px)`,
        width: `calc(50% - ${halfG}px)`,
        height: `calc(50% - ${halfG}px)`,
      },
      {
        left: `calc(50% + ${halfG}px)`,
        top: `calc(50% + ${halfG}px)`,
        width: `calc(50% - ${halfG}px)`,
        height: `calc(50% - ${halfG}px)`,
      },
    ];
  }

  const rects: PanelRect[] = [];

  rects.push({
    left: "0px",
    top: "0px",
    width: `calc(50% - ${halfG}px)`,
    height: `calc(50% - ${halfG}px)`,
  });

  const calculateRowWindows = (
    windowCount: number,
    baseLeft: string,
    topPosition: string,
    hasLeftGap: boolean = false,
    hasRightGap: boolean = false
  ) => {
    const leftEdgeGap = hasLeftGap ? halfG : 0;
    const rightEdgeGap = hasRightGap ? halfG : 0;
    const gapsBetween = g * (windowCount - 1);
    const totalGaps = gapsBetween + leftEdgeGap + rightEdgeGap;

    for (let i = 0; i < windowCount; i++) {
      const cellWidth = `calc((50% - ${totalGaps}px) / ${windowCount})`;
      const leftOffset =
        i === 0
          ? baseLeft
          : `calc(${baseLeft} + ${(i * 50) / windowCount}% - ${(i * totalGaps) / windowCount}px + ${i * g}px)`;

      rects.push({
        left: leftOffset,
        top: topPosition,
        width: cellWidth,
        height: `calc(50% - ${halfG}px)`,
      });
    }
  };

  const remainingCount = count - 1;

  const panelsPerArea = Math.ceil(remainingCount / 3);
  const topRightCount = Math.min(panelsPerArea, remainingCount);
  const remainingAfterTopRight = remainingCount - topRightCount;
  const bottomLeftCount = Math.ceil(remainingAfterTopRight / 2);
  const bottomRightCount = remainingAfterTopRight - bottomLeftCount;

  if (topRightCount > 0) {
    calculateRowWindows(topRightCount, `calc(50% + ${halfG}px)`, "0px", false, false);
  }

  if (bottomLeftCount > 0) {
    calculateRowWindows(
      bottomLeftCount,
      "0px",
      `calc(50% + ${halfG}px)`,
      false,
      bottomRightCount > 0
    );
  }

  if (bottomRightCount > 0) {
    calculateRowWindows(
      bottomRightCount,
      `calc(50% + ${halfG}px)`,
      `calc(50% + ${halfG}px)`,
      false,
      false
    );
  }

  return rects;
}

export default function SplitLayout({
  panels,
  newKeys,
  isMobile,
  mobileActiveIndex,
  onMobileNavigate,
}: SplitLayoutProps) {
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0, isDragging: false });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clampedIndex = Math.min(mobileActiveIndex, panels.length - 1);

  useEffect(() => {
    if (mobileActiveIndex >= panels.length && panels.length > 0) {
      onMobileNavigate(panels.length - 1);
    }
  }, [panels.length, mobileActiveIndex, onMobileNavigate]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current.startX = e.touches[0].clientX;
    touchRef.current.startY = e.touches[0].clientY;
    touchRef.current.startTime = Date.now();
    touchRef.current.isDragging = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchRef.current.startX;
      const deltaY = e.touches[0].clientY - touchRef.current.startY;

      if (!touchRef.current.isDragging) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          touchRef.current.isDragging = true;
          setIsDragging(true);
        } else {
          return;
        }
      }

      if (touchRef.current.isDragging) {
        let bounded = deltaX;
        if (clampedIndex === 0 && deltaX > 0) {
          bounded = deltaX * 0.2;
        }
        if (clampedIndex === panels.length - 1 && deltaX < 0) {
          bounded = deltaX * 0.2;
        }
        setDragOffset(bounded);
      }
    },
    [clampedIndex, panels.length]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current.isDragging) {
      setIsDragging(false);
      return;
    }

    const elapsed = Date.now() - touchRef.current.startTime;
    const velocity = Math.abs(dragOffset) / Math.max(elapsed, 1);

    if (
      dragOffset < -ANIMATION_CONFIG.swipeThreshold ||
      (dragOffset < 0 && velocity > ANIMATION_CONFIG.swipeVelocityThreshold)
    ) {
      if (clampedIndex < panels.length - 1) {
        onMobileNavigate(clampedIndex + 1);
      }
    } else if (
      dragOffset > ANIMATION_CONFIG.swipeThreshold ||
      (dragOffset > 0 && velocity > ANIMATION_CONFIG.swipeVelocityThreshold)
    ) {
      if (clampedIndex > 0) {
        onMobileNavigate(clampedIndex - 1);
      }
    }

    setDragOffset(0);
    setIsDragging(false);
    touchRef.current.isDragging = false;
  }, [dragOffset, clampedIndex, panels.length, onMobileNavigate]);

  if (isMobile) {
    return (
      <div className="h-full w-full flex flex-col">
        <div
          className="flex-1 min-h-0 overflow-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {panels.map((panel, index) => {
            const offset = (index - clampedIndex) * 100;
            return (
              <div
                key={panel.key}
                className="absolute inset-0"
                style={{
                  transform: `translate3d(calc(${offset}% + ${dragOffset}px), 0, 0)`,
                  transition: isDragging
                    ? "none"
                    : `transform ${ANIMATION_CONFIG.resizeDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
              >
                <div className="h-full w-full p-8">{panel.node}</div>
              </div>
            );
          })}
        </div>
        {panels.length > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-1.5 py-2">
            {panels.map((panel, index) => (
              <button
                key={panel.key}
                data-clickable
                onClick={() => onMobileNavigate(index)}
                className={`transition-all duration-300 rounded-full ${
                  clampedIndex === index
                    ? "w-6 h-2 bg-[var(--color-quinary)]"
                    : "w-2 h-2 bg-white/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const gap = parseInt(WINDOW_CONFIG.gapBetweenPanels);
  const layout = computeLayout(panels.length, gap);

  return (
    <div className="h-full w-full relative">
      {panels.map((panel, index) => {
        const rect = layout[index];
        if (!rect) return null;
        const isNew = newKeys.has(panel.key);

        return (
          <PanelBox key={panel.key} rect={rect} isNew={isNew}>
            {panel.node}
          </PanelBox>
        );
      })}
    </div>
  );
}

function PanelBox({
  rect,
  isNew,
  children,
}: {
  rect: PanelRect;
  isNew: boolean;
  children: ReactNode;
}) {
  const [shouldPopIn, setShouldPopIn] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isNew && !hasAnimated.current) {
      setTimeout(() => {
        setShouldPopIn(true);
      }, 0);
      hasAnimated.current = true;
    }
  }, [isNew]);

  const handleAnimationEnd = () => {
    setShouldPopIn(false);
  };

  const transitionValue = `left ${ANIMATION_CONFIG.resizeDuration}ms cubic-bezier(0.16, 1, 0.3, 1), top ${ANIMATION_CONFIG.resizeDuration}ms cubic-bezier(0.16, 1, 0.3, 1), width ${ANIMATION_CONFIG.resizeDuration}ms cubic-bezier(0.16, 1, 0.3, 1), height ${ANIMATION_CONFIG.resizeDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`;

  return (
    <div
      className={`absolute ${shouldPopIn ? "animate-window-in" : ""}`}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        transition: shouldPopIn ? "none" : transitionValue,
      }}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}
