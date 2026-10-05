import { HEIGHT, MARBLE_RADIUS, NODE_COUNT, WIDTH } from "./model";
import type { MarbleMachine, Point } from "./model";

const COLOR = "#dce7e0";
function path(ctx: CanvasRenderingContext2D, points: Point[], closed = false) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  if (closed) ctx.closePath(); ctx.stroke();
}
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
}
function bearing(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  circle(ctx, 0, 0, radius); circle(ctx, 0, 0, radius * 0.72); circle(ctx, 0, 0, 3);
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); path(ctx, [{ x: 7, y: 0 }, { x: radius * 0.66, y: 0 }]); }
  ctx.restore();
}
function foot(ctx: CanvasRenderingContext2D, x: number, y: number, width = 56) {
  path(ctx, [{ x: x - width / 2, y }, { x: x + width / 2, y }]);
  for (let i = 0; i < 6; i++) path(ctx, [{ x: x - width / 2 + i * width / 6, y: y + 2 }, { x: x - width / 2 + i * width / 6 - 6, y: y + 9 }]);
}
function rod(ctx: CanvasRenderingContext2D, a: Point, b: Point, width = 6) {
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), nx = -dy / length * width / 2, ny = dx / length * width / 2;
  path(ctx, [{ x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny }], true);
  circle(ctx, a.x, a.y, 3); circle(ctx, b.x, b.y, 3);
}

export class MarbleRenderer {
  width = 0;
  height = 0;
  scale = 1;
  ratio = 1;
  private plate: HTMLCanvasElement | null = null;
  keyboard: Point | null = null;
  constructor(readonly canvas: HTMLCanvasElement, readonly ctx: CanvasRenderingContext2D,
    readonly model: MarbleMachine) {}

  resize() {
    const bounds = this.canvas.getBoundingClientRect(); this.width = bounds.width; this.height = bounds.height;
    if (!this.width || !this.height) return;
    this.ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3_000_000 / (this.width * this.height)));
    this.scale = Math.min(this.width / WIDTH, this.height / HEIGHT) * 0.96;
    this.canvas.width = Math.floor(this.width * this.ratio); this.canvas.height = Math.floor(this.height * this.ratio);
    this.model.clearance = Math.min(76, Math.max(48, 23 / this.scale));
    this.model.setPointer(null, true); this.plate = null; this.draw();
  }
  point(x: number, y: number): Point {
    return { x: (x - this.width / 2) / this.scale + WIDTH / 2, y: (y - this.height / 2) / this.scale + HEIGHT / 2 };
  }
  private background() {
    if (this.plate) return this.plate;
    const plate = document.createElement("canvas"), scale = Math.min(this.scale * this.ratio, 1.5);
    plate.width = Math.ceil(WIDTH * scale); plate.height = Math.ceil(HEIGHT * scale);
    const ctx = plate.getContext("2d")!; ctx.scale(plate.width / WIDTH, plate.height / HEIGHT);
    ctx.strokeStyle = COLOR; ctx.fillStyle = COLOR; ctx.lineWidth = 1.25; ctx.globalAlpha = 0.42;
    // Fixed standards, engraved bearings and the return lift's chain housing.
    for (const [x, top] of [[245, 225], [515, 272], [722, 420]]) {
      path(ctx, [{ x: x - 7, y: top }, { x: x - 7, y: 568 }, { x: x + 7, y: 568 }, { x: x + 7, y: top }]);
      foot(ctx, x, 577, 70);
      for (const y of [top + 17, 552]) { circle(ctx, x, y, 2); }
    }
    path(ctx, [{ x: 245, y: 555 }, { x: 515, y: 555 }, { x: 722, y: 555 }]);
    path(ctx, [{ x: 245, y: 546 }, { x: 515, y: 546 }, { x: 722, y: 546 }]);
    for (let x = 290; x < 680; x += 14) path(ctx, [{ x, y: 554 }, { x: x + 7, y: 548 }]);
    ctx.globalAlpha = 0.65;
    bearing(ctx, 94, 211, 23); bearing(ctx, 94, 473, 23);
    path(ctx, [{ x: 71, y: 211 }, { x: 71, y: 473 }]); path(ctx, [{ x: 117, y: 211 }, { x: 117, y: 473 }]);
    ctx.globalAlpha = 0.28; ctx.setLineDash([3, 7]); path(ctx, [{ x: 94, y: 233 }, { x: 94, y: 451 }]); ctx.setLineDash([]);
    ctx.globalAlpha = 0.45;
    path(ctx, [{ x: 71, y: 498 }, { x: 71, y: 553 }, { x: 117, y: 553 }, { x: 117, y: 498 }]); foot(ctx, 94, 564, 72);
    // A small reduction gear, not a motor hidden outside the illustration.
    bearing(ctx, 287, 364, 43); bearing(ctx, 356, 395, 25);
    ctx.globalAlpha = 0.24;
    for (let i = 0; i < 28; i++) {
      const angle = i * Math.PI * 2 / 28;
      path(ctx, [{ x: 287 + Math.cos(angle) * 46, y: 364 + Math.sin(angle) * 46 },
        { x: 287 + Math.cos(angle) * 51, y: 364 + Math.sin(angle) * 51 }]);
    }
    path(ctx, [{ x: 244, y: 364 }, { x: 94, y: 211 }]); path(ctx, [{ x: 250, y: 350 }, { x: 104, y: 191 }]);
    ctx.globalAlpha = 0.5;
    bearing(ctx, 839, 230, 19); foot(ctx, 839, 568, 53);
    path(ctx, [{ x: 845, y: 249 }, { x: 845, y: 545 }]);
    ctx.globalAlpha = 0.18; ctx.setLineDash([4, 7]); path(ctx, [{ x: 217, y: 138 }, { x: 750, y: 229 }]); ctx.setLineDash([]);
    for (const x of [380, 580]) path(ctx, [{ x, y: 585 }, { x: x + 8, y: 585 }]);
    this.plate = plate; return plate;
  }
  draw() {
    if (!this.width || !this.height) return;
    const ctx = this.ctx, model = this.model, marble = model.marble();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.translate(this.width / 2 - WIDTH / 2 * this.scale, this.height / 2 - HEIGHT / 2 * this.scale); ctx.scale(this.scale, this.scale);
    ctx.drawImage(this.background(), 0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = COLOR; ctx.fillStyle = COLOR; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
    // Two continuous rail edges. Their joints actually carry the moving marble.
    for (const side of [-1, 1]) {
      ctx.globalAlpha = side < 0 ? 0.8 : 0.65; ctx.beginPath();
      for (let i = 0; i < NODE_COUNT; i++) {
        const a = model.points[(i + NODE_COUNT - 1) % NODE_COUNT], b = model.points[(i + 1) % NODE_COUNT], p = model.points[i],
          size = Math.hypot(b.x - a.x, b.y - a.y), x = p.x + (b.y - a.y) / size * 11 * side, y = p.y - (b.x - a.x) / size * 11 * side;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    // Trestles hinge with the bridge instead of leaving the bowed rail unsupported.
    ctx.globalAlpha = 0.57; ctx.lineWidth = 1.1;
    for (const [phase, x, y] of [[0.04, 245, 255], [0.19, 515, 296], [0.3, 722, 366]]) {
      const p = model.at(phase); rod(ctx, { x, y }, { x: p.x, y: p.y + 16 }, 5);
      circle(ctx, x, y, 6);
    }
    const upper = model.at(0.17);
    ctx.globalAlpha = 0.34; ctx.setLineDash([2, 5]);
    path(ctx, [{ x: 515, y: 308 }, { x: upper.x, y: upper.y + 20 }]); ctx.setLineDash([]);
    // A telescoping platform extends as the lower route gives the visitor room.
    const extension = model.platform * 84, platformY = 519 + model.platform * 26;
    ctx.globalAlpha = 0.62;
    rod(ctx, { x: 430, y: 540 }, { x: 630 + extension, y: platformY }, 9);
    rod(ctx, { x: 477, y: 570 }, { x: 580 + extension * 0.45, y: platformY }, 5);
    circle(ctx, 430, 540, 7); circle(ctx, 477, 570, 6);
    const collarX = 530 + extension * 0.2, collarY = 540 + (platformY - 540) * (collarX - 430) / (200 + extension);
    ctx.strokeRect(collarX - 9, collarY - 8, 18, 16);
    // The falling counterweight pulls the hinged right-hand passage outward.
    const courtesy = Math.max(model.gate, model.bridge * 0.25, model.platform * 0.35), weightY = 319 + courtesy * 91;
    const gate = model.at(0.405), hinge = { x: 742, y: 429 };
    ctx.globalAlpha = 0.65;
    path(ctx, [{ x: gate.x + 20, y: gate.y - 9 }, { x: 824, y: 217 }, { x: 853, y: 217 }, { x: 853, y: weightY }]);
    rod(ctx, hinge, { x: gate.x + 17, y: gate.y + 13 }, 7); circle(ctx, hinge.x, hinge.y, 7);
    ctx.strokeRect(840, weightY, 26, 38);
    for (let y = 8; y < 36; y += 7) path(ctx, [{ x: 845, y: weightY + y }, { x: 861, y: weightY + y }]);
    ctx.globalAlpha = 0.42; bearing(ctx, 839, 230, 19, courtesy * 2 + model.time * 0.08);
    // A linked cradle carries the marble up the return lift, then quietly releases it.
    const onLift = marble.x < 211 && marble.ty < -0.25;
    if (onLift) {
      ctx.globalAlpha = 0.7;
      rod(ctx, { x: 94, y: marble.y + 9 }, { x: marble.x - 2, y: marble.y + 9 }, 5);
      path(ctx, [{ x: marble.x - 14, y: marble.y - 3 }, { x: marble.x - 11, y: marble.y + 12 },
        { x: marble.x + 11, y: marble.y + 12 }, { x: marble.x + 14, y: marble.y - 3 }]);
      ctx.strokeRect(88, marble.y + 2, 12, 14);
    }
    ctx.globalAlpha = 0.34;
    bearing(ctx, 287, 364, 31, model.time * 0.12); bearing(ctx, 356, 395, 17, -model.time * 0.21);
    const release = Math.max(0, 1 - Math.min(model.phase, 1 - model.phase) * 40);
    ctx.save(); ctx.translate(214, 193); ctx.rotate(-0.22 - release * 0.45 - model.bridge * 0.25);
    path(ctx, [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 5 }]); circle(ctx, 0, 0, 3); ctx.restore();
    // A single, unadorned sphere. A rotating engraved arc makes its roll legible.
    ctx.globalAlpha = 1; ctx.fillStyle = "#0a2832"; ctx.beginPath(); ctx.arc(marble.x, marble.y, MARBLE_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; circle(ctx, marble.x, marble.y, MARBLE_RADIUS);
    ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(marble.x, marble.y, MARBLE_RADIUS * 0.56, model.rotation, model.rotation + Math.PI * 0.7); ctx.stroke();
    if (this.keyboard) {
      ctx.globalAlpha = 0.42; ctx.setLineDash([3, 6]); circle(ctx, this.keyboard.x, this.keyboard.y, model.clearance - 8); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}
