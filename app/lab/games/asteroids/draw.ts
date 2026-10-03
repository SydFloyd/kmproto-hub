import { Asteroids, HEIGHT, WIDTH } from "./engine";

// A small, single-stroke alphabet keeps the display independent of web fonts.
const glyphs: Record<string, string[]> = {
  A: ["0,7 2.5,0 5,7", "1,4 4,4"], B: ["0,7 0,0 3.5,0 5,1.5 3.5,3.5 0,3.5", "3.5,3.5 5,5.2 3.5,7 0,7"],
  C: ["5,0 0,0 0,7 5,7"], D: ["0,7 0,0 3,0 5,2 5,5 3,7 0,7"], E: ["5,0 0,0 0,7 5,7", "0,3.5 4,3.5"],
  G: ["5,1 4,0 0,0 0,7 5,7 5,4 3,4"], H: ["0,0 0,7", "5,0 5,7", "0,3.5 5,3.5"], I: ["0,0 5,0", "2.5,0 2.5,7", "0,7 5,7"],
  M: ["0,7 0,0 2.5,3.5 5,0 5,7"], O: ["1,0 4,0 5,1 5,6 4,7 1,7 0,6 0,1 1,0"], P: ["0,7 0,0 5,0 5,3.5 0,3.5"],
  R: ["0,7 0,0 5,0 5,3.5 0,3.5", "2.5,3.5 5,7"], S: ["5,0 0,0 0,3.5 5,3.5 5,7 0,7"], T: ["0,0 5,0", "2.5,0 2.5,7"],
  U: ["0,0 0,6 1,7 4,7 5,6 5,0"], V: ["0,0 2.5,7 5,0"], W: ["0,0 1,7 2.5,3.5 4,7 5,0"],
  "0": ["1,0 4,0 5,1 5,6 4,7 1,7 0,6 0,1 1,0"], "1": ["1,1 2.5,0 2.5,7", "1,7 4,7"],
  "2": ["0,0 5,0 5,3.5 0,3.5 0,7 5,7"], "3": ["0,0 5,0 5,7 0,7", "0,3.5 5,3.5"],
  "4": ["0,0 0,3.5 5,3.5", "5,0 5,7"], "5": ["5,0 0,0 0,3.5 5,3.5 5,7 0,7"],
  "6": ["5,0 0,0 0,7 5,7 5,3.5 0,3.5"], "7": ["0,0 5,0 2,7"], "8": ["0,0 5,0 5,7 0,7 0,0", "0,3.5 5,3.5"],
  "9": ["5,7 5,0 0,0 0,3.5 5,3.5"],
};
const letters = Object.fromEntries(Object.entries(glyphs).map(([letter, paths]) => [letter, paths.map(path => path.split(" ").map(point => point.split(",").map(Number)))]));

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, height: number, centered = false) {
  const scale = height / 7;
  ctx.save();
  ctx.translate(centered ? x - (value.length * 7 - 2) * scale / 2 : x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.35 / scale;
  for (const letter of value) {
    for (const path of letters[letter] ?? []) {
      ctx.beginPath();
      path.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
      ctx.stroke();
    }
    ctx.translate(7, 0);
  }
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function ship(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(size, size);
  line(ctx, [[15, 0], [-11, -9], [-6, 0], [-11, 9], [15, 0]]);
  ctx.restore();
}

function wrapped(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, draw: () => void) {
  const xs = [0], ys = [0];
  if (x < radius) xs.push(WIDTH);
  if (x > WIDTH - radius) xs.push(-WIDTH);
  if (y < radius) ys.push(HEIGHT);
  if (y > HEIGHT - radius) ys.push(-HEIGHT);
  for (const dx of xs) for (const dy of ys) { ctx.save(); ctx.translate(x + dx, y + dy); draw(); ctx.restore(); }
}

export function drawAsteroids(ctx: CanvasRenderingContext2D, game: Asteroids, thrust: boolean, time: number) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#f1f1eb";
  ctx.fillStyle = "#f1f1eb";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "#eee";
  ctx.shadowBlur = 2;
  ctx.globalAlpha = game.mode === "playing" ? 1 : .45;
  for (const rock of game.rocks) {
    wrapped(ctx, rock.x, rock.y, rock.radius, () => {
      line(ctx, [...rock.outline, rock.outline[0]].map((radius, i) => [Math.cos(i * Math.PI / 6) * radius * rock.radius, Math.sin(i * Math.PI / 6) * radius * rock.radius]));
    });
  }
  if (game.ship.alive && game.mode !== "ready") {
    wrapped(ctx, game.ship.x, game.ship.y, 28, () => {
      ship(ctx, 0, 0, game.ship.angle);
      if (thrust && game.mode === "playing") {
        ctx.rotate(game.ship.angle);
        line(ctx, [[-8, -5], [-20 - Math.sin(time * 45) * 5, 0], [-8, 5]]);
      }
    });
  }
  if (game.saucer) {
    const saucer = game.saucer;
    // Saucers enter and leave horizontally rather than wrapping in that axis.
    for (const dy of [0, saucer.y < 30 ? HEIGHT : saucer.y > HEIGHT - 30 ? -HEIGHT : 0].filter((value, i, all) => all.indexOf(value) === i)) {
      ctx.save(); ctx.translate(saucer.x, saucer.y + dy); ctx.scale(saucer.small ? .6 : 1, saucer.small ? .6 : 1);
      line(ctx, [[-27, 0], [-12, -10], [12, -10], [27, 0], [12, 10], [-12, 10], [-27, 0], [27, 0]]);
      line(ctx, [[-12, -10], [-7, -19], [7, -19], [12, -10]]);
      ctx.restore();
    }
  }
  for (const bullet of game.bullets) {
    wrapped(ctx, bullet.x, bullet.y, 3, () => { ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill(); });
  }
  for (const spark of game.sparks) {
    ctx.globalAlpha = spark.life / spark.duration;
    wrapped(ctx, spark.x, spark.y, spark.length, () => {
      ctx.rotate(spark.angle);
      line(ctx, [[-spark.length / 2, 0], [spark.length / 2, 0]]);
    });
  }
  ctx.globalAlpha = 1;
  text(ctx, String(game.score).padStart(2, "0"), 64, 42, 30);
  text(ctx, "HIGH SCORE", WIDTH / 2, 23, 13, true);
  text(ctx, String(game.best).padStart(2, "0"), WIDTH / 2, 47, 23, true);
  text(ctx, "WAVE", WIDTH - 154, 26, 13);
  text(ctx, String(game.wave).padStart(2, "0"), WIDTH - 145, 49, 23);
  for (let i = 0; i < Math.min(game.lives, 10); i++) ship(ctx, 75 + i * 25, 104, -Math.PI / 2, .7);
  if (game.lives > 10) text(ctx, String(game.lives), 330, 95, 18);
  if (game.mode === "ready") text(ctx, "ASTEROIDS", WIDTH / 2, HEIGHT * .36, 58, true);
  else if (game.mode === "paused") text(ctx, "PAUSED", WIDTH / 2, HEIGHT * .4, 44, true);
  else if (game.mode === "over") text(ctx, "GAME OVER", WIDTH / 2, HEIGHT * .4, 44, true);
  ctx.shadowBlur = 0;
}
