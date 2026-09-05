const projects = [
  {
    name: "ChordLift",
    description: "Less formatting. More playing. Turn the chord chart you found into the one you need.",
    category: "For making music",
    href: "https://chordlift.kmproto.com",
    accent: "chord",
    label: "Find your rhythm.",
  },
  {
    name: "Food Miller",
    description: "The recipes you pass around, come back to, and make your own. Pull up a chair.",
    category: "For gathering around",
    href: "https://foodmiller.com",
    accent: "food",
    label: "Something worth sharing.",
  },
  {
    name: "Shep Study",
    description: "A little space to slow down, open Scripture, and follow your curiosity deeper.",
    category: "For growing in faith",
    href: "https://shepstudy.com",
    accent: "study",
    label: "Room for reflection.",
  },
  {
    name: "Milk Yeller",
    description: "An eye for the ordinary. Photography and stories that invite a second look.",
    category: "For looking closer",
    href: "https://milk-yeller.com",
    accent: "photo",
    label: "Notice a little more.",
  },
] as const;

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} />
    </svg>
  );
}

function ProjectArt({ kind }: { kind: string }) {
  return (
    <div className={`project-art ${kind}-art`} aria-hidden="true">
      {kind === "chord" && <>
        <span className="art-caption">A GOOD PLACE TO FIND YOUR GROOVE</span>
        <div className="music-sheet">
          <div className="sheet-heading"><span>Sunday kind of sound</span><span>♪</span></div>
          <div className="chords"><span>G</span><span>D</span><span>Em</span><span>C</span></div>
          <div className="music-lines"><i /><i /><i /></div>
          <span className="sheet-note">A few chords. Endless possibilities.</span>
        </div>
        <div className="record"><span>CL<br /><small>33⅓</small></span></div>
      </>}
      {kind === "food" && <>
        <span className="art-caption">FROM ONE KITCHEN TO ANOTHER</span>
        <div className="recipe-note"><span>FROM THE RECIPE BOX</span><strong>Made with<br /><em>a little love.</em></strong><i /> <i /><i /><small>Keep this one.</small></div>
        <div className="plate"><span className="leaf leaf-one" /><span className="leaf leaf-two" /><span className="leaf leaf-three" /><span className="tomato tomato-one" /><span className="tomato tomato-two" /></div>
      </>}
      {kind === "study" && <>
        <span className="art-caption">A QUIETER KIND OF DISCOVERY</span>
        <div className="sun-disc" />
        <div className="open-book"><div><span>PAUSE.</span><i /><i /><i /><i /><i /></div><div><span>REFLECT.</span><i /><i /><i /><i /><i /></div></div>
        <span className="study-note">Let the words take root.</span>
      </>}
      {kind === "photo" && <>
        <span className="art-caption">THE EVERYDAY, SEEN DIFFERENTLY</span>
        <div className="photo-print print-back"><div /></div>
        <div className="photo-print print-front"><div><span className="landscape-sun" /><span className="landscape-hill back-hill" /><span className="landscape-hill front-hill" /></div><span>A moment, kept.</span></div>
        <span className="photo-edition">LIGHT / LIFE / LITTLE THINGS</span>
      </>}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#projects">Skip to projects</a>
      <header className="site-header" id="top">
        <a className="wordmark" href="#top" aria-label="KM Proto home">
          <span className="wordmark-mark" aria-hidden="true">K<span>↗</span></span>
          <span>km<span className="wordmark-light">proto</span><span className="wordmark-dot">.</span></span>
        </a>
        <nav aria-label="Main navigation"><a href="#projects">The projects <span aria-hidden="true">↘</span></a><a href="#about">A little about us</a></nav>
        <span className="header-note"><i /> Independently made</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> SMALL PROJECTS. OPEN POSSIBILITIES.</p>
            <h1 id="page-title">Good ideas.<br />Made <em>useful.</em></h1>
            <p className="hero-description">For the things you love doing.<br />And the little things that make them better.</p>
            <a className="primary-link" href="#projects">Find your next little thing <Arrow /></a>
            <p className="hero-footnote">A small collection. A lot of heart.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-grid" />
            <span className="hero-art-label">THE KM PROTO COLLECTION</span>
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="idea-card idea-music"><span className="idea-symbol">♫</span><span>Make a little<br /><strong>music.</strong></span><i>01 / PLAY</i></div>
            <div className="idea-card idea-wonder"><span className="spark">✳</span><span>Leave room for<br /><strong>wonder.</strong></span><i>02 / EXPLORE</i></div>
            <span className="art-coordinate">A FEW GOOD THINGS, ALL IN ONE PLACE.</span>
            <span className="art-plus">+</span>
          </div>
        </section>

        <section className="projects" id="projects" aria-labelledby="projects-heading">
          <div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2 id="projects-heading">Go on. <em>Find your thing.</em></h2></div><span className="collection-count">04 projects & counting <span aria-hidden="true">↙</span></span></div>
          <div className="project-list">
            {projects.map((project, index) => (
              <a className={`project-card ${project.accent}`} href={project.href} key={project.name} aria-label={`Explore ${project.name}: ${project.category.toLowerCase()}`}>
                <ProjectArt kind={project.accent} />
                <div className="project-copy"><div className="project-meta"><span>{project.category}</span><span>0{index + 1}</span></div><div className="project-title"><h3>{project.name}</h3><span className="project-arrow"><Arrow diagonal /></span></div><p>{project.description}</p><span className="project-link">{project.label} <span aria-hidden="true">↗</span></span></div>
              </a>
            ))}
          </div>
        </section>

        <section className="about" id="about" aria-labelledby="about-heading">
          <span className="about-flower" aria-hidden="true">✳</span>
          <div><p className="eyebrow">A LITTLE ABOUT KM PROTO</p><h2 id="about-heading">Useful by nature.<br /><em>Personal by design.</em></h2></div>
          <div className="about-copy"><p>Some things start with “wouldn’t it be nice if…” These projects are what happened next.</p><p>A place for music, food, faith, and a different way of seeing. Small, independent projects, made with care. We hope one finds a place in your day.</p><a href="https://github.com/SydFloyd" target="_blank" rel="noreferrer">See what’s taking shape <Arrow diagonal /></a></div>
        </section>
      </main>

      <footer><a className="footer-wordmark" href="#top">kmproto.</a><span>A few good things. Made with care.</span><a href="#top">Back to the top <span aria-hidden="true">↑</span></a></footer>
    </>
  );
}
