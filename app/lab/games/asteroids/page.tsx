import type { Metadata } from "next";
import { Footer, Header } from "../../../components/chrome";
import AsteroidsGame from "./AsteroidsGame";

const title = "Asteroids | The Lab | KM Proto";
const description = "Play Asteroids in your browser: vector graphics, drifting ships, splitting rocks, flying saucers and hyperspace. Keyboard and touch controls.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/lab/games/asteroids" },
  openGraph: { title, description, url: "https://kmproto.com/lab/games/asteroids", siteName: "KM Proto" },
};

export default function AsteroidsPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="games" />
      <main id="main" tabIndex={-1}>
        <section className="game-intro" aria-labelledby="game-title">
          <div className="shell">
            <p className="eyebrow">The Lab · Arcade · 1979</p>
            <div className="game-title-row"><h1 id="game-title">Asteroids</h1><a href="/lab/games">Back to games</a></div>
            <p className="game-description">An arcade classic, rebuilt for your browser. Rotate, thrust and shoot. Watch for the saucers.</p>
          </div>
        </section>
        <section className="game-section" aria-label="Play Asteroids"><div className="shell"><AsteroidsGame /></div></section>
      </main>
      <Footer />
    </>
  );
}
