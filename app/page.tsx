import BusyworkSorter from "./components/BusyworkSorter";
import CopyEmail from "./components/CopyEmail";
import { Arrow, Footer, Header } from "./components/chrome";
import { EMAIL, mailto, principles, process, projects, services } from "./data";

const marquee = ["Websites", "AI automation", "Custom software", "Prototypes", "Integrations", "Dashboards", "Care & support"];

function ServiceIcon({ id }: { id: string }) {
  return (
    <svg className="service-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {id === "websites" && (
        <>
          <rect x="5" y="9" width="38" height="30" rx="4" />
          <path d="M5 17h38" />
          <circle cx="10" cy="13" r="1" className="fill" />
          <circle cx="14" cy="13" r="1" className="fill" />
          <path d="M11 24h14M11 29h9" />
          <rect x="29" y="23" width="8" height="10" rx="1.5" className="accent" />
        </>
      )}
      {id === "automation" && (
        <>
          <circle cx="11" cy="24" r="5" />
          <circle cx="37" cy="12" r="5" />
          <circle cx="37" cy="36" r="5" className="accent" />
          <path d="M16 22.5 32 14M16 25.5 32 34" />
        </>
      )}
      {id === "software" && (
        <>
          <path d="m17 15-9 9 9 9M31 15l9 9-9 9" />
          <path d="m27 11-6 26" className="accent" />
        </>
      )}
    </svg>
  );
}

function Workbench() {
  return (
    <div className="workbench" aria-hidden="true">
      <div className="wb-grid" />
      <div className="wb-browser">
        <div className="wb-bar">
          <span className="wb-dots"><i /><i /><i /></span>
          <span className="wb-url">yourbusiness.com</span>
        </div>
        <div className="wb-site">
          <div className="wb-nav"><b /><span><i /><i /><i /></span></div>
          <p className="wb-headline">Your business,<br /><em>looking its best.</em></p>
          <div className="wb-lines"><i /><i /></div>
          <span className="wb-button">Book a visit</span>
          <div className="wb-tiles"><i /><i /><i /></div>
        </div>
      </div>

      <div className="wb-flow">
        <span className="mono">Automation · running</span>
        <ol>
          <li><i />New inquiry received</li>
          <li><i />Added to your CRM</li>
          <li><i />Friendly reply drafted</li>
          <li><i />Follow-up scheduled</li>
        </ol>
      </div>

      <div className="wb-code">
        <span><em>const</em> quote = <b>await</b> build(job)</span>
        <span>send(quote) <i>{"// ✓ done"}</i></span>
      </div>

      <div className="wb-note">prototype v0.1<br />looks good →</div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="home" />

      <main id="main">
        {/* ─── Hero ─── */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="shell hero-inner">
            <div className="hero-copy">
              <p className="status">
                <span className="status-dot" aria-hidden="true" />
                Independent studio · Taking on new projects
              </p>
              <h1 id="hero-title">
                Practical technology for <em>small businesses.</em>
              </h1>
              <p className="hero-lede">
                Websites, AI automation and custom software, designed and built by one developer who
                answers his own email.
              </p>
              <div className="hero-actions">
                <a className="button button-accent" href={mailto("New project inquiry")}>
                  Start a project <Arrow />
                </a>
                <a className="button button-ghost" href="#services">
                  See what I do
                </a>
              </div>
            </div>
            <Workbench />
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((n) => (
              <span key={n}>
                {marquee.map((m) => (
                  <span key={m}>{m}<b>✳</b></span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ─── Services ─── */}
        <section className="section" id="services" aria-labelledby="services-title">
          <div className="shell">
            <div className="section-head">
              <p className="kicker">What I do</p>
              <h2 id="services-title">
                Three ways to make your business <em>run smoother.</em>
              </h2>
              <p className="section-intro">
                Start with one, or combine them. Every project is sized to your business, with a clear plan and a
                working result.
              </p>
            </div>

            <div className="services">
              {services.map((s) => (
                <article className="service" key={s.id} id={s.id}>
                  <div className="service-top">
                    <ServiceIcon id={s.id} />
                    <span className="mono">{s.index}</span>
                  </div>
                  <p className="service-name">{s.name}</p>
                  <h3>{s.headline}</h3>
                  <p className="service-summary">{s.summary}</p>
                  <ul>
                    {s.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Fun: busywork sorter ─── */}
        <section className="section section-dark" id="sorter" aria-labelledby="sorter-title">
          <div className="shell">
            <div className="section-head">
              <p className="kicker">The Busywork Sorter</p>
              <h2 id="sorter-title">
                What would you hand to <em>a robot?</em>
              </h2>
              <p className="section-intro">
                Meet Proto. Feed it the chores that quietly eat your week and see how much time you could win back.
              </p>
            </div>
            <BusyworkSorter />
          </div>
        </section>

        {/* ─── Process ─── */}
        <section className="section" id="process" aria-labelledby="process-title">
          <div className="shell">
            <div className="section-head section-head-split">
              <div>
                <p className="kicker">How it works</p>
                <h2 id="process-title">
                  Simple process. <em>Real progress.</em>
                </h2>
              </div>
              <aside className="proto-note">
                <span className="mono">Why “Proto”?</span>
                <p>
                  The quickest way to a good decision is a working prototype. You see real progress early, and we
                  shape the final product together.
                </p>
              </aside>
            </div>
            <ol className="process">
              {process.map((p) => (
                <li key={p.step}>
                  <span className="process-step mono">{p.step}</span>
                  <h3>{p.name}</h3>
                  <p>{p.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── About ─── */}
        <section className="section section-tint" id="about" aria-labelledby="about-title">
          <div className="shell about">
            <div className="about-intro">
              <p className="kicker">Who you’ll work with</p>
              <h2 id="about-title">
                Hi, I’m Kyle. <em>Nice to meet you.</em>
              </h2>
              <p>
                KM Proto is my independent practice. I help small businesses use technology to look sharper, work
                faster, and spend less time on the tedious stuff.
              </p>
              <p>
                No account managers, no handoffs. When you email, you get me, and I’ll be the one building your
                project from first sketch to launch day.
              </p>
            </div>
            <ul className="principles">
              {principles.map((p, i) => (
                <li key={p.title}>
                  <span className="mono">0{i + 1}</span>
                  <h3>{p.title}</h3>
                  <p>{p.copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Lab teaser ─── */}
        <section className="section" id="lab" aria-labelledby="lab-title">
          <div className="shell lab-teaser">
            <div className="section-head">
              <p className="kicker">From the Lab</p>
              <h2 id="lab-title">
                I build my own products, <em>too.</em>
              </h2>
              <p className="section-intro">
                Between client projects, I make small apps for music, food, faith and photography. They’re where I
                try new ideas first.
              </p>
              <a className="text-link" href="/lab">
                Visit the Lab <Arrow />
              </a>
            </div>
            <ul className="lab-rows">
              {projects.map((p) => (
                <li key={p.name}>
                  <a href={p.href} className={`tone-${p.tone}`}>
                    <span className="lab-glyph" aria-hidden="true">{p.glyph}</span>
                    <span className="lab-name">{p.name}</span>
                    <span className="lab-cat">{p.category}</span>
                    <Arrow diagonal />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Contact ─── */}
        <section className="contact" id="contact" aria-labelledby="contact-title">
          <div className="shell contact-inner">
            <p className="kicker">Get in touch</p>
            <h2 id="contact-title">
              Got a project, a problem, or <em>just a hunch?</em>
            </h2>
            <p className="contact-lede">
              Tell me a little about your business and what you’d like to improve. I read every message myself.
            </p>
            <a className="contact-email" href={mailto("New project inquiry")}>
              {EMAIL}
              <Arrow diagonal />
            </a>
            <div className="contact-actions">
              <a className="button button-accent" href={mailto("New project inquiry")}>
                Write an email <Arrow />
              </a>
              <CopyEmail />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
