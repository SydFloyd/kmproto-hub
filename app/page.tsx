const projects = [
  {
    name: "Stillcraft",
    description: "Bring a photo. Add another. Arrange, crop and make a picture of your own. Try the early preview, right on your device.",
    category: "For making it your own",
    href: "https://stillcraft.kmproto.com",
    accent: "stillcraft",
    label: "A little room to create.",
  },
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
    name: "Verseform",
    description: "Write freely. Type a Scripture reference, then preview or insert the passage without leaving the page.",
    category: "For writing with Scripture",
    href: "https://verseform.kmproto.com",
    accent: "verse",
    label: "Keep writing.",
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
      {kind === "verse" && <>
        <span className="art-caption">SCRIPTURE, RIGHT WHEN YOU NEED IT</span>
        <div className="verse-specimen">
          <span>VERSEFORM / WRITING 03</span>
          <strong>John 3:16</strong>
          <div><i /><i /><i /><i /></div>
          <small>preview → insert</small>
        </div>
        <span className="verse-note">TYPE. PAUSE. CONTINUE.</span>
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
      {kind === "stillcraft" && <>
        <span className="art-caption">YOUR PHOTOS. YOUR POSSIBILITIES.</span>
        <div className="composition-paper"><svg viewBox="0 0 260 175"><rect width="260" height="175" fill="#e4e7dc"/><circle cx="198" cy="45" r="24" fill="#d4aa73"/><path d="M0 120Q70 45 140 119T260 88V175H0" fill="#96a38d"/><path d="M0 148Q70 93 144 145T260 120V175H0" fill="#557561"/></svg></div>
        <div className="composition-piece"><svg viewBox="0 0 110 145"><rect width="110" height="145" fill="#d9b59e"/><circle cx="58" cy="49" r="20" fill="#f3e4c8"/><path d="M0 104Q35 75 73 105T110 85V145H0" fill="#aa7867"/></svg><i /></div>
        <span className="composition-note">A picture worth keeping.</span>
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
          <div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2 id="projects-heading">Go on. <em>Find your thing.</em></h2></div><span className="collection-count">{String(projects.length).padStart(2, "0")} projects & counting <span aria-hidden="true">↙</span></span></div>
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
