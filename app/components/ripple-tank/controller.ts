import { WaveBudget, WAVE_BUDGETS } from "./budget";
import { poolLayout } from "./geometry";
import type { PoolLayout } from "./geometry";
import { BatchedWaterRenderer, QuietWaterRenderer } from "./renderer";
import type { WaterRenderer } from "./renderer";
import { WaveSimulation } from "./simulation";
import type { PoolConfig, PoolFrame, PoolInput, PoolJob, PoolDraw } from "./simulation";

export type WaterMode = "gpu" | "worker" | "canvas" | "local";
type Point = { x: number; y: number };

// One outstanding request, one reusable transfer buffer, one latest pointer
// segment. Input storms and slow frames cannot grow a queue of work.
export class PoolController {
  readonly budget: WaveBudget;
  readonly cursor = { x: 0.5, y: 0.5, visible: false };
  layout: PoolLayout | null = null;
  paused = false;
  resting = false;
  private renderer: WaterRenderer | null = null;
  private worker: Worker | null = null;
  private local: WaveSimulation | null = null;
  private disposed = false;
  private visible = true;
  private raf = 0;
  private resizeFrame = 0;
  private lastPaint = 0;
  private lastInterval = 0;
  private lastRenderedAt = 0;
  private time = 0;
  private lastInput = -Infinity;
  private active = false;
  private uploadWork = 0;
  private dirty = true;
  private busy = false;
  private generation = 0;
  private config: PoolConfig | null = null;
  private buffer: ArrayBuffer = new ArrayBuffer(0);
  private input: PoolInput | null = null;
  private anchor: Point | null = null;
  private pendingPoint: Point | null = null;
  private pageX = 0;
  private pageY = 0;
  private signature = "";
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private resizeObserver: ResizeObserver;
  private intersection: IntersectionObserver;
  private media = matchMedia("(prefers-reduced-motion: reduce)");

  constructor(readonly canvas: HTMLCanvasElement, private panel: HTMLDivElement,
    private stage: HTMLDivElement, readonly mode: WaterMode, private fallback: (mode: WaterMode) => void) {
    const phone = matchMedia("(any-pointer: coarse)").matches || Math.min(screen.width, screen.height) < 700;
    this.budget = new WaveBudget(mode === "gpu" ? phone ? 1 : 2 : 0);
    if (mode === "gpu") this.renderer = new BatchedWaterRenderer(canvas);
    else if (mode !== "worker") {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas");
      this.renderer = new QuietWaterRenderer(canvas, ctx);
    }
    if (mode === "local") this.local = new WaveSimulation();
    else {
      try {
        this.worker = new Worker(new URL("./wave.worker.ts", import.meta.url), { type: "module" });
        this.worker.onmessage = ({ data }: MessageEvent<PoolFrame>) => this.receive(data);
        this.worker.onerror = event => { event.preventDefault(); this.fallback(mode === "worker" ? "canvas" : "local"); };
      } catch { this.renderer?.dispose(); throw new Error("worker"); }
      if (mode === "worker") {
        try {
          const offscreen = canvas.transferControlToOffscreen();
          this.worker.postMessage({ type: "surface", canvas: offscreen }, [offscreen]);
        } catch { this.worker.terminate(); throw new Error("canvas"); }
      }
    }
    this.resizeObserver = new ResizeObserver(this.requestResize);
    this.resizeObserver.observe(canvas); this.resizeObserver.observe(stage);
    const copy = panel.closest(".hero")?.querySelector(".hero-copy");
    if (copy) this.resizeObserver.observe(copy);
    this.intersection = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.restart(); });
    this.intersection.observe(canvas);
    this.media.addEventListener("change", this.preference);
    document.addEventListener("visibilitychange", this.restart);
    window.addEventListener("resize", this.requestResize);
    window.visualViewport?.addEventListener("resize", this.requestResize);
    canvas.addEventListener("webglcontextlost", this.contextLost);
    this.requestResize();
  }
  private preference = () => this.restart();
  private contextLost = (event: Event) => { event.preventDefault(); if (!this.disposed) this.fallback("worker"); };
  private restart = () => {
    cancelAnimationFrame(this.raf); this.raf = 0; this.lastPaint = 0; this.lastRenderedAt = 0;
    this.budget.reset(performance.now()); this.schedule();
  };
  private schedule() {
    if (!this.raf && !this.disposed && this.visible && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  }
  requestResize = () => {
    if (!this.resizeFrame && !this.disposed) this.resizeFrame = requestAnimationFrame(() => { this.resizeFrame = 0; this.resize(); });
  };
  private resize() {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const width = bounds.width, height = bounds.height;
    this.pageX = bounds.left + scrollX; this.pageY = bounds.top + scrollY;
    const immersive = document.fullscreenElement === this.panel || this.panel.classList.contains("ripple-immersive");
    const zoneBounds = immersive ? bounds : this.stage.getBoundingClientRect();
    const zone = { x: zoneBounds.left - bounds.left, y: zoneBounds.top - bounds.top, width: zoneBounds.width, height: zoneBounds.height };
    const textBounds = !immersive ? this.panel.closest(".hero")?.querySelector(".hero-copy")?.getBoundingClientRect() : null;
    const copy = textBounds ? { x: textBounds.left - bounds.left, y: textBounds.top - bounds.top, width: textBounds.width, height: textBounds.height } : null;
    const density = Math.min(devicePixelRatio || 1, (devicePixelRatio || 1) * (visualViewport?.scale || 1));
    const signature = JSON.stringify([width, height, zone, copy, this.budget.tier, density]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.layout = poolLayout(width, height, zone, copy, this.budget.tier, density);
    this.renderer?.resize(this.layout);
    this.config = { generation: ++this.generation, columns: this.layout.columns, rows: this.layout.rows, placement: this.layout.placement, layout: this.mode === "worker" ? this.layout : undefined };
    this.anchor = this.pendingPoint = null; this.dirty = true; this.lastPaint = 0;
    this.budget.reset(performance.now()); this.flush(); this.schedule();
  }
  point(x: number, y: number): Point {
    return { x: Math.max(0, Math.min(1, (x + scrollX - this.pageX) / (this.layout?.width || 1))),
      y: Math.max(0, Math.min(1, (y + scrollY - this.pageY) / (this.layout?.height || 1))) };
  }
  move(point: Point) {
    this.anchor ??= point; this.pendingPoint = point;
    this.cursor.visible = false; this.lastInput = performance.now(); this.schedule();
  }
  leave() { this.anchor = this.pendingPoint = null; }
  drop(point: Point) { this.input = { ...point, drop: true }; this.lastInput = performance.now(); this.schedule(); }
  setPaused(paused: boolean) { this.paused = paused; this.dirty = true; this.restart(); }
  repaint() { this.dirty = true; this.schedule(); }
  private drawState(): PoolDraw | undefined {
    return this.mode === "worker" ? { time: this.time, cursor: { ...this.cursor },
      energy: this.resting ? Math.max(0, 1 - (performance.now() - this.lastInput) / 1600) : 1 } : undefined;
  }
  private send(request: PoolJob) {
    this.busy = true;
    if (this.worker) {
      this.watchdog = setTimeout(() => this.fallback("local"), 2500);
      this.worker.postMessage(request, request.type === "tick" && request.buffer.byteLength ? [request.buffer] : []);
    } else if (this.local) {
      if (request.type === "tick" && request.reset) this.local.water?.clear();
      this.receive(request.type === "configure" ? this.local.configure(request.config) : this.local.tick(request.steps, request.input, request.buffer));
    }
  }
  private flush(tick = false) {
    if (this.busy || this.disposed) return;
    if (this.config) { const config = this.config; this.config = null; this.send({ type: "configure", config, draw: this.drawState() }); return; }
    if (!tick) return;
    if (this.pendingPoint && this.anchor) {
      if (!this.input?.drop) this.input = { ...this.pendingPoint, fromX: this.anchor.x, fromY: this.anchor.y };
      this.anchor = this.pendingPoint; this.pendingPoint = null;
    }
    const simulate = Boolean(this.input) || (this.active && !this.paused && !this.resting);
    const renderOnly = this.mode === "worker" && (this.dirty || !this.paused);
    if (!simulate && !renderOnly) return;
    const input = this.input; this.input = null;
    const buffer = this.buffer; this.buffer = new ArrayBuffer(0);
    this.send({ type: "tick", generation: this.generation, steps: simulate ? this.paused || this.resting ? 12 : 4 : 0, input, buffer, reset: this.resting && Boolean(input), draw: this.drawState() });
  }
  private receive(frame: PoolFrame) {
    if (this.disposed) return;
    clearTimeout(this.watchdog); this.busy = false;
    if (frame.generation === this.generation) {
      const start = performance.now();
      this.renderer?.update(frame); this.uploadWork = Math.max(this.uploadWork, performance.now() - start);
      this.active = frame.active; this.dirty = !frame.rendered;
      if (frame.rendered) {
        // Judge worker rendering by completed-frame cadence, not by its CPU
        // work: that work no longer occupies the page's input thread.
        if (this.lastRenderedAt && !this.paused && !this.resting && this.visible && !document.hidden) {
          this.adjust(this.budget.observe(start, start - this.lastRenderedAt, this.uploadWork, this.lastInterval || 1000 / WAVE_BUDGETS[this.budget.tier].fps), start);
        }
        this.lastRenderedAt = start;
      }
    }
    this.buffer = frame.buffer; this.flush(); this.schedule();
  }
  private frame = (now: number) => {
    this.raf = 0;
    if (!this.visible || document.hidden || !this.layout || this.disposed) return;
    const budget = WAVE_BUDGETS[this.budget.tier], recent = now - this.lastInput < 2000;
    const interval = 1000 / (this.resting ? 8 : this.active || this.input || recent ? budget.fps : budget.idleFps);
    // Quiet currents keep drawing while the physical solver sleeps. Switching
    // cadence must not count as a missed interactive frame deadline.
    if (interval !== this.lastInterval) {
      this.lastInterval = interval; this.lastPaint = 0; this.lastRenderedAt = 0; this.budget.reset(now);
    }
    const elapsed = this.lastPaint ? now - this.lastPaint : interval;
    if ((elapsed >= interval - 0.5 || (this.paused && this.dirty)) && (this.mode !== "worker" || !this.busy)) {
      const start = performance.now();
      if (!this.paused) this.time += Math.min(elapsed / 1000, 0.15) * (this.media.matches ? 0.5 : 1);
      this.flush(true);
      try { if (this.renderer) this.dirty = !this.renderer.draw(this.time, this.cursor, this.resting ? Math.max(0, 1 - (now - this.lastInput) / 1600) : 1); }
      catch { this.fallback(this.mode === "gpu" ? "worker" : "local"); return; }
      const work = Math.max(performance.now() - start, this.uploadWork); this.uploadWork = 0; this.lastPaint = now;
      if (this.mode !== "worker" && !this.paused && !this.resting) {
        this.adjust(this.budget.observe(now, elapsed, work, interval), now);
      }
    }
    if (this.dirty || this.input || this.pendingPoint || !this.paused) this.schedule();
  };
  private adjust(decision: "keep" | "reduce" | "rest", now: number) {
    if (decision === "reduce") this.requestResize();
    if (decision === "rest") {
      if (this.mode === "gpu") { this.fallback("worker"); return; }
      this.resting = true; this.lastInput = now - 1600; this.dirty = true;
    }
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.raf); cancelAnimationFrame(this.resizeFrame); clearTimeout(this.watchdog);
    this.worker?.terminate(); this.resizeObserver.disconnect(); this.intersection.disconnect();
    this.media.removeEventListener("change", this.preference); document.removeEventListener("visibilitychange", this.restart);
    window.removeEventListener("resize", this.requestResize); window.visualViewport?.removeEventListener("resize", this.requestResize);
    this.canvas.removeEventListener("webglcontextlost", this.contextLost); this.renderer?.dispose();
  }
}
