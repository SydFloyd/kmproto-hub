import { Contra, HEIGHT, WIDTH, type Player } from "./engine";
import { pixelText } from "../pixel-text";

// Original 5×7 lettering and geometric sprites. Everything is drawn at 320×240.
function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) { ctx.fillStyle = color; ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)); }
function pixelLine(ctx: CanvasRenderingContext2D, color: string, x1: number, y1: number, x2: number, y2: number, thickness = 1) {
  const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
  for (let i = 0; i <= steps; i++) rect(ctx, color, x1 + (x2 - x1) * i / Math.max(1, steps), y1 + (y2 - y1) * i / Math.max(1, steps), thickness, thickness);
}
const hash = (value: number) => ((value * 1103515245 + 12345) >>> 8) % 997;

function background(ctx: CanvasRenderingContext2D, game: Contra) {
  const skin = game.stage.skin, time = game.time, camera = game.cameraX;
  rect(ctx, ["jungle", "waterfall"].includes(skin) ? "#081c28" : skin === "snow" ? "#18243d" : skin === "alien" ? "#180a24" : "#080c20", 0, 0, WIDTH, HEIGHT);
  if (skin === "base") {
    rect(ctx, "#143e64", 32, 40, 256, 126); rect(ctx, "#080c20", 41, 49, 238, 108);
    for (let x = 40; x < 280; x += 32) { rect(ctx, "#1d5076", x, 51, 2, 104); rect(ctx, "#5a8aa0", x + 4, 54, 1, 18); }
    for (let y = 56; y < 153; y += 24) rect(ctx, "#1d5076", 42, y, 235, 2);
    rect(ctx, "#15324b", 0, 170, WIDTH, 70);
    for (let x = -240; x < 600; x += 48) pixelLine(ctx, "#2b6380", 160 + (x - 160) * .18, 168, x, HEIGHT);
    for (const y of [170, 179, 196, 224]) rect(ctx, "#2b6380", 0, y, WIDTH, 1);
    if (!game.boss.roomClear) {
      rect(ctx, "#8be8ee", 18, 171, 284, 1);
      for (let x = 20; x < 300; x += 12) pixelLine(ctx, "#448cf0", x, 173, x + 6, 170 + Math.sin(time * 8 + x) * 3);
    }
    return;
  }
  if (skin === "jungle" || skin === "waterfall") {
    for (let layer = 0; layer < 3; layer++) {
      const spacing = [58, 44, 76][layer], offset = camera * [.13, .28, .5][layer];
      const color = ["#103d38", "#176043", "#1d784b"][layer];
      for (let i = Math.floor(offset / spacing) - 1; i < Math.floor((offset + WIDTH) / spacing) + 2; i++) {
        const x = i * spacing - offset, canopy = 46 + hash(i + layer * 80) % 53;
        rect(ctx, "#173a36", x + 18, canopy, 9, HEIGHT - canopy);
        for (let j = 0; j < 5; j++) rect(ctx, color, x - 14 + j * 7, canopy - j % 3 * 9, 38, 12);
        pixelLine(ctx, color, x + 20, canopy + 13, x - 6, canopy + 44, 2);
      }
    }
    if (skin === "waterfall") {
      rect(ctx, "#20788a", 126, 28, 67, HEIGHT);
      for (let i = 0; i < 26; i++) { const y = (i * 19 + time * 82 - game.cameraY * .4) % 250; rect(ctx, i % 2 ? "#70cbd1" : "#43a8b4", 130 + hash(i) % 54, y, 4, 14 + i % 5); }
    } else {
      rect(ctx, "#165b7b", 0, 217, WIDTH, 23);
      for (let x = 0; x < WIDTH; x += 19) rect(ctx, "#499eaa", x + Math.floor(time * 10) % 19, 229 + x % 3, 11, 1);
    }
  } else if (skin === "snow") {
    for (let i = 0; i < 6; i++) {
      const x = i * 90 - camera * .14 % 90;
      for (let j = 0; j < 7; j++) rect(ctx, j < 3 ? "#b5d4dd" : "#507e99", x + j * 7, 90 + j * 7, 90 - j * 12, 8);
    }
    for (let i = -1; i < 8; i++) {
      const x = i * 52 - camera * .4 % 52;
      rect(ctx, "#47657a", x + 16, 136, 5, 80);
      for (let j = 0; j < 5; j++) { rect(ctx, "#2e6070", x + 14 - j * 5, 125 + j * 13, 8 + j * 10, 12); rect(ctx, "#d7e5e4", x + 14 - j * 5, 125 + j * 13, 8 + j * 10, 3); }
    }
    for (let i = 0; i < 26; i++) rect(ctx, "#b5d4dd", hash(i * 2) % WIDTH, (hash(i * 3) + time * 16) % HEIGHT, 1, 2);
  } else if (skin === "alien") {
    for (let i = 0; i < 24; i++) {
      const x = i * 22 - camera * .35 % 22, y = 34 + hash(i) % 140;
      rect(ctx, "#46233e", x, y, 18, 44); rect(ctx, "#733448", x + 3, y + 5, 8, 24);
      pixelLine(ctx, "#91444b", x + 7, y + 4, x + 19, y - 16, 2);
      pixelLine(ctx, "#46233e", x + 8, y + 42, x - 4, y + 70, 3);
    }
  } else {
    for (let x = Math.floor(camera * .4 / 32) * 32; x < camera * .4 + WIDTH + 32; x += 32) {
      rect(ctx, "#1a243c", x - camera * .4, 32, 30, 180);
      for (let y = 36; y < 214; y += 28) { rect(ctx, "#2d3d56", x - camera * .4 + 2, y, 26, 2); rect(ctx, "#536777", x - camera * .4 + 5, y + 4, 2, 3); }
    }
    for (let x = 0; x < WIDTH; x += 64) {
      rect(ctx, "#405469", x - camera * .2 % 64, 58, 46, 8); rect(ctx, "#8a99a1", x - camera * .2 % 64, 58, 46, 2);
      rect(ctx, "#35535d", x + 17 - camera * .2 % 64, 66, 7, 124);
    }
  }
}

function platforms(ctx: CanvasRenderingContext2D, game: Contra) {
  for (const platform of game.platforms) {
    if (game.stage.kind === "base") continue;
    const y = platform.y, x = platform.x, w = platform.width, skin = game.stage.skin;
    const base = skin === "snow" ? "#57788c" : ["energy", "hangar"].includes(skin) ? "#354658" : skin === "alien" ? "#583041" : "#735331";
    rect(ctx, base, x, y, w, platform.solid ? 30 : 10);
    rect(ctx, skin === "snow" ? "#e0ece7" : skin === "alien" ? "#af6053" : ["energy", "hangar"].includes(skin) ? "#929fa2" : "#7ca044", x, y, w, 3);
    for (let bx = Math.floor(x / 12) * 12; bx < x + w; bx += 12) {
      const left = Math.max(x, bx), width = Math.min(x + w, bx + 10) - left;
      if (width > 0) { rect(ctx, "#222636", left, y + 6, width, 2); rect(ctx, base === "#735331" ? "#a37b49" : "#607080", left + 2, y + 4, Math.max(1, width - 4), 1); }
    }
    if (!platform.solid && skin === "jungle") { rect(ctx, "#563a29", x + 9, y + 10, 5, 42); rect(ctx, "#563a29", x + w - 13, y + 10, 5, 42); }
  }
}

function soldier(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, color: string, time: number, moving: boolean, prone = false, jump = false) {
  ctx.save(); ctx.translate(Math.floor(x), Math.floor(y));
  if (jump) { ctx.translate(0, -12); ctx.rotate(time * 13 * facing); ctx.translate(0, 12); }
  ctx.scale(facing, 1);
  if (prone) {
    rect(ctx, "#17192b", -12, -6, 25, 6); rect(ctx, color, -11, -5, 12, 4); rect(ctx, "#efb17b", 1, -6, 8, 4); rect(ctx, "#f3d098", 7, -7, 5, 4); rect(ctx, "#cf4038", 7, -7, 5, 1);
  } else {
    const stride = moving ? Math.floor(Math.sin(time * 18) * 3) : 1;
    rect(ctx, "#141522", -5, -24, 10, 23);
    rect(ctx, "#b67458", -2, -20, 6, 5); rect(ctx, "#efbd87", -1, -23, 5, 6); rect(ctx, "#d94344", -2, -23, 7, 2); rect(ctx, "#251b29", 3, -21, 2, 1);
    rect(ctx, "#efbd87", -4, -17, 10, 7); rect(ctx, "#b67458", -4, -16, 2, 7); rect(ctx, "#ffdab0", -1, -16, 5, 2);
    rect(ctx, "#efbd87", 5, -16, 5, 3); rect(ctx, "#714354", 1, -10, 5, 1);
    rect(ctx, color, -4, -10, 10, 5); rect(ctx, color, -4 + stride, -6, 4, 5); rect(ctx, color, 2 - stride, -6, 4, 5);
    rect(ctx, "#c8d6ce", -5 + stride, -2, 5, 2); rect(ctx, "#c8d6ce", 2 - stride, -2, 5, 2);
  }
  ctx.restore();
}
function player(ctx: CanvasRenderingContext2D, p: Player, game: Contra) {
  if (!p.alive) return;
  ctx.save();
  if (p.invincible > 0) ctx.globalAlpha = Math.sin(game.time * 22) > 0 ? .5 : 1;
  if (p.swimming) {
    rect(ctx, "#efbd87", p.x - 2, p.y - 7, 5, 5); rect(ctx, "#d94344", p.x - 3, p.y - 7, 7, 2);
    rect(ctx, "#9ac0bc", p.x - 8, p.y - 2, 16, 1);
  } else soldier(ctx, p.x, p.y, p.facing, p.id ? "#e86c38" : "#3b8cdb", game.time, Math.abs(p.vx) > 0, p.prone, !p.grounded);
  const y = p.y - (p.prone || p.swimming ? 6 : 17);
  pixelLine(ctx, "#15202d", p.x, y, p.x + Math.cos(p.aim) * 14, y + Math.sin(p.aim) * 9, 3);
  pixelLine(ctx, "#b5c9ce", p.x + Math.cos(p.aim) * 3, y, p.x + Math.cos(p.aim) * 13, y + Math.sin(p.aim) * 9, 1);
  if (p.shield > 0) { ctx.strokeStyle = "#87f7f0"; ctx.lineWidth = 1; ctx.strokeRect(Math.floor(p.x - 11), Math.floor(p.y - 27), 22, 29); }
  ctx.restore();
}
function boss(ctx: CanvasRenderingContext2D, game: Contra) {
  const { x, y, nodes } = game.boss, stage = game.stage;
  if (stage.kind === "base") {
    if (game.room === stage.rooms - 1) {
      rect(ctx, "#264c75", x - 46, y - 29, 92, 66); rect(ctx, "#83a0aa", x - 38, y - 22, 76, 11);
      rect(ctx, "#142944", x - 30, y - 9, 60, 30); rect(ctx, "#628298", x - 34, y + 24, 68, 8);
    }
  } else if (stage.skin === "jungle") {
    rect(ctx, "#38545c", x - 25, y - 62, 87, 88); rect(ctx, "#718884", x - 29, y - 64, 91, 9);
    for (let by = y - 51; by < y + 22; by += 13) for (let bx = x - 22; bx < x + 62; bx += 19) { rect(ctx, "#243d45", bx, by, 16, 2); rect(ctx, "#526a70", bx + 2, by + 2, 13, 2); }
    rect(ctx, "#0b152b", x - 13, y - 14, 50, 40);
  } else if (stage.skin === "waterfall") {
    for (let i = 0; i < 5; i++) rect(ctx, i % 2 ? "#a4bac0" : "#3d6580", x - 36 + i * 7, y - 44 + i * 8, 72 - i * 14, 16);
    rect(ctx, "#37607b", x - 90, y - 45, 30, 17); rect(ctx, "#37607b", x + 60, y - 45, 30, 17);
  } else if (stage.skin === "snow") {
    rect(ctx, "#647677", x - 35, y - 25, 96, 42); rect(ctx, "#aababc", x - 32, y - 28, 90, 7);
    rect(ctx, "#263a50", x - 39, y + 14, 105, 12); for (let bx = x - 36; bx < x + 62; bx += 13) rect(ctx, "#72818c", bx, y + 17, 8, 6);
    rect(ctx, "#6c8185", x - 26, y - 46, 55, 20); rect(ctx, "#b3bcb1", x - 61, y - 40, 54, 5);
  } else if (stage.skin === "alien") {
    rect(ctx, "#632343", x - 33, y - 70, 96, 96);
    for (let i = 0; i < 12; i++) pixelLine(ctx, i % 2 ? "#e95864" : "#923247", x + 10, y - 15, x - 34 + hash(i) % 98, y - 69 + hash(i + 3) % 95, 3);
    rect(ctx, "#b7445d", x - 18, y - 27, 37, 38); rect(ctx, "#f6756e", x - 12, y - 21, 23, 27);
  } else {
    rect(ctx, "#455979", x - 27, y - 58, 64, 52); rect(ctx, "#c1c1a6", x - 19, y - 54, 46, 8);
    rect(ctx, "#162a4a", x - 16, y - 35, 39, 15); rect(ctx, "#547093", x - 32, y - 9, 77, 28);
    rect(ctx, "#a85558", x - 29, y + 11, 19, 15); rect(ctx, "#a85558", x + 13, y + 11, 19, 15);
    rect(ctx, "#899bab", x - 48, y - 43, 27, 8);
  }
  for (const node of nodes) {
    if (node.hp <= 0) { rect(ctx, "#15182b", node.x - 8, node.y - 8, 16, 16); continue; }
    const locked = node.core && nodes.some(other => !other.core && other.hp > 0);
    rect(ctx, "#0b1227", node.x - node.radius - 2, node.y - node.radius - 2, node.radius * 2 + 4, node.radius * 2 + 4);
    rect(ctx, locked ? "#697a82" : node.core ? "#ffb23e" : "#b67e6f", node.x - node.radius, node.y - node.radius, node.radius * 2, node.radius * 2);
    rect(ctx, locked ? "#26394c" : node.core ? "#d84047" : "#17304b", node.x - node.radius + 3, node.y - node.radius + 3, node.radius * 2 - 6, node.radius * 2 - 6);
    if (!node.core) rect(ctx, "#e5cfb1", node.x - 3, node.y - 2, 6, 4);
  }
}

export function drawContra(ctx: CanvasRenderingContext2D, game: Contra) {
  ctx.imageSmoothingEnabled = false;
  background(ctx, game);
  ctx.save(); ctx.translate(-Math.floor(game.cameraX), -Math.floor(game.cameraY));
  platforms(ctx, game); boss(ctx, game);
  for (const enemy of game.enemies) if (enemy.hp > 0 && (enemy.active || game.mode === "ready")) {
    if (enemy.type === "turret") {
      rect(ctx, "#243042", enemy.x - 10, enemy.y - 15, 20, 15); rect(ctx, "#778b86", enemy.x - 8, enemy.y - 15, 16, 5);
      rect(ctx, "#b4beb1", enemy.x + (enemy.facing < 0 ? -17 : 6), enemy.y - 11, 11, 3);
    } else soldier(ctx, enemy.x, enemy.y, enemy.facing, enemy.type === "hopper" ? "#df5478" : "#c14b4f", game.time, enemy.type === "runner" || !enemy.grounded, false, !enemy.grounded);
  }
  for (const crate of game.crates) if (crate.hp > 0) {
    rect(ctx, "#09162c", crate.x - 10, crate.y - 9, 20, 18); rect(ctx, "#9bafab", crate.x - 9, crate.y - 8, 18, 16);
    rect(ctx, "#254963", crate.x - 7, crate.y - 6, 14, 12);
    if (crate.flying) { rect(ctx, "#e0c29a", crate.x - 15, crate.y - 3, 6, 5); rect(ctx, "#e0c29a", crate.x + 9, crate.y - 3, 6, 5); }
    pixelText(ctx, crate.power, crate.x - 2, crate.y - 3, "#f6dfb1");
  }
  for (const pickup of game.pickups) {
    rect(ctx, "#f35d3d", pickup.x - 6, pickup.y - 5, 12, 11); rect(ctx, "#f2c87d", pickup.x - 13, pickup.y - 4, 7, 4); rect(ctx, "#f2c87d", pickup.x + 6, pickup.y - 4, 7, 4);
    pixelText(ctx, pickup.power, pickup.x - 2, pickup.y - 3, "#fff6dc");
  }
  for (const shot of game.shots) {
    const color = shot.owner < 0 ? "#ffc26b" : shot.weapon === "L" ? "#88eff1" : shot.weapon === "F" ? "#fc7948" : "#fbe8b3";
    if (shot.weapon === "L") pixelLine(ctx, color, shot.x, shot.y, shot.x - shot.vx / 40, shot.y - shot.vy / 40, 2);
    else rect(ctx, color, shot.x - 1, shot.y - 1, shot.weapon === "F" ? 5 : 3, shot.weapon === "F" ? 5 : 3);
  }
  for (const p of game.players) player(ctx, p, game);
  for (const particle of game.particles) rect(ctx, particle.color, particle.x, particle.y, 2, 2);
  if (game.stage.skin === "energy" || game.stage.skin === "hangar") {
    for (let x = 620; x < game.stage.width - 210; x += 420) {
      rect(ctx, "#a88c58", x, 209, 20, 7);
      if (game.hazardAt(x + 9)) for (let i = 0; i < 5; i++) rect(ctx, i % 2 ? "#ffbc45" : "#e95e3c", x + i * 4, 171 + Math.sin(game.time * 11 + i) * 4, 3, 42);
    }
  }
  ctx.restore();
  rect(ctx, "#080c1c", 0, 0, WIDTH, 27);
  const p1 = game.players[0], p2 = game.players[1];
  pixelText(ctx, `1P ${String(p1?.score ?? 0).padStart(6, "0")}`, 7, 5, "#f7ead3");
  pixelText(ctx, `${p1?.lives ?? 3} LIFE  ${p1?.weapon ?? "N"}${p1?.rapid ? "R" : ""}`, 7, 16, "#7bbbf0");
  if (p2) { pixelText(ctx, `2P ${String(p2.score).padStart(6, "0")}`, 190, 5); pixelText(ctx, `${p2.lives} LIFE  ${p2.weapon}${p2.rapid ? "R" : ""}`, 190, 16, "#f0a47e"); }
  else { pixelText(ctx, `ZONE ${game.stageIndex + 1}/8`, 235, 5); pixelText(ctx, game.stage.kind === "base" ? `ROOM ${game.room + 1}/${game.stage.rooms}` : game.stage.name, 320 - game.stage.name.length * 6 - 6, 16, "#aab8c6"); }
  if (game.boss.active && !game.boss.roomClear && game.mode === "playing") {
    rect(ctx, "#100b26", 91, 29, 138, 8); rect(ctx, "#b75050", 93, 31, 134 * game.snapshot().boss / 100, 4);
  }
  if (game.stage.kind === "base" && game.boss.roomClear) pixelText(ctx, "MOVE UP TO ADVANCE", 160, 141, "#b8f0da", 1, true);
  if (["ready", "paused", "over", "won"].includes(game.mode)) {
    ctx.fillStyle = "#080c1cdd"; ctx.fillRect(23, 47, 274, 126);
    if (game.mode === "ready") {
      pixelText(ctx, "CONTRA", 162, 45, "#651e42", 5, true); pixelText(ctx, "CONTRA", 160, 42, "#ee7147", 5, true);
      pixelText(ctx, "EIGHT ZONES. ONE MISSION.", 160, 91, "#d5d6cc", 1, true);
    } else pixelText(ctx, game.mode === "paused" ? "PAUSED" : game.mode === "won" ? "MISSION COMPLETE" : "GAME OVER", 160, 70, game.mode === "won" ? "#a8e5ae" : "#edcfb3", 2, true);
    rect(ctx, "#080c1c", 0, 225, WIDTH, 15);
    pixelText(ctx, game.mode === "ready" && game.thirtyLives ? "30 LIFE MODE" : `HIGH SCORE ${game.best}`, 160, 229, "#d5d6cc", 1, true);
  }
  if (game.mode === "clear") {
    ctx.fillStyle = "#080c1cdd"; ctx.fillRect(28, 79, 264, 74);
    pixelText(ctx, "ZONE CLEAR", 160, 91, "#abe6b2", 2, true);
    pixelText(ctx, "BONUS: ONE LIFE", 160, 117, "#f0d5a0", 1, true);
    pixelText(ctx, `SCORE ${game.score}`, 160, 133, "#d5d6cc", 1, true);
  }
}
