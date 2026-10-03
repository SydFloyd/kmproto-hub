"use client";

import { useEffect, useRef, useState } from "react";
import { Asteroids, HEIGHT, NO_CONTROLS, STEP, WIDTH, type Controls, type Snapshot } from "./engine";
import { drawAsteroids } from "./draw";
import { ArcadeSound } from "./sound";
import "./asteroids.css";

type Action = keyof Controls;
type Commands = {
  start: () => void;
  pause: () => void;
  hold: (action: Action, id: string, down: boolean) => void;
  pulse: (action: Action) => void;
  sound: (enabled: boolean) => Promise<boolean>;
};
const keys: Record<string, Action> = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "thrust", KeyW: "thrust", Space: "fire", KeyH: "hyperspace", ShiftLeft: "hyperspace", ShiftRight: "hyperspace" };
const BEST_KEY = "kmproto.asteroids.best.v1";
const initial: Snapshot = { mode: "ready", score: 0, best: 0, lives: 3, wave: 1 };

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const commands = useRef<Commands | null>(null);
  const [state, setState] = useState<Snapshot>(initial);
  const [soundOn, setSoundOn] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current, screen = screenRef.current, cabinet = cabinetRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !screen || !cabinet || !ctx) return;
    let best = 0;
    try {
      const stored = Number(localStorage.getItem(BEST_KEY));
      if (Number.isSafeInteger(stored) && stored >= 0 && stored <= 1000000000) best = stored;
    } catch { /* The game also works without browser storage. */ }
    const game = new Asteroids(best), audio = new ArcadeSound();
    const held = new Map<string, Action>();
    const pulses = new Map<Action, number>();
    let request = 0, previous = 0, accumulator = 0, elapsed = 0;
    let signature = "", savedBest = best, soundEnabled = false;

    const controls = (): Controls => {
      const input = { ...NO_CONTROLS };
      for (const action of held.values()) input[action] = true;
      for (const [action, remaining] of pulses) if (remaining > 0) input[action] = true;
      return input;
    };
    const publish = () => {
      const snapshot = game.snapshot(), next = JSON.stringify(snapshot);
      if (next !== signature) { signature = next; setState(snapshot); }
      if (game.best > savedBest) {
        savedBest = game.best;
        try { localStorage.setItem(BEST_KEY, String(savedBest)); } catch { /* Keep the session score. */ }
      }
    };
    const paint = () => {
      ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
      drawAsteroids(ctx, game, controls().thrust, elapsed);
      publish();
    };
    const clearControls = () => { held.clear(); pulses.clear(); };
    const schedule = () => { if (!request) request = requestAnimationFrame(frame); };
    function frame(now: number) {
      request = 0;
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
      previous = now;
      if (game.mode === "playing") {
        elapsed += dt;
        accumulator += dt;
        while (accumulator >= STEP) {
          game.step(STEP, controls());
          for (const [action, remaining] of pulses) {
            if (remaining <= STEP) pulses.delete(action);
            else pulses.set(action, remaining - STEP);
          }
          accumulator -= STEP;
        }
      }
      for (const event of game.drainSounds()) audio.play(event);
      audio.setThrust(game.mode === "playing" && game.ship.alive && controls().thrust);
      audio.setSaucer(game.mode === "playing" && game.saucer ? game.saucer.small : null);
      paint();
      if (game.mode === "playing") schedule();
      else { previous = 0; accumulator = 0; }
    }
    const pause = () => {
      game.pause(); clearControls(); audio.stopLoops(); schedule();
    };
    commands.current = {
      start: () => {
        clearControls(); game.start(); previous = 0; accumulator = 0; elapsed = 0;
        if (soundEnabled) void audio.enable(true);
        schedule();
      },
      pause: () => {
        if (game.mode === "paused") { game.resume(); previous = 0; if (soundEnabled) void audio.enable(true); schedule(); }
        else pause();
      },
      hold: (action, id, down) => { if (down && game.mode === "playing") held.set(id, action); else held.delete(id); },
      pulse: action => { if (game.mode === "playing") pulses.set(action, .1); },
      sound: async enabled => { await audio.enable(enabled); soundEnabled = Boolean(audio.available); return soundEnabled; },
    };
    const resize = () => {
      const width = screen.getBoundingClientRect().width;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.round(canvas.width * HEIGHT / WIDTH);
      schedule();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.target !== screen || event.altKey || event.ctrlKey || event.metaKey) return;
      if (["Escape", "KeyP"].includes(event.code)) {
        if (game.mode === "playing" || game.mode === "paused") { event.preventDefault(); if (!event.repeat) commands.current?.pause(); }
      } else if (event.code === "Enter" && !event.repeat) {
        event.preventDefault();
        if (game.mode === "ready" || game.mode === "over") commands.current?.start();
        else if (game.mode === "paused") commands.current?.pause();
      } else if (keys[event.code] && game.mode === "playing") { event.preventDefault(); held.set(event.code, keys[event.code]); }
    };
    const keyup = (event: KeyboardEvent) => { held.delete(event.code); };
    const blur = () => { for (const id of held.keys()) if (keys[id]) held.delete(id); };
    const visibility = () => { if (document.hidden) pause(); };
    const focusout = (event: FocusEvent) => { if (!event.relatedTarget || !cabinet.contains(event.relatedTarget as Node)) pause(); };
    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); });
    resizeObserver.observe(screen);
    intersection.observe(screen);
    screen.addEventListener("keydown", keydown);
    screen.addEventListener("blur", blur);
    cabinet.addEventListener("focusout", focusout);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    resize();
    return () => {
      cancelAnimationFrame(request);
      resizeObserver.disconnect(); intersection.disconnect(); audio.dispose(); commands.current = null;
      screen.removeEventListener("keydown", keydown); screen.removeEventListener("blur", blur);
      cabinet.removeEventListener("focusout", focusout); window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const focus = () => screenRef.current?.focus({ preventScroll: true });
  const start = () => { setNotice(""); commands.current?.start(); focus(); };
  const pause = () => { commands.current?.pause(); focus(); };
  const toggleSound = async () => {
    focus();
    const enabled = await commands.current?.sound(!soundOn);
    setSoundOn(Boolean(enabled));
    setNotice(!soundOn && !enabled ? "Sound is unavailable in this browser. You can still play." : "");
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (cabinetRef.current?.requestFullscreen) await cabinetRef.current.requestFullscreen();
      else setNotice("Full screen is unavailable in this browser.");
    } catch { setNotice("Full screen is unavailable in this browser."); }
    focus();
  };
  const announcement = state.mode === "ready" ? "Ready. Start a game to play." : state.mode === "paused" ? "Game paused." : state.mode === "over" ? `Game over. Final score ${state.score}.` : `Wave ${state.wave}. ${state.lives} ships remaining.`;

  return (
    <div className="asteroids-player">
      <div className="arcade-cabinet" ref={cabinetRef}>
        <div className="arcade-screen" ref={screenRef} tabIndex={0} role="group" aria-label="Asteroids playfield" aria-describedby="asteroids-controls" data-mode={state.mode}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={`Asteroids. Score ${state.score}. High score ${state.best}. ${state.lives} ships. Wave ${state.wave}.`}>Your browser needs canvas support to play Asteroids.</canvas>
          {state.mode !== "playing" && (
            <div className="arcade-overlay">
              <h2 className="sr-only">{state.mode === "ready" ? "Asteroids" : state.mode === "paused" ? "Paused" : "Game over"}</h2>
              <p>{state.mode === "ready" ? "Three ships. Extra life at 10,000." : state.mode === "paused" ? "Press Resume to continue." : `Final score: ${state.score.toLocaleString()}`}</p>
              <button type="button" className="arcade-start" onClick={state.mode === "paused" ? pause : start}>{state.mode === "ready" ? "Start game" : state.mode === "paused" ? "Resume game" : "Play again"}</button>
              <span className="arcade-enter">or press Enter</span>
            </div>
          )}
        </div>
        <div className="arcade-toolbar" aria-label="Game options">
          <button type="button" onClick={pause} disabled={state.mode === "ready" || state.mode === "over"}>{state.mode === "paused" ? "Resume" : "Pause"}<span aria-hidden="true"> · P</span></button>
          <button type="button" onClick={() => void toggleSound()} aria-pressed={soundOn}>Sound {soundOn ? "on" : "off"}</button>
          <button type="button" onClick={() => void fullscreen()}>Full screen</button>
          <button type="button" onClick={start}>New game</button>
        </div>
        <div className="arcade-touch" role="group" aria-label="Touch controls">
          {([['left', 'Rotate left', '↶'], ['right', 'Rotate right', '↷'], ['thrust', 'Thrust', '↑'], ['fire', 'Fire', 'Fire'], ['hyperspace', 'Hyperspace', 'Jump']] as const).map(([action, label, symbol]) => (
            <button type="button" key={action} aria-label={label} disabled={state.mode !== "playing"}
              onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); commands.current?.hold(action, `pointer:${event.pointerId}`, true); }}
              onPointerUp={event => commands.current?.hold(action, `pointer:${event.pointerId}`, false)}
              onPointerCancel={event => commands.current?.hold(action, `pointer:${event.pointerId}`, false)}
              onLostPointerCapture={event => commands.current?.hold(action, `pointer:${event.pointerId}`, false)}
              onKeyDown={event => { if (event.code === "Space" || event.code === "Enter") { event.preventDefault(); commands.current?.hold(action, `button:${action}`, true); } }}
              onKeyUp={event => { if (event.code === "Space" || event.code === "Enter") commands.current?.hold(action, `button:${action}`, false); }}
              onBlur={() => commands.current?.hold(action, `button:${action}`, false)}
              onClick={event => { if (!event.detail) commands.current?.pulse(action); }}>
              <span aria-hidden="true">{symbol}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">{announcement}</p>
      <p className="arcade-notice" role="status">{notice}</p>
      <div className="arcade-instructions" id="asteroids-controls">
        <dl className="arcade-keys">
          <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Rotate</dd></div>
          <div><dt><kbd>↑</kbd></dt><dd>Thrust</dd></div>
          <div><dt><kbd>Space</kbd></dt><dd>Fire</dd></div>
          <div><dt><kbd>H</kbd> / <kbd>Shift</kbd></dt><dd>Hyperspace</dd></div>
          <div><dt><kbd>P</kbd> / <kbd>Esc</kbd></dt><dd>Pause</dd></div>
        </dl>
        <p>Clear the rocks to advance. Large rocks split in two, then split again. Your ship keeps drifting when you release thrust. Hyperspace is a gamble: you may reappear in danger.</p>
        <p>Rocks: 20 / 50 / 100 points. Saucers: 200 / 1,000. An extra ship every 10,000 points. High score saved in this browser.</p>
        <p className="arcade-mobile-note">Use the buttons below the screen on touch devices. Rotate, thrust and fire can be held together. Landscape gives you a larger playfield.</p>
      </div>
    </div>
  );
}
