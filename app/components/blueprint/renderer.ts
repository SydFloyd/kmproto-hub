import { childWorld, ease, fitCamera, focusCamera, mixCamera, pointAlong } from "./model";
import type { BlueprintNavigator, Box, Camera, Part, Point, World } from "./model";

const ink = { line: "#9ed2d2", bright: "#d9eee5", faint: "#427c88", gold: "#e8cc98", shade: "#092731" };
type Texture = { world: World; canvas: HTMLCanvasElement };

function line(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
}
function corners(ctx: CanvasRenderingContext2D, box: Box, length: number) {
  for (const [x, y, dx, dy] of [[box.x, box.y, 1, 1], [box.x + box.w, box.y, -1, 1],
    [box.x, box.y + box.h, 1, -1], [box.x + box.w, box.y + box.h, -1, -1]]) {
    line(ctx, [{ x, y: y + dy * length }, { x, y }, { x: x + dx * length, y }]);
  }
}
function gear(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, teeth: number) {
  ctx.beginPath();
  for (let i = 0; i <= teeth * 4; i++) {
    const angle = i / (teeth * 4) * Math.PI * 2, r = radius * (i % 4 < 2 ? 1 : 0.91);
    const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
    if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.stroke();
}

function drawPart(ctx: CanvasRenderingContext2D, world: World, part: Part, detail: boolean) {
  const { x, y, w, h, aperture: a } = part;
  const weight = detail ? 1 : 3.4;
  ctx.fillStyle = "rgba(6, 27, 36, .38)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = ink.line; ctx.lineWidth = 1.4 * weight;
  if (world.kind === "machine") {
    const radius = Math.min(w, h) * 0.48;
    gear(ctx, x + w / 2, y + h / 2, radius, part.id === 4 ? 32 : 20);
    ctx.strokeStyle = ink.faint;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, radius * 0.82, radius * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath(); ctx.arc(x + w / 2 + Math.cos(angle) * radius * 0.72,
        y + h / 2 + Math.sin(angle) * radius * 0.72, 2.6, 0, Math.PI * 2); ctx.stroke();
    }
    if (detail) {
      ctx.strokeStyle = "rgba(154, 199, 199, .28)"; ctx.lineWidth = 0.8; ctx.setLineDash([4, 7]);
      line(ctx, [{ x: x - 18, y: y + h / 2 }, { x: x + w + 18, y: y + h / 2 }]);
      line(ctx, [{ x: x + w / 2, y: y - 18 }, { x: x + w / 2, y: y + h + 18 }]); ctx.setLineDash([]);
    }
  } else if (world.kind === "city") {
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = ink.faint; ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    if (detail) {
      for (let i = 0; i < 5; i++) {
        const step = w * (0.16 + i * 0.165);
        ctx.strokeRect(x + step, y - 8, w * 0.09, 4);
        ctx.strokeRect(x + step, y + h + 4, w * 0.09, 4);
      }
      ctx.strokeStyle = ink.gold; corners(ctx, { x: x - 4, y: y - 4, w: w + 8, h: h + 8 }, 6);
      ctx.strokeStyle = ink.faint; ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const px = x + 8 + i * (w - 16) / 6;
        line(ctx, [{ x: px, y: y + 8 }, { x: px + 7, y: a.y - 4 }]);
      }
    }
  } else {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.stroke();
    ctx.strokeStyle = ink.faint;
    if (detail) {
      for (let i = 1; i < 6; i++) {
        const py = y + h * i / 6;
        line(ctx, [{ x: x - 5, y: py }, { x: x - 12, y: py }]);
        line(ctx, [{ x: x + w + 5, y: py }, { x: x + w + 12, y: py }]);
      }
      ctx.fillStyle = ink.gold; ctx.beginPath(); ctx.arc(x + 8, y + 8, 2.1, 0, Math.PI * 2); ctx.fill();
      const busY = y + h - 8;
      ctx.lineWidth = 0.8;
      line(ctx, [{ x: x + 7, y: busY }, { x: x + w - 7, y: busY }]);
      for (let i = 0; i < 4 + part.variant; i++) ctx.strokeRect(x + 12 + i * 8, busY - 5, 4, 3);
    }
  }
  // Feed-throughs meet the same normalized gates used by the world inside.
  ctx.strokeStyle = ink.line; ctx.lineWidth = weight;
  part.gates.forEach((p, i) => {
    const outer = { x: x + p.x * w, y: y + p.y * h }, inner = { x: a.x + p.x * a.w, y: a.y + p.y * a.h };
    line(ctx, [outer, i < 2 ? { x: inner.x, y: outer.y } : { x: outer.x, y: inner.y }, inner]);
  });
  ctx.strokeStyle = ink.faint; ctx.strokeRect(a.x, a.y, a.w, a.h);
  if (detail) {
    ctx.font = '8.5px "Courier New", monospace'; ctx.fillStyle = ink.line;
    ctx.fillText(`${world.kind === "circuit" ? "U" : world.kind === "city" ? "B" : "M"}${String(part.id + 1).padStart(2, "0")}`, x, y - 16);
    ctx.fillStyle = ink.gold; ctx.font = '7.5px "Courier New", monospace';
    ctx.fillText(`${Math.round(w / 4)}.${part.variant}`, x + w - 25, y - 16);
  }
}

function drawWorld(ctx: CanvasRenderingContext2D, world: World, preview: boolean) {
  ctx.save();
  if (preview) {
    ctx.fillStyle = "rgba(118, 188, 195, .22)";
    for (let x = 40; x < world.width; x += 40) for (let y = 40; y < world.height; y += 40) ctx.fillRect(x, y, 0.9, 0.9);
    // Delicate witness lines and dimension ticks sit just outside the drawing.
    ctx.strokeStyle = "rgba(154, 199, 199, .35)"; ctx.lineWidth = 0.9;
    const first = world.parts[0], last = world.parts[2], baseline = Math.max(25, first.y - 34);
    line(ctx, [{ x: first.x, y: baseline + 12 }, { x: first.x, y: baseline - 6 }]);
    line(ctx, [{ x: last.x + last.w, y: baseline + 12 }, { x: last.x + last.w, y: baseline - 6 }]);
    line(ctx, [{ x: first.x, y: baseline }, { x: last.x + last.w, y: baseline }]);
    for (const x of [first.x, last.x + last.w]) line(ctx, [{ x: x - 4, y: baseline + 4 }, { x: x + 4, y: baseline - 4 }]);
    ctx.font = '9px "Courier New", monospace'; ctx.textAlign = "center"; ctx.fillStyle = ink.gold;
    ctx.fillText(`${((last.x + last.w - first.x) / 10).toFixed(2)}`, (first.x + last.x + last.w) / 2, baseline - 7);
    ctx.textAlign = "start";
  }
  for (const route of world.routes) {
    if (world.kind === "city") {
      ctx.lineWidth = 12; ctx.strokeStyle = "rgba(106, 159, 166, .20)"; ctx.lineJoin = "round"; line(ctx, route.points);
      ctx.lineWidth = preview ? 0.9 : 3.5; ctx.strokeStyle = ink.line; ctx.setLineDash([5, 7]); line(ctx, route.points); ctx.setLineDash([]);
    } else {
      ctx.lineWidth = world.kind === "machine" ? 4 : preview ? 1.4 : 4;
      ctx.strokeStyle = world.kind === "machine" ? "rgba(155, 202, 199, .30)" : ink.line;
      line(ctx, route.points);
      if (world.kind === "machine") { ctx.lineWidth = 0.9; ctx.strokeStyle = ink.line; line(ctx, route.points); }
    }
    if (preview) for (const p of route.points.slice(1, -1)) {
      ctx.strokeStyle = ink.gold; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, world.kind === "city" ? 3 : 2.7, 0, Math.PI * 2); ctx.stroke();
    }
    if (preview && world.kind === "circuit") {
      const a = route.points[1], b = route.points[2], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
      if (length > 30) {
        ctx.save(); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = ink.shade; ctx.fillRect(-11, -4, 22, 8); ctx.strokeStyle = ink.line; ctx.lineWidth = 1;
        const points = Array.from({ length: 9 }, (_, i) => ({ x: -11 + i * 2.75, y: i === 0 || i === 8 ? 0 : i % 2 ? -3 : 3 }));
        line(ctx, points); ctx.restore();
      }
    }
  }
  for (const part of world.parts) {
    drawPart(ctx, world, part, preview);
    if (preview) {
      const child = childWorld(world, part), a = part.aperture;
      ctx.save(); ctx.beginPath(); ctx.rect(a.x, a.y, a.w, a.h); ctx.clip();
      ctx.translate(a.x, a.y); ctx.scale(a.w / child.width, a.h / child.height);
      ctx.globalAlpha *= 0.83; drawWorld(ctx, child, false); ctx.restore();
    }
  }
  if (preview) {
    ctx.strokeStyle = "rgba(149, 207, 207, .32)"; ctx.lineWidth = 0.8;
    const cy = world.height / 2;
    for (let i = -3; i <= 3; i++) {
      line(ctx, [{ x: 33, y: cy + i * 12 }, { x: i ? 39 : 46, y: cy + i * 12 }]);
      line(ctx, [{ x: world.width - 33, y: cy + i * 12 }, { x: world.width - (i ? 39 : 46), y: cy + i * 12 }]);
    }
  }
  ctx.restore();
}

export class BlueprintRenderer {
  width = 0;
  height = 0;
  ratio = 1;
  private textures: Texture[] = [];

  constructor(readonly canvas: HTMLCanvasElement, readonly context: CanvasRenderingContext2D,
    readonly model: BlueprintNavigator) {}

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width; this.height = bounds.height;
    if (!this.width || !this.height) return;
    // Bound both the backing surface and cached sheets on large/retina screens.
    this.ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3_000_000 / (this.width * this.height)));
    this.canvas.width = Math.round(this.width * this.ratio); this.canvas.height = Math.round(this.height * this.ratio);
    this.textures = []; this.draw();
  }
  private texture(world: World) {
    const old = this.textures.find(item => item.world === world);
    if (old) return old.canvas;
    const canvas = document.createElement("canvas");
    const scale = Math.min(fitCamera(world, this.width, this.height).scale * this.ratio * 1.3,
      Math.sqrt(2_000_000 / (world.width * world.height)));
    canvas.width = Math.max(1, Math.ceil(world.width * scale)); canvas.height = Math.max(1, Math.ceil(world.height * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.scale(canvas.width / world.width, canvas.height / world.height); drawWorld(ctx, world, true);
    this.textures.push({ world, canvas });
    return canvas;
  }
  private drawLayer(world: World, camera: Camera, alpha = 1, box?: Box) {
    const ctx = this.context, scale = camera.scale;
    const x = this.width / 2 - camera.x * scale, y = this.height / 2 - camera.y * scale;
    ctx.save(); ctx.globalAlpha = alpha;
    const image = this.texture(world);
    if (box) ctx.drawImage(image, x + box.x * scale, y + box.y * scale, box.w * scale, box.h * scale);
    else ctx.drawImage(image, x, y, world.width * scale, world.height * scale);
    ctx.restore();
  }
  private motion(world: World, camera: Camera, alpha = 1, box?: Box) {
    const ctx = this.context, sx = box ? box.w / world.width : 1, sy = box ? box.h / world.height : 1;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(this.width / 2 - camera.x * camera.scale, this.height / 2 - camera.y * camera.scale);
    ctx.scale(camera.scale, camera.scale);
    if (box) { ctx.translate(box.x, box.y); ctx.scale(sx, sy); }
    for (const [i, route] of world.routes.entries()) {
      const p = pointAlong(route, this.model.time * (world.kind === "city" ? 0.035 : 0.045) + route.phase);
      ctx.fillStyle = i % 3 ? ink.bright : ink.gold;
      ctx.beginPath(); ctx.arc(p.x, p.y, world.kind === "city" ? 2.5 : 2, 0, Math.PI * 2); ctx.fill();
    }
    // Construction marks rise and settle slowly, like a drawing under study.
    const part = world.parts[Math.floor(this.model.time / 9) % world.parts.length];
    const cycle = (this.model.time % 9) / 9, light = Math.sin(cycle * Math.PI) ** 2;
    ctx.save(); ctx.globalAlpha *= light * 0.55;
    ctx.strokeStyle = ink.gold; ctx.lineWidth = 0.9;
    const y = part.y + part.h + 18;
    line(ctx, [{ x: part.x, y }, { x: part.x + part.w, y }]);
    for (const x of [part.x, part.x + part.w]) line(ctx, [{ x: x - 3, y: y + 4 }, { x: x + 3, y: y - 4 }]);
    ctx.restore();
    // A few slowly turning spokes give the mechanism a quiet, physical rhythm.
    if (world.kind === "machine") for (const part of world.parts.filter(p => p.id % 2 === 0)) {
      ctx.save(); ctx.translate(part.x + part.w / 2, part.y + part.h / 2);
      ctx.rotate(this.model.time * 0.08 * (part.id % 4 ? -1 : 1));
      ctx.strokeStyle = "rgba(231, 211, 173, .65)"; ctx.lineWidth = 1;
      const radius = Math.min(part.w, part.h) * 0.45;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2); line(ctx, [{ x: radius * 0.82, y: 0 }, { x: radius * 0.98, y: 0 }]);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  draw() {
    if (!this.width || !this.height) return;
    const ctx = this.context, model = this.model, transition = model.transition;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    const active = transition ? [transition.from, transition.to] : [model.world];
    this.textures = this.textures.filter(item => active.includes(item.world));
    if (transition?.mode === "surface") {
      const t = ease(transition.elapsed / transition.duration);
      const from = fitCamera(transition.from, this.width, this.height), to = fitCamera(transition.to, this.width, this.height);
      const incoming = { ...to, scale: to.scale * (1.15 - t * 0.15) };
      this.drawLayer(transition.from, { ...from, scale: from.scale * (1 - t * 0.28) }, 1 - t);
      this.drawLayer(transition.to, incoming, t);
      this.motion(transition.to, incoming, t);
    } else if (transition?.part) {
      const entering = transition.mode === "in", parent = entering ? transition.from : transition.to,
        child = entering ? transition.to : transition.from, box = transition.part.aperture;
      const progress = transition.elapsed / transition.duration, t = entering ? progress : 1 - progress;
      const camera = mixCamera(fitCamera(parent, this.width, this.height), focusCamera(box, this.width, this.height), t);
      const detail = ease(Math.min(1, t * 2)), surround = 1 - ease(Math.max(0, (t - 0.5) * 2));
      this.drawLayer(parent, camera, surround); this.motion(parent, camera, surround);
      this.drawLayer(child, camera, detail, box); this.motion(child, camera, detail, box);
    } else {
      const camera = fitCamera(model.world, this.width, this.height);
      this.drawLayer(model.world, camera); this.motion(model.world, camera);
      const selected = model.world.parts[model.selected];
      if (selected) {
        const a = selected.aperture, x = this.width / 2 + (a.x - camera.x) * camera.scale,
          y = this.height / 2 + (a.y - camera.y) * camera.scale;
        ctx.strokeStyle = ink.gold; ctx.lineWidth = 1.2;
        corners(ctx, { x: x - 4, y: y - 4, w: a.w * camera.scale + 8, h: a.h * camera.scale + 8 }, 8);
      }
    }
  }
  hit(x: number, y: number) {
    if (this.model.transition) return -1;
    const camera = fitCamera(this.model.world, this.width, this.height);
    const px = camera.x + (x - this.width / 2) / camera.scale, py = camera.y + (y - this.height / 2) / camera.scale;
    return this.model.world.parts.findIndex(p => px >= p.x - 8 && px <= p.x + p.w + 8 && py >= p.y - 8 && py <= p.y + p.h + 8);
  }
}
