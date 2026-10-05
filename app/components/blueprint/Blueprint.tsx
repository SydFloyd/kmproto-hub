"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { BlueprintNavigator } from "./model";
import { BlueprintRenderer } from "./renderer";
import "../ripple-tank/ripple-tank.css";
import "./blueprint.css";

export default function Blueprint() {
  const panel = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<BlueprintRenderer | null>(null);
  const reduced = useRef(false), paused = useRef(false);
  const touch = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [depth, setDepth] = useState(0), [kind, setKind] = useState("circuit");
  const [expanded, setExpanded] = useState(false), [fallback, setFallback] = useState(false);

  const announce = () => {
    const model = renderer.current?.model;
    if (model) { setDepth(model.path.length); setKind(model.world.kind); }
  };
  useEffect(() => {
    const surface = canvas.current, instrument = panel.current;
    if (!surface || !instrument) return;
    const context = surface.getContext("2d");
    if (!context) return;
    const view = new BlueprintRenderer(surface, context, new BlueprintNavigator());
    renderer.current = view;
    let animation = 0, last = 0, visible = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => { reduced.current = media.matches; if (media.matches && view.model.transition) view.model.advance(1); view.draw(); announce(); };
    preference(); media.addEventListener("change", preference);
    const resize = new ResizeObserver(() => view.resize()); resize.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; }); visibility.observe(instrument);
    const tabVisibility = () => { last = 0; };
    document.addEventListener("visibilitychange", tabVisibility);
    const frame = (now: number) => {
      const moving = view.model.transition || (!reduced.current && !paused.current);
      if (visible && !document.hidden && moving) {
        if (!last) last = now;
        const elapsed = now - last;
        if (elapsed >= 1000 / 30 - 0.5) {
          const finished = view.model.advance(Math.min(elapsed / 1000, 0.1));
          view.draw(); last = now;
          if (finished) announce();
        }
      } else last = 0;
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(animation); resize.disconnect(); visibility.disconnect(); document.removeEventListener("visibilitychange", tabVisibility); media.removeEventListener("change", preference); renderer.current = null; };
  }, []);

  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!fallback) return;
    const overflow = document.body.style.overflow, restoreFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>(".ripple-fullscreen")?.focus();
    const keys = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { setFallback(false); setExpanded(false); }
      if (event.key !== "Tab") return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>("canvas, button") || []), first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keys); restoreFocus?.focus({ preventScroll: true }); };
  }, [fallback]);

  const fullScreen = async () => {
    if (fallback) { setFallback(false); setExpanded(false); return; }
    if (document.fullscreenElement === panel.current) { await document.exitFullscreen(); return; }
    try { if (!panel.current?.requestFullscreen) throw new Error("Unavailable"); await panel.current.requestFullscreen(); }
    catch { setFallback(true); setExpanded(true); }
  };
  const navigate = (action: "dive" | "back" | "surface", id = 4) => {
    const view = renderer.current;
    if (!view) return;
    const immediate = reduced.current;
    const changed = action === "dive" ? view.model.dive(id, immediate) : view.model[action](immediate);
    if (changed) { view.draw(); if (action === "surface") canvas.current?.focus({ preventScroll: true }); if (immediate) announce(); }
  };
  const coordinates = (event: MouseEvent<HTMLCanvasElement> | PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "mouse") {
      if (touch.current && Math.hypot(event.clientX - touch.current.x, event.clientY - touch.current.y) > 8) touch.current.moved = true;
      return;
    }
    const view = renderer.current;
    if (!view) return;
    const p = coordinates(event), hit = view.hit(p.x, p.y);
    event.currentTarget.style.cursor = hit < 0 ? "default" : "pointer";
    if (view.model.selected !== hit) { view.model.selected = hit; view.draw(); }
  };
  const click = (event: MouseEvent<HTMLCanvasElement>) => {
    if (touch.current?.moved) { touch.current = null; return; }
    touch.current = null;
    const p = coordinates(event), hit = renderer.current?.hit(p.x, p.y) ?? -1;
    if (hit >= 0) navigate("dive", hit);
  };
  const keys = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const view = renderer.current;
    if (!view) return;
    if (view.model.transition) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Backspace"].includes(event.key)) event.preventDefault();
      return;
    }
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const current = view.model.selected < 0 ? 4 : view.model.selected;
      const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0,
        dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      view.model.selected = Math.max(0, Math.min(2, Math.floor(current / 3) + dy)) * 3 + Math.max(0, Math.min(2, current % 3 + dx));
      view.draw();
    } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("dive", view.model.selected < 0 ? 4 : view.model.selected); }
    else if (event.key === "Backspace" || (event.key === "Escape" && !expanded)) { event.preventDefault(); navigate("back"); }
    else if (event.key.toLowerCase() === "p") { event.preventDefault(); paused.current = !paused.current; }
  };

  return <div ref={panel} className={`ripple-instrument blueprint-instrument${fallback ? " ripple-immersive" : ""}`} aria-label="Infinite blueprint">
    <canvas ref={canvas} tabIndex={0} aria-label={`Interactive ${kind} drawing, level ${depth}. Click a component to explore inside. With the keyboard, use arrow keys to select, Enter or Space to dive, Backspace to go back, and P to pause or resume.`}
      onPointerMove={move} onPointerDown={event => { touch.current = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY, moved: false }; }}
      onPointerCancel={() => { if (touch.current) touch.current.moved = true; }} onClick={click}
      onPointerLeave={() => { const view = renderer.current; if (view) { view.model.selected = -1; view.draw(); } }} onKeyDown={keys}
      onFocus={() => { const view = renderer.current; if (view && view.model.selected < 0) { view.model.selected = 4; view.draw(); } }}
      onBlur={() => { const view = renderer.current; if (view) { view.model.selected = -1; view.draw(); } }}>
      A nested technical illustration: circuits contain street plans, buildings contain machines, and machines contain circuits.
    </canvas>
    <span className="blueprint-status" role="status">{depth ? `${kind === "city" ? "Street plan" : kind === "machine" ? "Machine" : "Circuit"}, level ${depth}.` : "Circuit, surface."}</span>
    {depth > 0 && <button type="button" className="blueprint-surface" onClick={() => navigate("surface")} aria-label="Return to the surface">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true"><path d="M8 12V4m-4 4 4-4 4 4M3 2h10" /></svg>surface
    </button>}
    <button type="button" className="ripple-fullscreen" onClick={fullScreen} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
        <path d={expanded ? "M2 7h5V2m6 0v5h5M2 13h5v5m6 0v-5h5" : "M7 2H2v5m11-5h5v5M2 13v5h5m6 0h5v-5"} />
      </svg>
    </button>
  </div>;
}
