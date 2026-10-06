import type { Metadata } from "next";
import { Arrow, Footer, Header } from "../../components/chrome";
import { games } from "./catalog";
import "./games.css";

const title = "Arcade | The Lab | KM Proto";
const description = "Play Asteroids, Contra, Bubble Bobble and R.C. Pro-Am in your browser. Explore KM Proto's arcade recreations with keyboard, touch controls and local co-op.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/lab/games" },
  openGraph: { title, description, url: "https://kmproto.com/lab/games", siteName: "KM Proto" },
};

export default function GamesPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="games" />
      <main id="main" tabIndex={-1}>
        <section className="page-intro" aria-labelledby="games-title">
          <div className="shell">
            <p className="eyebrow">The Lab</p>
            <div className="games-title-row"><h1 id="games-title">Arcade</h1><a href="/lab">Back to the Lab</a></div>
            <p className="hero-lede">Classic arcade and console games, recreated for your browser. Choose a game to begin.</p>
            <p className="page-note">{games.length} games · Keyboard and touch controls</p>
          </div>
        </section>
        <section className="section games-directory" aria-label="Arcade library">
          <div className="shell">
            <ul className="games-grid">
              {games.map(game => (
                <li key={game.id}>
                  <article>
                    <a className="game-card" href={game.href} aria-labelledby={`name-${game.id}`} aria-describedby={`description-${game.id} players-${game.id}`}>
                      <div className={`game-card-art game-card-art-${game.id}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Static Vite hosting serves these small preview files directly. */}
                        <img src={game.preview} width={game.width} height={game.height} alt="" decoding="async" />
                      </div>
                      <div className="game-card-content">
                        <p className="game-card-meta">{game.year} · {game.category}</p>
                        <h2 id={`name-${game.id}`}>{game.name}</h2>
                        <p className="game-card-description" id={`description-${game.id}`}>{game.description}</p>
                        <div className="game-card-footer"><span id={`players-${game.id}`}>{game.players}</span><span className="game-card-play">Play game <Arrow /></span></div>
                      </div>
                    </a>
                  </article>
                </li>
              ))}
            </ul>
            <p className="section-note">Sound starts off. Two-player games share a keyboard.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
