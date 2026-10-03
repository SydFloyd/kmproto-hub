"use client";

import { useEffect, useRef } from "react";
import { games } from "../lab/games/catalog";

export default function GamesMenu({ currentGame }: { currentGame?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        event.preventDefault();
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return (
    <details className="games-menu" ref={ref} data-active={Boolean(currentGame) || undefined}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }}>
      <summary>Games <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" /></svg></summary>
      <ul aria-label="Browser games">
        {games.map(game => <li key={game.href}><a href={game.href} aria-current={currentGame === game.href ? "page" : undefined}>{game.name}<span>{game.year}</span></a></li>)}
      </ul>
    </details>
  );
}
