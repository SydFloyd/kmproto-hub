"use client";

import { useEffect, useRef, useState } from "react";
import { RCProAm, WIDTH, HEIGHT, STEP, IDLE, type Controls, type Snapshot } from "./engine";
import { drawRCProAm } from "./draw";
import { RacingSound } from "./sound";
import "../arcade.css";
import "./rc-pro-am.css";

type Action = keyof Controls;
type Commands = { start:()=>void; advance:()=>void; continue:()=>void; pause:()=>void; hold:(action:Action,id:string,down:boolean)=>void; pulse:(action:Action)=>void; sound:(on:boolean)=>Promise<boolean> };
const keymap:Record<string,Action>={ArrowLeft:"left",ArrowRight:"right",KeyA:"left",KeyD:"right",KeyX:"throttle",Space:"throttle",KeyZ:"fire",KeyJ:"fire"};
const BEST_KEY="kmproto.rc-pro-am.best.v1";
const initial:Snapshot={mode:"ready",race:1,score:0,best:0,place:1,lap:1,laps:3,mph:0,ammo:0,weapon:"missile",letters:0,vehicle:0,continues:3,turbo:0,engine:0,tires:0};
export default function RCProAmGame(){
  const canvasRef=useRef<HTMLCanvasElement>(null),screenRef=useRef<HTMLDivElement>(null),cabinetRef=useRef<HTMLDivElement>(null),commands=useRef<Commands|null>(null);
  const[state,setState]=useState(initial),[soundOn,setSoundOn]=useState(false),[notice,setNotice]=useState("");
  useEffect(()=>{
    const canvas=canvasRef.current,screen=screenRef.current,cabinet=cabinetRef.current,ctx=canvas?.getContext("2d");
    if(!canvas||!screen||!cabinet||!ctx)return;
    const native=document.createElement("canvas");native.width=WIDTH;native.height=HEIGHT;const nativeCtx=native.getContext("2d");if(!nativeCtx)return;
    let best=0;try{const saved=Number(localStorage.getItem(BEST_KEY));if(Number.isSafeInteger(saved)&&saved>=0&&saved<=1e9)best=saved;}catch{/* Storage is optional. */}
    const game=new RCProAm(best),audio=new RacingSound(),held=new Map<string,Action>(),pulses=new Map<Action,number>();
    let request=0,previous=0,accumulator=0,signature="",savedBest=best,soundEnabled=false;
    const playable=()=>game.mode==="playing"||game.mode==="countdown";
    const clear=()=>{held.clear();pulses.clear();};
    const input=()=>{const controls={...IDLE};for(const action of held.values())controls[action]=true;for(const action of pulses.keys())controls[action]=true;return controls;};
    const schedule=()=>{if(!request)request=requestAnimationFrame(frame);};
    function frame(now:number){
      request=0;const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
      if(playable()){accumulator+=dt;while(accumulator>=STEP){game.step(STEP,input());accumulator-=STEP;for(const[action,left]of pulses){if(left<=STEP)pulses.delete(action);else pulses.set(action,left-STEP);}}}
      audio.tick(game.mode==="playing",game.player.speed);for(const event of game.drainSounds())audio.play(event);
      drawRCProAm(nativeCtx!,game);ctx!.imageSmoothingEnabled=false;ctx!.drawImage(native,0,0,canvas!.width,canvas!.height);
      const snapshot=game.snapshot(),next=JSON.stringify(snapshot);if(next!==signature){signature=next;setState(snapshot);}
      if(game.best>savedBest){savedBest=game.best;try{localStorage.setItem(BEST_KEY,String(savedBest));}catch{/* Keep the session score. */}}
      if(playable())schedule();else{previous=0;accumulator=0;}
    }
    const pause=()=>{game.pause();clear();audio.pause();schedule();};
    const wake=()=>{previous=0;accumulator=0;if(soundEnabled)void audio.enable(true);schedule();};
    commands.current={start:()=>{clear();game.start();wake();},advance:()=>{clear();game.nextRace();wake();},continue:()=>{clear();game.continueGame();wake();},
      pause:()=>{if(game.mode==="paused"){game.resume();wake();}else pause();},
      hold:(action,id,down)=>{if(down&&playable()){held.set(id,action);if(action==="fire")pulses.set(action,.075);}else held.delete(id);},
      pulse:action=>{if(playable())pulses.set(action,.1);},sound:async on=>{soundEnabled=Boolean(await audio.enable(on));return soundEnabled;}};
    const resize=()=>{canvas.width=Math.max(1,Math.round(screen.getBoundingClientRect().width*Math.min(devicePixelRatio||1,2)));canvas.height=Math.max(1,Math.round(canvas.width*3/4));schedule();};
    const keydown=(event:KeyboardEvent)=>{
      if(event.target!==screen||event.ctrlKey||event.altKey||event.metaKey)return;
      if(["Escape","KeyP"].includes(event.code)&&["playing","countdown","paused"].includes(game.mode)){event.preventDefault();if(!event.repeat)commands.current?.pause();}
      else if(event.code==="Enter"&&!event.repeat){event.preventDefault();if(game.mode==="paused")commands.current?.pause();else if(game.mode==="result")commands.current?.advance();else if(game.mode==="over"&&game.continues)commands.current?.continue();else if(game.mode==="ready"||game.mode==="over")commands.current?.start();}
      else if(keymap[event.code]&&playable()){event.preventDefault();held.set(event.code,keymap[event.code]);if(!event.repeat&&keymap[event.code]==="fire")pulses.set("fire",.075);}
    };
    const keyup=(event:KeyboardEvent)=>held.delete(event.code);
    const blur=()=>{for(const id of held.keys())if(keymap[id])held.delete(id);};
    const focusout=(event:FocusEvent)=>{if(!event.relatedTarget||!cabinet.contains(event.relatedTarget as Node))pause();};
    const visibility=()=>{if(document.hidden)pause();};
    const observer=new ResizeObserver(resize),intersection=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();});observer.observe(screen);intersection.observe(screen);
    screen.addEventListener("keydown",keydown);screen.addEventListener("blur",blur);cabinet.addEventListener("focusout",focusout);window.addEventListener("keyup",keyup);window.addEventListener("blur",pause);document.addEventListener("visibilitychange",visibility);resize();
    return()=>{cancelAnimationFrame(request);observer.disconnect();intersection.disconnect();audio.dispose();commands.current=null;screen.removeEventListener("keydown",keydown);screen.removeEventListener("blur",blur);cabinet.removeEventListener("focusout",focusout);window.removeEventListener("keyup",keyup);window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  const focus=()=>screenRef.current?.focus({preventScroll:true});
  const start=()=>{commands.current?.start();focus();};const pause=()=>{commands.current?.pause();focus();};const advance=()=>{commands.current?.advance();focus();};const continueGame=()=>{commands.current?.continue();focus();};
  const toggleSound=async()=>{focus();const on=await commands.current?.sound(!soundOn);setSoundOn(Boolean(on));setNotice(!soundOn&&!on?"Sound is unavailable in this browser. You can still play.":"");};
  const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(cabinetRef.current?.requestFullscreen)await cabinetRef.current.requestFullscreen();else setNotice("Full screen is unavailable in this browser.");}catch{setNotice("Full screen is unavailable in this browser.");}focus();};
  const active=state.mode==="playing"||state.mode==="countdown";
  const announcement=state.mode==="ready"?"Start the race when ready.":state.mode==="paused"?"Race paused.":state.mode==="over"?`Fourth place. Game over. ${state.continues} continues remaining.`:state.mode==="result"?`Race ${state.race} complete. You placed ${state.place}. Start the next race.`:`Race ${state.race}. Lap ${state.lap} of ${state.laps}.`;
  const label=`R.C. Pro-Am. Race ${state.race}. Lap ${state.lap} of ${state.laps}. Position ${state.place} of 4. Speed ${state.mph} miles per hour. Score ${state.score}. High score ${state.best}. ${state.ammo} ${state.weapon} charges. ${state.letters} of 8 letters.`;
  return <div className="arcade-player rc-pro-am-player">
    <div className="arcade-cabinet" ref={cabinetRef}>
      <div className="arcade-screen" ref={screenRef} tabIndex={0} role="group" aria-label="R.C. Pro-Am playfield" aria-describedby="rc-pro-am-controls" data-mode={state.mode}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>Your browser needs canvas support to play R.C. Pro-Am.</canvas>
        {["ready","paused","result","over"].includes(state.mode)&&<div className={`arcade-overlay rc-${state.mode}`}>
          <h2 className="sr-only">{state.mode==="ready"?"Start R.C. Pro-Am":state.mode==="paused"?"Paused":state.mode==="result"?"Race complete":"Game over"}</h2>
          {state.mode==="over"&&state.continues>0&&<button type="button" className="arcade-start" onClick={continueGame}>Continue · {state.continues}</button>}
          <button type="button" className="arcade-start" onClick={state.mode==="paused"?pause:state.mode==="result"?advance:start}>{state.mode==="ready"?"Start game":state.mode==="paused"?"Resume game":state.mode==="result"?"Next race":"New game"}</button>
          <span className="arcade-enter">or press Enter</span>
        </div>}
      </div>
      <div className="arcade-toolbar" aria-label="Game options"><button type="button" onClick={pause} disabled={!active&&state.mode!=="paused"}>{state.mode==="paused"?"Resume":"Pause"}<span aria-hidden="true"> · P</span></button><button type="button" onClick={()=>void toggleSound()} aria-pressed={soundOn}>Sound {soundOn?"on":"off"}</button><button type="button" onClick={()=>void fullscreen()}>Full screen</button><button type="button" onClick={start}>New game</button></div>
      <div className="arcade-touch" role="group" aria-label="Touch controls">{([['left','←','Steer left'],['right','→','Steer right'],['throttle','Gas','Accelerate'],['fire','Fire','Fire weapon or horn']]as const).map(([action,text,label])=><button type="button" key={action} aria-label={label} disabled={!active}
        onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);commands.current?.hold(action,`touch:${e.pointerId}`,true);}} onPointerUp={e=>commands.current?.hold(action,`touch:${e.pointerId}`,false)} onPointerCancel={e=>commands.current?.hold(action,`touch:${e.pointerId}`,false)} onLostPointerCapture={e=>commands.current?.hold(action,`touch:${e.pointerId}`,false)}
        onKeyDown={e=>{if(["Space","Enter"].includes(e.code)){e.preventDefault();commands.current?.hold(action,`button:${action}`,true);}}} onKeyUp={e=>{if(["Space","Enter"].includes(e.code))commands.current?.hold(action,`button:${action}`,false);}} onBlur={()=>commands.current?.hold(action,`button:${action}`,false)} onClick={e=>{if(!e.detail)commands.current?.pulse(action);}}>{text}</button>)}</div>
    </div>
    <p className="sr-only" role="status">{announcement}</p><p className="arcade-notice" role="status">{notice}</p>
    <div className="arcade-instructions" id="rc-pro-am-controls">
      <dl className="arcade-keys"><div><dt><kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd></dt><dd>Steer</dd></div><div><dt><kbd>X</kbd> / <kbd>Space</kbd></dt><dd>Accelerate</dd></div><div><dt><kbd>Z</kbd> / <kbd>J</kbd></dt><dd>Weapon / horn</dd></div><div><dt><kbd>P</kbd> / <kbd>Esc</kbd></dt><dd>Pause</dd></div></dl>
      <p>You drive the red truck. Left and Right turn the car relative to its heading. Hold Accelerate, steer before the corner, and release the gas to slow down. A race ends when the leader finishes the final lap: stay in the top three to advance. Fourth place ends your run, with three continues.</p>
      <p>Collect turbo, engine and tire upgrades for better acceleration, speed and grip. Missiles fire ahead; bombs drop behind. Stars add ammunition, skulls take it away, and an empty weapon button honks the horn. Roll cages protect against hazards and other cars. Watch for puddles, oil, moving rain clouds and rising barriers; zippers give a burst of speed.</p>
      <p>Collect eight letters to spell <strong>NINTENDO</strong> for 40,000 bonus points and a vehicle upgrade after the race. Race your truck, 4-wheeler and off-roader through 24 courses; the circuit repeats with tougher opponents.</p>
      <p className="arcade-mobile-note">Hold Gas and a steering button together. Landscape full screen gives you more room to race.</p>
      <p className="section-note">A browser recreation of the 1988 NES game, with the original course shapes, recreated pixel art and synthesized sound. Sound starts off; high scores stay in this browser.</p>
    </div>
  </div>;
}
