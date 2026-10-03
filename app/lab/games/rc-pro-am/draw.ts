import { Course, HEIGHT, ROAD, WIDTH, project, type Point, type RCProAm, type Car } from "./engine";
import { pixelText } from "../pixel-text";

const colors = ["#f94b24", "#448fff", "#72d13e", "#ffb332"];
const vehicles = ["TRUCK", "4-WHEELER", "OFF-ROADER"];
function polygon(ctx: CanvasRenderingContext2D, points: number[][], color: string) {
  ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => { if (i) ctx.lineTo(Math.round(x), Math.round(y)); else ctx.moveTo(Math.round(x), Math.round(y)); }); ctx.closePath(); ctx.fill();
}
function tree(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  ctx.fillStyle = "#075708"; ctx.fillRect(x - 3, y + 1, 12, 3);
  ctx.fillStyle = "#513912"; ctx.fillRect(x, y - 6, 2, 8);
  for (let i = 0; i < 3; i++) {
    const yy = y - 5 - i * 5, xx = x + ((seed + i) % 3) - 1;
    polygon(ctx, [[xx - 4, yy], [xx - 3, yy - 5], [xx + 1, yy - 7], [xx + 4, yy - 4], [xx + 3, yy + 1]], "#12380a");
    ctx.fillStyle = "#80bd29"; ctx.fillRect(xx - 2, yy - 5, 3, 2); ctx.fillStyle = "#3e8015"; ctx.fillRect(xx + 1, yy - 2, 2, 3);
  }
}
function car(ctx: CanvasRenderingContext2D, c: Car, x: number, y: number, time: number, vehicle: number) {
  if (c.crash) return;
  const frame = Math.round(c.angle / (Math.PI / 8)) * Math.PI / 8;
  const cos = Math.cos(frame), sin = Math.sin(frame);
  const transform = (a: number, b: number, h = 0) => { const wx = cos * a - sin * b, wy = sin * a + cos * b; return [x + wx - wy, y + (wx + wy) * .5 - h]; };
  const part = (a: number, b: number, w: number, d: number, h: number, fill: string) => polygon(ctx, [transform(a, b, h), transform(a + w, b, h), transform(a + w, b + d, h), transform(a, b + d, h)], fill);
  part(-7, -6, 17, 15, -1, "#075509");
  if (c.shield > 0 && Math.floor(time * 12) % 2) { ctx.strokeStyle = "#f1ffff"; ctx.strokeRect(Math.round(x - 13), Math.round(y - 13), 26, 18); }
  const length = vehicle === 2 ? 17 : 15;
  for (const a of [-6, 4]) for (const b of [-7, 4]) { part(a, b, 5, 4, 1, "#121419"); part(a, b, 3, 3, 3, "#808b92"); }
  part(-length / 2, -5, length, 10, 3, "#381c12"); part(-length / 2, -5, length, 10, 5, colors[c.id]);
  part(0, -4, 4, 8, 6, "#bee7ec"); part(1, -3, 3, 6, 7, "#263649"); part(-5, -3, 5, 6, 7, colors[c.id]);
  if (vehicle === 0) { part(-7, -3, 2, 6, 6, "#252931"); part(-7, -2, 3, 4, 4, "#783426"); }
  if (vehicle === 2) { part(-5, -4, 1, 8, 8, "#e5f1f2"); part(-1, -4, 1, 8, 8, "#e5f1f2"); }
  part(6, -4, 1, 2, 6, "#fff3b6"); part(6, 2, 1, 2, 6, "#fff3b6");
  if (!c.id) { ctx.fillStyle = "#fff2c7"; ctx.fillRect(Math.round(x), Math.round(y - 8), 2, 2); }
}
function pickup(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, time: number, letters: number) {
  ctx.fillStyle = "#113418"; ctx.fillRect(x - 5, y - 2, 12, 5);
  if (kind === "tires") { ctx.fillStyle = "#111722"; ctx.fillRect(x - 5, y - 8, 10, 7); ctx.fillStyle = "#849cbd"; ctx.fillRect(x - 3, y - 7, 6, 3); ctx.fillStyle = "#182a45"; ctx.fillRect(x - 1, y - 6, 2, 2); }
  else if (kind === "star") { polygon(ctx, [[x,y-10],[x+2,y-6],[x+6,y-6],[x+3,y-3],[x+4,y+1],[x,y-1],[x-4,y+1],[x-3,y-3],[x-6,y-6],[x-2,y-6]], "#ffe181"); }
  else {
    const fill = kind === "letter" ? Math.floor(time * 6) % 2 ? "#e9f57b" : "#65e86a" : kind === "skull" ? "#ecf2ed" : kind === "cage" ? "#8dfcad" : ["engine", "turbo"].includes(kind) ? "#77baff" : "#ffe373";
    ctx.fillStyle = "#172930"; ctx.fillRect(x - 6, y - 11, 12, 11); ctx.fillStyle = fill; ctx.fillRect(x - 5, y - 10, 10, 9);
    if (kind === "skull") { ctx.fillStyle = "#141414"; ctx.fillRect(x - 3, y - 7, 2, 2); ctx.fillRect(x + 1, y - 7, 2, 2); ctx.fillRect(x - 1, y - 3, 2, 1); }
    else pixelText(ctx, kind === "letter" ? "NINTENDO"[Math.min(7, letters)] : kind === "engine" ? "E" : kind === "turbo" ? "T" : kind === "cage" ? "R" : kind === "bomb" ? "B" : "M", x - 2, y - 9, "#163543");
  }
}
function miniMap(ctx: CanvasRenderingContext2D, game: RCProAm, left: number, top: number, width: number, height: number, cars = true, course = game.course) {
  const pts = course.points.map(project), minX = Math.min(...pts.map(p => p.x)), minY = Math.min(...pts.map(p => p.y));
  const scale = Math.min((width - 8) / (Math.max(...pts.map(p => p.x)) - minX), (height - 8) / (Math.max(...pts.map(p => p.y)) - minY));
  const transform = (p: Point) => ({ x: left + 4 + (p.x - minX) * scale, y: top + 4 + (p.y - minY) * scale });
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#707a7d"; ctx.beginPath(); pts.forEach((p,i) => { const q=transform(p); if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y); }); ctx.closePath(); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = "#141a18"; ctx.stroke();
  if (cars) for (const c of game.cars) { const p = transform(project(c)); ctx.fillStyle = colors[c.id]; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); }
}
function roadScene(ctx: CanvasRenderingContext2D, game: RCProAm) {
  const p = project(game.player), camX = Math.round(WIDTH / 2 - p.x), camY = Math.round(100 - p.y);
  const screen = (point: Point) => { const q = project(point); return { x: Math.round(q.x + camX), y: Math.round(q.y + camY) }; };
  ctx.fillStyle = "#008b05"; ctx.fillRect(0, 0, WIDTH, 188);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,WIDTH,188); ctx.clip();
  ctx.save(); ctx.transform(1, .5, -1, .5, camX, camY); ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath(); game.course.points.forEach((p,i) => { if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y); }); ctx.closePath();
  ctx.lineWidth = ROAD * 2 + 5; ctx.strokeStyle = "#17251c"; ctx.stroke();
  ctx.strokeStyle = "#ebcd62"; ctx.lineCap = "butt"; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "round";
  ctx.lineWidth = ROAD * 2; ctx.strokeStyle = "#787b78"; ctx.stroke();
  // Direction arrows, painted on the road in the game's isometric view.
  for (let s = 130; s < game.course.length; s += 160) {
    const q = game.course.at(s); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.angle); polygon(ctx, [[-7,-4],[1,-4],[1,-7],[9,0],[1,7],[1,4],[-7,4]], "#f4cc65"); ctx.restore();
  }
  // Checkerboard grid is shared by the start and finish line.
  const grid = game.course.at(0); ctx.save(); ctx.translate(grid.x, grid.y); ctx.rotate(grid.angle);
  for (let a = 0; a < 4; a++) for (let b = 0; b < 12; b++) { ctx.fillStyle = (a+b)%2 ? "#eeeacd" : "#171e1b"; ctx.fillRect(a*6, -ROAD+b*7, 6, 7); } ctx.restore(); ctx.restore();
  for (const h of game.hazards) {
    const rain = h.kind === "rain" ? Math.sin(game.time * 1.2 + h.phase) * 22 : 0;
    const q = screen({ x:h.x-Math.sin(h.angle)*rain,y:h.y+Math.cos(h.angle)*rain });
    if (q.x < -30 || q.x > WIDTH+30 || q.y < -30 || q.y > 220) continue;
    if (h.kind === "oil" || h.kind === "water") {
      polygon(ctx, [[q.x-13,q.y],[q.x-8,q.y-5],[q.x+5,q.y-6],[q.x+13,q.y-1],[q.x+8,q.y+4],[q.x-7,q.y+5]], h.kind === "oil" ? "#172c28" : "#76b9f2");
      ctx.fillStyle = h.kind === "oil" ? "#294944" : "#acd9ff"; ctx.fillRect(q.x-5,q.y-2,7,1); ctx.fillRect(q.x+2,q.y+2,5,1);
    } else if (h.kind === "zip") { for(let i=0;i<3;i++)polygon(ctx,[[q.x-9+i*5,q.y-8],[q.x-4+i*5,q.y-3],[q.x-9+i*5,q.y+2],[q.x-5+i*5,q.y+2],[q.x+i*5,q.y-3],[q.x-5+i*5,q.y-8]],"#ffdc54"); }
    else if (h.kind === "barrier") { const up=Math.sin(game.time*1.7+h.phase)>.1; ctx.fillStyle="#252e28";ctx.fillRect(q.x-11,q.y-2,22,3);if(up){ctx.fillStyle="#d76b2e";ctx.fillRect(q.x-11,q.y-12,22,10);for(let i=0;i<5;i++){ctx.fillStyle=i%2?"#ffe67c":"#222d28";ctx.fillRect(q.x-10+i*4,q.y-11,4,7);}} }
    else { for(let i=0;i<4;i++){ctx.fillStyle="#86c4ed";ctx.fillRect(q.x-9+i*5,q.y-6+(Math.floor(game.time*16+i*2)%8),1,4);}polygon(ctx,[[q.x-14,q.y-17],[q.x-12,q.y-24],[q.x-6,q.y-28],[q.x+2,q.y-25],[q.x+9,q.y-26],[q.x+15,q.y-21],[q.x+12,q.y-16]],"#dce2e1");ctx.fillStyle="#a0b7ba";ctx.fillRect(q.x-8,q.y-18,18,2); }
  }
  const objects: { y:number; paint:()=>void }[]=[];
  const c = game.player;
  for(let x=Math.floor((c.x-400)/74)*74;x<c.x+400;x+=74)for(let y=Math.floor((c.y-400)/74)*74;y<c.y+400;y+=74){const q=screen({x,y});if(q.x>-15&&q.x<WIDTH+15&&q.y>-10&&q.y<200&&game.course.nearest({x,y}).distance>ROAD+18)objects.push({y:q.y,paint:()=>tree(ctx,q.x,q.y,Math.abs(x+y)%7)});}
  for (const item of game.items) if(item.active){const q=screen(item);objects.push({y:q.y,paint:()=>pickup(ctx,item.kind,q.x,q.y,game.time,game.letters)});}
  for (const c of game.cars) { const q=screen(c);objects.push({y:q.y,paint:()=>car(ctx,c,q.x,q.y,game.time,game.vehicle)}); }
  objects.sort((a,b)=>a.y-b.y).forEach(o=>o.paint());
  for(const s of game.shots){const q=screen(s);if(s.kind==="bomb"){ctx.fillStyle="#161f25";ctx.fillRect(q.x-3,q.y-5,6,5);ctx.fillStyle="#ffad43";ctx.fillRect(q.x+1,q.y-7,2,2);}else{const v=project({x:Math.cos(s.angle)*8,y:Math.sin(s.angle)*8});ctx.strokeStyle="#ffecab";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x-v.x,q.y-v.y);ctx.lineTo(q.x+v.x,q.y+v.y);ctx.stroke();}}
  for(const part of game.particles){const q=screen(part);ctx.fillStyle=part.color;ctx.fillRect(q.x,q.y,3,3);}ctx.restore();
}
function hud(ctx: CanvasRenderingContext2D, game: RCProAm) {
  const s=game.snapshot();ctx.fillStyle="#303e41";ctx.fillRect(0,188,WIDTH,52);ctx.fillStyle="#a8b7b8";ctx.fillRect(0,188,WIDTH,2);
  ctx.fillStyle="#0a1914";ctx.fillRect(3,193,71,43);miniMap(ctx,game,4,194,68,39);
  pixelText(ctx,`${s.place}${["ST","ND","RD","TH"][s.place-1]}`,8,8,"#fff7d7",2);
  ctx.fillStyle="#0d2217";ctx.fillRect(WIDTH-61,6,61,17);pixelText(ctx,`LAP ${s.lap}/${s.laps}`,WIDTH-57,10,"#fff7d7");
  pixelText(ctx,"SCORE",82,194,"#b7d5d4");pixelText(ctx,String(game.score).padStart(7,"0"),82,205,"#fff3ae");
  pixelText(ctx,`${s.weapon==="bomb"?"B":"M"} ${String(s.ammo).padStart(2,"0")}`,82,219,"#ffce66");
  pixelText(ctx,`${String(s.mph).padStart(3,"0")} MPH`,173,194,"#fff3ae");
  ctx.fillStyle="#132527";ctx.fillRect(173,205,74,5);ctx.fillStyle=s.mph>100?"#ffd55b":"#72bfe9";ctx.fillRect(174,206,Math.min(72,s.mph/127*72),3);
  for(let i=0;i<8;i++)pixelText(ctx,"NINTENDO"[i],173+i*9,219,i<game.letters?"#9afa5d":"#697b74");
}
function conditions(ctx:CanvasRenderingContext2D,game:RCProAm){
  ctx.fillStyle="#061c12";ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="#54a268";ctx.lineWidth=2;ctx.strokeRect(7,7,242,226);
  pixelText(ctx,game.mode==="over"?"GAME OVER":"TRACK CONDITIONS",128,19,"#81e35f",1,true);
  pixelText(ctx,`RACE ${game.mode==="result"?game.race+1:game.race}`,128,35,"#fff4b4",1,true);
  if(game.mode==="result"||game.mode==="over")pixelText(ctx,`${game.player.place}${["ST","ND","RD","TH"][game.player.place-1]} PLACE`,128,53,game.mode==="over"?"#ffab72":"#cfeccc",2,true);
  miniMap(ctx,game,16,80,104,52,false,game.mode==="result"?new Course(game.race):game.course);pixelText(ctx,vehicles[game.vehicle],180,82,"#ffb858",1,true);
  const p=game.player;([['TURBO',p.turbo],['ENGINE',p.engine],['TIRES',p.tires]] as const).forEach(([name,n],i)=>{pixelText(ctx,name,132,98+i*14,"#c3d8d0");for(let j=0;j<4;j++){ctx.fillStyle=j<n?"#8cd352":"#304b3c";ctx.fillRect(174+j*13,98+i*14,10,6);}});
  game.trophies.forEach((n,i)=>{const x=21+i*29;ctx.fillStyle=["#ffe490","#d0dfe0","#d79755"][i];ctx.fillRect(x,135,6,5);ctx.fillRect(x+2,140,2,2);ctx.fillRect(x,142,6,1);pixelText(ctx,String(Math.min(99,n)),x+9,136,"#c3d8d0");});
  pixelText(ctx,`SCORE ${String(game.score).padStart(7,"0")}`,128,204,"#ffe6a1",1,true);
  pixelText(ctx,`BEST  ${String(game.best).padStart(7,"0")}`,128,218,"#a9c9b7",1,true);
}
export function drawRCProAm(ctx: CanvasRenderingContext2D, game: RCProAm) {
  ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,WIDTH,HEIGHT);
  if(game.mode==="result"||game.mode==="over"){conditions(ctx,game);return;}
  roadScene(ctx,game);hud(ctx,game);
  if(game.mode==="ready"){
    ctx.fillStyle="#061c12";ctx.fillRect(12,25,232,162);ctx.strokeStyle="#86d74b";ctx.lineWidth=2;ctx.strokeRect(14,27,228,158);
    pixelText(ctx,"R.C.",128,40,"#9dea66",3,true);pixelText(ctx,"PRO-AM",128,71,"#87df5d",4,true);
    pixelText(ctx,"RADIO CONTROLLED RACING",128,113,"#f8e7a7",1,true);pixelText(ctx,"STEER EARLY. STAY IN THE TOP 3.",128,128,"#b7d5bf",1,true);
  }else if(game.mode==="countdown"){
    ctx.fillStyle="#10251e";ctx.fillRect(94,55,68,33);pixelText(ctx,String(Math.max(1,Math.ceil(game.countdown))),128,61,"#ffea9d",3,true);
  }else if(game.mode==="paused"){
    ctx.fillStyle="#061c12e8";ctx.fillRect(30,63,196,113);pixelText(ctx,"PAUSED",128,78,"#9dea66",2,true);
  }
}
