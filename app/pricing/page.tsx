import type { Metadata } from "next";
import { Arrow, Footer, Header } from "../components/chrome";
import WebsitePackages from "../components/WebsitePackages";
import { mailto } from "../data";
import { monthlyServices, PRICING_DATE, PRICING_GUIDE, websiteAddons } from "../pricing";

const title = "Website Pricing | KM Proto";
const description = "Website builds from $1,200, $2,500 and $4,500. Compare scopes, add-ons and optional hosting and support. Download the KM Proto pricing guide.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { title, description, url: "https://kmproto.com/pricing", siteName: "KM Proto", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function Pricing() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header current="pricing" />
      <main id="main" tabIndex={-1}>
        <section className="page-intro" aria-labelledby="pricing-title">
          <div className="shell">
            <p className="eyebrow">Website pricing</p>
            <h1 id="pricing-title">Professional websites.<br />Straightforward pricing.</h1>
            <p className="hero-lede">A clear online presence for small businesses and organizations, with direct access to the person building it.</p>
            <p className="page-note">Pricing guide · {PRICING_DATE} · All prices in USD</p>
            <div className="actions">
              <a className="button button-primary" href={PRICING_GUIDE} download>Download pricing guide (PDF)</a>
              <a className="button button-secondary" href={mailto("Website quote request")}>Request a quote <Arrow /></a>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="packages-title">
          <div className="shell">
            <div className="section-head">
              <h2 id="packages-title">Website packages</h2>
              <p>Base prices for the scopes below. Your final scope and fee are agreed before work begins.</p>
            </div>
            <WebsitePackages />
            <p className="section-note">CMS entries do not count toward Expanded’s 10 standard pages.</p>

            <div className="pricing-block" aria-labelledby="included-title">
              <h2 id="included-title">Included in every build</h2>
              <div className="inclusion-grid">
                <div>
                  <h3>Design &amp; development</h3>
                  <ul className="detail-list">
                    <li>Mobile-friendly layout and one agreed design direction.</li>
                    <li>Light editing of supplied content.</li>
                    <li>One contact form with spam protection, up to 6 fields.</li>
                    <li>Page titles, descriptions, headings and sitemap.</li>
                    <li>Image optimization; keyboard, contrast and form-label checks.</li>
                  </ul>
                </div>
                <div>
                  <h3>Testing, launch &amp; handoff</h3>
                  <ul className="detail-list">
                    <li>Basic analytics and Search Console setup with your approval.</li>
                    <li>Mobile and browser testing.</li>
                    <li>Two consolidated revision rounds.</li>
                    <li>Launch and account handoff.</li>
                    <li>Correction of defects in our delivered work for 30 days after launch. New requests and third-party changes are separate.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="scope-note">
              <h3>What keeps the price predictable</h3>
              <p>You provide your logo, images and approved copy. Packages cover one language and standard content pages using the agreed design system.</p>
              <p>A revision round is one consolidated set of feedback within the agreed direction, not a new design or feature.</p>
              <p>Stores, member areas, dashboards, AI features and custom integrations are quoted separately. Original copywriting, branding, photography and ongoing SEO are not included.</p>
            </div>
            <div className="payment-note">
              <h3>50% to begin. 50% before launch or final handoff.</h3>
              <p>Optional hosting and support. No mandatory maintenance contract.</p>
            </div>
          </div>
        </section>

        <section className="section section-tint" aria-labelledby="addons-title">
          <div className="shell">
            <div className="section-head">
              <h2 id="addons-title">Add-ons</h2>
              <p>Choose only what your website needs. Extra work is approved before it is billed.</p>
            </div>
            <div className="table-wrap" role="region" aria-label="Website add-on fees and scope" tabIndex={0}>
              <table className="rates-table">
                <caption className="sr-only">Website add-on fees and scope</caption>
                <thead><tr><th scope="col">Service</th><th scope="col">Fee</th><th scope="col">Scope</th></tr></thead>
                <tbody>
                  {websiteAddons.map((addon) => <tr key={addon.name}><th scope="row">{addon.name}</th><td className="rate-fee">{addon.fee}</td><td>{addon.scope}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="monthly-title">
          <div className="shell">
            <div className="section-head">
              <h2 id="monthly-title">Optional monthly services</h2>
              <p>Manage your own website after handoff, or choose hosting administration or website care.</p>
            </div>
            <div className="table-wrap" role="region" aria-label="Optional monthly service fees and inclusions" tabIndex={0}>
              <table className="rates-table">
                <caption className="sr-only">Optional monthly service fees and inclusions</caption>
                <thead><tr><th scope="col">Option</th><th scope="col">Monthly fee</th><th scope="col">Included</th></tr></thead>
                <tbody>
                  {monthlyServices.map((service) => <tr key={service.name}><th scope="row">{service.name}</th><td className="rate-fee">{service.fee}</td><td>{service.scope}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="service-terms">
              <p>Care time does not roll over. Larger repairs and new features are separate. Plans are month-to-month with 30 days’ cancellation notice; no 24/7 support.</p>
              <p>Base managed hosting is already included in Website care.</p>
            </div>
            <p className="cost-example"><strong>Example:</strong> Business + 12 months of Website care = <strong>$3,640</strong>, before outside costs and tax.</p>
          </div>
        </section>

        <section className="section section-tint" aria-labelledby="expectations-title">
          <div className="shell">
            <div className="section-head"><h2 id="expectations-title">Clear expectations</h2></div>
            <dl className="terms-list">
              <div><dt>Outside costs</dt><dd>Domain, email, premium licenses, CMS/database subscriptions, transaction fees and excess usage are separate and disclosed at vendor cost. Applicable tax is additional.</dd></div>
              <div><dt>Ownership</dt><dd>Your domain and third-party accounts remain yours. Project-specific deliverables transfer after full payment; reusable components and third-party assets retain their licenses. Launch handoff is included, even without a monthly plan.</dd></div>
              <div><dt>Scope &amp; timing</dt><dd>Quotes are valid for 30 days. Schedule is confirmed at kickoff and depends on timely content and feedback. Legal/privacy text is client-supplied. Search rankings, business results and accessibility certification are not guaranteed.</dd></div>
            </dl>
            <div className="page-cta">
              <div><h2>Discuss your website</h2><p>Send your requirements and preferred timeline to request a scoped quote.</p></div>
              <a className="button button-primary" href={mailto("Website quote request")}>Contact Kyle <Arrow /></a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
