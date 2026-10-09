"use client";

import { useEffect, useRef, useState } from "react";
import { cToF, createSimulation, fToC, openLid, refuel, setControls, stepSimulation } from "./model";
import type { FuelKind, SmokerConfig, SmokerState } from "./model";
import SmokerDiagram from "./SmokerDiagram";
import HybridMath from "./HybridMath";

type Point = { t: number; pit: number; core: number; fixed: number; target: number; power: number; volatile: number; char: number; fixedPower: number; wood: number; pellets: number; demand: number | null };
type Event = { t: number; label: string };
type Session = { live: SmokerState; fixed: SmokerState; points: Point[]; events: Event[]; windUntil: number; restingWind: number };
type View = { live: SmokerState; fixed: SmokerState; points: Point[]; events: Event[] };
type Unit = "F" | "C";
const LIMIT = 12 * 3600;
const displayTemp = (c: number, unit: Unit) => unit === "F" ? cToF(c) : c;
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}`;
const sample = (s: Session): Point => ({ t: s.live.timeS, pit: s.live.chamberC, core: s.live.meatCoreC, fixed: s.fixed.chamberC, target: s.live.config.targetC, power: s.live.powerW / 1000, volatile: s.live.volatilePowerW / 1000, char: s.live.charPowerW / 1000, fixedPower: s.fixed.powerW / 1000, wood: s.live.woodPowerW / 1000, pellets: s.live.pelletPowerW / 1000, demand: s.live.config.mode === "auto" && s.live.config.pelletControl === "feed-and-air" ? s.live.demandPowerW / 1000 : null });
function newSession(fuel: FuelKind, options: Partial<SmokerConfig> = {}): Session {
  const live = createSimulation({ ...options, fuel, targetC: fToC(250) });
  const fixed = createSimulation({ ...options, fuel, targetC: fToC(250), mode: "manual", intake: .45, woodIntake: .45, pelletIntake: .45, exhaust: .85, pelletFeedKgH: .65 });
  const s: Session = { live, fixed, points: [], events: [], windUntil: 0, restingWind: live.config.windMps };
  s.points.push(sample(s));
  return s;
}
const snapshot = (s: Session): View => ({ live: { ...s.live, config: { ...s.live.config } }, fixed: { ...s.fixed, config: { ...s.fixed.config } }, points: s.points.slice(), events: s.events.slice() });
function advance(s: Session, seconds: number) {
  const end = Math.min(LIMIT, s.live.timeS + Math.floor(seconds));
  while (s.live.timeS < end) {
    const dt = Math.min(end - s.live.timeS, 15 - s.live.timeS % 15, s.windUntil > s.live.timeS ? s.windUntil - s.live.timeS : 15);
    stepSimulation(s.live, dt); stepSimulation(s.fixed, dt);
    if (s.windUntil && s.live.timeS >= s.windUntil) {
      setControls(s.live, { windMps: s.restingWind }); setControls(s.fixed, { windMps: s.restingWind }); s.windUntil = 0;
    }
    if (s.live.timeS % 15 === 0) s.points.push(sample(s));
  }
}

function Range({ label, value, min, max, step = 1, shown, onChange, disabled = false, hint }: { label: string; value: number; min: number; max: number; step?: number; shown: string; onChange: (value: number) => void; disabled?: boolean; hint?: string }) {
  const id = `smoker-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="smoker-range"><label htmlFor={id}><span>{label}</span><strong>{shown}</strong></label><input id={id} type="range" value={value} min={min} max={max} step={step} disabled={disabled} onChange={e => onChange(Number(e.target.value))} aria-valuetext={shown} />{hint && <p>{hint}</p>}</div>;
}

function Trace({ points, events, unit, compare, kind }: { points: Point[]; events: Event[]; unit: Unit; compare: boolean; kind: "temperature" | "burn" | "hybrid" }) {
  const plot = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(760);
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(230, Math.round(entries[0].contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const isTemp = kind === "temperature", height = 242, left = 42, right = 10, top = 16, bottom = 36;
  const horizon = Math.max(3600, points.at(-1)?.t ?? 0);
  const convert = (v: number) => isTemp ? displayTemp(v, unit) : v;
  const values = points.flatMap(p => isTemp ? [p.pit, p.core, p.target, ...(compare ? [p.fixed] : [])].map(convert) : kind === "hybrid" ? [p.power, p.wood, p.pellets, ...(p.demand === null ? [] : [p.demand])] : [p.power, p.volatile, p.char]);
  const high = Math.max(isTemp ? (unit === "F" ? 300 : 150) : 8, ...values);
  const ceiling = isTemp ? Math.ceil(high / (unit === "F" ? 50 : 25)) * (unit === "F" ? 50 : 25) : Math.ceil(high / 2) * 2;
  const floor = isTemp ? Math.floor(Math.min(0, ...values) / 10) * 10 : 0;
  const x = (t: number) => left + t / horizon * (width - left - right);
  const y = (v: number) => height - bottom - (v - floor) / (ceiling - floor) * (height - top - bottom);
  const path = (key: Exclude<keyof Point, "t" | "fixedPower">) => { let drawing = false; return points.map(p => { const value = p[key]; if (value === null) { drawing = false; return ""; } const command = drawing ? "L" : "M"; drawing = true; return `${command}${x(p.t).toFixed(1)},${y(convert(value)).toFixed(1)}`; }).join(" "); };
  const lines = isTemp ? [{ key: "target" as const, color: "#718393", dash: "3 5" }, ...(compare ? [{ key: "fixed" as const, color: "#74767b", dash: "7 5" }] : []), { key: "core" as const, color: "#23777c" }, { key: "pit" as const, color: "#c3531c" }] : kind === "hybrid" ? [{ key: "demand" as const, color: "#718393", dash: "3 5" }, { key: "power" as const, color: "#102638" }, { key: "wood" as const, color: "#c3531c" }, { key: "pellets" as const, color: "#23777c" }] : [{ key: "power" as const, color: "#c3531c" }, { key: "volatile" as const, color: "#b77615", dash: "5 3" }, { key: "char" as const, color: "#102638" }];
  return <svg ref={plot} className="smoker-trace" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={isTemp ? `Temperature history in degrees ${unit === "F" ? "Fahrenheit" : "Celsius"}, over ${duration(horizon)} hours. Pit temperature, meat core, target${compare ? " and fixed damper comparison" : ""}.` : kind === "hybrid" ? "Simultaneous hybrid heat release in kilowatts: total, hardwood contribution, pellet contribution and controller heat demand." : "Fuel heat release history in kilowatts, showing total, volatile flame and charcoal combustion."}>
    {[0, 1, 2, 3, 4].map(i => { const v = floor + (ceiling - floor) * i / 4; return <g key={i}><line x1={left} y1={y(v)} x2={width - right} y2={y(v)} stroke="#e1e5e8" /><text x={left - 9} y={y(v) + 4} textAnchor="end">{Number(v.toFixed(1))}</text></g>; })}
    {(width < 420 ? [0, 2, 4] : [0, 1, 2, 3, 4]).map(i => <text key={i} x={x(horizon * i / 4)} y={height - 10} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>{duration(horizon * i / 4)}</text>)}
    {events.slice(-12).map((e, i) => <line key={i} x1={x(e.t)} x2={x(e.t)} y1={top} y2={height - bottom} stroke="#b3c0ca" strokeDasharray="2 5"><title>{e.label} at {duration(e.t)}</title></line>)}
    {lines.map(line => <path key={line.key} d={path(line.key)} stroke={line.color} strokeWidth={line.key === "pit" || line.key === "power" ? 2.6 : 1.8} strokeDasharray={line.dash} fill="none" />)}
    <text x={left} y={12}>{isTemp ? `°${unit}` : "kW"}</text>
  </svg>;
}

function metric(points: Point[], key: "pit" | "fixed") {
  const eligible = points.filter(p => p.t >= 1200);
  return eligible.length ? Math.round(100 * eligible.filter(p => Math.abs(p[key] - p.target) <= fToC(255) - fToC(250)).length / eligible.length) : null;
}

export default function SmokerLab() {
  const [initial] = useState(() => newSession("hybrid"));
  const session = useRef<Session>(initial);
  const [view, setView] = useState<View>(() => snapshot(initial));
  const [running, setRunning] = useState(false), [speed, setSpeed] = useState(300), [unit, setUnit] = useState<Unit>("F"), [compare, setCompare] = useState(true), [notice, setNotice] = useState("Ready. Start the simulation or advance 15 minutes.");
  const s = view.live, fuel = s.config.fuel, auto = s.config.mode === "auto", hybrid = fuel === "hybrid";
  const feedAuto = auto && s.config.pelletControl === "feed-and-air";
  const publish = () => setView(snapshot(session.current!));
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const current = session.current!;
      advance(current, speed / 5);
      setView(snapshot(current));
      if (current.live.timeS >= LIMIT) { setRunning(false); setNotice("12-hour session complete. Reset to try a new cook."); }
    }, 200);
    return () => window.clearInterval(timer);
  }, [running, speed]);
  function controls(patch: Parameters<typeof setControls>[1], paired = false) {
    setControls(session.current!.live, patch);
    if (paired) setControls(session.current!.fixed, patch);
    publish();
  }
  function reset(nextFuel = fuel, options: Partial<SmokerConfig> = {}) {
    session.current = newSession(nextFuel, options); setRunning(false); setNotice(`${nextFuel === "hybrid" ? "Simultaneous wood + pellet" : nextFuel === "wood" ? "Hardwood" : "Pellet"} session ready. A new cook starts with an established ember bed.`); publish();
  }
  function event(label: string, action: (current: Session) => void) {
    const current = session.current!; action(current); current.events.push({ t: current.live.timeS, label });
    if (current.events.length > 36) current.events.shift();
    setNotice(label); publish();
  }
  const temp = (c: number) => `${displayTemp(c, unit).toFixed(0)}°${unit}`;
  const inBand = metric(view.points, "pit"), baselineBand = metric(view.points, "fixed");
  const target = displayTemp(s.config.targetC, unit);
  const latest = view.points.at(-1)!;
  const depleted = s.fuelRemainingKg < .03;
  const pelletFireOut = s.feedInhibited && s.hopperKg > 0;
  const status = s.lidOpenRemainingS > 0 ? "Lid open" : depleted ? "Fuel nearly exhausted" : pelletFireOut ? "Pellet fire cooled · reset to relight" : s.phase === "Fire cooling" ? "Fire cooled · reset to relight" : hybrid && s.woodOverpower ? "Wood heat exceeds control range" : hybrid && s.cleanAirLimited ? "Draft capacity reached" : s.setpointLimited ? "Controller at limit" : s.smokeIndex > .5 ? "Oxygen-starved burn" : Math.abs(s.errorC) < 2.8 ? "Holding temperature" : s.errorC > 0 ? "Heating toward target" : auto ? "Above target · reducing heat" : "Above target";
  return <>
    <div className="smoker-toolbar">
      <div className="smoker-segment" aria-label="Fuel type"><button aria-pressed={fuel === "wood"} onClick={() => reset("wood")}>Hardwood splits</button><button aria-pressed={fuel === "pellets"} onClick={() => reset("pellets")}>Wood pellets</button><button aria-pressed={hybrid} onClick={() => reset("hybrid")}>Hybrid</button></div>
      <div className="smoker-time"><span>Simulated time</span><strong data-testid="sim-time">{duration(s.timeS)} <small>h:mm</small></strong></div>
      <label className="smoker-unit">Units<select aria-label="Temperature units" value={unit} onChange={e => setUnit(e.target.value as Unit)}><option value="F">°F</option><option value="C">°C</option></select></label>
    </div>
    <div className="smoker-workbench">
      <aside className="smoker-controls" aria-label="Simulation controls">
        <div className="smoker-control-title"><h2>The controller</h2><span className={`smoker-dot ${auto ? "is-auto" : ""}`} /></div>
        <div className="smoker-segment smoker-mode" aria-label="Control mode"><button aria-pressed={auto} onClick={() => controls({ mode: "auto" })}>Automatic</button><button aria-pressed={!auto} onClick={() => controls({ mode: "manual" })}>Manual</button></div>
        <p className="smoker-small">{auto ? hybrid ? feedAuto ? "Dedicated wood and pellet fireboxes heat one pit. The controller forecasts wood heat, meters the pellet supplement, and adjusts each intake." : "Each firebox has its own intake. Pellet feed stays fixed while the dampers regulate airflow." : "Feedback adjusts intake and exhaust, using the temperature trend to anticipate delayed heat and maintain draft." : hybrid ? "Set each firebox intake and the shared exhaust. Watch how the two fires respond." : "Set both dampers yourself. Watch how oxygen and thermal lag change the cook."}</p>
        <Range label="Pit target" value={target} min={unit === "F" ? 200 : fToC(200)} max={unit === "F" ? 300 : fToC(300)} step={unit === "F" ? 5 : 5 / 9} shown={temp(s.config.targetC)} hint={`Measured pit: ${temp(s.chamberC)}`} onChange={v => controls({ targetC: unit === "F" ? fToC(v) : v }, true)} />
        {hybrid ? <>
          <Range label="Wood intake damper" value={Math.round(s.woodIntake * 100)} min={0} max={100} shown={`${Math.round(s.woodIntake * 100)}%`} disabled={auto} onChange={v => controls({ woodIntake: v / 100 })} />
          <Range label="Pellet intake damper" value={Math.round(s.pelletIntake * 100)} min={0} max={100} shown={`${Math.round(s.pelletIntake * 100)}%`} disabled={auto} onChange={v => controls({ pelletIntake: v / 100 })} />
        </> : <Range label="Intake damper" value={Math.round(s.intake * 100)} min={0} max={100} shown={`${Math.round(s.intake * 100)}%`} disabled={auto} onChange={v => controls({ intake: v / 100 })} />}
        <Range label={hybrid ? "Shared exhaust damper" : "Exhaust damper"} value={Math.round(s.exhaust * 100)} min={0} max={100} shown={`${Math.round(s.exhaust * 100)}%`} disabled={auto} onChange={v => controls({ exhaust: v / 100 })} hint={auto ? "Controller preserves draft in each active firebox." : hybrid ? "Closing the common exhaust restricts both fireboxes." : "Closing the exhaust also restricts oxygen and smoke clearance."} />
        {fuel !== "wood" && <div className="smoker-pellet-controls"><label htmlFor="pellet-strategy">Pellet strategy</label><select id="pellet-strategy" value={s.config.pelletControl} onChange={e => controls({ pelletControl: e.target.value as "feed-and-air" | "damper-only" })}><option value="feed-and-air">Feed + dampers</option><option value="damper-only">Dampers only · fixed feed</option></select><Range label="Pellet feed" value={auto && s.config.pelletControl === "feed-and-air" ? s.pelletFeedKgH : s.config.pelletFeedKgH} min={0} max={2.5} step={.05} shown={`${(auto && s.config.pelletControl === "feed-and-air" ? s.pelletFeedKgH : s.config.pelletFeedKgH).toFixed(2)} kg/h`} disabled={auto && s.config.pelletControl === "feed-and-air"} onChange={v => controls({ pelletFeedKgH: v })} /><p className="smoker-small">{hybrid ? "A small automatic feed keeps the separate pellet fire lit during normal wood peaks. Excess wood heat stops feed; pellets already in the bed keep burning briefly." : "Metering fuel is the main heat control on a typical pellet grill. Fixed feed can overwhelm the dampers."}</p></div>}
        <details className="smoker-settings"><summary>Fuel & weather</summary>
          <Range label={hybrid ? "Wood moisture" : "Fuel moisture"} value={Math.round(s.config.woodMoisture * 100)} min={5} max={40} shown={`${Math.round(s.config.woodMoisture * 100)}% wet basis`} onChange={v => controls({ woodMoisture: v / 100 }, true)} hint="Applies to the next fuel addition. Water consumes heat before the fuel can burn." />
          {hybrid && <Range label="Pellet moisture" value={Math.round(s.config.pelletMoisture * 100)} min={5} max={20} shown={`${Math.round(s.config.pelletMoisture * 100)}% wet basis`} onChange={v => controls({ pelletMoisture: v / 100 }, true)} hint="Applies to the next hopper refill; existing moisture is conserved." />}
          <Range label="Outside temperature" value={displayTemp(s.config.ambientC, unit)} min={unit === "F" ? 20 : fToC(20)} max={unit === "F" ? 100 : fToC(100)} step={unit === "F" ? 1 : 5 / 9} shown={temp(s.config.ambientC)} onChange={v => controls({ ambientC: unit === "F" ? fToC(v) : v }, true)} />
          <Range label="Wind" value={s.config.windMps} min={0} max={8} step={.5} shown={`${s.config.windMps.toFixed(1)} m/s`} onChange={v => { session.current!.restingWind = v; session.current!.windUntil = 0; controls({ windMps: v }, true); }} />
        </details>
        <div className="smoker-playback"><button className="button button-primary" onClick={() => { if (s.timeS >= LIMIT) reset(); else setRunning(!running); }}>{running ? "Pause simulation" : "Start simulation"}</button><label>Speed<select aria-label="Simulation speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={60}>1 min / second</option><option value={300}>5 min / second</option><option value={900}>15 min / second</option></select></label><div className="smoker-step-row"><button onClick={() => { advance(session.current!, 900); publish(); setNotice("Advanced 15 simulated minutes."); }}>+15 min</button><button onClick={() => reset()}>Reset cook</button></div></div>
      </aside>
      <div className="smoker-results">
        <div className="smoker-metrics">
          <div><span>Pit temperature</span><strong data-testid="pit-temp">{temp(s.chamberC)}</strong><small>Target {temp(s.config.targetC)}</small></div>
          <div><span>Meat core</span><strong data-testid="core-temp">{temp(s.meatCoreC)}</strong><small>3 kg illustrative cut</small></div>
          <div><span>Fire heat release</span><strong>{(s.powerW / 1000).toFixed(1)} <em>kW</em></strong><small>{s.phase}</small></div>
          <div><span>Fuel remaining</span><strong>{s.fuelRemainingKg.toFixed(2)} <em>kg</em></strong><small>{hybrid ? `${s.woodFuelRemainingKg.toFixed(2)} wood + ${s.pelletFuelRemainingKg.toFixed(2)} pellets` : fuel === "wood" ? "Wood, water & coals" : "Hopper & fire bed"}</small></div>
        </div>
        <section className="smoker-panel smoker-system" aria-labelledby="system-title">
          <div className="smoker-panel-head"><h2 id="system-title">Inside the smoker</h2><span className={`smoker-status ${depleted || pelletFireOut || s.smokeIndex > .5 || s.woodOverpower || s.cleanAirLimited ? "is-warning" : ""}`}>{status}</span></div>
          <SmokerDiagram unit={unit} fuel={fuel} woodKw={s.woodPowerW / 1000} pelletKw={s.pelletPowerW / 1000} woodPhase={s.woodPhase} pelletPhase={s.pelletPhase} intake={s.intake} exhaust={s.exhaust} chamberC={s.chamberC} fireC={s.fireC} coreC={s.meatCoreC} heatKw={s.powerW / 1000} cleanBurn={1 - s.smokeIndex} phase={s.phase} lidOpen={s.lidOpenRemainingS > 0} running={running} woodIntake={s.woodIntake} pelletIntake={s.pelletIntake} woodFireC={s.woodFireC} pelletFireC={s.pelletFireC} woodAirKgS={s.woodAirKgS} pelletAirKgS={s.pelletAirKgS} woodHeatIntoChamberW={s.woodHeatIntoChamberW} pelletHeatIntoChamberW={s.pelletHeatIntoChamberW} woodSmokeIndex={s.woodSmokeIndex} pelletSmokeIndex={s.pelletSmokeIndex} />
          <div className="smoker-energy"><span><i className="smoker-key air" />Airflow <strong>{(s.airKgS * 1000).toFixed(1)} g/s</strong></span><span>Heat to pit <strong>{(s.heatIntoChamberW / 1000).toFixed(2)} kW</strong></span><span>Heat loss <strong>{(s.lossW / 1000).toFixed(2)} kW</strong></span></div>
          <div className="smoker-disturbances"><span>Try a disturbance</span><button onClick={() => event("Lid opened for 45 seconds", c => { openLid(c.live, 45); openLid(c.fixed, 45); })}>Open lid · 45 s</button><button onClick={() => event("Wind gust: 6 m/s for 5 minutes", c => { c.windUntil = c.live.timeS + 300; setControls(c.live, { windMps: 6 }); setControls(c.fixed, { windMps: 6 }); })}>Wind gust</button>{fuel !== "pellets" && <button onClick={() => event("Added 0.5 kg hardwood", c => { refuel(c.live, .5, "wood"); refuel(c.fixed, .5, "wood"); })}>+0.5 kg wood</button>}{fuel !== "wood" && <button onClick={() => event("Added 1 kg pellets to hopper", c => { refuel(c.live, 1, "pellets"); refuel(c.fixed, 1, "pellets"); })}>+1 kg pellets</button>}</div>
        </section>
        {hybrid && <section className="smoker-panel smoker-hybrid-control" aria-labelledby="hybrid-title">
          <div className="smoker-panel-head"><h2 id="hybrid-title">Two fireboxes. One pit.</h2><span className="smoker-panel-note">Dedicated wood + pellet fires</span></div>
          <div className="smoker-hybrid-budget">
            <div><span>{feedAuto ? "Required fire heat" : "Actual total heat"}</span><strong data-testid="hybrid-demand">{((feedAuto ? s.demandPowerW : s.powerW) / 1000).toFixed(2)} <small>kW</small></strong></div>
            <div><span>{feedAuto ? "Forecast wood heat" : "Actual wood heat"}</span><strong data-testid="hybrid-wood">{((feedAuto ? s.predictedWoodPowerW : s.woodPowerW) / 1000).toFixed(2)} <small>kW</small></strong></div>
            <div><span>{feedAuto ? "Pellet heat command" : "Pellet feed setting"}</span><strong data-testid="hybrid-residual">{(feedAuto ? s.residualPelletPowerW / 1000 : s.config.pelletFeedKgH).toFixed(2)} <small>{feedAuto ? "kW" : "kg/h"}</small></strong></div>
          </div>
          <p className="smoker-hybrid-reason" data-testid="hybrid-reason">{auto ? s.controlReason : "Manual mode: each firebox uses its own intake; pellet feed stays at your command."}</p>
          {feedAuto && s.pelletPilotActive && <p className="smoker-small" data-testid="pellet-pilot">Keeping the pellet fire lit: minimum 0.10 kg/h ({(s.pelletPilotPowerW / 1000).toFixed(2)} kW). This command can exceed the heat gap while wood carries the cook.</p>}
          <p className="smoker-small">The wood estimate uses known fuel states in the simulation. A real controller needs an observer fitted to temperature, draft and feed measurements. Heat command and actual release differ because fuel takes time to dry and burn.</p>
          <div className="smoker-hybrid-scenarios"><span>Try a new wood charge</span><button onClick={() => reset("hybrid", { initialWoodKg: .35 })}>Small · 0.35 kg</button><button onClick={() => reset("hybrid", { initialWoodKg: 1.5 })}>Large · 1.5 kg</button></div>
          <p className="smoker-chart-reading">Starts a new cook with 3 kg of pellets. A large wood load can exceed the target even with pellet feed stopped; a minimum draft keeps the fire breathing.</p>
        </section>}
        <section className="smoker-panel" aria-labelledby="temperature-title">
          <div className="smoker-panel-head"><h2 id="temperature-title">A steady cook</h2><label className="smoker-check"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} />Compare fixed dampers</label></div>
          <div className="smoker-legend"><span><i className="smoker-key pit" />Pit</span><span><i className="smoker-key air" />Meat core</span><span><i className="smoker-key target" />Target</span>{compare && <span><i className="smoker-key fixed" />Fixed dampers</span>}<small>Time (h:mm)</small></div>
          <Trace points={view.points} events={view.events} unit={unit} compare={compare} kind="temperature" />
          <div className="smoker-comparison"><div><span>Within ±{unit === "F" ? "5°F" : "2.8°C"} of target</span><strong>{inBand === null ? "—" : `${inBand}%`} <small>this cook</small>{compare && <> <b>/</b> {baselineBand === null ? "—" : `${baselineBand}%`} <small>fixed</small></>}</strong></div><p>{inBand === null ? "Starts after 20 simulated minutes of warm-up." : "Sampled every 15 seconds, after the first 20 minutes."}{compare && ` Same fuel, weather and disturbances; ${hybrid ? "both intakes" : "intake"} fixed at 45%, exhaust at 85% and pellet feed at 0.65 kg/h.`}</p></div>
          <p className="smoker-chart-reading">Latest: pit {temp(s.chamberC)}, core {temp(s.meatCoreC)}{compare && `, fixed-damper pit ${temp(view.fixed.chamberC)}`}. Dashed vertical lines mark disturbances.</p>
        </section>
        <section className="smoker-panel" aria-labelledby="burn-title">
          <div className="smoker-panel-head"><h2 id="burn-title">{hybrid ? "The hybrid heat handoff" : "The burn profile"}</h2><span className="smoker-panel-note">{hybrid ? "Both fuels, simultaneously" : fuel === "wood" ? "Finite batch" : "Metered fuel"}</span></div>
          <div className="smoker-legend">{hybrid ? <><span><i className="smoker-key coal" />Total</span><span><i className="smoker-key pit" />Wood</span><span><i className="smoker-key air" />Pellets</span><span><i className="smoker-key target" />Demand (auto feed)</span></> : <><span><i className="smoker-key pit" />Total</span><span><i className="smoker-key volatile" />Volatile flame</span><span><i className="smoker-key coal" />Charcoal</span></>}<small>Time (h:mm)</small></div>
          <Trace points={view.points} events={view.events} unit={unit} compare={false} kind={hybrid ? "hybrid" : "burn"} />
          <p className="smoker-small smoker-burn-copy">{hybrid ? "Wood and pellets dry and burn in separate fireboxes, each with its own oxygen supply and stored heat. Both transfer heat to the same cooking chamber through separate paths. With automatic feed control, pellets supplement a declining wood fire and new wood reduces the pellet command as it heats up. Fixed-feed mode keeps adding pellets. Cutting the auger does not remove fuel already burning. The demand trace has gaps while automatic feed control is inactive." : fuel === "wood" ? "Splits absorb heat as they dry, release combustible gases as they pyrolyze, then leave a slower-burning charcoal bed. These stages overlap. A damper can shape the burn; it cannot replenish a spent batch. Add wood while embers remain; reset the cook to relight a cold fire." : "Pellets are compressed wood, with the same drying, volatile and charcoal stages. Small particles and a continuous feed overlap those stages into a steadier heat source. The hopper is finite; heat persists briefly after feed stops. Automatic feed stops if the fire cools below its relight threshold; reset to relight."}</p>
          <p className="smoker-chart-reading">{hybrid ? `Latest sampled release: ${latest.wood.toFixed(2)} kW wood + ${latest.pellets.toFixed(2)} kW pellets = ${latest.power.toFixed(2)} kW total.` : `Latest sampled release: ${latest.power.toFixed(2)} kW, including ${latest.volatile.toFixed(2)} kW volatile flame and ${latest.char.toFixed(2)} kW charcoal.`}</p>
        </section>
      </div>
    </div>
    <p className="smoker-notice" role="status">{notice}</p>
    <div className="smoker-explainer">
      <section><p className="eyebrow">What the software does</p><h2>Control the heat.<br />Keep the fire breathing.</h2><p>The controller reads pit temperature and anticipates delayed heat. In hybrid mode it forecasts heat from the wood firebox, meters pellets into the separate pellet firebox, and adjusts each intake under a shared exhaust. Integral limits prevent a lid-opening dip from demanding excessive heat afterward.</p><p>A stable pit and adequate airflow are the objectives here. A large burning split can exceed the available control range even at zero pellet feed. More smoke is not automatically better flavor, and restricting oxygen can produce a smoldering fire.</p></section>
      <section><p className="eyebrow">What the model represents</p><h2>Physics with visible assumptions.</h2><p>This reduced-order model tracks fuel mass, moisture evaporation, volatile and charcoal combustion, oxygen-limited heat release, smoker heat capacity and losses, and a two-node meat temperature. Surface evaporation can slow core heating.</p><p>The burn stages and fuel-energy basis follow published research. Rates, draft, geometry, meat properties and controller tuning describe a nominal smoker, and need measured data to predict a particular cooker. Core temperature is illustrative; it does not determine doneness or food safety.</p></section>
    </div>
    <HybridMath />
    <details className="smoker-model-details"><summary>Model assumptions & sources</summary><div><p>Starts with an established ember bed and a cold cooking chamber. Time advances in fixed one-second steps. Default target 250°F (121°C), ambient 68°F (20°C), 3 kg meat. Default moisture: hardwood 20%, pellets 8%, measured as water / total wet fuel mass.</p><p>Dry wood net energy: 18.5 MJ/kg; charcoal: 30 MJ/kg; nominal charcoal yield: 20% of dry wood. Moisture evaporation deducts sensible and latent heat. The charcoal energy is allocated from the wood’s energy budget. A smoke index indicates incomplete combustion in this model; it is not a particulate, emissions or flavor measurement.</p><ul><li><a href="https://research.fs.usda.gov/treesearch/34919" target="_blank" rel="noreferrer">USDA Forest Products Laboratory: wood fuel properties</a></li><li><a href="https://research.fs.usda.gov/treesearch/8568" target="_blank" rel="noreferrer">USDA: heat of combustion and oxygen consumption</a></li><li><a href="https://research.fs.usda.gov/treesearch/8392" target="_blank" rel="noreferrer">USDA: drying, pyrolysis and charcoal oxidation</a></li><li><a href="https://support.traeger.com/hc/en-us/articles/20230767254939-Non-WiFi-AC-Grill-Controllers" target="_blank" rel="noreferrer">Traeger: temperature controllers and pellet feed</a></li></ul><p>Controller gains and the nominal heat-transfer coefficients are available in the <a href="https://github.com/SydFloyd/kmproto-hub/blob/main/app/lab/smoker/model.ts" target="_blank" rel="noreferrer">simulation source</a>. Fuel and weather changes apply to both comparison runs. Switching fuel or resetting starts a new cook; manual damper changes affect this cook only. Sessions stop at 12 simulated hours.</p></div></details>
  </>;
}
