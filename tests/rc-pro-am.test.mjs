import test from 'node:test';
import assert from 'node:assert/strict';
import { RCProAm, Course, COURSE_COUNT, ROAD, STEP, IDLE, angleDiff, project } from '../app/lab/games/rc-pro-am/engine.ts';
const running=()=>{const g=new RCProAm();g.start();for(let i=0;i<365;i++)g.step(STEP);assert.equal(g.mode,'playing');return g;};
const seconds=(g,n,input=IDLE)=>{for(let i=0;i<n/STEP;i++)g.step(STEP,input);};

test('24 closed course geometries support continuous sampling and wraparound',()=>{
  assert.equal(COURSE_COUNT,24);
  for(let i=0;i<24;i++){const c=new Course(i);assert(c.length>1000);assert(c.points.length>80);assert(c.lengths.every(n=>n>0&&n<70));assert.deepEqual(c.at(20),c.at(c.length+20));assert(Math.abs(c.nearest(c.at(150)).s-150)<.001);}
  assert.deepEqual(new Course(24).points,new Course(0).points);
  assert.deepEqual(project({x:10,y:6}),{x:4,y:8});
});
test('idle is static and sound events are empty until a deliberate start',()=>{const g=new RCProAm();const s=JSON.stringify(g);seconds(g,5,{...IDLE,throttle:true});assert.equal(JSON.stringify(g),s);assert.deepEqual(g.drainSounds(),[]);});
test('countdown locks movement and pause preserves its remaining time',()=>{const g=new RCProAm();g.start();const x=g.player.x;seconds(g,1,{...IDLE,throttle:true});assert.equal(g.player.x,x);g.pause();const left=g.countdown;seconds(g,4);assert.equal(g.countdown,left);g.resume();seconds(g,2.1);assert.equal(g.mode,'playing');});
test('gas accelerates, releasing it coasts down, and steering is relative to the car',()=>{const g=running();seconds(g,.5,{...IDLE,throttle:true});assert(g.player.speed>50);const speed=g.player.speed,angle=g.player.angle;seconds(g,.2,{...IDLE,right:true});assert(g.player.speed<speed);assert(angleDiff(g.player.angle,angle)>.5);const a=g.player.angle;seconds(g,.2,{...IDLE,left:true});assert(angleDiff(g.player.angle,a)<-.5);assert(Math.abs(angleDiff(g.player.angle,g.player.momentum))>.1);});
test('walls contain the car and reduce speed without steering it automatically',()=>{const g=running();seconds(g,5,{...IDLE,throttle:true});assert(g.course.nearest(g.player).distance<=ROAD-6);assert(g.player.speed<g.maxSpeed(g.player));});
test('ordered progress rejects cutting across the track or teleporting a lap',()=>{const g=running();const p=g.player,progress=p.progress;const target=g.course.at(g.course.length*.45);p.x=target.x;p.y=target.y;seconds(g,.1);assert.equal(p.progress,progress);assert.equal(g.lap,1);});
test('upgrades cap at four and survive race transitions; ammo carries too',()=>{const g=running();for(let i=0;i<8;i++)for(const kind of ['turbo','engine','tires'])g.collect(g.player,{x:0,y:0,kind,active:true});assert.equal(g.player.turbo,4);assert.equal(g.player.engine,4);assert.equal(g.player.tires,4);g.collect(g.player,{x:0,y:0,kind:'bomb',active:true});g.mode='result';g.nextRace();assert.equal(g.race,2);assert.equal(g.player.engine,4);assert.equal(g.ammo,5);assert.equal(g.weapon,'bomb');});
test('missiles and bombs share ammunition, stars add a charge and skulls subtract one',()=>{const g=running();for(const kind of ['missile','bomb','star','skull'])g.collect(g.player,{x:0,y:0,kind,active:true});assert.equal(g.ammo,10);assert.equal(g.weapon,'bomb');g.fire();assert.equal(g.ammo,9);assert.equal(g.shots[0].kind,'bomb');const p=g.player;assert((g.shots[0].x-p.x)*Math.cos(p.angle)+(g.shots[0].y-p.y)*Math.sin(p.angle)<0);});
test('empty weapons honk, holding fire does not spend repeated charges',()=>{const g=running();g.fire();assert(g.drainSounds().includes('horn'));g.player.cooldown=0;g.ammo=5;seconds(g,.5,{...IDLE,fire:true});assert.equal(g.ammo,4);seconds(g,.1);seconds(g,.1,{...IDLE,fire:true});assert.equal(g.ammo,3);});
test('missiles crash opponents and the tenth hit boosts the orange drone',()=>{const g=running(),p=g.player,c=g.cars[1];g.hazards=[];g.items=[];g.hits=9;g.ammo=1;Object.assign(c,{x:p.x+Math.cos(p.angle)*20,y:p.y+Math.sin(p.angle)*20,speed:0,crash:0});g.fire();g.step(STEP);assert(c.crash>0);assert.equal(g.hits,10);assert(g.cars[3].boost>900);assert(g.score>=100);});
test('roll cage blocks hazard damage and can be stolen by a drone',()=>{const g=running();g.hazards=[{x:g.player.x,y:g.player.y,kind:'oil',phase:0,angle:0}];g.player.shield=1;g.step(STEP);assert.equal(g.player.spin,0);g.player.shield=0;g.step(STEP);assert(g.player.spin>0);const cage={x:0,y:0,kind:'cage',active:true};g.collect(g.cars[1],cage);assert.equal(cage.active,false);assert(g.cars[1].shield>0);});
test('rain and water slow cars, oil retains momentum, and zippers boost speed',()=>{const g=running();g.items=[];g.player.speed=150;g.hazards=[{x:g.player.x,y:g.player.y,kind:'water',phase:0,angle:0}];g.step(STEP);g.step(STEP);assert(g.player.speed<=65);g.hazards=[{x:g.player.x,y:g.player.y,kind:'zip',phase:0,angle:0}];g.step(STEP);assert(g.player.speed>=370);});
test('the first finishing car ends the race and fourth place consumes a continue',()=>{const g=running();g.cars[1].progress=g.course.length*g.course.laps;g.cars[2].progress=100;g.cars[3].progress=90;g.step(STEP);assert.equal(g.mode,'over');assert.equal(g.player.place,4);g.continueGame();assert.equal(g.continues,2);assert.equal(g.race,1);assert.equal(g.mode,'countdown');});
test('top-three advancement, trophies and NINTENDO upgrades happen after the race',()=>{const g=running();g.letters=8;g.player.progress=g.course.length*g.course.laps+100;g.step(STEP);assert.equal(g.mode,'result');assert.equal(g.player.place,1);assert.equal(g.trophies[0],1);assert.equal(g.score,44000);assert.equal(g.vehicle,1);assert.equal(g.letters,0);g.nextRace();assert.equal(g.race,2);assert.equal(g.mode,'countdown');});
test('all course transitions and repeated championship remain playable',()=>{const g=running();for(let race=1;race<=49;race++){assert.equal(g.race,race);g.mode='playing';g.player.progress=g.course.length*g.course.laps+100;g.step(STEP);assert.equal(g.mode,'result');g.nextRace();}assert.equal(g.race,50);assert(g.best>0);});
test('a complete first race can be driven through steering and gas inputs',()=>{
  const g=running();
  // A deterministic driver uses exactly the same relative controls as a person.
  // No teleportation, damage protection, car-speed edits or progress fixtures.
  for(let i=0;i<120/STEP&&g.mode==='playing';i++){
    const p=g.player,target=g.course.at(p.s+55),d=angleDiff(Math.atan2(target.y-p.y,target.x-p.x),p.angle);
    g.step(STEP,{...IDLE,left:d<-.06,right:d>.06,throttle:Math.abs(d)<.85});
  }
  assert.equal(g.mode,'result');assert(g.player.place<=3);assert(g.lap>=2);assert(g.score>0);
});
test('pause freezes physics and input; corrupt stored scores are rejected',()=>{for(const best of [NaN,-1,1e11,2.5])assert.equal(new RCProAm(best).best,0);const g=running();g.pause();const s=JSON.stringify(g);seconds(g,2,{...IDLE,throttle:true,right:true});assert.equal(JSON.stringify(g),s);g.resume();assert.equal(g.mode,'playing');});

test('all 24 courses finish through real controls with functioning drone opponents',()=>{
  for(let race=1;race<=24;race++){
    const g=new RCProAm();g.start();while(g.race<race){g.mode='result';g.nextRace();}
    seconds(g,3.1);
    for(let i=0;i<120/STEP&&g.mode==='playing';i++){
      const p=g.player,target=g.course.at(p.s+55),d=angleDiff(Math.atan2(target.y-p.y,target.x-p.x),p.angle);
      g.step(STEP,{...IDLE,left:d<-.06,right:d>.06,throttle:Math.abs(d)<.85});
    }
    assert(['result','over'].includes(g.mode),`Race ${race} stalled`);
    assert(g.lap>=2,`Race ${race} progress stalled`);
    assert(g.cars.filter(c=>c.progress/g.course.length>2).length>=3,`Race ${race} drones stalled`);
  }
});

test('collecting points updates the best score and a new run retains it',()=>{
  const g=running();g.collect(g.player,{kind:'letter',active:true,x:0,y:0});
  assert.equal(g.score,200);assert.equal(g.best,200);g.start();assert.equal(g.score,0);assert.equal(g.best,200);
});
