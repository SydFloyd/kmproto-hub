"use client";

import { useId } from "react";

export type SmokerDiagramProps = {
  fuel: "wood" | "pellets";
  intake: number;
  exhaust: number;
  chamberC: number;
  fireC: number;
  coreC: number;
  heatKw: number;
  cleanBurn: number;
  phase: string;
  lidOpen: boolean;
  running: boolean;
  unit?: "F" | "C";
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const fahrenheit = (celsius: number) => Math.round(celsius * 1.8 + 32);

/** A cutaway: arrows describe the energy paths, not calculated gas trajectories. */
export default function SmokerDiagram({
  fuel,
  intake,
  exhaust,
  chamberC,
  fireC,
  coreC,
  heatKw,
  cleanBurn,
  phase,
  lidOpen,
  running,
  unit = "F",
}: SmokerDiagramProps) {
  const id = useId().replaceAll(":", "");
  const air = clamp(intake);
  const vent = clamp(exhaust);
  const clean = clamp(cleanBurn);
  const coalBed = fuel === "wood" && phase === "Char / embers";
  const flameScale = Math.min(1.1, Math.max(0.15, (fireC - 35) / 650)) * (coalBed ? .45 : 1);
  const burning = heatKw > 0.02;
  const smokeColor = clean > 0.6 ? "#7d9fa8" : "#858078";
  const smokeOpacity = (0.19 + (1 - clean) * 0.47) * Math.max(0.12, vent);
  const navy = "#102638";
  const amber = "#c85a21";
  const teal = "#23777c";

  return (
    <figure className="smoker-visual" style={{ margin: 0 }} data-running={running}>
      <svg
        viewBox="0 0 880 390"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <title id={`${id}-title`}>
          {fuel === "wood" ? "Wood-fired" : "Pellet-fired"} smoker, {phase}
        </title>
        <desc id={`${id}-desc`}>
          Cutaway of an offset smoker. Air enters the firebox through an intake
          damper opened to {Math.round(air * 100)} percent. Burning fuel heats
          gases that flow through the cooking chamber and leave through an
          exhaust damper opened to {Math.round(vent * 100)} percent. Heat transfers
          between the cooking chamber and meat, and through the chamber walls.
          {lidOpen ? " The cooking chamber lid is open." : " The lid is closed."}
          {running ? " Simulation running." : " Simulation paused."}
        </desc>
        <defs>
          <linearGradient id={`${id}-chamber`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f6dbbe" />
            <stop offset="1" stopColor="#f8f2e8" />
          </linearGradient>
          <radialGradient id={`${id}-fire`}>
            <stop offset="0" stopColor="#efb76c" stopOpacity=".5" />
            <stop offset="1" stopColor="#c85a21" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The firebox is lower than the cooking chamber, supporting natural draft. */}
        <path d="M299 250H332V306H299" fill="#ecd3b6" stroke={navy} strokeWidth="4" />
        <rect x="105" y="212" width="203" height="129" rx="20" fill="#f8f2e8" stroke={navy} strokeWidth="4" />
        <circle cx="211" cy="280" r="63" fill={`url(#${id}-fire)`} opacity={burning ? 1 : 0.15} />
        <path d="M128 341V364M281 341V364" stroke={navy} strokeWidth="6" strokeLinecap="round" />

        {fuel === "wood" ? (
          <g>
            <rect x="153" y="306" width="109" height="16" rx="8" fill={coalBed ? "#4f4840" : "#805234"} stroke={navy} strokeWidth="2" transform="rotate(-8 206 314)" />
            <rect x="159" y="311" width="104" height="15" rx="7" fill={coalBed ? "#63564a" : "#a77443"} stroke={navy} strokeWidth="2" transform="rotate(10 211 318)" />
            <path d="M172 308L194 316M211 304L226 315M233 313L251 320" stroke={coalBed ? "#c85a21" : "#dfab70"} strokeWidth="2" />
          </g>
        ) : (
          <g>
            <path d="M34 123H94L87 190H45Z" fill="#e3e9e9" stroke={navy} strokeWidth="3" />
            <path d="M41 140H88L82 183H49Z" fill="#b58a5e" />
            <path d="M53 148L63 153M72 146L82 151M51 165L61 170M68 165L78 170" stroke="#7e573a" strokeWidth="5" strokeLinecap="round" />
            <path d="M65 190V228L161 299" fill="none" stroke={navy} strokeWidth="14" strokeLinejoin="round" />
            <path d="M65 190V228L161 299" fill="none" stroke="#e3e9e9" strokeWidth="8" strokeLinejoin="round" />
            <path d="M166 306L174 325H252L260 306Z" fill="#c5cfce" stroke={navy} strokeWidth="2" />
            <path d="M178 309H246" stroke="#a77443" strokeWidth="8" strokeLinecap="round" />
            <text x="65" y="111" textAnchor="middle" fill={navy} fontSize="17" fontWeight="600">Pellets</text>
          </g>
        )}
        <g opacity={burning ? 1 : 0.15} transform={`translate(210 309) scale(${flameScale}) translate(-210 -309)`}>
          <path d="M182 308C158 291 194 278 187 253C211 264 204 274 215 282C224 263 225 247 219 232C257 268 263 287 239 308Z" fill={amber} />
          <path d="M198 308C187 294 207 289 208 273C226 287 223 294 234 308Z" fill="#efb76c" />
        </g>

        {/* Damper blades: transverse means closed, parallel to flow means open. */}
        <path d="M31 280H82" fill="none" stroke={teal} strokeWidth="4" strokeLinecap="round" opacity={0.15 + air * 0.85} />
        <path d="M70 272L83 280L70 288" fill="none" stroke={teal} strokeWidth="3" strokeLinecap="round" opacity={0.15 + air * 0.85} />
        <circle cx="105" cy="280" r="21" fill="#eaf2f2" stroke={navy} strokeWidth="3" />
        <path d="M105 263V297" stroke={navy} strokeWidth="5" strokeLinecap="round" transform={`rotate(${air * 90} 105 280)`} />
        <circle cx="105" cy="280" r="3" fill={teal} />
        <text x="65" y="322" textAnchor="middle" fill={teal} fontSize="17" fontWeight="600">Intake</text>

        <path d="M377 328V364M699 328V364" stroke={navy} strokeWidth="6" strokeLinecap="round" />
        <rect x="326" y="130" width="447" height="199" rx="40" fill={`url(#${id}-chamber)`} stroke={navy} strokeWidth="4" />
        <path d="M351 297H749" stroke={navy} strokeWidth="3" />
        <path d="M369 297V307M397 297V307M425 297V307M453 297V307M481 297V307M509 297V307M537 297V307M565 297V307M593 297V307M621 297V307M649 297V307M677 297V307M705 297V307M733 297V307" stroke={navy} strokeWidth="2" />
        {lidOpen ? (
          <g>
            <path d="M329 160L743 81" stroke={navy} strokeWidth="9" strokeLinecap="round" />
            <path d="M502 115L536 108" stroke={navy} strokeWidth="6" strokeLinecap="round" />
            <path d="M398 142C381 122 412 109 397 86M475 129C458 110 491 94 476 76" fill="none" stroke={amber} strokeWidth="3" opacity=".5" />
          </g>
        ) : (
          <path d="M330 163H769M517 129V119H575V129" fill="none" stroke={navy} strokeWidth="3" />
        )}
        <text x="548" y="191" textAnchor="middle" fill={navy} fontSize="19" fontWeight="600">Cooking chamber</text>

        {/* Warm gas carries heat from the fire into the chamber. */}
        <g fill="none" stroke={amber} strokeWidth="4" strokeLinecap="round" opacity={burning ? 0.9 : 0.25}>
          <path d="M278 273C340 273 352 227 425 226H475" />
          <path d="M461 218L476 226L461 234" />
          <path d="M457 277H493" />
          <path d="M480 269L494 277L480 285" />
        </g>
        <path d="M501 287C483 272 494 246 512 242C520 221 544 224 555 232C575 218 604 225 611 244C633 246 640 270 625 287Z" fill="#b77852" stroke="#75462f" strokeWidth="3" />
        <path d="M517 251C537 237 556 249 570 241M584 253L609 267M518 273L542 280" fill="none" stroke="#d9a178" strokeWidth="3" strokeLinecap="round" />
        <path d="M538 262L562 263" stroke="#fff5e7" strokeWidth="3" />
        <circle cx="567" cy="263" r="7" fill={teal} stroke="#fff" strokeWidth="2" />

        {/* Exhaust exits above the chamber; density indicates combustion quality. */}
        <path d="M718 146V59H756V146" fill="#eaf0ef" stroke={navy} strokeWidth="4" />
        <g stroke={smokeColor} fill="none" strokeWidth="8" strokeLinecap="round" opacity={smokeOpacity}>
          <path d="M646 241C705 242 739 198 738 157V66" />
          <path d="M733 52C711 32 747 26 733 9" />
          <path d="M749 45C772 26 748 22 766 8" />
        </g>
        <path d="M723 94H751" stroke={navy} strokeWidth="5" strokeLinecap="round" transform={`rotate(${vent * 90} 737 94)`} />
        <circle cx="737" cy="94" r="3" fill={teal} />
        <text x="795" y="85" fill={teal} fontSize="17" fontWeight="600">Exhaust</text>

        {/* Surface heat loss and conduction into the meat are distinct paths. */}
        <g stroke={amber} fill="none" strokeWidth="2.5" strokeLinecap="round" opacity=".55">
          <path d="M421 120V81M414 91L421 80L428 91" />
          <path d="M642 120V81M635 91L642 80L649 91" />
          <path d="M785 230H818M808 223L819 230L808 237" />
        </g>
        <text x="533" y="66" textAnchor="middle" fill="#9c4820" fontSize="17">Heat to surroundings</text>
        <text x="207" y="385" textAnchor="middle" fill={navy} fontSize="18" fontWeight="600">{fuel === "wood" ? "Wood firebox" : "Pellet firebox"}</text>
        <text x="568" y="385" textAnchor="middle" fill={teal} fontSize="18" fontWeight="600">{chamberC >= coreC ? "Heat moves inward to the core" : "Heat leaves the meat as it cools"}</text>
      </svg>
      <figcaption style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem", paddingTop: "1rem", color: navy }}>
        {[
          ["Firebox", fireC],
          ["Chamber", chamberC],
          ["Meat core", coreC],
        ].map(([label, temperature]) => (
          <div key={label}>
            <span style={{ display: "block", fontSize: "0.75rem", color: "#536570" }}>{label}</span>
            <strong style={{ display: "block", fontSize: "1.25rem", fontVariantNumeric: "tabular-nums" }}>{unit === "F" ? fahrenheit(Number(temperature)) : Math.round(Number(temperature))}°{unit}</strong>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}
