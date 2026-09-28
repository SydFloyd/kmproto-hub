import { EMAIL, mailto } from "../data";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={diagonal ? "M7 17 17 7M8 7h9v9" : "M4 12h15m-6-6 6 6-6 6"} />
    </svg>
  );
}

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="mark-bg" />
      <path d="M10 8v16M10.5 17 20 8M13.5 14.5 21 24" className="mark-k" />
      <circle cx="24.5" cy="24.5" r="2.6" className="mark-dot" />
    </svg>
  );
}

export function Header({ current }: { current: "home" | "lab" }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="/" aria-label="KM Proto home">
          <Mark />
          <span>
            KM Proto
          </span>
        </a>
        <nav aria-label="Main">
          <a href="/#services">Services</a>
          <a href="/#process">Process</a>
          <a href="/lab" aria-current={current === "lab" ? "page" : undefined}>
            The Lab
          </a>
          <a className="nav-cta" href="/#contact">
            Get in touch
          </a>
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
          <a className="brand" href="/" aria-label="KM Proto home">
            <Mark />
            <span>KM Proto</span>
          </a>
          <p>Websites, AI automation &amp; custom software.<br />Practical technology for small businesses.</p>
        </div>
        <div className="footer-links">
          <a href={mailto("Hello from kmproto.com")}>{EMAIL}</a>
          <a href="/#services">Services</a>
          <a href="/lab">The Lab</a>
          <a href="https://github.com/SydFloyd" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <p className="footer-fine">
          © {new Date().getFullYear()} KM Proto · Designed &amp; built in-house, naturally.
        </p>
      </div>
    </footer>
  );
}
