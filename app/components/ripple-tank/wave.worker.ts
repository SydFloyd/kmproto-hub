import { WaveSimulation } from "./simulation.ts";
import type { PoolRequest, PoolFrame } from "./simulation.ts";

const pool = new WaveSimulation();
const scope = self as unknown as { onmessage: (event: MessageEvent<PoolRequest>) => void; postMessage: (frame: PoolFrame, transfer: Transferable[]) => void };
// Request driven, with one transferable buffer in flight. No timer, queue of
// pointer events, or work left running when the page is hidden.
scope.onmessage = ({ data }) => {
  if (data.type === "tick" && data.reset) pool.water?.clear();
  const frame = data.type === "configure" ? pool.configure(data.config) : pool.tick(data.steps, data.input, data.buffer);
  scope.postMessage(frame, [frame.buffer]);
};
