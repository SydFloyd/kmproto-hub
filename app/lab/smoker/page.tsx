import type { Metadata } from "next";
import { Footer, Header } from "../../components/chrome";
import SmokerLab from "./SmokerLab";
import "./smoker.css";

const title = "Smoker Control Lab | KM Proto";
const description = "Explore wood, pellets and simultaneous hybrid combustion, smoker dampers, meat heating and software temperature control in an interactive thermodynamics simulation.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/lab/smoker" } };

export default function SmokerPage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header current="lab" />
    <main id="main" className="smoker-page" tabIndex={-1}>
      <div className="shell">
        <div className="smoker-intro">
          <a className="smoker-back" href="/lab">← Back to the Lab</a>
          <p className="eyebrow">Thermodynamics / Control systems</p>
          <h1>Smoker Control Lab</h1>
          <p>Wood, pellets, or both at once. Explore how a software controller balances changing fuel, shared airflow and stored heat to hold a smoking temperature.</p>
        </div>
        <SmokerLab />
      </div>
    </main>
    <Footer />
  </>;
}
