"use client";

import { useState } from "react";
import { chores, mailto } from "../data";
import { Arrow } from "./chrome";

const WEEKS_PER_YEAR = 48;

function quip(hours: number) {
  if (hours === 0) return "Pick a chore or two. Proto is hungry.";
  if (hours < 4) return "A nice warm-up. That’s a long lunch back, every week.";
  if (hours < 8) return "Now we’re talking. That’s most of a workday back, every week.";
  if (hours < 14) return `That’s about ${Math.round((hours * WEEKS_PER_YEAR) / 40)} work weeks a year. Vacation, anyone?`;
  return "Proto is delighted. You may need a new hobby.";
}

function Robot({ mood, bite }: { mood: 0 | 1 | 2; bite: number }) {
  const mouths = ["M25 44h14", "M24 42q8 7 16 0", "M22 40q10 11 20 0z"];
  return (
    <svg className={`robot mood-${mood}`} viewBox="0 0 64 64" aria-hidden="true" key={bite}>
      <line x1="32" y1="6" x2="32" y2="15" className="robot-line" />
      <circle cx="32" cy="6" r="3.5" className="robot-bulb" />
      <rect x="8" y="15" width="48" height="40" rx="12" className="robot-head" />
      <rect x="3" y="29" width="5" height="12" rx="2" className="robot-ear" />
      <rect x="56" y="29" width="5" height="12" rx="2" className="robot-ear" />
      <g className="robot-eyes">
        <circle cx="23" cy="31" r="4" />
        <circle cx="41" cy="31" r="4" />
      </g>
      <path d={mouths[mood]} className="robot-mouth" />
    </svg>
  );
}

export default function BusyworkSorter() {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const selected = chores.filter((c) => picked.includes(c.id));
  const hours = selected.reduce((sum, c) => sum + c.hours, 0);
  const yearly = Math.round(hours * WEEKS_PER_YEAR);
  const mood: 0 | 1 | 2 = hours === 0 ? 0 : hours < 8 ? 1 : 2;
  const fill = Math.min(100, (hours / 17) * 100);

  const body = [
    "Hi Kyle,",
    "",
    selected.length
      ? `I played with the Busywork Sorter and would love to get these off my plate:\n${selected.map((c) => `• ${c.task}`).join("\n")}`
      : "I have some busywork I’d love to get off my plate.",
    "",
    "A little about my business:",
    "",
  ].join("\n");

  return (
    <div className="sorter">
      <div className="sorter-plate">
        <p className="sorter-label">
          <span className="mono">Your plate</span>
          <span>Tap the chores you’d happily never do again.</span>
        </p>
        <ul className="chore-list">
          {chores.map((c) => {
            const on = picked.includes(c.id);
            return (
              <li key={c.id}>
                <button type="button" className="chore" aria-pressed={on} onClick={() => toggle(c.id)}>
                  <span className="chore-check" aria-hidden="true" />
                  <span className="chore-task">{c.task}</span>
                  <span className="chore-hours mono">~{c.hours}h/wk</span>
                </button>
              </li>
            );
          })}
        </ul>
        {picked.length > 0 && (
          <a className="sorter-peek" href="#proto-results">
            <span><strong>{hours % 1 ? hours.toFixed(1) : hours}h</strong> a week back</span>
            <span>See Proto’s plate ↓</span>
          </a>
        )}
        {picked.length > 0 && (
          <button type="button" className="sorter-reset" onClick={() => setPicked([])}>
            Put it all back
          </button>
        )}
      </div>

      <div className="sorter-bot" id="proto-results">
        <div className="bot-head">
          <Robot mood={mood} bite={picked.length} />
          <div>
            <span className="mono">Proto’s plate</span>
            <p aria-live="polite">{quip(hours)}</p>
          </div>
        </div>

        <div className="bot-stats">
          <div>
            <strong>{hours % 1 ? hours.toFixed(1) : hours}</strong>
            <span>hours back / week</span>
          </div>
          <div>
            <strong>{yearly}</strong>
            <span>hours back / year</span>
          </div>
        </div>
        <div className="bot-meter" aria-hidden="true">
          <span style={{ width: `${fill}%` }} />
        </div>

        <ul className="bot-list">
          {selected.length === 0 && <li className="bot-empty">Automations will appear here.</li>}
          {selected.map((c) => (
            <li key={c.id}>
              <span className="bot-tick" aria-hidden="true">✓</span>
              {c.auto}
            </li>
          ))}
        </ul>

        <a className="button button-light" href={mailto("Taking busywork off my plate", body)}>
          {selected.length ? "Send Kyle my list" : "Tell Kyle what’s eating your week"} <Arrow />
        </a>
        <p className="bot-fine">Rough, just-for-fun estimates. Real savings depend on your workflow.</p>
      </div>
    </div>
  );
}
