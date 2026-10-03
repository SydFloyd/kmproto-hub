import type { Metadata } from "next";
import { Footer, Header } from "../../../components/chrome";
import ContraGame from "./ContraGame";

const title = "Contra | The Lab | KM Proto";
const description = "Play a Contra browser recreation with eight zones, weapon pickups, bosses and local two-player co-op. Keyboard and touch controls.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/lab/games/contra" }, openGraph: { title, description, url: "https://kmproto.com/lab/games/contra", siteName: "KM Proto" } };
export default function ContraPage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a><Header current="games" />
    <main id="main" tabIndex={-1}>
      <section className="game-intro" aria-labelledby="game-title"><div className="shell"><p className="eyebrow">The Lab · Arcade · 1987</p><div className="game-title-row"><h1 id="game-title">Contra</h1><a href="/lab/games">Back to games</a></div><p className="game-description">Run, jump and shoot through eight zones. Take on the mission solo or with a friend.</p></div></section>
      <section className="game-section" aria-label="Play Contra"><div className="shell"><ContraGame /></div></section>
    </main><Footer />
  </>;
}
