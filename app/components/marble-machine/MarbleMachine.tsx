"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useInstrumentFullscreen } from "../useInstrumentFullscreen";
import { MarbleMachine as Machine, HEIGHT, WIDTH } from "./model";
import { MarbleRenderer } from "./renderer";
import "../ripple-tank/ripple-tank.css";
import "./marble-machine.css";

export default function MarbleMachine() {
  const panel = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<MarbleRenderer | null>(null), reduced = useRef(false), paused = useRef(false);
  const releaseTouch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useRef({ x: 500, y: 208 });
  const { expanded, fallback, toggle } = useInstrumentFullscreen(panel);

  useEffect(() => {
    const surface = canvas.current, instrument = panel.current;
    if (!surface || !instrument) return;
    const context = surface.getContext("2d"); if (!context) return;
    const view = new MarbleRenderer(surface, context, new Machine()); renderer.current = view;
    let animation = 0, last = 0, visible = true;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => { reduced.current = media.matches; view.model.setPointer(view.model.pointer, media.matches); view.draw(); last = 0; };
    preference(); media.addEventListener("change", preference);
    const resize = new ResizeObserver(() => { view.resize(); last = 0; }); resize.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; }); visibility.observe(instrument);
    const tabVisibility = () => { last = 0; }; document.addEventListener("visibilitychange", tabVisibility);
    const scroll = () => {
      if (view.model.pointer && !view.keyboard) { view.model.setPointer(null, reduced.current); if (reduced.current) view.draw(); }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    const frame = (now: number) => {
      const moving = !reduced.current && (!paused.current || view.model.settling);
      if (visible && !document.hidden && moving) {
        if (!last) last = now;
        const elapsed = now - last;
        if (elapsed >= 1000 / 30 - 0.5) { view.model.advance(Math.min(elapsed / 1000, 0.1), !paused.current); view.draw(); last = now; }
      } else last = 0;
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animation); resize.disconnect(); visibility.disconnect(); media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", tabVisibility); window.removeEventListener("scroll", scroll);
      if (releaseTouch.current) clearTimeout(releaseTouch.current); renderer.current = null;
    };
  }, []);

  const clear = () => {
    const view = renderer.current;
    if (releaseTouch.current) { clearTimeout(releaseTouch.current); releaseTouch.current = null; }
    if (view) { view.model.setPointer(null, reduced.current); view.keyboard = null; if (reduced.current) view.draw(); }
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const view = renderer.current; if (!view) return;
    if (releaseTouch.current) { clearTimeout(releaseTouch.current); releaseTouch.current = null; }
    const bounds = event.currentTarget.getBoundingClientRect(), p = view.point(event.clientX - bounds.left, event.clientY - bounds.top);
    view.keyboard = null; view.model.setPointer(p, reduced.current); if (reduced.current) view.draw();
  };
  const keys = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const view = renderer.current; if (!view) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); const p = keyboard.current;
      p.x = Math.max(55, Math.min(WIDTH - 45, p.x + (event.key === "ArrowLeft" ? -22 : event.key === "ArrowRight" ? 22 : 0)));
      p.y = Math.max(55, Math.min(HEIGHT - 55, p.y + (event.key === "ArrowUp" ? -22 : event.key === "ArrowDown" ? 22 : 0)));
      view.keyboard = { ...p }; view.model.setPointer(p, reduced.current); view.draw();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault(); view.keyboard = { ...keyboard.current }; view.model.setPointer(view.keyboard, reduced.current); view.draw();
    } else if (event.key === "Escape" && !expanded) { event.preventDefault(); clear(); }
    else if (event.key.toLowerCase() === "p") { event.preventDefault(); paused.current = !paused.current; }
  };
  return <div ref={panel} className={`ripple-instrument marble-instrument${fallback ? " ripple-immersive" : ""}`} aria-label="Obliging marble machine">
    <canvas ref={canvas} tabIndex={0} aria-label="One marble travels through a mechanical loop. Put your pointer near a rail and the machine makes room. On touch screens, tap a rail. Arrow keys move an imaginary pointer; Space or Enter places it, Escape removes it, and P pauses or resumes the marble."
      onPointerMove={event => { if (event.pointerType === "mouse" || event.pointerType === "pen" || event.buttons) point(event); }}
      onPointerDown={point} onPointerLeave={event => { if (event.pointerType !== "touch") clear(); }} onPointerCancel={clear}
      onPointerUp={event => { if (event.pointerType !== "mouse") releaseTouch.current = setTimeout(clear, 2000); }}
      onKeyDown={keys} onBlur={clear}>
      A precision marble loop with accommodating rails, hinged platforms and a falling counterweight.
    </canvas>
    <button type="button" className="ripple-fullscreen" onClick={toggle} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
        <path d={expanded ? "M2 7h5V2m6 0v5h5M2 13h5v5m6 0v-5h5" : "M7 2H2v5m11-5h5v5M2 13v5h5m6 0h5v-5"} />
      </svg>
    </button>
  </div>;
}
