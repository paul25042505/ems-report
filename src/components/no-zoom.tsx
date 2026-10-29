"use client";

import { useEffect } from "react";

/** iOS Safari 會忽略 viewport 的 user-scalable=no，另外攔截雙指縮放手勢 */
export function NoZoom() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("touchmove", preventPinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("touchmove", preventPinch);
    };
  }, []);
  return null;
}
