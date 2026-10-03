"use client";

import { useEffect, useId, useRef, useState } from "react";

type Playback = "idle" | "playing" | "paused" | "complete";
type Point = { x: number; y: number };

const DURATION = 7200;
const strands = [
  { from: "Website", to: "Customers", startY: 45, first: { x: 205, y: -35 }, second: { x: 330, y: 310 }, color: "#315e7b" },
  { from: "Enquiries", to: "Sales", startY: 112, first: { x: 300, y: 285 }, second: { x: 115, y: -30 }, color: "#617c89" },
  { from: "Your tools", to: "Operations", startY: 179, first: { x: 260, y: -60 }, second: { x: 170, y: 320 }, color: "#4b736a" },
  { from: "Reports", to: "Decisions", startY: 246, first: { x: 165, y: 100 }, second: { x: 340, y: 50 }, color: "#506280" },
] as const;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const ease = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

function onCurve(points: Point[], amount: number): Point {
  const remaining = 1 - amount;
  const weights = [remaining ** 3, 3 * remaining ** 2 * amount, 3 * remaining * amount ** 2, amount ** 3];
  return {
    x: points.reduce((value, point, index) => value + point.x * weights[index], 0),
    y: points.reduce((value, point, index) => value + point.y * weights[index], 0),
  };
}

export default function WorkflowAnimation() {
  const id = useId();
  const figure = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [playback, setPlayback] = useState<Playback>("idle");

  useEffect(() => {
    if (playback !== "playing") return;

    let frame = 0;
    let started: number | null = null;
    const initial = progressRef.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");

    const tick = (time: number) => {
      started ??= time;
      const next = clamp(initial + (time - started) / DURATION);
      progressRef.current = next;
      setProgress(next);
      if (next === 1) setPlayback("complete");
      else frame = window.requestAnimationFrame(tick);
    };

    const pauseWhenHidden = () => {
      if (document.hidden) setPlayback("paused");
    };
    const finishWithoutMotion = () => {
      if (!preference.matches) return;
      window.cancelAnimationFrame(frame);
      progressRef.current = 1;
      setProgress(1);
      setPlayback("complete");
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlayback("paused");
    });

    if (figure.current) observer.observe(figure.current);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    preference.addEventListener("change", finishWithoutMotion);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      preference.removeEventListener("change", finishWithoutMotion);
    };
  }, [playback]);

  const togglePlayback = () => {
    if (playback === "playing") {
      setPlayback("paused");
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      progressRef.current = 1;
      setProgress(1);
      setPlayback("complete");
    } else {
      if (playback === "complete") {
        progressRef.current = 0;
        setProgress(0);
      }
      setPlayback("playing");
    }
  };

  const reset = () => {
    progressRef.current = 0;
    setProgress(0);
    setPlayback("idle");
  };

  const buttonText = { idle: "Play animation", playing: "Pause animation", paused: "Resume animation", complete: "Replay animation" }[playback];
  const status = {
    idle: "Play to bring the pieces together.",
    playing: "Turning a tangle into a clearer flow.",
    paused: "Paused. Continue when you’re ready.",
    complete: "Connected tools. Less repeated work.",
  }[playback];
  const arrangement = ease(clamp((progress - 0.06) / 0.5));

  return (
    <figure className="workflow-demo" ref={figure} data-state={playback}>
      <figcaption>
        <h2>Bring the pieces together</h2>
        <p>Your website, tools and everyday work.</p>
      </figcaption>
      <svg className="workflow-scene" viewBox="0 0 440 292" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>From scattered work to connected workflows</title>
        <desc id={`${id}-description`}>Four tangled lines connect a website, enquiries, tools and reports to customers, sales, operations and decisions. Playing the animation straightens the connections and sends a signal along each line.</desc>
        <defs>
          <pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.8" fill="#dce3e9" /></pattern>
        </defs>
        <rect x="128" y="8" width="184" height="276" fill={`url(#${id}-dots)`} />
        {strands.map((strand, index) => {
          const endY = strand.startY;
          const points = [
            { x: 122, y: strand.startY },
            { x: mix(strand.first.x, 180, arrangement), y: mix(strand.first.y, strand.startY, arrangement) },
            { x: mix(strand.second.x, 260, arrangement), y: mix(strand.second.y, strand.startY, arrangement) },
            { x: 318, y: endY },
          ];
          const path = `M${points[0].x},${points[0].y} C${points[1].x},${points[1].y} ${points[2].x},${points[2].y} ${points[3].x},${points[3].y}`;
          const signalProgress = clamp((progress - 0.6 - index * 0.04) / 0.18);
          const signal = onCurve(points, signalProgress);
          const connected = signalProgress === 1;
          return (
            <g key={strand.from}>
              <path d={path} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
              <path className="workflow-strand" d={path} fill="none" stroke={strand.color} strokeWidth="2.5" strokeLinecap="round" />
              <rect x="12" y={strand.startY - 19} width="104" height="38" rx="3" fill="#fff" stroke="#d5dde3" />
              <text x="64" y={strand.startY + 5} textAnchor="middle" className="workflow-label">{strand.from}</text>
              <circle cx="122" cy={strand.startY} r="4" fill={strand.color} />
              <rect x="324" y={endY - 19} width="104" height="38" rx="3" fill={connected ? "#edf3f1" : "#fff"} stroke={connected ? "#78988e" : "#d5dde3"} />
              <text x="376" y={endY + 5} textAnchor="middle" className="workflow-label">{strand.to}</text>
              <circle cx="318" cy={endY} r="4" fill={connected ? strand.color : "#fff"} stroke={strand.color} strokeWidth="1.5" />
              {signalProgress > 0 && signalProgress < 1 && <circle cx={signal.x} cy={signal.y} r="5" fill={strand.color} stroke="#fff" strokeWidth="2" />}
            </g>
          );
        })}
      </svg>
      <div className="workflow-controls">
        <button className="button button-secondary" type="button" onClick={togglePlayback}>
          <svg className="workflow-control-icon" viewBox="0 0 16 16" aria-hidden="true">
            {playback === "playing" ? <path d="M4 3h3v10H4zm5 0h3v10H9z" /> : <path d="m5 3 8 5-8 5z" />}
          </svg>
          {buttonText}
        </button>
        {playback !== "idle" && <button className="workflow-reset" type="button" onClick={reset}>Reset</button>}
      </div>
      <p className="workflow-status" aria-live="polite" aria-atomic="true">{status}</p>
    </figure>
  );
}
