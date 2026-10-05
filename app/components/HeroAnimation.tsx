"use client";

import { Component, lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./ripple-tank/ripple-tank.css";

const RippleTank = lazy(() => import("./ripple-tank/RippleTank"));
const MarbleMachine = lazy(() => import("./marble-machine/MarbleMachine"));
const placeholder = <div className="hero-animation-placeholder" aria-hidden="true" />;

class AnimationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? placeholder : this.props.children; }
}

export default function HeroAnimation() {
  const [theme, setTheme] = useState<"waves" | "marble" | null>(null);
  useEffect(() => {
    // Choose once per page load; only the selected canvas engine is mounted.
    const frame = requestAnimationFrame(() => {
      const preview = new URLSearchParams(location.search).get("animation");
      setTheme(preview === "waves" || preview === "marble" ? preview : Math.random() < 0.5 ? "waves" : "marble");
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!theme) return placeholder;
  return <AnimationBoundary><Suspense fallback={placeholder}>
    {theme === "waves" ? <RippleTank /> : <MarbleMachine />}
  </Suspense></AnimationBoundary>;
}
