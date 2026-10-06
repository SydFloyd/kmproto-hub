export default function HybridMath() {
  return <details className="smoker-model-details smoker-hybrid-math">
    <summary>Hybrid math & control algorithm</summary>
    <div>
      <p>The two fuels keep separate mass, moisture, charcoal and temperature states. The current design candidate shares a firebox, an oxygen budget, and the cooking chamber; the hardware layout is still open. These equations describe the model; the engineering notes specify the discretization, coefficients, controller limits and tests.</p>
      <div className="smoker-equations">
        <section><h3>1. Conserve fuel and oxygen</h3><p className="smoker-formula">O₂ supplied = 0.232 × air mass flow</p><p className="smoker-formula">O₂ consumed by wood + pellets ≤ O₂ supplied</p><p>Pyrolysis divides dry wood into combustible gases and charcoal. Fuel that escapes without burning releases no combustion heat. Neither bed gets to use the same oxygen twice.</p></section>
        <section><h3>2. Balance the shared heat</h3><p className="smoker-formula">C<sub>fire</sub> × dT<sub>fire</sub>/dt = Q<sub>wood</sub> + Q<sub>pellets</sub> − Q<sub>pit</sub> − Q<sub>fuel heating</sub> − Q<sub>loss</sub></p><p>Heat flows into the wood and pellet fuel nodes; their water evaporation consumes that energy. The pit, walls, meat surface and core each have a corresponding heat balance. All Q terms are watts; C is joules per kelvin.</p></section>
        <section><h3>3. Allocate the pellet supplement</h3><p className="smoker-formula">Q<sub>pellet command</sub> = max(0, Q<sub>required</sub> − Q<sub>wood forecast</sub>)</p><p>With Automatic + Feed/dampers selected, the temperature supervisor includes heat loss, temperature error and trend anticipation. It converts the residual to a wet pellet feed rate, accounting for moisture. Pellets already in the bed keep burning; chamber trend and firebox temperature help account for that delay.</p></section>
        <section><h3>4. Respect actuator limits</h3><p className="smoker-formula">0 ≤ pellet feed ≤ 2.5 kg/h</p><p>A clean-draft floor takes priority over choking the fire to meet a temperature target. The controller freezes or limits integral action during lid openings and saturation. When a hot wood load exceeds available control authority, it commands pellet feed toward zero and reports the limit.</p></section>
      </div>
      <p>The wood estimate is an idealized observer of the simulated fuel states. For your physical smoker, the heat-transfer coefficients, burn kinetics, airflow curve, auger calibration and sensor delays need measured identification before these algorithms can be tuned for hardware.</p>
      <p><a href="https://github.com/SydFloyd/kmproto-hub/blob/main/app/lab/smoker/HYBRID_MODEL.md" target="_blank" rel="noreferrer">Full equations, parameter tables, pseudocode and calibration plan</a> · <a href="https://github.com/SydFloyd/kmproto-hub/blob/main/app/lab/smoker/model.ts" target="_blank" rel="noreferrer">Executable model</a></p>
      <p>A real example of simultaneous firing is <a href="https://lonestargrillz.com/collections/smokers/products/24-x-48-offset-hybride-smoker" target="_blank" rel="noreferrer">Lone Star Grillz’s single-firebox hybrid offset</a>. This simulation is our independent nominal design; it does not reproduce that manufacturer’s proprietary controller.</p>
    </div>
  </details>;
}
