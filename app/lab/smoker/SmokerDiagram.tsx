"use client";

import { useId } from "react";

export type SmokerDiagramProps = {
  fuel: "wood" | "pellets" | "hybrid";
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
  woodKw?: number;
  pelletKw?: number;
  woodPhase?: string;
  pelletPhase?: string;
  woodIntake?: number;
  pelletIntake?: number;
  woodFireC?: number;
  pelletFireC?: number;
  woodAirKgS?: number;
  pelletAirKgS?: number;
  woodHeatIntoChamberW?: number;
  pelletHeatIntoChamberW?: number;
  woodSmokeIndex?: number;
  pelletSmokeIndex?: number;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const fahrenheit = (celsius: number) => Math.round(celsius * 1.8 + 32);
const navy = "#102638";
const amber = "#c85a21";
const teal = "#23777c";
const pelletAmber = "#b77615";

/** A cutaway: arrows describe the energy paths, not calculated gas trajectories. */
export default function SmokerDiagram({
  fuel, intake, exhaust, chamberC, fireC, coreC, heatKw, cleanBurn, phase,
  lidOpen, running, unit = "F", woodKw, pelletKw, woodPhase, pelletPhase,
  woodIntake, pelletIntake, woodFireC, pelletFireC, woodAirKgS, pelletAirKgS,
  woodHeatIntoChamberW, pelletHeatIntoChamberW, woodSmokeIndex, pelletSmokeIndex,
}: SmokerDiagramProps) {
  const id = useId().replaceAll(":", "");
  const vent = clamp(exhaust);
  const clean = clamp(cleanBurn);
  const hybrid = fuel === "hybrid";
  const sources = [
    {
      kind: "wood", label: "Wood firebox", release: Math.max(0, woodKw ?? heatKw * (hybrid ? .5 : 1)),
      intake: clamp(hybrid ? woodIntake ?? intake : intake), temperature: hybrid ? woodFireC ?? fireC : fireC,
      airflow: woodAirKgS, toChamber: woodHeatIntoChamberW, smoke: clamp(woodSmokeIndex ?? 1 - clean),
      phase: woodPhase ?? phase, offset: hybrid ? -90 : 0, color: amber,
    },
    {
      kind: "pellets", label: "Pellet firebox", release: Math.max(0, pelletKw ?? heatKw * (hybrid ? .5 : 1)),
      intake: clamp(hybrid ? pelletIntake ?? intake : intake), temperature: hybrid ? pelletFireC ?? fireC : fireC,
      airflow: pelletAirKgS, toChamber: pelletHeatIntoChamberW, smoke: clamp(pelletSmokeIndex ?? 1 - clean),
      phase: pelletPhase ?? phase, offset: hybrid ? 105 : 0, color: pelletAmber,
    },
  ].filter(source => hybrid || source.kind === fuel);
  const heating = sources.some(source => source.toChamber === undefined ? source.release > .02 : source.toChamber > 20);
  const temperature = (celsius: number) => `${unit === "F" ? fahrenheit(celsius) : Math.round(celsius)}°${unit}`;
  const smokeColor = clean > .6 ? "#7d9fa8" : "#858078";
  const smokeOpacity = (.19 + (1 - clean) * .47) * Math.max(.12, vent);

  return (
    <figure className="smoker-visual" style={{ margin: 0 }} data-running={running}>
      <svg
        viewBox={hybrid ? "0 0 880 495" : "0 0 880 390"}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <title id={`${id}-title`}>
          {hybrid ? "Dedicated wood and pellet fireboxes" : fuel === "wood" ? "Wood-fired smoker" : "Pellet-fired smoker"}, {phase}
        </title>
        <desc id={`${id}-desc`}>
          {hybrid
            ? "Two dedicated fireboxes feed one cooking chamber. Wood burns in the upper firebox; an auger supplies pellets to the lower firebox. Each firebox has its own air intake, temperature, and heat and smoke path into the chamber. "
            : "Cutaway of an offset smoker. Burning fuel heats gases that flow from the firebox into the cooking chamber. "}
          {sources.map(source => `${source.label}: intake ${Math.round(source.intake * 100)} percent, temperature ${temperature(source.temperature)}, fuel heat release ${source.release.toFixed(2)} kilowatts. `).join("")}
          Both chamber heat and smoke leave through the shared exhaust, opened to {Math.round(vent * 100)} percent.
          Heat transfers between the chamber and meat, and through the chamber walls.
          {lidOpen ? " The chamber lid is open." : " The lid is closed."}
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
          {sources.map(source => <marker key={`${source.kind}-arrow`} id={`${id}-heat-${source.kind}`} markerWidth="16" markerHeight="16" refX="14" refY="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M2 2L14 8L2 14" fill="none" stroke={source.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </marker>)}
        </defs>

        {/* Separate ducts join the common pit; neither firebox feeds the other. */}
        {hybrid ? <>
          <path d="M299 162H332V219H299" fill="#ecd3b6" stroke={navy} strokeWidth="4" />
          <path d="M299 350L334 292L357 310L308 387" fill="#ecd3b6" stroke={navy} strokeWidth="4" />
        </> : <path d="M299 250H332V306H299" fill="#ecd3b6" stroke={navy} strokeWidth="4" />}

        {sources.map(source => {
          const wood = source.kind === "wood";
          const coalBed = wood && source.phase === "Char / embers";
          const flameScale = Math.min(1.1, Math.max(.15, (source.temperature - 35) / 650)) * (coalBed ? .45 : 1);
          const augerPath = hybrid ? "M252 219V299L235 308" : "M65 190V228L161 299";
          return (
            <g key={source.kind} transform={`translate(0 ${source.offset})`}>
              <rect x="105" y="212" width="203" height="129" rx="20" fill="#f8f2e8" stroke={navy} strokeWidth="4" />
              <circle cx="211" cy="280" r="63" fill={`url(#${id}-fire)`} opacity={source.release > .02 ? 1 : .15} />
              {(!hybrid || !wood) && <path d="M128 341V364M281 341V364" stroke={navy} strokeWidth="6" strokeLinecap="round" />}
              {wood ? <>
                <rect x="153" y="306" width="109" height="16" rx="8" fill={coalBed ? "#4f4840" : "#805234"} stroke={navy} strokeWidth="2" transform="rotate(-8 206 314)" />
                <rect x="159" y="311" width="104" height="15" rx="7" fill={coalBed ? "#63564a" : "#a77443"} stroke={navy} strokeWidth="2" transform="rotate(10 211 318)" />
                <path d="M172 308L194 316M211 304L226 315M233 313L251 320" stroke={coalBed ? amber : "#dfab70"} strokeWidth="2" />
              </> : <>
                <g transform={hybrid ? "translate(187 67) scale(1 .8)" : undefined}>
                  <path d="M34 123H94L87 190H45Z" fill="#e3e9e9" stroke={navy} strokeWidth="3" />
                  <path d="M41 140H88L82 183H49Z" fill="#b58a5e" />
                  <path d="M53 148L63 153M72 146L82 151M51 165L61 170M68 165L78 170" stroke="#7e573a" strokeWidth="5" strokeLinecap="round" />
                </g>
                <path d={augerPath} fill="none" stroke={navy} strokeWidth="14" strokeLinejoin="round" />
                <path d={augerPath} fill="none" stroke="#e3e9e9" strokeWidth="8" strokeLinejoin="round" />
                <path d={augerPath} fill="none" stroke={pelletAmber} strokeWidth="3" strokeDasharray="4 9" />
                <path d="M166 306L174 325H252L260 306Z" fill="#c5cfce" stroke={navy} strokeWidth="2" />
                <path d="M178 309H246" stroke="#a77443" strokeWidth="8" strokeLinecap="round" />
                {!hybrid && <text x="65" y="111" textAnchor="middle" fill={navy} fontSize="19" fontWeight="600">Pellets</text>}
              </>}
              <g opacity={source.release > .02 ? 1 : .08} transform={`translate(210 309) scale(${flameScale}) translate(-210 -309)`}>
                <path d="M182 308C158 291 194 278 187 253C211 264 204 274 215 282C224 263 225 247 219 232C257 268 263 287 239 308Z" fill={source.color} />
                <path d="M198 308C187 294 207 289 208 273C226 287 223 294 234 308Z" fill="#efb76c" />
              </g>

              {/* A transverse damper is closed; a blade parallel to airflow is open. */}
              <g fill="none" stroke={teal} strokeLinecap="round" opacity={.15 + source.intake * .85}>
                <path d="M31 280H82" strokeWidth="4" />
                <path d="M70 272L83 280L70 288" strokeWidth="3" />
              </g>
              <circle cx="105" cy="280" r="21" fill="#eaf2f2" stroke={navy} strokeWidth="3" />
              <path d="M105 263V297" stroke={navy} strokeWidth="5" strokeLinecap="round" transform={`rotate(${source.intake * 90} 105 280)`} />
              <circle cx="105" cy="280" r="3" fill={teal} />
              <text x="55" y="322" textAnchor="middle" fill={teal} fontSize="20" fontWeight="600">Air in</text>
              <text x="207" y={hybrid && wood ? 195 : 385} textAnchor="middle" fill={navy} fontSize={hybrid ? 26 : 20} fontWeight="600">{source.label}</text>
            </g>
          );
        })}

        <path d="M377 328V364M699 328V364" stroke={navy} strokeWidth="6" strokeLinecap="round" />
        <rect x="326" y="130" width="447" height="199" rx="40" fill={`url(#${id}-chamber)`} stroke={navy} strokeWidth="4" />
        <path d="M351 297H749" stroke={navy} strokeWidth="3" />
        <path d="M369 297V307M397 297V307M425 297V307M453 297V307M481 297V307M509 297V307M537 297V307M565 297V307M593 297V307M621 297V307M649 297V307M677 297V307M705 297V307M733 297V307" stroke={navy} strokeWidth="2" />
        {lidOpen ? <g>
          <path d="M329 160L743 81" stroke={navy} strokeWidth="9" strokeLinecap="round" />
          <path d="M502 115L536 108" stroke={navy} strokeWidth="6" strokeLinecap="round" />
          <path d="M398 142C381 122 412 109 397 86M475 129C458 110 491 94 476 76" fill="none" stroke={amber} strokeWidth="3" opacity=".5" />
        </g> : <path d="M330 163H769M517 129V119H575V129" fill="none" stroke={navy} strokeWidth="3" />}
        <text x="548" y="191" textAnchor="middle" fill={navy} fontSize={hybrid ? 24 : 19} fontWeight="600">{hybrid ? "Shared cooking chamber" : "Cooking chamber"}</text>

        {sources.map(source => {
          const wood = source.kind === "wood";
          const heatIntoPit = source.toChamber ?? source.release * 1000;
          const fromPit = heatIntoPit < -20;
          const transferringHeat = Math.abs(heatIntoPit) > 20;
          const arrow = `url(#${id}-heat-${source.kind})`;
          const path = hybrid
            ? wood ? "M278 183C340 183 359 226 425 226H475" : "M278 378L340 292Q365 277 411 277H462"
            : "M278 273C340 273 352 227 425 226H475";
          const smokePath = hybrid
            ? wood ? "M270 171C344 171 372 211 425 210L651 238" : "M270 361L335 281Q379 253 448 255L658 245"
            : "M278 263C340 263 352 211 425 211L651 238";
          return <g key={`${source.kind}-paths`}>
            <path d={smokePath} fill="none" stroke={source.smoke < .4 ? "#7d9fa8" : "#858078"} strokeWidth="5" strokeLinecap="round" strokeDasharray={wood ? undefined : "5 6"} opacity={(.15 + source.smoke * .5) * (source.release > .02 ? 1 : .15)} />
            <g fill="none" stroke={source.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={hybrid && !wood ? "6 5" : undefined} opacity={transferringHeat ? .9 : .2}>
              <path d={path} markerStart={fromPit ? arrow : undefined} markerEnd={fromPit ? undefined : arrow} data-source={source.kind} data-heat-direction={fromPit ? "from-pit" : "to-pit"} />
            </g>
          </g>;
        })}
        <g fill="none" stroke={amber} strokeWidth="4" strokeLinecap="round" opacity={heating ? .9 : .25}>
          <path d="M457 277H493M480 269L494 277L480 285" />
        </g>
        <path d="M501 287C483 272 494 246 512 242C520 221 544 224 555 232C575 218 604 225 611 244C633 246 640 270 625 287Z" fill="#b77852" stroke="#75462f" strokeWidth="3" />
        <path d="M517 251C537 237 556 249 570 241M584 253L609 267M518 273L542 280" fill="none" stroke="#d9a178" strokeWidth="3" strokeLinecap="round" />
        <path d="M538 262L562 263" stroke="#fff5e7" strokeWidth="3" />
        <circle cx="567" cy="263" r="7" fill={teal} stroke="#fff" strokeWidth="2" />

        <path d="M718 146V59H756V146" fill="#eaf0ef" stroke={navy} strokeWidth="4" />
        <g stroke={smokeColor} fill="none" strokeWidth="8" strokeLinecap="round" opacity={smokeOpacity}>
          <path d="M646 241C705 242 739 198 738 157V66" />
          <path d="M733 52C711 32 747 26 733 9M749 45C772 26 748 22 766 8" />
        </g>
        <path d="M723 94H751" stroke={navy} strokeWidth="5" strokeLinecap="round" transform={`rotate(${vent * 90} 737 94)`} />
        <circle cx="737" cy="94" r="3" fill={teal} />
        <text x="795" y="85" fill={teal} fontSize="18" fontWeight="600">Exhaust</text>

        <g stroke={amber} fill="none" strokeWidth="2.5" strokeLinecap="round" opacity=".55">
          <path d="M421 120V81M414 91L421 80L428 91M642 120V81M635 91L642 80L649 91M785 230H818M808 223L819 230L808 237" />
        </g>
        <text x="533" y="66" textAnchor="middle" fill="#9c4820" fontSize="18">Heat to surroundings</text>
        <text x="568" y={hybrid ? 405 : 385} textAnchor="middle" fill={teal} fontSize="19" fontWeight="600">Heat exchange with the meat core</text>
      </svg>
      <figcaption style={{ paddingTop: "1rem", color: navy }}>
        <div style={{ display: "grid", gridTemplateColumns: hybrid ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: ".75rem" }}>
          {!hybrid && <div>
            <span style={{ display: "block", fontSize: ".75rem", color: "#536570" }}>Firebox</span>
            <strong style={{ display: "block", fontSize: "1.25rem", fontVariantNumeric: "tabular-nums" }}>{temperature(fireC)}</strong>
          </div>}
          {[["Chamber", chamberC], ["Meat core", coreC]].map(([label, celsius]) => <div key={label}>
            <span style={{ display: "block", fontSize: ".75rem", color: "#536570" }}>{label}</span>
            <strong style={{ display: "block", fontSize: "1.25rem", fontVariantNumeric: "tabular-nums" }}>{temperature(Number(celsius))}</strong>
          </div>)}
        </div>
        {hybrid && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: ".75rem", marginTop: "1rem", paddingTop: ".75rem", borderTop: "1px solid #dce2e6" }}>
            {sources.map(source => <div key={`${source.kind}-readout`} data-testid={source.kind === "wood" ? "wood-firebox-readout" : "pellet-firebox-readout"}>
              <span style={{ display: "block", fontSize: ".875rem", fontWeight: 600 }}>{source.label}</span>
              <strong style={{ display: "block", fontSize: "1.25rem", fontVariantNumeric: "tabular-nums", color: source.color }}>{temperature(source.temperature)}</strong>
              <span style={{ display: "block", fontSize: ".875rem", lineHeight: 1.6 }}>Heat release: {source.release.toFixed(2)} kW</span>
              {source.toChamber !== undefined && <span style={{ display: "block", fontSize: ".875rem", lineHeight: 1.6 }}>To pit: {(source.toChamber / 1000).toFixed(2)} kW</span>}
              <span style={{ display: "block", fontSize: ".875rem", lineHeight: 1.6 }}>Intake: {Math.round(source.intake * 100)}%</span>
              {source.airflow !== undefined && <span style={{ display: "block", fontSize: ".875rem", lineHeight: 1.6 }}>Airflow: {(source.airflow * 1000).toFixed(2)} g/s</span>}
              <span style={{ display: "block", fontSize: ".75rem", lineHeight: 1.6, color: "#536570" }}>{source.phase}</span>
            </div>)}
          </div>
          <p style={{ fontSize: ".875rem", lineHeight: 1.6, color: "#536570", marginTop: ".75rem" }}>Wood follows the solid path; pellets follow the dashed path. Each firebox feeds heat and smoke into one shared pit and exhaust. A negative to-pit value means the firebox absorbs pit heat. This conceptual layout represents no specific manufacturer’s smoker.</p>
        </>}
      </figcaption>
    </figure>
  );
}
