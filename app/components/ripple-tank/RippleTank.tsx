"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { PoolController } from "./controller";
import type { WaterMode } from "./controller";
import { useInstrumentFullscreen } from "../useInstrumentFullscreen";
import "./ripple-tank.css";

export default function RippleTank() {
  const panel = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<PoolController | null>(null);
  const [mode, setMode] = useState<WaterMode>("gpu");
  const { expanded, fallback, toggle } = useInstrumentFullscreen(panel);

  useEffect(() => {
    const surface = canvas.current, instrument = panel.current, zone = stage.current;
    if (!surface || !instrument || !zone) return;
    let pool: PoolController;
    try { pool = new PoolController(surface, instrument, zone, mode, setMode); }
    catch (error) {
      if (mode === "local") return;
      const retry = requestAnimationFrame(() => setMode(error instanceof Error && error.message === "worker" ? "local" : mode === "gpu" ? "worker" : mode === "worker" ? "canvas" : "local"));
      return () => cancelAnimationFrame(retry);
    }
    controller.current = pool;
    const hero = instrument.closest(".hero") || instrument;
    let press: { id: number; x: number; y: number; time: number; moved: boolean } | null = null;
    const control = (event: PointerEvent) => (event.target as Element)?.closest("a,button,input,select,textarea");
    const move = (event: Event) => {
      const e = event as PointerEvent;
      if (!e.isPrimary) return;
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.moved = true;
      const touchWake = e.pointerType === "touch" && press?.id === e.pointerId
        && (document.fullscreenElement === instrument || instrument.classList.contains("ripple-immersive"));
      if (e.pointerType === "mouse" || e.pointerType === "pen" || touchWake) pool.move(pool.point(e.clientX, e.clientY));
    };
    const down = (event: Event) => {
      const e = event as PointerEvent;
      if (!e.isPrimary || e.button !== 0 || control(e)) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now(), moved: false };
      pool.cursor.visible = false;
      if (e.pointerType !== "touch") pool.drop(pool.point(e.clientX, e.clientY));
      else if (document.fullscreenElement === instrument || instrument.classList.contains("ripple-immersive")) pool.move(pool.point(e.clientX, e.clientY));
    };
    const up = (event: Event) => {
      const e = event as PointerEvent;
      if (press?.id === e.pointerId && e.pointerType === "touch" && !press.moved && performance.now() - press.time < 600 && !control(e)) pool.drop(pool.point(e.clientX, e.clientY));
      press = null;
      if (e.pointerType !== "mouse") pool.leave();
    };
    const leave = () => { press = null; pool.leave(); };
    const handlers = { pointermove: move, pointerdown: down, pointerup: up, pointerleave: leave, pointercancel: leave };
    for (const [name, handler] of Object.entries(handlers)) hero.addEventListener(name, handler, { passive: true });
    return () => {
      for (const [name, handler] of Object.entries(handlers)) hero.removeEventListener(name, handler);
      pool.dispose(); controller.current = null;
    };
  }, [mode]);
  useEffect(() => { controller.current?.leave(); controller.current?.requestResize(); }, [expanded]);

  const keys = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const pool = controller.current; if (!pool) return;
    const p = pool.cursor;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); pool.move({ x: p.x, y: p.y });
      p.x = Math.max(0.04, Math.min(0.96, p.x + (event.key === "ArrowLeft" ? -0.025 : event.key === "ArrowRight" ? 0.025 : 0)));
      p.y = Math.max(0.04, Math.min(0.96, p.y + (event.key === "ArrowUp" ? -0.025 : event.key === "ArrowDown" ? 0.025 : 0)));
      pool.move({ x: p.x, y: p.y }); p.visible = true; pool.repaint();
    } else if (event.key === " " || event.key === "Enter") { event.preventDefault(); pool.drop(p); }
    else if (event.key.toLowerCase() === "p") { event.preventDefault(); pool.setPaused(!pool.paused); }
  };
  return <div ref={stage} className="ripple-stage">
    <div ref={panel} className={`ripple-instrument ripple-ribbon${fallback ? " ripple-immersive" : ""}`} aria-label="ASCII ripple tank">
      <canvas key={mode} ref={canvas} tabIndex={0} onKeyDown={keys}
        onFocus={event => { const pool = controller.current; if (pool) { pool.cursor.visible = event.currentTarget.matches(":focus-visible"); pool.repaint(); } }}
        onBlur={() => { const pool = controller.current; if (pool) { pool.cursor.visible = false; pool.repaint(); } }}
        aria-label="An interactive pool made of punctuation. Move your pointer to leave a wake, or tap to drop a pebble. Arrow keys move a ripple cursor; Space or Enter drops a pebble; P pauses or resumes motion.">
        Ripples briefly reveal a submerged KM monogram.
      </canvas>
      <button type="button" className="ripple-fullscreen" onClick={toggle} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
          <path d={expanded ? "M2 7h5V2m6 0v5h5M2 13h5v5m6 0v-5h5" : "M7 2H2v5m11-5h5v5M2 13v5h5m6 0h5v-5"} />
        </svg>
      </button>
    </div>
  </div>;
}
