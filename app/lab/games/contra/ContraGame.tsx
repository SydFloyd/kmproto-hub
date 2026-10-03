"use client";

import { useEffect, useRef, useState } from "react";
import { Contra, HEIGHT, IDLE, STAGES, STEP, WIDTH, type Controls, type Snapshot } from "./engine";
import { drawContra } from "./draw";
import { ContraSound } from "./sound";
import "../arcade.css";
import "./contra.css";

type Action = keyof Controls;
type Commands = { start: () => void; pause: () => void; continue: () => void; hold: (action: Action, id: string, down: boolean) => void; direction: (id: string, actions: Action[]) => void; pulse: (action: Action) => void; sound: (on: boolean) => Promise<boolean> };
const keymap: Record<string, [number, Action]> = {
  ArrowLeft: [0, "left"], ArrowRight: [0, "right"], ArrowUp: [0, "up"], ArrowDown: [0, "down"], KeyZ: [0, "fire"], KeyJ: [0, "fire"], KeyX: [0, "jump"], Space: [0, "jump"],
  KeyA: [1, "left"], KeyD: [1, "right"], KeyW: [1, "up"], KeyS: [1, "down"], KeyF: [1, "fire"], KeyG: [1, "jump"],
};
const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];
const BEST_KEY = "kmproto.contra.best.v1";
const initial: Snapshot = { mode: "ready", stage: 0, room: 0, score: 0, best: 0, players: [], continues: 3, thirtyLives: false, boss: 100 };

export default function ContraGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null), screenRef = useRef<HTMLDivElement>(null), cabinetRef = useRef<HTMLDivElement>(null);
  const commands = useRef<Commands | null>(null), selectedPlayers = useRef(1);
  const [state, setState] = useState<Snapshot>(initial);
  const [playerCount, setPlayerCount] = useState(1), [soundOn, setSoundOn] = useState(false), [notice, setNotice] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current, screen = screenRef.current, cabinet = cabinetRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !screen || !cabinet || !ctx) return;
    let best = 0;
    try { const saved = Number(localStorage.getItem(BEST_KEY)); if (Number.isSafeInteger(saved) && saved >= 0 && saved <= 1000000000) best = saved; } catch { /* Scores still work in this session. */ }
    const game = new Contra(best), audio = new ContraSound();
    const held = new Map<string, [number, Action]>(), pulses = new Map<string, { player: number; action: Action; time: number }>();
    let request = 0, previous = 0, accumulator = 0, signature = "", savedBest = best, soundEnabled = false, codeIndex = 0;
    const input = () => {
      const controls: Controls[] = [{ ...IDLE }, { ...IDLE }];
      for (const [player, action] of held.values()) controls[player][action] = true;
      for (const pulse of pulses.values()) controls[pulse.player][pulse.action] = true;
      return controls;
    };
    const pulse = (player: number, action: Action) => pulses.set(`${player}:${action}`, { player, action, time: .075 });
    const clear = () => { held.clear(); pulses.clear(); };
    const publish = () => {
      const snapshot = game.snapshot(), next = JSON.stringify(snapshot);
      if (next !== signature) { signature = next; setState(snapshot); }
      if (game.best > savedBest) { savedBest = game.best; try { localStorage.setItem(BEST_KEY, String(savedBest)); } catch { /* Storage is optional. */ } }
    };
    const paint = () => {
      ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
      drawContra(ctx, game); publish();
    };
    const schedule = () => { if (!request) request = requestAnimationFrame(frame); };
    function frame(now: number) {
      request = 0;
      const dt = previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
      if (game.mode === "playing" || game.mode === "clear") {
        accumulator += dt;
        while (accumulator >= STEP) {
          game.step(STEP, input()); accumulator -= STEP;
          for (const [id, value] of pulses) { value.time -= STEP; if (value.time <= 0) pulses.delete(id); }
        }
      }
      audio.tick(dt, game.mode === "playing", game.stageIndex);
      for (const event of game.drainSounds()) audio.play(event);
      paint();
      if (game.mode === "playing" || game.mode === "clear") schedule();
      else { previous = 0; accumulator = 0; }
    }
    const pause = () => { game.pause(); clear(); audio.pause(); schedule(); };
    const wake = () => { previous = 0; accumulator = 0; if (soundEnabled) void audio.enable(true); schedule(); };
    commands.current = {
      start: () => { clear(); game.start(selectedPlayers.current); wake(); },
      pause: () => { if (game.mode === "paused") { game.resume(); wake(); } else pause(); },
      continue: () => { clear(); game.continueGame(); wake(); },
      hold: (action, id, down) => { if (down && game.mode === "playing") { held.set(id, [0, action]); if (action === "fire" || action === "jump") pulse(0, action); } else held.delete(id); },
      direction: (id, actions) => { for (const action of ["left", "right", "up", "down"] as const) held.delete(`${id}:${action}`); if (game.mode === "playing") for (const action of actions) held.set(`${id}:${action}`, [0, action]); },
      pulse: action => { if (game.mode === "playing") pulse(0, action); },
      sound: async on => { soundEnabled = Boolean(await audio.enable(on)); return soundEnabled; },
    };
    const resize = () => { canvas.width = Math.max(1, Math.round(screen.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2))); canvas.height = Math.round(canvas.width * HEIGHT / WIDTH); schedule(); };
    const keydown = (event: KeyboardEvent) => {
      if (event.target !== screen || event.ctrlKey || event.altKey || event.metaKey) return;
      if (game.mode === "ready" && !event.repeat && event.code !== "Enter") {
        if (event.code === code[codeIndex]) codeIndex++;
        else codeIndex = event.code === code[0] ? 1 : 0;
        if (codeIndex === code.length) { game.thirtyLives = true; codeIndex = 0; setNotice("30 lives enabled for the next mission."); schedule(); }
        if (keymap[event.code]) event.preventDefault();
      }
      if (["Escape", "KeyP"].includes(event.code)) {
        if (["playing", "paused", "clear"].includes(game.mode)) { event.preventDefault(); if (!event.repeat) commands.current?.pause(); }
      } else if (event.code === "Enter" && !event.repeat) {
        event.preventDefault();
        if (game.mode === "paused") commands.current?.pause();
        else if (game.mode === "over" && game.continues > 0) commands.current?.continue();
        else if (["ready", "over", "won"].includes(game.mode)) commands.current?.start();
      } else if (keymap[event.code] && game.mode === "playing") {
        const [player, action] = keymap[event.code];
        if (player < selectedPlayers.current) { event.preventDefault(); held.set(event.code, [player, action]); if (!event.repeat && (action === "fire" || action === "jump")) pulse(player, action); }
      }
    };
    const keyup = (event: KeyboardEvent) => { held.delete(event.code); };
    const blur = () => { for (const id of held.keys()) if (keymap[id]) held.delete(id); };
    const focusout = (event: FocusEvent) => { if (!event.relatedTarget || !cabinet.contains(event.relatedTarget as Node)) pause(); };
    const visibility = () => { if (document.hidden) pause(); };
    const observer = new ResizeObserver(resize), intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); });
    observer.observe(screen); intersection.observe(screen);
    screen.addEventListener("keydown", keydown); screen.addEventListener("blur", blur); cabinet.addEventListener("focusout", focusout);
    window.addEventListener("keyup", keyup); window.addEventListener("blur", pause); document.addEventListener("visibilitychange", visibility); resize();
    return () => {
      cancelAnimationFrame(request); observer.disconnect(); intersection.disconnect(); audio.dispose(); commands.current = null;
      screen.removeEventListener("keydown", keydown); screen.removeEventListener("blur", blur); cabinet.removeEventListener("focusout", focusout);
      window.removeEventListener("keyup", keyup); window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const focus = () => screenRef.current?.focus({ preventScroll: true });
  const start = () => { setNotice(""); commands.current?.start(); focus(); };
  const pause = () => { commands.current?.pause(); focus(); };
  const continueMission = () => { commands.current?.continue(); focus(); };
  const choose = (count: number) => { selectedPlayers.current = count; setPlayerCount(count); };
  const toggleSound = async () => { focus(); const on = await commands.current?.sound(!soundOn); setSoundOn(Boolean(on)); setNotice(!soundOn && !on ? "Sound is unavailable in this browser. You can still play." : ""); };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (cabinetRef.current?.requestFullscreen) await cabinetRef.current.requestFullscreen(); else setNotice("Full screen is unavailable in this browser."); }
    catch { setNotice("Full screen is unavailable in this browser."); }
    focus();
  };
  const pad = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect(), dx = event.clientX - box.x - box.width / 2, dy = event.clientY - box.y - box.height / 2;
    const actions: Action[] = [];
    if (Math.abs(dx) > 10 && Math.abs(dx) >= Math.abs(dy) * .45) actions.push(dx < 0 ? "left" : "right");
    if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx) * .45) actions.push(dy < 0 ? "up" : "down");
    commands.current?.direction(`pad:${event.pointerId}`, actions);
  };
  const endPad = (event: React.PointerEvent<HTMLDivElement>) => commands.current?.direction(`pad:${event.pointerId}`, []);
  const label = `Contra. Zone ${state.stage + 1}: ${STAGES[state.stage].name}. Score ${state.score}. High score ${state.best}. ${state.players.map((player, i) => `Player ${i + 1}: ${player.lives} lives, weapon ${player.weapon}.`).join(" ")}`;
  const announcement = state.mode === "ready" ? "Choose one or two players, then start the mission." : state.mode === "over" ? `Game over. Score ${state.score}. ${state.continues} continues remaining.` : state.mode === "won" ? `Mission complete. Final score ${state.score}.` : state.mode === "paused" ? "Mission paused." : state.mode === "clear" ? `Zone ${state.stage + 1} complete. One bonus life.` : `Zone ${state.stage + 1}: ${STAGES[state.stage].name}. ${state.players.map((player, i) => `Player ${i + 1}: ${player.lives} lives.`).join(" ")}`;
  return (
    <div className="arcade-player contra-player">
      <div className="arcade-cabinet" ref={cabinetRef}>
        <div className="arcade-screen" ref={screenRef} tabIndex={0} role="group" aria-label="Contra playfield" aria-describedby="contra-controls" data-mode={state.mode}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={label}>Your browser needs canvas support to play Contra.</canvas>
          {["ready", "paused", "over", "won"].includes(state.mode) && <div className="arcade-overlay">
            <h2 className="sr-only">{state.mode === "ready" ? "Start Contra" : state.mode === "paused" ? "Paused" : state.mode === "won" ? "Mission complete" : "Game over"}</h2>
            {state.mode === "ready" && <div className="contra-choice" role="group" aria-label="Number of players">{[1, 2].map(count => <button key={count} type="button" aria-pressed={playerCount === count} onClick={() => choose(count)}>{count} {count === 1 ? "player" : "players"}</button>)}</div>}
            {(state.mode === "over" || state.mode === "won") && <p>Score {state.score.toLocaleString()} · Best {state.best.toLocaleString()}</p>}
            <div className="contra-end-actions">
              {state.mode === "over" && state.continues > 0 && <button type="button" className="arcade-start" aria-label={`Continue mission (${state.continues} remaining)`} onClick={continueMission}>Continue · {state.continues}</button>}
              <button type="button" className="arcade-start" onClick={state.mode === "paused" ? pause : start}>{state.mode === "ready" ? "Start game" : state.mode === "paused" ? "Resume game" : state.mode === "won" ? "Play again" : "New game"}</button>
            </div>
            <span className="arcade-enter">or press Enter</span>
          </div>}
        </div>
        <div className="arcade-toolbar" aria-label="Game options">
          <button type="button" onClick={pause} disabled={["ready", "over", "won"].includes(state.mode)}>{state.mode === "paused" ? "Resume" : "Pause"}<span aria-hidden="true"> · P</span></button>
          <button type="button" onClick={() => void toggleSound()} aria-pressed={soundOn}>Sound {soundOn ? "on" : "off"}</button>
          <button type="button" onClick={() => void fullscreen()}>Full screen</button>
          <button type="button" onClick={start}>New mission</button>
        </div>
        <div className="contra-touch" role="group" aria-label="Touch controls">
          <div className="contra-dpad" role="group" aria-label="Direction pad"
            onPointerDown={event => { if (state.mode !== "playing") return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pad(event); }}
            onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pad(event); }}
            onPointerUp={endPad} onPointerCancel={endPad} onLostPointerCapture={endPad}>
            {([['up', '↑'], ['left', '←'], ['right', '→'], ['down', '↓']] as const).map(([action, symbol]) => <button type="button" key={action} data-action={action} aria-label={action === "up" ? "Aim up or advance" : action === "down" ? "Crouch or aim down" : `Move ${action}`} disabled={state.mode !== "playing"}
              onKeyDown={event => { if (["Space", "Enter"].includes(event.code)) { event.preventDefault(); commands.current?.hold(action, `button:${action}`, true); } }}
              onKeyUp={event => { if (["Space", "Enter"].includes(event.code)) commands.current?.hold(action, `button:${action}`, false); }} onBlur={() => commands.current?.hold(action, `button:${action}`, false)}
              onClick={event => { if (!event.detail) commands.current?.pulse(action); }}><span aria-hidden="true">{symbol}</span></button>)}
          </div>
          <div className="contra-touch-actions">{([['jump', 'Jump'], ['fire', 'Fire']] as const).map(([action, name]) => <button key={action} type="button" disabled={state.mode !== "playing"}
            onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); commands.current?.hold(action, `touch:${event.pointerId}`, true); }}
            onPointerUp={event => commands.current?.hold(action, `touch:${event.pointerId}`, false)} onPointerCancel={event => commands.current?.hold(action, `touch:${event.pointerId}`, false)} onLostPointerCapture={event => commands.current?.hold(action, `touch:${event.pointerId}`, false)}
            onKeyDown={event => { if (["Space", "Enter"].includes(event.code)) { event.preventDefault(); commands.current?.hold(action, `button:${action}`, true); } }}
            onKeyUp={event => { if (["Space", "Enter"].includes(event.code)) commands.current?.hold(action, `button:${action}`, false); }} onBlur={() => commands.current?.hold(action, `button:${action}`, false)}
            onClick={event => { if (!event.detail) commands.current?.pulse(action); }}>{name}</button>)}</div>
        </div>
      </div>
      <p className="sr-only" role="status">{announcement}</p><p className="arcade-notice" role="status">{notice}</p>
      <div className="arcade-instructions" id="contra-controls">
        <dl className="arcade-keys">
          <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Move</dd></div><div><dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>Aim / crouch</dd></div><div><dt><kbd>Z</kbd> / <kbd>J</kbd></dt><dd>Fire</dd></div><div><dt><kbd>X</kbd> / <kbd>Space</kbd></dt><dd>Jump</dd></div><div><dt><kbd>P</kbd> / <kbd>Esc</kbd></dt><dd>Pause</dd></div>
        </dl>
        <p>Hold fire and aim in eight directions. Down crouches; Down + Jump drops through platforms. Shoot the weapon capsules, then collect the flying badge. M: machine gun · S: spread · L: laser · F: fireball · R: rapid fire · B: barrier.</p>
        <p>Destroy a boss’s gun pods to expose its core. In the bases, line up with each sensor and shoot forward; hold Up once the energy field is down to advance. Three lives, three continues and one bonus life for each cleared zone. Weapons are lost when you die.</p>
        <h2>Two-player co-op</h2><p className="contra-coop-note">Choose 2 players before starting. Player 2 uses <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move and aim, <kbd>F</kbd> to fire and <kbd>G</kbd> to jump. Stay together as the screen scrolls. Co-op uses a shared keyboard; touch controls operate Player 1.</p>
        <p className="arcade-mobile-note">Hold the direction pad between arrows to aim diagonally while firing. Jump and fire can be held together. Try landscape full screen for a larger playfield.</p>
        <p className="section-note">An eight-zone browser recreation with original level layouts, pixel art and chiptune music. High score saved in this browser.</p>
      </div>
    </div>
  );
}
