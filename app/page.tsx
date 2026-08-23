const projects = [
  {
    name: "Chordlift",
    description: "Turn copied chord charts into clean, editable ChordPro.",
    category: "Music tools",
    href: "https://chordlift.kmproto.com",
    accent: "coral",
  },
  {
    name: "Foodmiller",
    description: "A welcoming place to share recipes worth making again.",
    category: "Recipes",
    href: "https://foodmiller.com",
    accent: "olive",
  },
  {
    name: "Shep Study",
    description: "A focused companion for Bible study and reflection.",
    category: "Bible study",
    href: "https://shepstudy.com",
    accent: "blue",
  },
  {
    name: "Milk Yeller",
    description: "Photography, stories, and moments worth keeping.",
    category: "Photography",
    href: "https://milk-yeller.com",
    accent: "lilac",
  },
] as const;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="KM Proto home">
          <span className="wordmark-mark" aria-hidden="true">K</span>
          <span>KM Proto</span>
        </a>
        <span className="header-note">Independent web projects</span>
      </header>

      <section className="hero" id="top" aria-labelledby="page-title">
        <p className="eyebrow">A SMALL COLLECTION</p>
        <h1 id="page-title">Useful things,<br /><em>well considered.</em></h1>
        <p className="intro">
          KM Proto is home to a growing collection of focused digital projects—each made to do one thing well.
        </p>
      </section>

      <section className="projects" aria-labelledby="projects-heading">
        <div className="section-heading">
          <p className="eyebrow">EXPLORE</p>
          <h2 id="projects-heading">Projects</h2>
        </div>

        <div className="project-list">
          {projects.map((project, index) => (
            <a className={`project-card ${project.accent}`} href={project.href} key={project.name}>
              <span className="project-index" aria-hidden="true">0{index + 1}</span>
              <div className="project-copy">
                <span className="project-category">{project.category}</span>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </div>
              <span className="project-link" aria-label={`Visit ${project.name}`}>Visit <b aria-hidden="true">↗</b></span>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <span>KM Proto</span>
        <span>Thoughtful projects for everyday life.</span>
      </footer>
    </main>
  );
}
