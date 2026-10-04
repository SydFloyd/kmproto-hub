import type { Metadata } from "next";
import { Arrow, Footer, Header } from "../components/chrome";
import { labProjects, mailto } from "../data";

const title = "The Lab | KM Proto";
const description = "Independent applications from KM Proto for music, recipes, writing, Bible study and photography.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/lab" },
  openGraph: { title, description, url: "https://kmproto.com/lab", siteName: "KM Proto", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function Lab() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="lab" />
      <main id="main" tabIndex={-1}>
        <section className="page-intro" aria-labelledby="lab-title">
          <div className="shell">
            <p className="eyebrow">The Lab</p>
            <h1 id="lab-title">Independent projects</h1>
            <p className="hero-lede">Applications I develop alongside client work, covering music, recipes, writing, Bible study and photography.</p>
            <p className="page-note">{labProjects.length} projects</p>
          </div>
        </section>
        <section className="section" aria-label="Project directory">
          <div className="shell">
            <ul className="project-directory">
              {labProjects.map((project) => (
                <li key={project.name}>
                  <article className="project-entry">
                    <p className="project-category">{project.category}</p>
                    <div><h2><a href={project.href}>{project.name} <Arrow diagonal={!project.href.startsWith("/")} /></a></h2><p>{project.description}</p></div>
                    <a className="project-visit" href={project.href} aria-label={`Visit ${project.name}`}>Visit project <Arrow diagonal={!project.href.startsWith("/")} /></a>
                  </article>
                </li>
              ))}
            </ul>
            <div className="page-cta">
              <div><h2>Have a project in mind?</h2><p>Get in touch to discuss a website or application for your business.</p></div>
              <a className="button button-primary" href={mailto("Custom application inquiry")}>Contact Kyle <Arrow /></a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
