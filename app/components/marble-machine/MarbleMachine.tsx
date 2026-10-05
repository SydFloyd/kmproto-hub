"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useInstrumentFullscreen } from "../useInstrumentFullscreen";
import { MarbleMachine as Machine, HEIGHT, WIDTH } from "./model";
import type { Point } from "./model";
import { MarbleRenderer } from "./renderer";
import "../ripple-tank/ripple-tank.css";
import "./marble-machine.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (notify: () => void) => {
  const query = matchMedia(motionQuery); query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const motionSnapshot = () => matchMedia(motionQuery).matches;

export default function MarbleMachine() {
  const panel = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<MarbleRenderer | null>(null), moving = useRef(false);
  const restart = useRef<(() => void) | null>(null), pending = useRef<Point | null | undefined>(undefined);
  const releaseTouch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useRef({ x: 500, y: 208 });
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  const [override, setOverride] = useState<boolean | null>(null);
  const playing = override ?? !reduced;
  const { expanded, fallback, toggle } = useInstrumentFullscreen(panel);

  useEffect(() => {
    const surface = canvas.current, instrument = panel.current;
    if (!surface || !instrument) return;
    const context = surface.getContext("2d"); if (!context) return;
    const view = new MarbleRenderer(surface, context, new Machine()); renderer.current = view;
    let animation = 0, last = 0, visible = true, dirty = true, resizeFrame = 0;
    const schedule = () => { if (!animation && visible && !document.hidden) animation = requestAnimationFrame(frame); };
    const frame = (now: number) => {
      animation = 0;
      if (!visible || document.hidden) return;
      const elapsed = last ? now - last : 1000 / 30;
      if (elapsed >= 1000 / 30 - 0.5) {
        if (pending.current !== undefined) { view.model.setPointer(pending.current, !moving.current); pending.current = undefined; dirty = true; }
        if (moving.current || view.model.settling) { view.model.advance(Math.min(elapsed / 1000, 0.1), moving.current); dirty = true; }
        if (dirty) { view.draw(); dirty = false; }
        last = now;
      }
      if (moving.current || view.model.settling || pending.current !== undefined || dirty) schedule();
    };
    const wake = () => { dirty = true; schedule(); }; restart.current = wake;
    const reset = () => { cancelAnimationFrame(animation); animation = 0; last = 0; wake(); };
    const relayout = () => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; view.resize(); last = 0; wake(); });
    };
    const resize = new ResizeObserver(relayout); resize.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; reset(); }); visibility.observe(instrument);
    document.addEventListener("visibilitychange", reset);
    window.visualViewport?.addEventListener("resize", relayout);
    const scroll = () => { if (view.model.pointer && !view.keyboard) { pending.current = null; wake(); } };
    window.addEventListener("scroll", scroll, { passive: true });
    relayout(); schedule();
    return () => {
      cancelAnimationFrame(animation); cancelAnimationFrame(resizeFrame); resize.disconnect(); visibility.disconnect();
      document.removeEventListener("visibilitychange", reset); window.removeEventListener("scroll", scroll);
      window.visualViewport?.removeEventListener("resize", relayout);
      if (releaseTouch.current) clearTimeout(releaseTouch.current);
      renderer.current = null; restart.current = null;
    };
  }, []);
  useEffect(() => {
    moving.current = playing;
    const view = renderer.current;
    if (view && !playing) view.model.setPointer(view.model.pointer, true);
    restart.current?.();
  }, [playing]);

  const clear = () => {
    if (releaseTouch.current) { clearTimeout(releaseTouch.current); releaseTouch.current = null; }
    if (renderer.current) renderer.current.keyboard = null;
    pending.current = null; restart.current?.();
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const view = renderer.current; if (!view || !event.isPrimary) return;
    if (releaseTouch.current) { clearTimeout(releaseTouch.current); releaseTouch.current = null; }
    view.keyboard = null;
    pending.current = view.point(event.clientX + scrollX - view.pageX, event.clientY + scrollY - view.pageY); restart.current?.();
  };
  const keys = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const view = renderer.current; if (!view) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); const p = keyboard.current;
      p.x = Math.max(55, Math.min(WIDTH - 45, p.x + (event.key === "ArrowLeft" ? -22 : event.key === "ArrowRight" ? 22 : 0)));
      p.y = Math.max(55, Math.min(HEIGHT - 55, p.y + (event.key === "ArrowUp" ? -22 : event.key === "ArrowDown" ? 22 : 0)));
      view.keyboard = { ...p }; pending.current = { ...p }; restart.current?.();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault(); view.keyboard = { ...keyboard.current }; pending.current = { ...keyboard.current }; restart.current?.();
    } else if (event.key === "Escape" && !expanded) { event.preventDefault(); clear(); }
    else if (event.key.toLowerCase() === "p") { event.preventDefault(); setOverride(!playing); }
  };
  return <div ref={panel} className={`ripple-instrument marble-instrument${fallback ? " ripple-immersive" : ""}`} aria-label="Obliging marble machine">
    <canvas ref={canvas} tabIndex={0} aria-label="One marble travels through a mechanical loop. Put your pointer near a rail and the machine makes room. On touch screens, tap a rail. Arrow keys move an imaginary pointer; Space or Enter places it, Escape removes it, and P pauses or resumes the marble."
      onPointerMove={event => { if (event.pointerType === "mouse" || event.pointerType === "pen" || event.buttons) point(event); }}
      onPointerDown={point} onPointerLeave={event => { if (event.pointerType !== "touch") clear(); }} onPointerCancel={clear}
      onPointerUp={event => { if (event.pointerType !== "mouse") releaseTouch.current = setTimeout(clear, 2000); }}
      onKeyDown={keys} onBlur={clear}>
      A precision marble loop with accommodating rails, hinged platforms and a falling counterweight.
    </canvas>
    <button type="button" className="ripple-fullscreen marble-playback" onClick={() => setOverride(!playing)} aria-label={playing ? "Pause animation" : "Play animation"} aria-pressed={playing}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {playing ? <path d="M5 4h3v12H5zm7 0h3v12h-3z" /> : <path d="M6 3l11 7-11 7z" />}
      </svg>
    </button>
    <button type="button" className="ripple-fullscreen" onClick={toggle} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
        <path d={expanded ? "M2 7h5V2m6 0v5h5M2 13h5v5m6 0v-5h5" : "M7 2H2v5m11-5h5v5M2 13v5h5m6 0h5v-5"} />
      </svg>
    </button>
  </div>;
}
