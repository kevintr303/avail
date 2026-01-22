"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CURSOR_CONFIG } from "@/config/constants";

export default function CustomCursor() {
  const pathname = usePathname();
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hasMouse, setHasMouse] = useState(false);
  const [visible, setVisible] = useState(false);
  const posRef = useRef({ mouseX: 0, mouseY: 0, trailX: 0, trailY: 0, initialized: false });

  const isDocsPage = pathname === "/api/docs";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    if (mediaQuery.matches) {
      setTimeout(() => {
        setHasMouse(true);
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (isDocsPage) {
      const el = document.getElementById("cursor-hide");
      if (el) el.remove();
    }
  }, [isDocsPage]);

  useEffect(() => {
    if (!hasMouse || isDocsPage) return;

    const cursor = cursorRef.current;
    const trail = trailRef.current;
    if (!cursor || !trail) return;

    let animationId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!posRef.current.initialized) {
        posRef.current.trailX = e.clientX;
        posRef.current.trailY = e.clientY;
        posRef.current.mouseX = e.clientX;
        posRef.current.mouseY = e.clientY;
        posRef.current.initialized = true;
        setVisible(true);
      } else {
        posRef.current.mouseX = e.clientX;
        posRef.current.mouseY = e.clientY;
      }
    };

    const handleMouseDown = () => setClicking(true);
    const handleMouseUp = () => setClicking(false);

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("[data-clickable]");
      setHovering(!!isInteractive);
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = (e: MouseEvent) => {
      if (posRef.current.initialized) {
        posRef.current.mouseX = e.clientX;
        posRef.current.mouseY = e.clientY;
        setVisible(true);
      }
    };

    const animate = () => {
      const { mouseX, mouseY } = posRef.current;
      posRef.current.trailX += (mouseX - posRef.current.trailX) * CURSOR_CONFIG.trailSmoothing;
      posRef.current.trailY += (mouseY - posRef.current.trailY) * CURSOR_CONFIG.trailSmoothing;

      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      trail.style.transform = `translate3d(${posRef.current.trailX}px, ${posRef.current.trailY}px, 0)`;

      animationId = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseover", handleMouseOver);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);
    animationId = requestAnimationFrame(animate);

    const styleEl = document.createElement("style");
    styleEl.id = "cursor-hide";
    styleEl.textContent = "*, *::before, *::after { cursor: none !important; }";
    document.head.appendChild(styleEl);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseover", handleMouseOver);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(animationId);
      const el = document.getElementById("cursor-hide");
      if (el) el.remove();
    };
  }, [hasMouse, isDocsPage]);

  if (!hasMouse || isDocsPage) return null;

  const trailSize = hovering ? CURSOR_CONFIG.trailSizeHover : CURSOR_CONFIG.trailSize;
  const trailOpacity = hovering ? CURSOR_CONFIG.trailOpacityHover : CURSOR_CONFIG.trailOpacity;

  return (
    <>
      <div
        ref={trailRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        style={{
          willChange: "transform",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        <div
          style={{
            width: `${trailSize}px`,
            height: `${trailSize}px`,
            marginLeft: `${-trailSize / 2}px`,
            marginTop: `${-trailSize / 2}px`,
            borderRadius: "50%",
            border: `1.5px solid rgba(255, 255, 255, ${trailOpacity})`,
            transition:
              "width 0.3s ease, height 0.3s ease, margin 0.3s ease, border-color 0.3s ease",
          }}
        />
      </div>
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          willChange: "transform",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        <div
          style={{
            width: `${CURSOR_CONFIG.cursorSize}px`,
            height: `${CURSOR_CONFIG.cursorSize}px`,
            marginLeft: `${-CURSOR_CONFIG.cursorSize / 2}px`,
            marginTop: `${-CURSOR_CONFIG.cursorSize / 2}px`,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.4)",
            transform: clicking ? "scale(0.7)" : "scale(1)",
            transition: "transform 0.12s ease",
          }}
        />
      </div>
    </>
  );
}
