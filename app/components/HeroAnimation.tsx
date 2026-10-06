"use client";

import { Component, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import "./ripple-tank/ripple-tank.css";

const RippleTank = lazy(() => import("./ripple-tank/RippleTank"));
const placeholder = <div className="hero-animation-placeholder" aria-hidden="true" />;

class AnimationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? placeholder : this.props.children; }
}

export default function HeroAnimation() {
  return <AnimationBoundary><Suspense fallback={placeholder}>
    <RippleTank />
  </Suspense></AnimationBoundary>;
}
