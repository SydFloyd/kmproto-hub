import type { Metadata } from "next";
import { Footer, Header } from "../../../components/chrome";
import RCProAmGame from "./RCProAmGame";
const title = "R.C. Pro-Am | The Lab | KM Proto";
const description = "Play an R.C. Pro-Am browser recreation with isometric racing, weapons, upgrades and 24 NES course shapes. Keyboard and touch controls.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/lab/games/rc-pro-am" }, openGraph: { title, description, url: "https://kmproto.com/lab/games/rc-pro-am", siteName: "KM Proto" } };
export default function RCProAmPage() {
  return <><a className="skip-link" href="#main">Skip to content</a><Header current="games" /><main id="main" tabIndex={-1}>
    <section className="game-intro" aria-labelledby="game-title"><div className="shell"><p className="eyebrow">The Lab · NES · 1988</p><div className="game-title-row"><h1 id="game-title">R.C. Pro-Am</h1><a href="/lab/games">Back to Arcade</a></div><p className="game-description">Small trucks. Slippery corners. Race, upgrade and blast your way to the next circuit.</p></div></section>
    <section className="game-section" aria-label="Play R.C. Pro-Am"><div className="shell"><RCProAmGame /></div></section></main><Footer /></>;
}
