import test from "node:test";
import assert from "node:assert/strict";
import { BubbleBobble, ROUNDS, IDLE, STEP, chainPoints, segmentBox } from "../app/lab/games/bubble-bobble/engine.ts";

const create = (count = 1) => { const g = new BubbleBobble(0, () => .5); g.start(count); return g; };
const advance = (g, seconds, one = IDLE, two = IDLE) => { for (let i = 0; i < Math.ceil(seconds / STEP); i++) { g.step(STEP, [one, two]); g.drainSounds(); } };
const bubble = (id, x, y, kind = "plain", enemy = -1) => ({ id, x, y, vx: 0, vy: -22, age: 1, life: 8, travel: 0, owner: 0, kind, enemy, letter: 0, radius: 8 });
const quiet = g => { g.clock = 1000; g.enemies.forEach(e => { e.x = 200; e.y = 80; }); };
const pickup = (g, kind) => { const p = g.players[0]; g.items = [{ x:p.x, y:p.y-8, vx:0, vy:0, kind, value:500, fruit:0, life:15, settled:true }]; g.step(STEP); };
const round = (g, index) => { g.round=index; g.mode="over"; g.continueGame(); };
const hurt = (g, p = g.players[0]) => { p.invincible=0; g.clock=0; g.shots=[{x:p.x,y:p.y-8,vx:0,vy:0,kind:"laser",owner:-1,life:1,age:0,hits:new Set()}];g.step(STEP); };

test("100 arcade layouts and eight enemy families have valid geometry and spawns", () => {
  assert.equal(ROUNDS.length,100); assert.equal(new Set(ROUNDS.map(r=>r.map)).size,100);
  const kinds=new Set();
  for(const [i,r] of ROUNDS.entries()) {
    assert.match(r.map,/^[0-9a-f]{224}$/);assert.equal(r.colors.length,2);
    if(i<99)assert.ok(r.enemies.length>0&&r.enemies.length<=8,`Round ${i+1}: ${r.enemies.length} monsters`);
    for(const [kind,x,y,facing] of r.enemies){kinds.add(kind);assert.ok(kind>=0&&kind<8);assert.ok(x>=16&&x<=240);assert.ok(y>=0&&y<=224);assert.ok(Math.abs(facing)===1);}
  }
  assert.equal(kinds.size,8);
  assert.deepEqual([...new Set(create().platforms.map(p=>p.y))],[80,120,160,200]);
});

test("running, jumping through ledges and landing match the compact arcade playfield", () => {
  const g=create();quiet(g);advance(g,.2);const p=g.players[0];
  advance(g,.4,{...IDLE,right:true});assert.ok(p.x>60);assert.equal(p.y,200);
  advance(g,.4,{...IDLE,jump:true});assert.ok(p.y<158);
  advance(g,.6,{...IDLE,jump:true});assert.equal(p.y,160);assert.equal(p.grounded,true);
  advance(g,.1);g.step(STEP,[{...IDLE,jump:true}]);assert.ok(p.vy<0);
  advance(g,1.2,{...IDLE,left:true});assert.ok(p.x>=23);
});

test("open rounds wrap falling players and circulating bubbles through the vertical passage", () => {
  const g=create();round(g,2);quiet(g);const p=g.players[0];
  assert.equal(g.open(88),true);p.x=88;p.y=239;p.vy=120;g.step(STEP);assert.ok(p.y<20);
  g.bubbles=[bubble(500,88,-9)];g.updateBubbles(STEP);assert.ok(g.bubbles[0].y>224);
  round(g,0);g.bubbles=[bubble(501,128,22)];g.updateBubbles(STEP);assert.ok(g.bubbles[0].y>=21);
});

test("a blown bubble captures without killing; a later touch pops the monster and produces food", () => {
  const g=create();quiet(g);const p=g.players[0],e=g.enemies[0];e.x=64;e.y=200;
  advance(g,.15,{...IDLE,fire:true});assert.equal(e.state,"trapped");assert.equal(p.score,0);
  const b=g.bubbles.find(b=>b.enemy===e.id);assert.ok(b);b.age=1;p.x=b.x;p.y=b.y+8;p.vy=0;
  g.step(STEP);assert.equal(e.state,"dead");assert.equal(p.score,1500);assert.ok(g.events.some(i=>i.type==="fruit"));
});

test("touching bubbles form one exponential chain and earn EXTEND letters", () => {
  const g=create(),p=g.players[0];quiet(g);
  g.bubbles=g.enemies.map((e,i)=>{e.state="trapped";return bubble(500+i,100+i*15,100,"enemy",e.id);});
  g.popBubble(g.bubbles[0],p);assert.equal(p.score,7000);assert.equal(g.remaining,0);assert.equal(g.items.length,3);assert.deepEqual(g.letters,[0]);
  assert.equal(chainPoints(7),128000);assert.equal(chainPoints(12),128000);
});

test("holding Jump bounces on a bubble; releasing it bursts the bubble", () => {
  const g=create();quiet(g);const p=g.players[0];p.x=100;p.y=144;p.vy=100;p.grounded=false;
  g.bubbles=[bubble(500,100,154)];g.step(.03,[{...IDLE,jump:true}]);assert.ok(p.vy<0);assert.equal(g.bubbles.length,1);
  p.y=144;p.vy=100;p.jumpHeld=false;g.step(.03);assert.equal(g.bubbles.length,0);assert.equal(p.score,10);
});

test("trapped enemies escape angrily, while hurry and Skel-Monsta enforce the time limit", () => {
  const g=create();quiet(g);const e=g.enemies[0];e.state="trapped";const b=bubble(500,160,90,"enemy",e.id);b.life=.001;g.bubbles=[b];g.step(STEP);
  assert.equal(e.state,"free");assert.equal(e.angry,true);
  g.clock=0;g.roundTime=35;g.step(STEP);assert.equal(g.hurry,true);
  g.roundTime=50;g.step(STEP);assert.equal(g.skels.length,1);
  g.bubbles=[bubble(501,g.skels[0].x,g.skels[0].y)];g.updateBubbles(STEP);assert.equal(g.skels.length,1);
});

test("candy upgrades have separate effects, shoes speed up movement, and death removes powers", () => {
  const g=create();quiet(g);const p=g.players[0];
  for(const [kind,power] of [["yellow","fast"],["purple","range"],["blue","speed"],["shoe","shoe"]]){pickup(g,kind);assert.equal(p[power],true);}
  const x=p.x;advance(g,.2,{...IDLE,right:true});assert.ok(p.x-x>20);
  g.bubbles=[];p.cooldown=0;g.step(STEP,[{...IDLE,fire:true}]);assert.ok(Math.abs(g.bubbles[0].vx)>200);assert.ok(g.bubbles[0].travel>.6);assert.ok(p.cooldown<.16);
  hurt(g);assert.equal(p.lives,2);assert.equal(p.alive,false);assert.equal(p.fast||p.range||p.speed||p.shoe,false);
  quiet(g);advance(g,1.5);assert.equal(p.alive,true);assert.ok(p.invincible>0);
});

test("clock freezes enemies and attacks; hearts grant contact kills and bombs clear the room", () => {
  const g=create();pickup(g,"clock");const x=g.enemies[0].x,y=g.enemies[0].y,t=g.roundTime;advance(g,.5);
  assert.equal(g.enemies[0].x,x);assert.equal(g.enemies[0].y,y);assert.equal(g.roundTime,t);
  g.clock=0;pickup(g,"heart");g.enemies[0].x=g.players[0].x;g.enemies[0].y=g.players[0].y;g.step(STEP);assert.equal(g.enemies[0].state,"dead");assert.equal(g.players[0].lives,3);
  pickup(g,"bomb");assert.equal(g.remaining,0);assert.equal(g.mode,"clear");
});

test("water, fire and lightning have distinct attacks; lightning travels behind the player", () => {
  const g=create();quiet(g);const p=g.players[0];p.facing=1;
  for(const [kind,shot] of [["thunder","thunder"],["fire","flame"],["water","water"]]){g.bubbles=[bubble(500,120,100,kind)];g.popBubble(g.bubbles[0],p);assert.equal(g.shots.at(-1).kind,shot);}
  assert.ok(g.shots[0].vx<0);
  const e=g.enemies[0];e.x=100;e.y=108;g.shots=[{x:120,y:100,vx:-230,vy:0,kind:"thunder",owner:0,life:1,age:0,hits:new Set()}];g.updateShots(.1);assert.equal(e.state,"dead");assert.ok(g.items.some(i=>i.kind==="diamond"));
});

test("six EXTEND letters award a life and clear the round, with separate score bonus lives", () => {
  const g=create(),p=g.players[0];
  for(let letter=0;letter<6;letter++){const b=bubble(500+letter,100,100,"letter");b.letter=letter;g.bubbles=[b];g.popBubble(b,p);}
  assert.equal(p.lives,4);assert.equal(p.extend.some(Boolean),false);assert.equal(g.mode,"clear");
  g.award(p,30000);assert.equal(p.lives,5);g.award(p,70000);assert.equal(p.lives,6);
  g.pause();const t=g.time;advance(g,1);assert.equal(g.time,t);g.resume();advance(g,3.1);assert.equal(g.round,1);
});

test("co-op keeps separate scores and lives, allows Bob to join, and ends only when both are out", () => {
  const g=create();g.join();assert.equal(g.players.length,2);g.award(g.players[1],500);assert.equal(g.players[0].score,0);assert.equal(g.players[1].score,500);g.award(g.players[0],100);assert.equal(g.best,500);
  g.players[0].lives=1;hurt(g,g.players[0]);assert.equal(g.players[0].lives,0);advance(g,1.2);assert.equal(g.mode,"playing");
  g.players[1].lives=1;hurt(g,g.players[1]);advance(g,1.2);assert.equal(g.mode,"over");
  const best=g.best;g.continueGame();assert.equal(g.players.length,2);assert.ok(g.players.every(p=>p.lives===3&&p.score===0));assert.equal(g.best,best);
});

test("umbrellas skip their printed round count, with no skip past the final fight", () => {
  for(const count of [3,5,7]){const g=create();quiet(g);pickup(g,`umbrella${count}`);advance(g,3.1);assert.equal(g.round,count);}
  const g=create();round(g,97);quiet(g);pickup(g,"umbrella7");advance(g,3.1);assert.equal(g.round,99);assert.equal(g.boss.hp,60);
});

test("no-death secret doors open diamond rooms; the round 50 door advances to 70", () => {
  const g=create();round(g,19);g.specialItem();assert.ok(g.items.some(i=>i.kind==="door"));pickup(g,"door");assert.equal(g.bonus,true);assert.equal(g.items.length,32);
  g.roundTime=30;g.step(STEP);advance(g,3.1);assert.equal(g.round,20);
  round(g,29);g.deaths=1;g.specialItem();assert.ok(!g.items.some(i=>i.kind==="door"));g.originalMode=true;g.specialItem();assert.ok(g.items.some(i=>i.kind==="door"));
  round(g,49);pickup(g,"door");advance(g,3.1);assert.equal(g.round,69);
});

test("all 100 rounds can be cleared and full-health Super Drunk must be trapped, then popped", () => {
  const g=create(2);
  for(let i=0;i<99;i++){
    assert.equal(g.round,i);g.enemies.forEach(e=>{e.state="trapped";});g.bubbles=g.enemies.map((e,j)=>bubble(1000+j,50+j*16,100,"enemy",e.id));
    g.popBubble(g.bubbles[0],g.players[0]);g.step(STEP);assert.equal(g.mode,"clear");advance(g,3.1);
  }
  assert.equal(g.round,99);assert.equal(g.boss.hp,60);pickup(g,"potion");assert.equal(g.players[0].thunder,true);
  for(let i=0;i<60;i++){const b=g.boss;g.shots=[{x:b.x+25,y:b.y,vx:-230,vy:0,kind:"thunder",owner:0,life:1,age:0,hits:new Set()}];g.updateShots(.03);}
  assert.equal(g.boss.state,"trapped");assert.equal(g.mode,"playing");assert.equal(g.bubbles.at(-1).kind,"boss");g.popBubble(g.bubbles.at(-1),g.players[0]);advance(g,3.1);assert.equal(g.mode,"won");assert.equal(g.ending,"together");
});

test("swept collision detects fast shots without hits behind the projectile", () => {
  assert.equal(segmentBox(0,10,200,0,90,0,16,16),true);assert.equal(segmentBox(100,10,200,0,10,0,16,16),false);assert.equal(segmentBox(0,30,200,0,90,0,16,16),false);
});

test("normal controls climb and clear the first round by trapping and popping every monster", () => {
  const g=create();let trapped=0,popped=0;
  // Protect Bub from contact damage to isolate traversal and bubble mechanics.
  for(let t=0;t<50&&g.mode==="playing";t+=STEP){
    const p=g.players[0];p.invincible=100;
    const targets=[...g.bubbles.filter(b=>b.kind==="enemy").map(b=>({x:b.x,y:b.y+8})),...g.enemies.filter(e=>e.state==="free")];
    const target=targets.sort((a,b)=>Math.abs(a.y-p.y)+Math.abs(a.x-p.x)-Math.abs(b.y-p.y)-Math.abs(b.x-p.x))[0];
    const dx=target?.x-p.x||0;g.step(STEP,[{...IDLE,left:dx<-5,right:dx>5,fire:true,jump:p.grounded&&!p.jumpHeld}]);
    for(const e of g.drainSounds()){if(e.type==="trap")trapped++;if(e.type==="pop")popped+=e.value;}
  }
  assert.equal(g.mode,"clear");assert.equal(trapped,3);assert.equal(popped,3);assert.equal(g.remaining,0);assert.ok(g.score>=3000);
});

test("returning bottles reverse course and the boss replenishes lost lightning potions", () => {
  const g=create();quiet(g);g.shots=[{x:128,y:48,vx:92,vy:0,kind:"bottle",owner:-1,life:3,age:.595,hits:new Set()}];g.updateShots(STEP);assert.ok(g.shots[0].vx<0);
  round(g,99);g.items=[];g.step(STEP);assert.equal(g.items.filter(i=>i.kind==="potion").length,2);assert.ok(g.items.every(i=>i.life>100));
});
