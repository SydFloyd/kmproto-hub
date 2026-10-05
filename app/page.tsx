import CopyEmail from "./components/CopyEmail";
import RippleTank from "./components/ripple-tank/RippleTank";
import { Arrow, Footer, Header } from "./components/chrome";
import { EMAIL, mailto, process, projects, services } from "./data";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="home" />
      <main id="main" tabIndex={-1}>
        <section className="hero hero-water" aria-labelledby="hero-title">
          <div className="shell">
            <div className="hero-copy">
              <p className="eyebrow">Independent web &amp; software development</p>
              <h1 id="hero-title">Make your business<br />easier to find and run.</h1>
              <p className="hero-lede">Websites, automation and custom software that help customers reach you and give your team a simpler way to work. Designed and built directly with Kyle.</p>
              <p className="page-note">Websites starting at $1,200.<br />Serving lower Bucks County · In-person meetings by appointment</p>
              <div className="actions">
                <a className="button button-primary" href={mailto("New project inquiry")}>Request a quote <Arrow /></a>
                <a className="button button-secondary" href="#services">Explore services</a>
              </div>
            </div>
            <RippleTank />
          </div>
        </section>

        <section className="section" id="services" aria-labelledby="services-title">
          <div className="shell">
            <div className="section-head">
              <p className="eyebrow">Services</p>
              <h2 id="services-title">What I can help with</h2>
              <p>Start with the website or workflow your business needs.</p>
            </div>
            <div className="services-grid">
              {services.map((service) => (
                <article className="service" id={service.id} key={service.id}>
                  <h3>{service.name}</h3>
                  <p>{service.summary}</p>
                  <ul>{service.items.map((item) => <li key={item}>{item}</li>)}</ul>
                  <a className="text-link" href={service.href}>{service.link} <Arrow /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="process" aria-labelledby="process-title">
          <div className="shell">
            <div className="section-head">
              <p className="eyebrow">Process</p>
              <h2 id="process-title">From brief to handoff</h2>
              <p>The scope, feedback rounds and schedule are agreed at the start of the project.</p>
            </div>
            <ol className="process-grid">
              {process.map((step) => (
                <li key={step.step}>
                  <span className="step-number" aria-hidden="true">{step.step}</span>
                  <h3>{step.name}</h3>
                  <p>{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section-tint" id="about" aria-labelledby="about-title">
          <div className="shell about-grid">
            <div>
              <p className="eyebrow">About KM Proto</p>
              <h2 id="about-title">Work directly with Kyle</h2>
              <p>KM Proto is my independent web and software practice. I handle the design, development and project communication myself.</p>
              <p>My focus is small businesses and organizations that need a useful website or a better way to manage their work.</p>
            </div>
            <dl className="working-details">
              <div><dt>Written scope</dt><dd>Deliverables, feedback rounds and schedule agreed in advance.</dd></div>
              <div><dt>Your accounts</dt><dd>Your domain and third-party accounts remain yours.</dd></div>
              <div><dt>Project handoff</dt><dd>Receive your finished project and account handoff, with optional ongoing support.</dd></div>
            </dl>
          </div>
        </section>

        <section className="section" id="lab" aria-labelledby="lab-title">
          <div className="shell lab-overview">
            <div className="section-head">
              <p className="eyebrow">The Lab</p>
              <h2 id="lab-title">Independent projects</h2>
              <p>Alongside client work, I develop applications for music, writing, photography and other interests.</p>
              <a className="text-link" href="/lab">Browse the projects <Arrow /></a>
            </div>
            <ul className="project-links">
              {projects.map((project) => (
                <li key={project.name}>
                  <a href={project.href}><span><strong>{project.name}</strong><span className="project-category">{project.category}</span></span><Arrow diagonal /></a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="contact" id="contact" aria-labelledby="contact-title">
          <div className="shell contact-inner">
            <div>
              <p className="eyebrow">Contact</p>
              <h2 id="contact-title">Discuss your project</h2>
              <p>Include a little about your business, what you need, and your preferred timeline. If you’re in lower Bucks County, we can arrange an in-person meeting to discuss your project.</p>
            </div>
            <div className="contact-details">
              <a className="contact-email" href={mailto("New project inquiry")}>{EMAIL}</a>
              <div className="actions">
                <a className="button button-light" href={mailto("New project inquiry")}>Email Kyle <Arrow /></a>
                <CopyEmail />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
