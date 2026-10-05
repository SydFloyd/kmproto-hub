"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { RippleField, STEP } from "./field";
import "./ripple-tank.css";

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
    <path d={expanded ? "M2 7h5V2m6 0v5h5M2 13h5v5m6 0v-5h5" : "M7 2H2v5m11-5h5v5M2 13v5h5m6 0h5v-5"} />
  </svg>;
}

export default function RippleTank() {
  const panel = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<RippleField | null>(null);
  const repaint = useRef<(() => void) | null>(null);
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const keyboard = useRef({ x: 0.5, y: 0.5, visible: false });
  const pausedRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const surface = canvas.current, instrument = panel.current;
    if (!surface || !instrument) return;
    const context = surface.getContext("2d");
    if (!context) return;
    let animation = 0, last = 0, accumulator = 0, visible = true, width = 0, height = 0;
    let atlas: HTMLCanvasElement | null = null;
    let cell = 8, ratio = 1;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const setReduced = () => {
      pausedRef.current = media.matches;
    };
    setReduced();
    media.addEventListener("change", setReduced);

    const draw = () => {
      const water = field.current;
      if (!water || !atlas) return;
      context.clearRect(0, 0, surface.width, surface.height);
      const tile = Math.ceil(cell * ratio * 1.8);
      const offsetX = (width - water.columns * cell) / 2;
      const offsetY = (height - water.rows * cell) / 2;
      for (let y = 0; y < water.rows; y++) for (let x = 0; x < water.columns; x++) {
        const i = y * water.columns + x;
        const tide = water.ambient(x, y);
        const value = water.mask[i] ? tide : water.height[i] + tide;
        const energy = Math.abs(value) + water.reveal[i] * 1.1;
        const glyph = energy < 0.013 ? 0 : energy < 0.035 ? 1 : energy < 0.09 ? 2 : energy < 0.23 ? 3 : 4;
        const ink = Math.min(15, Math.floor(energy * 18 + 1.2 + water.reveal[i] * 8));
        context.drawImage(atlas, glyph * tile, ink * tile, tile, tile,
          (offsetX + x * cell - cell * 0.4) * ratio, (offsetY + y * cell - cell * 0.4) * ratio, tile, tile);
      }
      if (keyboard.current.visible) {
        context.font = `${12 * ratio}px monospace`;
        context.fillStyle = "#234e70";
        const x = keyboard.current.x * width * ratio, y = keyboard.current.y * height * ratio;
        for (const [dx, dy] of [[-12, 0], [12, 0], [0, -12], [0, 12]]) context.fillText(":", x + dx * ratio, y + dy * ratio);
      }
    };
    repaint.current = draw;

    const resize = () => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width; height = bounds.height;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      cell = Math.max(7.6, Math.sqrt(width * height / 15500));
      const columns = Math.floor(width / cell), rows = Math.floor(height / cell);
      const old = field.current;
      const water = new RippleField(columns, rows);
      // Resizing or entering full screen carries the same water into its new grid.
      if (old) {
        for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
          const i = y * columns + x;
          const j = Math.min(old.rows - 1, Math.floor(y * old.rows / rows)) * old.columns + Math.min(old.columns - 1, Math.floor(x * old.columns / columns));
          if (!water.mask[i] && !old.mask[j]) { water.height[i] = old.height[j]; water.previous[i] = old.previous[j]; }
          if (water.mask[i] && old.mask[j]) water.reveal[i] = old.reveal[j];
        }
        water.time = old.time;
      } else if (!media.matches) water.drop(0.24, 0.56, 0.45);
      field.current = water;
      const tile = Math.ceil(cell * ratio * 1.8);
      atlas = document.createElement("canvas"); atlas.width = tile * 5; atlas.height = tile * 16;
      const ink = atlas.getContext("2d")!;
      ink.font = `${Math.min(12, cell * 1.38) * ratio}px "Courier New", monospace`;
      ink.textAlign = "center"; ink.textBaseline = "middle";
      for (let shade = 0; shade < 16; shade++) {
        const mix = shade / 15;
        ink.fillStyle = `rgb(${Math.round(173 - mix * 142)}, ${Math.round(186 - mix * 134)}, ${Math.round(196 - mix * 126)})`;
        for (const [glyph, mark] of ["·", ",", ":", "~", "≈"].entries()) ink.fillText(mark, (glyph + 0.5) * tile, (shade + 0.5) * tile);
      }
      draw();
    };
    const observer = new ResizeObserver(resize); observer.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; accumulator = 0; });
    visibility.observe(instrument);
    const frame = (now: number) => {
      if (visible && !document.hidden && !pausedRef.current) {
        accumulator += last ? Math.min((now - last) / 1000, 0.05) : 0;
        while (accumulator >= STEP) { field.current?.step(); accumulator -= STEP; }
        draw();
      } else accumulator = 0;
      last = now;
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animation); observer.disconnect(); visibility.disconnect();
      media.removeEventListener("change", setReduced); repaint.current = null; field.current = null;
    };
  }, []);

  useEffect(() => {
    const changed = () => { setExpanded(document.fullscreenElement === panel.current); pointer.current = null; };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  useEffect(() => {
    if (!fallback) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { setFallback(false); setExpanded(false); } };
    const instrument = panel.current;
    const restoreFocus = document.activeElement as HTMLElement | null;
    instrument?.querySelector<HTMLButtonElement>(".ripple-fullscreen")?.focus();
    const trap = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(instrument?.querySelectorAll<HTMLElement>("button, canvas") || []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", escape); document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); document.removeEventListener("keydown", trap); restoreFocus?.focus(); };
  }, [fallback]);

  const fullScreen = async () => {
    if (fallback) { setFallback(false); setExpanded(false); return; }
    if (document.fullscreenElement === panel.current) { await document.exitFullscreen(); return; }
    try {
      if (!panel.current?.requestFullscreen) throw new Error("Unavailable");
      await panel.current.requestFullscreen();
    } catch { setFallback(true); setExpanded(true); }
  };

  const drop = (x = 0.5, y = 0.5) => {
    field.current?.drop(x, y);
    if (pausedRef.current) { for (let i = 0; i < 12; i++) field.current?.step(); repaint.current?.(); }
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)), id: event.pointerId };
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "mouse" && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const next = point(event), previous = pointer.current;
    keyboard.current.visible = false;
    if (previous && previous.id === next.id) {
      const dx = next.x - previous.x, dy = next.y - previous.y;
      const distance = Math.hypot(dx * (field.current?.columns || 1), dy * (field.current?.rows || 1));
      const samples = Math.min(90, Math.ceil(distance));
      for (let i = 1; i <= samples; i++) field.current?.wake(previous.x + dx * i / samples, previous.y + dy * i / samples, dx / samples, dy / samples);
      if (pausedRef.current) for (let i = 0; i < 6; i++) field.current?.step();
    }
    pointer.current = next;
    if (pausedRef.current) repaint.current?.();
  };
  const keys = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const location = keyboard.current;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const old = { ...location };
      location.x = Math.max(0.04, Math.min(0.96, location.x + (event.key === "ArrowLeft" ? -0.025 : event.key === "ArrowRight" ? 0.025 : 0)));
      location.y = Math.max(0.04, Math.min(0.96, location.y + (event.key === "ArrowUp" ? -0.025 : event.key === "ArrowDown" ? 0.025 : 0)));
      location.visible = true;
      field.current?.wake(location.x, location.y, location.x - old.x, location.y - old.y);
      if (pausedRef.current) for (let i = 0; i < 6; i++) field.current?.step();
      repaint.current?.();
    } else if (event.key === " " || event.key === "Enter") { event.preventDefault(); drop(location.x, location.y); }
    else if (event.key.toLowerCase() === "p") { event.preventDefault(); pausedRef.current = !pausedRef.current; }
  };

  return <div ref={panel} className={`ripple-instrument${fallback ? " ripple-immersive" : ""}`} aria-label="ASCII ripple tank">
      <canvas ref={canvas} tabIndex={0} aria-label="Interactive water. Move your pointer or drag to stir; click or tap to drop a pebble. With the keyboard, use arrow keys to move, Space or Enter to drop, and P to pause or resume."
        onPointerMove={move} onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); pointer.current = point(event); drop(pointer.current.x, pointer.current.y); }}
        onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (event.pointerType !== "mouse") pointer.current = null; }}
        onPointerLeave={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }} onKeyDown={keys}
        onFocus={() => { keyboard.current.visible = true; repaint.current?.(); }} onBlur={() => { keyboard.current.visible = false; repaint.current?.(); }}>
        Interactive punctuation water with a submerged KM monogram.
      </canvas>
      <button type="button" className="ripple-fullscreen" onClick={fullScreen} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}><ExpandIcon expanded={expanded} /></button>
  </div>;
}
