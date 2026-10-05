"use client";

import { useEffect, useState } from "react";
import Blueprint from "./blueprint/Blueprint";
import RippleTank from "./ripple-tank/RippleTank";
import MarbleMachine from "./marble-machine/MarbleMachine";

export default function HeroAnimation() {
  const [theme, setTheme] = useState<"waves" | "blueprint" | "marble" | null>(null);
  useEffect(() => {
    // Choose once per page load; only the selected canvas engine is mounted.
    const frame = requestAnimationFrame(() => {
      const roll = Math.random();
      setTheme(roll < 1 / 3 ? "waves" : roll < 2 / 3 ? "blueprint" : "marble");
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!theme) return <div className="hero-animation-placeholder" aria-hidden="true" />;
  return theme === "waves" ? <RippleTank /> : theme === "blueprint" ? <Blueprint /> : <MarbleMachine />;
}
