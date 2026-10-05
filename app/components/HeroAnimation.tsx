"use client";

import { useEffect, useState } from "react";
import Blueprint from "./blueprint/Blueprint";
import RippleTank from "./ripple-tank/RippleTank";

export default function HeroAnimation() {
  const [theme, setTheme] = useState<"waves" | "blueprint" | null>(null);
  useEffect(() => {
    // Choose once per page load; only the selected canvas engine is mounted.
    const frame = requestAnimationFrame(() => setTheme(Math.random() < 0.5 ? "waves" : "blueprint"));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!theme) return <div className="hero-animation-placeholder" aria-hidden="true" />;
  return theme === "waves" ? <RippleTank /> : <Blueprint />;
}
