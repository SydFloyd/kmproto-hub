import { EMAIL, mailto } from "../data";
import { PRICING_GUIDE } from "../pricing";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={diagonal ? "M7 17 17 7M8 7h9v9" : "M4 12h15m-6-6 6 6-6 6"} />
    </svg>
  );
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="KM Proto home">
      <span className="brand-monogram" aria-hidden="true">KM</span>
      <span>KM Proto</span>
    </a>
  );
}

export function Header({ current }: { current: "home" | "lab" | "pricing" }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="/#services">Services</a>
          <a href="/pricing" aria-current={current === "pricing" ? "page" : undefined}>Pricing</a>
          <a href="/#process">Process</a>
          <a href="/lab" aria-current={current === "lab" ? "page" : undefined}>The Lab</a>
          <a className="nav-cta" href="/#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <Brand />
          <p>Websites, automation and custom software<br />for small businesses and organizations.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="/pricing">Website pricing</a>
          <a href={PRICING_GUIDE} download>Pricing guide (PDF)</a>
          <a href="/lab">The Lab</a>
          <a href="https://github.com/SydFloyd" target="_blank" rel="noreferrer">GitHub</a>
          <a href={mailto("Project inquiry")}>{EMAIL}</a>
        </nav>
        <p className="footer-fine">© {new Date().getFullYear()} KM Proto</p>
      </div>
    </footer>
  );
}
