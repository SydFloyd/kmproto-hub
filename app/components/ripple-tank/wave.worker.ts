import { WaveSimulation } from "./simulation.ts";
import { QuietWaterRenderer } from "./renderer.ts";
import type { PoolRequest, PoolFrame } from "./simulation.ts";

const pool = new WaveSimulation();
let renderer: QuietWaterRenderer | null = null;
let renderBuffer: ArrayBuffer = new ArrayBuffer(0);
let latest: PoolFrame | null = null;
const scope = self as unknown as { onmessage: (event: MessageEvent<PoolRequest>) => void; postMessage: (frame: PoolFrame, transfer: Transferable[]) => void };
// Request driven, with one transferable buffer in flight. No timer, queue of
// pointer events, or work left running when the page is hidden.
scope.onmessage = ({ data }) => {
  if (data.type === "surface") {
    const context = data.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Offscreen drawing unavailable");
    renderer = new QuietWaterRenderer(data.canvas, context);
    return;
  }
  const start = performance.now();
  if (renderer && latest && data.type === "tick" && !data.steps && !data.input && !data.reset) {
    // Ambient drawing reuses the last field. No solve, encoding or field copy
    // is needed when the pointer and physical ripples are at rest.
    renderer.draw(data.draw?.time || 0, data.draw?.cursor || { x: 0.5, y: 0.5, visible: false }, data.draw?.energy ?? 1);
    scope.postMessage({ ...latest, buffer: new ArrayBuffer(0), rendered: true, workMs: performance.now() - start }, []);
    return;
  }
  if (data.type === "tick" && data.reset) pool.water?.clear();
  const frame = data.type === "configure" ? pool.configure(data.config) : pool.tick(data.steps, data.input, renderer ? renderBuffer : data.buffer);
  if (renderer) {
    if (data.type === "configure" && data.config.layout) renderer.resize(data.config.layout);
    renderer.update(frame);
    renderer.draw(data.draw?.time || 0, data.draw?.cursor || { x: 0.5, y: 0.5, visible: false }, data.draw?.energy ?? 1);
    renderBuffer = frame.buffer;
    latest = frame;
    // The canvas and pixel buffer stay in this worker. Only a small completion
    // message crosses back; the browser presents the transferred canvas.
    scope.postMessage({ ...frame, buffer: new ArrayBuffer(0), rendered: true, workMs: performance.now() - start }, []);
    return;
  }
  scope.postMessage(frame, [frame.buffer]);
};
