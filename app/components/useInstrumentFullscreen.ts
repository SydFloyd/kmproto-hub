import { useEffect, useState } from "react";
import type { RefObject } from "react";

export function useInstrumentFullscreen(panel: RefObject<HTMLDivElement | null>) {
  const [expanded, setExpanded] = useState(false), [fallback, setFallback] = useState(false);
  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, [panel]);
  useEffect(() => {
    if (!fallback) return;
    const overflow = document.body.style.overflow, restoreFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>(".ripple-fullscreen")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setFallback(false); setExpanded(false); }
      if (event.key !== "Tab") return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>("canvas, button") || []), first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keys); restoreFocus?.focus({ preventScroll: true }); };
  }, [fallback, panel]);
  const toggle = async () => {
    if (fallback) { setFallback(false); setExpanded(false); return; }
    if (document.fullscreenElement === panel.current) { await document.exitFullscreen(); return; }
    try { if (!panel.current?.requestFullscreen) throw new Error("Unavailable"); await panel.current.requestFullscreen(); }
    catch { setFallback(true); setExpanded(true); }
  };
  return { expanded, fallback, toggle };
}
