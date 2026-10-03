"use client";

import { useEffect, useRef, useState } from "react";
import { BubbleBobble, HEIGHT, IDLE, STEP, WIDTH, type Controls, type Snapshot } from "./engine";
import { drawBubbleBobble } from "./draw";
import { BubbleSound } from "./sound";
import "../arcade.css";
import "./bubble-bobble.css";

type Action = keyof Controls;
type Commands = { start:()=>void; pause:()=>void; continue:()=>void; join:()=>void; super:(on:boolean)=>void; hold:(action:Action,id:string,down:boolean)=>void; pulse:(action:Action)=>void; sound:(on:boolean)=>Promise<boolean> };
const keymap:Record<string,[number,Action]>={ArrowLeft:[0,"left"],ArrowRight:[0,"right"],KeyZ:[0,"fire"],KeyJ:[0,"fire"],KeyX:[0,"jump"],Space:[0,"jump"],KeyA:[1,"left"],KeyD:[1,"right"],KeyF:[1,"fire"],KeyG:[1,"jump"]};
const titleCodes = [
  { keys:["ArrowLeft","KeyX","ArrowLeft","Digit1","ArrowLeft","KeyZ","ArrowLeft","Digit1"], mode:"power", message:"Power-up code enabled." },
  { keys:["KeyZ","KeyX","KeyZ","KeyX","KeyZ","KeyX","ArrowRight","Digit1"], mode:"original", message:"Original game code enabled: secret doors remain available." },
  { keys:["Digit1","KeyX","KeyZ","ArrowLeft","ArrowRight","KeyX","Digit1","ArrowRight"], mode:"super", message:"Super Bubble Bobble enabled." },
];
const BEST_KEY="kmproto.bubble-bobble.best.v1", SUPER_KEY="kmproto.bubble-bobble.super.v1";
const initial:Snapshot={mode:"ready",round:0,score:0,best:0,players:[],enemies:3,hurry:false,boss:0,superMode:false,ending:"solo",bonus:false};

export default function BubbleBobbleGame(){
  const canvasRef=useRef<HTMLCanvasElement>(null),screenRef=useRef<HTMLDivElement>(null),cabinetRef=useRef<HTMLDivElement>(null);
  const commands=useRef<Commands|null>(null),selectedPlayers=useRef(1);
  const[state,setState]=useState<Snapshot>(initial),[playerCount,setPlayerCount]=useState(1),[soundOn,setSoundOn]=useState(false),[notice,setNotice]=useState(""),[superUnlocked,setSuperUnlocked]=useState(false);
  useEffect(()=>{
    const canvas=canvasRef.current,screen=screenRef.current,cabinet=cabinetRef.current,ctx=canvas?.getContext("2d");
    if(!canvas||!screen||!cabinet||!ctx)return;
    let best=0,unlocked=false;
    try{const saved=Number(localStorage.getItem(BEST_KEY));if(Number.isSafeInteger(saved)&&saved>=0&&saved<=1000000000)best=saved;unlocked=localStorage.getItem(SUPER_KEY)==="yes";}catch{/* Storage is optional. */}
    const game=new BubbleBobble(best),audio=new BubbleSound(),held=new Map<string,[number,Action]>(),pulses=new Map<string,{player:number;action:Action;time:number}>();
    const codeIndexes=[0,0,0];let request=0,previous=0,accumulator=0,signature="",savedBest=best,soundEnabled=false,initialized=false;
    const playable=()=>game.mode==="playing"||game.mode==="clear";
    const input=()=>{const controls:Controls[]=[{...IDLE},{...IDLE}];for(const[player,action]of held.values())controls[player][action]=true;for(const pulse of pulses.values())controls[pulse.player][pulse.action]=true;return controls;};
    const pulse=(player:number,action:Action)=>pulses.set(`${player}:${action}`,{player,action,time:.075});
    const clear=()=>{held.clear();pulses.clear();};
    const publish=()=>{
      const snapshot=game.snapshot(),next=JSON.stringify(snapshot);if(next!==signature){signature=next;setState(snapshot);}
      if(!initialized){initialized=true;setSuperUnlocked(unlocked);}
      if(game.best>savedBest){savedBest=game.best;try{localStorage.setItem(BEST_KEY,String(savedBest));}catch{/* Keep the session score. */}}
      if(game.mode==="won"&&game.ending!=="solo"&&!unlocked){unlocked=true;setSuperUnlocked(true);try{localStorage.setItem(SUPER_KEY,"yes");}catch{/* The current session still unlocks Super. */}}
    };
    const schedule=()=>{if(!request)request=requestAnimationFrame(frame);};
    function frame(now:number){
      request=0;const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
      if(playable()){
        accumulator+=dt;while(accumulator>=STEP){game.step(STEP,input());accumulator-=STEP;for(const[id,value]of pulses){value.time-=STEP;if(value.time<=0)pulses.delete(id);}}
      }
      audio.tick(dt,game.mode==="playing",game.hurry);for(const event of game.drainSounds())audio.play(event);
      ctx!.setTransform(canvas!.width/WIDTH,0,0,canvas!.height/HEIGHT,0,0);drawBubbleBobble(ctx!,game);publish();
      if(playable())schedule();else{previous=0;accumulator=0;}
    }
    const pause=()=>{game.pause();clear();audio.pause();schedule();};
    const wake=()=>{previous=0;accumulator=0;if(soundEnabled)void audio.enable(true);schedule();};
    commands.current={
      start:()=>{clear();game.start(selectedPlayers.current);wake();},pause:()=>{if(game.mode==="paused"){game.resume();wake();}else pause();},
      continue:()=>{clear();game.continueGame();wake();},join:()=>{game.join();selectedPlayers.current=game.players.length;setPlayerCount(game.players.length);schedule();},
      super:on=>{game.superMode=on;schedule();},
      hold:(action,id,down)=>{if(down&&playable()){held.set(id,[0,action]);if(action==="fire"||action==="jump")pulse(0,action);}else held.delete(id);},
      pulse:action=>{if(playable())pulse(0,action);},sound:async on=>{soundEnabled=Boolean(await audio.enable(on));return soundEnabled;},
    };
    const resize=()=>{canvas.width=Math.max(1,Math.round(screen.getBoundingClientRect().width*Math.min(devicePixelRatio||1,2)));canvas.height=Math.round(canvas.width*HEIGHT/WIDTH);schedule();};
    const keydown=(event:KeyboardEvent)=>{
      if(event.target!==screen||event.ctrlKey||event.altKey||event.metaKey)return;
      if(game.mode==="ready"&&!event.repeat&&event.code!=="Enter"){
        titleCodes.forEach((code,i)=>{
          codeIndexes[i]=event.code===code.keys[codeIndexes[i]]?codeIndexes[i]+1:event.code===code.keys[0]?1:0;
          if(codeIndexes[i]===code.keys.length){
            if(code.mode==="power")game.powerMode=true;else if(code.mode==="original")game.originalMode=true;else{game.superMode=true;unlocked=true;setSuperUnlocked(true);}
            codeIndexes[i]=0;setNotice(code.message);schedule();
          }
        });
        if(keymap[event.code]||event.code==="Digit1")event.preventDefault();
      }
      if(["Escape","KeyP"].includes(event.code)){
        if(["playing","paused","clear"].includes(game.mode)){event.preventDefault();if(!event.repeat)commands.current?.pause();}
      }else if(event.code==="Enter"&&!event.repeat){event.preventDefault();if(game.mode==="paused")commands.current?.pause();else if(game.mode==="over")commands.current?.continue();else if(["ready","won"].includes(game.mode))commands.current?.start();}
      else if(event.code==="Digit2"&&game.mode==="playing"&&!event.repeat){event.preventDefault();commands.current?.join();}
      else if(keymap[event.code]&&playable()){
        const[player,action]=keymap[event.code];if(player<game.players.length){event.preventDefault();held.set(event.code,[player,action]);if(!event.repeat&&(action==="fire"||action==="jump"))pulse(player,action);}
      }
    };
    const keyup=(event:KeyboardEvent)=>{held.delete(event.code);};const blur=()=>{for(const id of held.keys())if(keymap[id])held.delete(id);};
    const focusout=(event:FocusEvent)=>{if(!event.relatedTarget||!cabinet.contains(event.relatedTarget as Node))pause();};
    const visibility=()=>{if(document.hidden)pause();};
    const observer=new ResizeObserver(resize),intersection=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();});observer.observe(screen);intersection.observe(screen);
    screen.addEventListener("keydown",keydown);screen.addEventListener("blur",blur);cabinet.addEventListener("focusout",focusout);window.addEventListener("keyup",keyup);window.addEventListener("blur",pause);document.addEventListener("visibilitychange",visibility);resize();
    return()=>{cancelAnimationFrame(request);observer.disconnect();intersection.disconnect();audio.dispose();commands.current=null;screen.removeEventListener("keydown",keydown);screen.removeEventListener("blur",blur);cabinet.removeEventListener("focusout",focusout);window.removeEventListener("keyup",keyup);window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  const focus=()=>screenRef.current?.focus({preventScroll:true});const start=()=>{setNotice("");commands.current?.start();focus();};const pause=()=>{commands.current?.pause();focus();};const continueGame=()=>{commands.current?.continue();focus();};const join=()=>{commands.current?.join();focus();};
  const choose=(count:number)=>{selectedPlayers.current=count;setPlayerCount(count);};
  const toggleSound=async()=>{focus();const on=await commands.current?.sound(!soundOn);setSoundOn(Boolean(on));setNotice(!soundOn&&!on?"Sound is unavailable in this browser. You can still play.":"");};
  const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(cabinetRef.current?.requestFullscreen)await cabinetRef.current.requestFullscreen();else setNotice("Full screen is unavailable in this browser.");}catch{setNotice("Full screen is unavailable in this browser.");}focus();};
  const label=`Bubble Bobble. Round ${state.round+1}. Score ${state.score}. High score ${state.best}. ${state.players.map((p,i)=>`Player ${i+1}: ${p.lives} lives, score ${p.score}.`).join(" ")} ${state.enemies} enemies remaining.`;
  const announcement=state.mode==="ready"?"Choose one or two players, then start the game.":state.mode==="paused"?"Game paused.":state.mode==="over"?`Game over. Score ${state.score}. Continue to try this round again.`:state.mode==="won"?`Adventure complete. ${state.ending==="solo"?"Play together with a friend for the happy ending.":"Bub and Bob have won together."}`:state.mode==="clear"?`Round ${state.round+1} clear. Collect the bonuses.`:`Round ${state.round+1}. ${state.players.map((p,i)=>`Player ${i+1}: ${p.lives} lives.`).join(" ")}${state.hurry?" Hurry up!":""}`;
  const playable=state.mode==="playing"||state.mode==="clear";
  return <div className="arcade-player bubble-bobble-player">
    <div className="arcade-cabinet" ref={cabinetRef}>
      <div className="arcade-screen" ref={screenRef} tabIndex={0} role="group" aria-label="Bubble Bobble playfield" aria-describedby="bubble-controls" data-mode={state.mode}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>Your browser needs canvas support to play Bubble Bobble.</canvas>
        {["ready","paused","over","won"].includes(state.mode)&&<div className={`arcade-overlay ${state.mode==="ready"?`bubble-ready ${superUnlocked?"has-super":""}`:""}`}>
          <h2 className="sr-only">{state.mode==="ready"?"Start Bubble Bobble":state.mode==="paused"?"Paused":state.mode==="won"?"Adventure complete":"Game over"}</h2>
          {state.mode==="ready"&&<div className="bubble-choice" role="group" aria-label="Number of players">{[1,2].map(count=><button type="button" key={count} aria-pressed={playerCount===count} onClick={()=>choose(count)}>{count} {count===1?"player":"players"}</button>)}</div>}
          {state.mode==="ready"&&superUnlocked&&<button type="button" className="bubble-super" aria-pressed={state.superMode} onClick={()=>commands.current?.super(!state.superMode)}>Super mode {state.superMode?"on":"off"}</button>}
          {state.mode==="over"&&<p>Score {state.score.toLocaleString()} · Best {state.best.toLocaleString()}</p>}
          <div className="bubble-end-actions">
            {state.mode==="over"&&<button type="button" className="arcade-start" onClick={continueGame}>Continue</button>}
            <button type="button" className="arcade-start" onClick={state.mode==="paused"?pause:start}>{state.mode==="ready"?"Start game":state.mode==="paused"?"Resume game":state.mode==="won"?"Play again":"New game"}</button>
          </div><span className="arcade-enter">or press Enter</span>
        </div>}
      </div>
      <div className="arcade-toolbar" aria-label="Game options">
        <button type="button" onClick={pause} disabled={["ready","over","won"].includes(state.mode)}>{state.mode==="paused"?"Resume":"Pause"}<span aria-hidden="true"> · P</span></button>
        <button type="button" onClick={()=>void toggleSound()} aria-pressed={soundOn}>Sound {soundOn?"on":"off"}</button>
        <button type="button" onClick={()=>void fullscreen()}>Full screen</button><button type="button" onClick={start}>New game</button>
        {state.mode==="playing"&&(!state.players[1]||state.players[1].lives===0)&&<button type="button" onClick={join}>Join as Bob<span aria-hidden="true"> · 2</span></button>}
      </div>
      <div className="arcade-touch" role="group" aria-label="Touch controls">{([['left','←','Move left'],['right','→','Move right'],['fire','Bubble','Blow bubbles'],['jump','Jump','Jump']] as const).map(([action,text,label])=><button type="button" key={action} aria-label={label} disabled={!playable}
        onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);commands.current?.hold(action,`touch:${event.pointerId}`,true);}}
        onPointerUp={event=>commands.current?.hold(action,`touch:${event.pointerId}`,false)} onPointerCancel={event=>commands.current?.hold(action,`touch:${event.pointerId}`,false)} onLostPointerCapture={event=>commands.current?.hold(action,`touch:${event.pointerId}`,false)}
        onKeyDown={event=>{if(["Space","Enter"].includes(event.code)){event.preventDefault();commands.current?.hold(action,`button:${action}`,true);}}}
        onKeyUp={event=>{if(["Space","Enter"].includes(event.code))commands.current?.hold(action,`button:${action}`,false);}} onBlur={()=>commands.current?.hold(action,`button:${action}`,false)}
        onClick={event=>{if(!event.detail)commands.current?.pulse(action);}}>{text}</button>)}</div>
    </div>
    <p className="sr-only" role="status">{announcement}</p><p className="arcade-notice" role="status">{notice}</p>
    <div className="arcade-instructions" id="bubble-controls">
      <dl className="arcade-keys"><div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Move</dd></div><div><dt><kbd>Z</kbd> / <kbd>J</kbd></dt><dd>Blow bubbles</dd></div><div><dt><kbd>X</kbd> / <kbd>Space</kbd></dt><dd>Jump</dd></div><div><dt><kbd>P</kbd> / <kbd>Esc</kbd></dt><dd>Pause</dd></div></dl>
      <p>Trap a monster in a bubble, then touch it to pop it. Pop touching bubbles together for a bigger score. Hold Jump to bounce on bubbles; release it to burst them. Clear every monster to move to the next round, and grab the food before the screen changes.</p>
      <p>Collect candy for faster, farther bubbles and shoes for faster movement. Pop special bubbles for water, fire or lightning; lightning travels behind you. Collect all six <strong>EXTEND</strong> letters for an extra life. Take too long and the monsters get angry, followed by the invincible Skel-Monsta.</p>
      <h2>Play together</h2><p className="bubble-coop-note">Choose 2 players, or press <kbd>2</kbd> during play to join as Bob. Player 2 uses <kbd>A</kbd> / <kbd>D</kbd> to move, <kbd>F</kbd> for bubbles and <kbd>G</kbd> to jump. Co-op uses one keyboard; touch controls operate Bub. Both players are needed for the happy ending and to unlock Super mode.</p>
      <p className="arcade-mobile-note">Move, Jump and Bubble can be held together. Try landscape full screen for a larger playfield.</p>
      <p className="section-note">A browser recreation of the 1986 arcade game, with the original 100-round platform layouts, recreated pixel art and synthesized sound. Sound starts off; high scores stay in this browser.</p>
    </div>
  </div>;
}
