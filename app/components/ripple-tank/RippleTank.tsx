"use client";

import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { createMonogram, RippleField, STEP } from "./field";
import { useInstrumentFullscreen } from "../useInstrumentFullscreen";
import "./ripple-tank.css";

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
    <path d={expanded ? "M2 7h5V2m6 0v5h5M2 13h5v5m6 0v-5h5" : "M7 2H2v5m11-5h5v5M2 13v5h5m6 0h5v-5"} />
  </svg>;
}

export default function RippleTank() {
  const panel = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<RippleField | null>(null);
  const repaint = useRef<(() => void) | null>(null);
  const relayout = useRef<(() => void) | null>(null);
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const keyboard = useRef({ x: 0.5, y: 0.5, visible: false });
  const pausedRef = useRef(false);
  const { expanded, fallback, toggle: fullScreen } = useInstrumentFullscreen(panel);

  useEffect(() => {
    const surface = canvas.current, instrument = panel.current;
    if (!surface || !instrument) return;
    const context = surface.getContext("2d");
    if (!context) return;
    let animation = 0, last = 0, lastPaint = 0, accumulator = 0, visible = true, width = 0, height = 0;
    let atlas: HTMLCanvasElement | null = null;
    let letterAtlas: HTMLCanvasElement | null = null, letterTile = 0;
    let letterPoints: { x: number; y: number; sample: number; coverage: number }[] = [];
    let detail: ReturnType<typeof createMonogram> | null = null;
    let resample = false;
    let samples = new Int32Array(0), mixX = new Float32Array(0), mixY = new Float32Array(0);
    let tides = new Float32Array(0), driftXs = new Float32Array(0), driftYs = new Float32Array(0);
    let cell = 8, ratio = 1;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const setReduced = () => {
      pausedRef.current = media.matches;
    };
    setReduced();
    media.addEventListener("change", setReduced);

    const draw = () => {
      const water = field.current;
      if (!water || !atlas || !detail) return;
      context.clearRect(0, 0, surface.width, surface.height);
      const tile = Math.ceil(cell * ratio * 1.8);
      const offsetX = (width - detail.columns * cell) / 2;
      const offsetY = (height - detail.rows * cell) / 2;
      const current = 1 - Math.exp(-water.time / 8);
      // Cache moving currents on the physics grid, then smoothly sample them
      // for the displayed water grid. No extra wave-solving steps.
      if (resample) for (let y = 0; y < water.rows; y++) for (let x = 0; x < water.columns; x++) {
        const i = y * water.columns + x;
        tides[i] = water.ambient(x, y);
        driftXs[i] = Math.sin(y * 0.095 + x * 0.028 - water.time * 0.12) * cell * 0.18 * current;
        driftYs[i] = Math.cos(x * 0.065 - y * 0.035 - water.time * 0.1) * cell * 0.16 * current;
      }
      const sample = (values: Float32Array, i: number) => {
        const j = samples[i], u = mixX[i], v = mixY[i];
        const top = values[j] + (values[j + 1] - values[j]) * u;
        const bottom = values[j + water.columns] + (values[j + water.columns + 1] - values[j + water.columns]) * u;
        return top + (bottom - top) * v;
      };
      for (let y = 0; y < detail.rows; y++) for (let x = 0; x < detail.columns; x++) {
        const i = y * detail.columns + x;
        const tide = resample ? sample(tides, i) : water.ambient(x, y);
        const value = detail.mask[i] ? tide : (resample ? sample(water.height, i) : water.height[i]) + tide;
        const energy = Math.abs(value) * 2;
        const glyph = energy < 0.016 ? 0 : energy < 0.04 ? 1 : energy < 0.11 ? 2 : energy < 0.28 ? 3 : 4;
        const ink = Math.min(15, Math.floor(energy * 24 + 2));
        const family = value >= 0 || energy < 0.016 ? 1 : 0;
        const driftX = resample ? sample(driftXs, i) : Math.sin(y * 0.095 + x * 0.028 - water.time * 0.12) * cell * 0.18 * current;
        const driftY = resample ? sample(driftYs, i) : Math.cos(x * 0.065 - y * 0.035 - water.time * 0.1) * cell * 0.16 * current;
        context.drawImage(atlas, glyph * tile, (family * 16 + ink) * tile, tile, tile,
          Math.round((offsetX + x * cell + driftX - cell * 0.4) * ratio), Math.round((offsetY + y * cell + driftY - cell * 0.4) * ratio), tile, tile);
      }
      // Only wave contact lights the finer, fixed letter nodes. At rest this
      // pass draws nothing; partial edge coverage evens out the stroke weights.
      if (letterAtlas) for (const point of letterPoints) {
        const j = point.sample;
        const glint = Math.max(water.reveal[j], water.reveal[j + 1], water.reveal[j + water.columns], water.reveal[j + water.columns + 1]);
        if (glint < 0.002) continue;
        const energy = glint * 1.8;
        const glyph = energy < 0.016 ? 0 : energy < 0.04 ? 1 : energy < 0.11 ? 2 : energy < 0.28 ? 3 : 4;
        const ink = Math.min(15, Math.floor(energy * 24 + 2 + glint * 8));
        context.globalAlpha = point.coverage * Math.min(1, glint / 0.04);
        context.drawImage(letterAtlas, glyph * letterTile, ink * letterTile, letterTile, letterTile, point.x, point.y, letterTile, letterTile);
      }
      context.globalAlpha = 1;
      if (keyboard.current.visible) {
        context.font = `${12 * ratio}px monospace`;
        context.fillStyle = "#f2e4c5";
        const x = keyboard.current.x * width * ratio, y = keyboard.current.y * height * ratio;
        for (const [dx, dy] of [[-12, 0], [12, 0], [0, -12], [0, 12]]) context.fillText(":", x + dx * ratio, y + dy * ratio);
      }
    };
    repaint.current = draw;

    const resize = () => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width; height = bounds.height;
      ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3_000_000 / (width * height)));
      surface.width = Math.floor(width * ratio); surface.height = Math.floor(height * ratio);
      context.imageSmoothingEnabled = false;
      // A wider pool uses a coarser water lattice on touch devices, while the
      // independent lettering keeps its fine nodes and 1,200-point budget.
      const touch = window.matchMedia("(pointer: coarse)").matches;
      cell = Math.max(9, Math.sqrt(width * height / (touch ? 2600 : 4400)));
      const physicsCell = Math.max(9, Math.sqrt(width * height / (touch ? 3200 : 5600)));
      const columns = Math.max(3, Math.floor(width / physicsCell)), rows = Math.max(3, Math.floor(height / physicsCell));
      const immersive = document.fullscreenElement === instrument || instrument.classList.contains("ripple-immersive");
      const zone = !immersive ? stage.current?.getBoundingClientRect() : null;
      const centerX = zone ? zone.left - bounds.left + zone.width / 2 : width / 2;
      const centerY = zone ? zone.top - bounds.top + zone.height / 2 : height / 2;
      const shapeSize = Math.min((zone?.width || width) * 0.56, (zone?.height || height) * 1.02);
      const placement = { x: columns / 2 + (centerX - width / 2) / physicsCell,
        y: rows / 2 + (centerY - height / 2) / physicsCell, size: shapeSize / physicsCell };
      const old = field.current;
      const water = new RippleField(columns, rows, placement);
      // Resizing or entering full screen carries the same water into its new grid.
      if (old) {
        for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
          const i = y * columns + x;
          const j = Math.min(old.rows - 1, Math.floor(y * old.rows / rows)) * old.columns + Math.min(old.columns - 1, Math.floor(x * old.columns / columns));
          if (!water.mask[i] && !old.mask[j]) { water.height[i] = old.height[j]; water.previous[i] = old.previous[j]; }
          if (water.coverage[i] && old.coverage[j]) water.reveal[i] = old.reveal[j];
        }
        water.time = old.time;
        water.active = old.active;
      }
      field.current = water;
      const detailColumns = Math.floor(width / cell), detailRows = Math.floor(height / cell);
      resample = cell !== physicsCell;
      detail = resample
        ? createMonogram(detailColumns, detailRows, shapeSize / cell, {
          x: detailColumns / 2 + (centerX - width / 2) / cell,
          y: detailRows / 2 + (centerY - height / 2) / cell })
        : { columns, rows, mask: water.mask, coverage: water.coverage };
      // Cache the soft text protection as one small compositor mask. Keeping
      // water sprites at the same alpha lets the browser batch their drawing.
      const copy = !immersive ? instrument.closest(".hero")?.querySelector(".hero-copy")?.getBoundingClientRect() : null;
      const opacityAt = (x: number, y: number) => {
        if (!copy) return 1;
        const dx = Math.max(copy.left - bounds.left - x, 0, x - (copy.right - bounds.left));
        const dy = Math.max(copy.top - bounds.top - y, 0, y - (copy.bottom - bounds.top));
        const feather = Math.min(100, width * 0.16);
        const t = Math.min(1, Math.hypot(dx, dy) / feather);
        return 0.12 + 0.88 * t * t * (3 - 2 * t);
      };
      if (copy) {
        const scale = Math.min(1, 512 / width, 384 / height);
        const protection = document.createElement("canvas");
        protection.width = Math.ceil(width * scale); protection.height = Math.ceil(height * scale);
        const ink = protection.getContext("2d")!;
        const image = ink.createImageData(protection.width, protection.height);
        for (let y = 0; y < protection.height; y++) for (let x = 0; x < protection.width; x++) {
          const i = (y * protection.width + x) * 4;
          image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
          image.data[i + 3] = Math.round(opacityAt(x / scale, y / scale) * 255);
        }
        ink.putImageData(image, 0, 0);
        surface.style.maskImage = `url(${protection.toDataURL()})`;
      } else surface.style.maskImage = "none";
      if (resample) {
        const count = detailColumns * detailRows;
        samples = new Int32Array(count); mixX = new Float32Array(count); mixY = new Float32Array(count);
        tides = new Float32Array(columns * rows); driftXs = new Float32Array(columns * rows); driftYs = new Float32Array(columns * rows);
        for (let y = 0; y < detailRows; y++) for (let x = 0; x < detailColumns; x++) {
          const i = y * detailColumns + x;
          const px = Math.max(0, Math.min(columns - 1, columns / 2 + (x - detailColumns / 2) * cell / physicsCell));
          const py = Math.max(0, Math.min(rows - 1, rows / 2 + (y - detailRows / 2) * cell / physicsCell));
          const sx = Math.min(columns - 2, Math.floor(px)), sy = Math.min(rows - 2, Math.floor(py));
          samples[i] = sy * columns + sx; mixX[i] = px - sx; mixY[i] = py - sy;
        }
      }
      const makeAtlas = (spacing: number, palettes: number[][][]) => {
        const tile = Math.ceil(spacing * ratio * 1.8);
        const sheet = document.createElement("canvas"); sheet.width = tile * 5; sheet.height = tile * palettes.length * 16;
        const ink = sheet.getContext("2d")!;
        ink.font = `${Math.min(17, spacing * 1.45) * ratio}px "Courier New", monospace`;
        ink.textAlign = "center"; ink.textBaseline = "middle";
        for (let family = 0; family < palettes.length; family++) for (let shade = 0; shade < 16; shade++) {
          const mix = (shade / 15) ** 0.75;
          const [base, peak] = palettes[family];
          const color = base.map((value, i) => Math.round(value + (peak[i] - value) * mix));
          ink.fillStyle = `rgb(${color.join(",")})`;
          ink.shadowColor = `rgba(${color.join(",")},${palettes.length === 1 ? 0.28 : 0.35})`;
          ink.shadowBlur = shade >= 8 ? Math.min(palettes.length === 1 ? 3 : 2, spacing * 0.24) * ratio : 0;
          for (const [glyph, mark] of ["·", ",", ":", "~", "≈"].entries()) ink.fillText(mark, (glyph + 0.5) * tile, (family * 16 + shade + 0.5) * tile);
        }
        return { sheet, tile };
      };
      atlas = makeAtlas(cell, [[[29, 60, 80], [102, 173, 190]], [[41, 86, 104], [196, 244, 226]]]).sheet;
      const occupied = water.coverage.reduce((count, value) => count + (value > 0 ? 1 : 0), 0);
      let letterCell = physicsCell / Math.max(1, Math.min(5, Math.sqrt(1200 / occupied)));
      let letters: ReturnType<typeof createMonogram>;
      for (;;) {
        const size = shapeSize / letterCell;
        letters = createMonogram(Math.ceil(size * 1.14), Math.ceil(size * 0.72), size);
        const count = letters.coverage.reduce((total, value) => total + (value > 0 ? 1 : 0), 0);
        if (count <= 1200) break;
        letterCell *= Math.sqrt(count / 1200) * 1.04;
      }
      letterPoints = [];
      for (let y = 0; y < letters.rows; y++) for (let x = 0; x < letters.columns; x++) {
        const coverage = letters.coverage[y * letters.columns + x];
        if (!coverage) continue;
        const px = (x - letters.columns / 2) * letterCell, py = (y - letters.rows / 2) * letterCell;
        const sx = Math.max(0, Math.min(columns - 2, Math.floor(placement.x + px / physicsCell)));
        const sy = Math.max(0, Math.min(rows - 2, Math.floor(placement.y + py / physicsCell)));
        letterPoints.push({ sample: sy * columns + sx, coverage,
          x: Math.round((centerX + px - letterCell * 0.4) * ratio), y: Math.round((centerY + py - letterCell * 0.4) * ratio) });
      }
      const lettering = makeAtlas(letterCell, [[[42, 100, 112], [249, 231, 198]]]);
      letterAtlas = lettering.sheet; letterTile = lettering.tile;
      draw();
    };
    relayout.current = resize;
    const observer = new ResizeObserver(resize); observer.observe(surface);
    if (stage.current) observer.observe(stage.current);
    const copy = instrument.closest(".hero")?.querySelector(".hero-copy");
    if (copy) observer.observe(copy);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; accumulator = 0; });
    visibility.observe(instrument);
    const frame = (now: number) => {
      if (visible && !document.hidden && !pausedRef.current) {
        accumulator += last ? Math.min((now - last) / 1000, 0.05) : 0;
        while (accumulator >= STEP) { field.current?.step(); accumulator -= STEP; }
        // The display paints at 30 fps; the wave solver retains its fixed timestep.
        const paintInterval = 1000 / 30;
        if (now - lastPaint >= paintInterval - 0.5) { draw(); lastPaint = now; }
      } else accumulator = 0;
      last = now;
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animation); observer.disconnect(); visibility.disconnect();
      media.removeEventListener("change", setReduced); repaint.current = null; relayout.current = null; field.current = null;
    };
  }, []);

  useEffect(() => {
    pointer.current = null;
    relayout.current?.();
  }, [expanded]);

  const drop = useCallback((x = 0.5, y = 0.5) => {
    field.current?.drop(x, y);
    if (pausedRef.current) { for (let i = 0; i < 12; i++) field.current?.step(); repaint.current?.(); }
  }, []);

  useEffect(() => {
    const instrument = panel.current, surface = canvas.current;
    const ribbon = instrument?.closest<HTMLElement>(".hero");
    if (!instrument || !surface || !ribbon) return;
    let press: { id: number; x: number; y: number; time: number; moved: boolean } | null = null;
    const control = (event: globalThis.PointerEvent) => event.target instanceof Element && Boolean(event.target.closest("a, button, input, select, textarea"));
    const point = (event: globalThis.PointerEvent) => {
      const bounds = surface.getBoundingClientRect();
      return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
        y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)), id: event.pointerId };
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!event.isPrimary || (event.pointerType !== "mouse" && press?.id !== event.pointerId)) return;
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) press.moved = true;
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
    const down = (event: globalThis.PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || control(event)) return;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
      pointer.current = point(event); keyboard.current.visible = false;
      if (event.pointerType !== "touch") drop(pointer.current.x, pointer.current.y);
    };
    const up = (event: globalThis.PointerEvent) => {
      if (press?.id !== event.pointerId) return;
      if (event.pointerType === "touch" && !press.moved && performance.now() - press.time < 600 && !control(event)) {
        const location = point(event); drop(location.x, location.y);
      }
      press = null;
      if (event.pointerType !== "mouse") pointer.current = null;
    };
    const leave = () => { press = null; pointer.current = null; };
    // Listen on the ribbon so motion continues over the copy. Passive events
    // leave links, selection, wheel scrolling and touch panning to the browser.
    ribbon.addEventListener("pointermove", move, { passive: true });
    ribbon.addEventListener("pointerdown", down, { passive: true });
    ribbon.addEventListener("pointerup", up, { passive: true });
    ribbon.addEventListener("pointerleave", leave);
    ribbon.addEventListener("pointercancel", leave);
    return () => {
      ribbon.removeEventListener("pointermove", move); ribbon.removeEventListener("pointerdown", down);
      ribbon.removeEventListener("pointerup", up); ribbon.removeEventListener("pointerleave", leave);
      ribbon.removeEventListener("pointercancel", leave);
    };
  }, [drop]);
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

  return <div ref={stage} className="ripple-stage">
    <div ref={panel} className={`ripple-instrument ripple-ribbon${fallback ? " ripple-immersive" : ""}`} aria-label="ASCII ripple tank">
      <canvas ref={canvas} tabIndex={0} aria-label="Interactive water. Move your pointer or drag to stir; click or tap to drop a pebble. With the keyboard, use arrow keys to move, Space or Enter to drop, and P to pause or resume."
        onKeyDown={keys}
        onFocus={event => { keyboard.current.visible = event.currentTarget.matches(":focus-visible"); repaint.current?.(); }} onBlur={() => { keyboard.current.visible = false; repaint.current?.(); }}>
        Interactive punctuation water with a submerged KM monogram.
      </canvas>
      <button type="button" className="ripple-fullscreen" onClick={fullScreen} aria-label={expanded ? "Exit full screen" : "Full screen"} aria-pressed={expanded}><ExpandIcon expanded={expanded} /></button>
    </div>
  </div>;
}
