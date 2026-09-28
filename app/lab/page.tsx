import type { Metadata } from "next";
import { Arrow, Footer, Header } from "../components/chrome";
import { mailto, projects } from "../data";

export const metadata: Metadata = {
  title: "The Lab | KM Proto",
  description: "Independent apps from KM Proto for music, food, faith, writing and photography.",
  alternates: { canonical: "/lab" },
};

export default function Lab() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="lab" />

      <main id="main">
        <section className="lab-hero" aria-labelledby="lab-title">
          <div className="shell">
            <p className="kicker">The Lab</p>
            <h1 id="lab-title">
              Small apps, <em>made with care.</em>
            </h1>
            <p className="hero-lede">
              Independent projects for music, food, faith and a different way of seeing. This is where KM Proto
              tries new ideas first, and every one is free to explore.
            </p>
            <p className="lab-count mono">
              {String(projects.length).padStart(2, "0")} projects &amp; counting
            </p>
          </div>
        </section>

        <section className="section lab-section" aria-label="Projects">
          <div className="shell">
            <ul className="lab-grid">
              {projects.map((p, i) => (
                <li key={p.name}>
                  <a className={`lab-card tone-${p.tone}`} href={p.href}>
                    <div className="lab-card-art" aria-hidden="true">
                      <span className="lab-card-glyph">{p.glyph}</span>
                      <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="lab-card-body">
                      <span className="mono lab-card-cat">{p.category}</span>
                      <h2>
                        {p.name} <Arrow diagonal />
                      </h2>
                      <p>{p.description}</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>

            <div className="lab-cta">
              <p>
                Like how these feel? <em>Your business could have something like this.</em>
              </p>
              <a className="button button-accent" href={mailto("Something like the Lab, for my business")}>
                Talk to Kyle <Arrow />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
