import type { Metadata } from "next";
import { Footer, Header } from "../../../components/chrome";
import BubbleBobbleGame from "./BubbleBobbleGame";

const title="Bubble Bobble | The Lab | KM Proto";
const description="Play a Bubble Bobble arcade recreation with 100 original round layouts, bubble trapping, chain pops and local two-player co-op. Keyboard and touch controls.";
export const metadata:Metadata={title,description,alternates:{canonical:"/lab/games/bubble-bobble"},openGraph:{title,description,url:"https://kmproto.com/lab/games/bubble-bobble",siteName:"KM Proto"}};
export default function BubbleBobblePage(){return <>
  <a className="skip-link" href="#main">Skip to content</a><Header current="games" currentGame="/lab/games/bubble-bobble"/>
  <main id="main" tabIndex={-1}>
    <section className="game-intro" aria-labelledby="game-title"><div className="shell"><p className="eyebrow">The Lab · Arcade · 1986</p><div className="game-title-row"><h1 id="game-title">Bubble Bobble</h1><a href="/lab">Back to the Lab</a></div><p className="game-description">Bub, Bob and a hundred rounds of bubble-popping adventure. Play solo or bring a friend.</p></div></section>
    <section className="game-section" aria-label="Play Bubble Bobble"><div className="shell"><BubbleBobbleGame/></div></section>
  </main><Footer/>
</>;}
