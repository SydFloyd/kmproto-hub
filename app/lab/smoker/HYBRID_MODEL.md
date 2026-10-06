# Hybrid smoker model and controller

The Hybrid option represents wood splits and auger-fed pellets burning at the
same time in one firebox. The two fuel beds have independent temperatures,
moisture, particle kinetics, inventories and origin ledgers; they share one
oxygen supply and one firebox/chamber/wall/meat thermal model. This is the
first design candidate for the KM Proto prototype; the hardware layout has
not been chosen. It must be revised if the actual cooker has separately
supplied combustion zones or fireboxes.

A commercially listed example is the
[Lone Star Grillz 24 × 48 Hybrid Offset](https://lonestargrillz.com/collections/smokers/products/24-x-48-offset-hybride-smoker),
listed by its manufacturer at **$7,195** when checked on October 5, 2026. The
manufacturer describes simultaneous wood and pellet combustion in one firebox,
pellet compensation as a split burns down, and adjustment when wood is added.
This is an example consistent with the proposed architecture, not an
identification of the user's cooker. The simulation neither reproduces that
product's geometry nor claims access to its FireBoard controller algorithm.

`model.ts` is the executable specification. The equations below describe the
implemented nominal model, including its limitations. Internal units are
seconds, kilograms, degrees Celsius, watts, joules and kelvin temperature
differences. The interface converts temperatures to Fahrenheit and powers to
kilowatts. Physics advances in deterministic one-second steps; render speed
does not change the equations.

## Physical basis and nominal parameters

[USDA fuelwood data](https://research.fs.usda.gov/treesearch/34919) document
species-dependent moisture, heating values and elemental composition.
[USDA combustion research](https://research.fs.usda.gov/treesearch/8568) distinguishes
whole biomass, evolved volatiles and char, and relates heat release to oxygen
consumption. [USDA log modelling](https://research.fs.usda.gov/treesearch/8392)
describes drying, pyrolysis and char oxidation with heat transport. Those
principles motivate this reduced model; they do not validate its assumed
smoker geometry, burn-rate constants, split dimensions or controller tuning.
[Traeger's controller documentation](https://support.traeger.com/hc/en-us/articles/20230767254939-Non-WiFi-AC-Grill-Controllers)
confirms that pellet temperature controllers vary auger delivery. It does not
specify this independent hybrid algorithm.

| Quantity | Implemented value | Unit |
| --- | ---: | --- |
| Dry biomass net chemical heat, `H_d` | 18,500,000 | J/kg dry biomass |
| Char net chemical heat, `H_c` | 30,000,000 | J/kg char |
| Char mass yield, `y_c` | 0.20 | kg char/kg pyrolyzed dry biomass |
| Volatile net chemical heat, `H_v` | 15,625,000 | J/kg evolved volatiles |
| Water evaporation latent heat, `L` | 2,300,000 | J/kg water |
| Air oxygen mass fraction | 0.232 | kg oxygen/kg air |
| Volatile oxygen requirement, `r_v` | 1.15 | kg oxygen/kg volatiles burned |
| Char oxygen requirement, `r_c` | 2.667 | kg oxygen/kg char burned |
| Firebox heat capacity, `C_f` | 2,000 | J/K |
| Chamber heat capacity, `C_p` | 4,500 | J/K |
| Wall heat capacity, `C_w` | 22,000 | J/K |
| Meat specific heat, `c_m` | 3,300 | J/(kg K) |
| Dry fuel/water specific heat | 1,700 / 4,180 | J/(kg K) |

`H_d = (1 - y_c) H_v + y_c H_c` exactly: the chosen char/volatile
partition preserves chemical energy. Both fuels use the same nominal biomass
chemistry; smaller pellets respond faster because their thermal and kinetic
time constants differ. These values are engineering assumptions with plausible
physical scale, not measurements of a particular wood species, pellet brand
or device. Real char is not chemically pure carbon; the char oxygen coefficient
is a simplified nominal value.

Hybrid defaults are a **0.35 kg wet wood charge**, **3 kg wet pellet hopper**,
20% wood and 8% pellet moisture by wet mass, 3 kg meat, 250°F target, 20°C
ambient and zero wind. Each fuel can be independently loaded/refueled. Changing
the moisture control affects newly added fuel, not material already present.
Hopper refilling preserves its mass-weighted water fraction.

The run assumes an established ember bed: 0.04 kg wood-origin char if wood is
loaded, plus 0.025 kg pellet-origin dry starter and 0.025 kg pellet-origin char
if the pellet hopper initially contains fuel. Starter pellet water is
`0.025 M_p / (1 - M_p)`. The firebox begins at 480°C, the pellet bed at 160°C,
and loaded wood at ambient temperature. Starters are included in the fuel and
chemical-energy ledgers. `startupSensibleEnergyJ` records firebox sensible
energy above ambient plus the initially warm pellet dry-fuel/water inventory;
it is not a complete thermal energy ledger for the entire cooker.

## Fuel mass and chemical-energy ledgers

For bed `i` (wood or pellets), let `D_i`, `C_i`, `W_i` denote remaining dry
biomass, char and water. Let `B_i`, `G_i`, `V_i` denote cumulative mass actually
burned, volatiles escaped without burning and fuel water evaporated. Pellet
inventory also includes hopper mass `H` with stored wet-basis moisture `M_h`.
The exact fuel-origin mass balances are:

```text
woodAddedKg   = D_wood + C_wood + W_wood + B_wood + G_wood + V_wood
pelletAddedKg = D_pellet + C_pellet + W_pellet + H
                + B_pellet + G_pellet + V_pellet
```

Transfer through the auger moves mass from the hopper to the pellet bed without
creating or consuming it. Burned mass tracks fuel-origin mass only; atmospheric
oxygen and resulting exhaust-product mass are outside this fuel ledger.

Remaining chemical energy is `D_i H_d + C_i H_c`, with the pellet hopper term
`H (1 - M_h) H_d`. Supplied chemical energy equals remaining chemical energy
plus cumulative released energy plus escaped volatile energy `G_i H_v`, by
origin. Fuel moisture has no chemical heating value. Its evaporation draws
thermal energy separately; it is not subtracted a second time from the chemical
ledger. Ash, CO chemistry, recondensed tar and individual exhaust species are
not resolved.

## Shared airflow and cooker heat balance

Intake `u` and exhaust `v` are fractions from 0 to 1, not calibrated valve
angles. The nominal two-restriction draft model is:

```text
valve = 1 / sqrt(1/(u + 0.025)^2 + 1/(v + 0.025)^2)
draft = sqrt(clamp((T_fire - T_ambient + 60)/520, 0.12, 2))
air_kg_s = 0.00008 + 0.006 valve draft (1 + 0.045 wind_m_s)
```

The small leakage floor permits some flow with closed dampers. The model uses
natural draft with a nominal wind multiplier, not a resolved fan/pressure
network. A real combustion blower would require its own measured pressure/flow
curve, actuation limits and fire-zone distribution.

For each one-second step, the nominal inter-node powers are:

```text
Q_fire_pit  = 4 (T_fire - T_pit)
Q_fire_loss = (1 + 0.08 wind) (T_fire - T_ambient)
Q_pit_wall = 32 (T_pit - T_wall)
Q_wall_loss = (9 + 0.8 wind) (T_wall - T_ambient)
Q_direct_loss = (3 + 0.35 wind + (lid_open ? 95 : 0)) (T_pit - T_ambient)
Q_exhaust_loss = air_kg_s × 1005 (T_pit - T_ambient)
area_factor = (meat_kg / 3)^(2/3)
Q_pit_meat = 3.2 area_factor (T_pit - T_surface)
Q_surface_core = 0.95 area_factor (T_surface - T_core)
```

Multipliers relating power to temperature difference are conductances in W/K;
1005 is nominal air specific heat in J/(kg K). Firebox heating of both fuel
beds is subtracted once from the shared firebox. Temperature updates are:

```text
ΔT_fire = (P_wood + P_pellet - Q_fire_pit
           - Q_fuel_wood - Q_fuel_pellet - Q_fire_loss) / C_f
ΔT_pit  = (Q_fire_pit - Q_pit_wall - Q_direct_loss
           - Q_exhaust_loss - Q_pit_meat) / C_p
ΔT_wall = (Q_pit_wall - Q_wall_loss) / C_w
```

The meat model has a surface capacity `0.20 meat_kg c_m` and core capacity
`0.80 meat_kg c_m`. Initial removable surface/core water inventories are
`0.20 meat_kg` and `0.45 meat_kg`. Surface evaporation per second is:

```text
evap_kg = min(surface_water_kg,
  0.000055 area_factor
  × clamp((T_surface - 45)/30, 0, 1.7)
  × min(1, surface_water_kg/(0.06 meat_kg))
  × clamp(0.65 + air_kg_s/0.004, 0.65, 2))
ΔT_surface = (Q_pit_meat - Q_surface_core - evap_kg L) / (0.20 meat_kg c_m)
```

For the core, heat above the amount needed to reach 100°C consumes remaining
core water before raising the core above 100°C:

```text
heat_to_boiling_J = max(0, (100 - T_core) × 0.80 meat_kg c_m)
core_evap_kg = min(core_water_kg, max(0, Q_surface_core - heat_to_boiling_J)/L)
ΔT_core = (Q_surface_core - core_evap_kg L) / (0.80 meat_kg c_m)
```

These equations provide an illustrative evaporative stall and thermal lag.
They do not estimate tenderness, pathogen reduction, recipe completion or
species/cut-dependent doneness. Chamber humidity, wrapping, fat rendering,
changing meat dimensions and radiation are not separately resolved.

Inter-node heat transfers have equal and opposite terms in the temperature
equations. However, a complete thermodynamic energy closure is **not claimed**:
fuel capacities change with inventory, a minimum capacity stabilizes tiny
beds, and sensible enthalpy leaving with pyrolysis products/ash is omitted.
Hybrid additions use dry-fuel/water heat-capacity-weighted temperature mixing;
char sensible energy is not a separately tracked fuel node. The aggregate
`fuelC` field is mass-weighted display telemetry; each actual bed evolves from
its own temperature. Chemical-energy conservation is checked independently
from these thermal approximations.

## Two fuel beds, one oxygen budget

The sequence within each one-second tick is controller update, shared airflow,
actual pellet transfer, preparation of both beds, oxygen allocation, thermal
updates and telemetry. A command is not instantaneous fire power: material
already in the pellet bed continues to dry, devolatilize and burn after the
auger slows or stops.

For wet material `m` with moisture `M`, dry mass is `m (1 - M)` and water is
`m M`. Wood additions enter the wood bed at ambient temperature; pellets enter
the pellet bed from the hopper at ambient temperature. Actual pellet delivery
is `min(hopper_kg, commanded_kg_h / 3600)` per tick, or zero when inhibited.
The new bed temperature after addition is weighted by the old and new
dry-fuel/water heat capacities.

For each bed, with current dry mass `D`, water `W`, char `C` and temperature
`T_b`, the nominal thermal preparation is:

```text
C_b = max(minimum_capacity, 1700 D + 4180 W)
wood:   minimum_capacity = 80 J/K
        k_b = 3.5 × min(1.5, ((D + W)/0.8)^(2/3)) W/K
pellet: minimum_capacity = 8 J/K
        k_b = C_b / 8 s
```

If `D + W ≤ 10^-9 kg`, conductance is zero. With `Q_b = k_b (T_fire - T_b)`:

```text
evap_kg = T_b >= 95 ? min(W, max(0, Q_b)/L, W/t_dry) : 0
t_dry = 120 s for wood; 5 s for pellets
W -= evap_kg
ΔT_b = (Q_b - evap_kg L) / C_b
activation = clamp((T_b - 140)/180, 0, 1.5)
moisture_drag = 1 / (1 + 8 W/max(0.02, D))
pyrolyzed_kg = min(D, D/t_pyro × activation × moisture_drag)
t_pyro = 3500 s for wood; 65 s for pellets
D -= pyrolyzed_kg
C += y_c × pyrolyzed_kg
gas_potential_kg = (1 - y_c) × pyrolyzed_kg
```

Water removal is evaluated before pyrolysis. This lumped preparation permits
drying and devolatilization in the same aggregate bed, representing a hotter
surface and cooler split interior approximately. It does not resolve either
region or use an Arrhenius material reaction model.

Potential char oxidation per second, after new char is produced, is:

```text
wood:   char_potential = min(C, C/600 × clamp((T_fire - 80)/180, 0, 1.8))
pellet: char_potential = min(C, C/90  × clamp((T_fire - 180)/280, 0, 1.8))
```

Let `g_w`, `g_p` and `c_w`, `c_p` be the two beds' potential volatile and char
masses for the tick; let `g = g_w + g_p`, `c = c_w + c_p` and
`O = 0.232 air_kg_s`. Combustion uses this **one shared oxygen allocation**:

```text
mix = clamp((T_fire - 120)/120, 0, 1)
gas_burn = min(g, O/r_v) × mix
O_after_gas = max(0, O - gas_burn r_v)
char_burn = min(c, O_after_gas/r_c)
bed_i_gas_burn = g > 0 ? gas_burn × g_i/g : 0
bed_i_char_burn = c > 0 ? char_burn × c_i/c : 0
```

Gas has first access to oxygen; each origin gets a proportional share of that
gas budget. Char then shares the remaining oxygen proportionally. Oxygen used
is exactly `gas_burn r_v + char_burn r_c ≤ O`, subject to floating-point
roundoff. There are not two full oxygen supplies for two simultaneous fires.
Unburned gas escapes, keeps its chemical energy in the escaped-gas ledger and
produces no combustion power. Unburned char stays in its bed.

For each origin, `P_i = bed_i_gas_burn H_v + bed_i_char_burn H_c`; total power
is `P_wood + P_pellet`. The displayed oxygen ratio is
`min(8, O / (g r_v + c r_c))`, or 8 for negligible demand. The smoke index is
`1 - gas_burn/g`, or zero for negligible evolved gas. It is a relative
incomplete-combustion indicator, not measured particulate concentration,
smoke flavor, a desirable smoke dose or emissions compliance.

## Supervisory controller and predictor

The implemented objective is to follow the chamber-temperature setpoint while
maintaining combustion airflow and respecting nonnegative, finite pellet
delivery. Temperature control uses pellets as the fast energy trim around a
slower wood batch. The clean-air target takes priority over trying to cool an
excessive wood load by starving its fire. This is deterministic feed-forward
plus constrained PI/trend compensation, not a numerical optimizer or a proof
of optimal meat flavor, texture or fuel economy.

The wood observer has **ideal access to simulated wood heat release**. At each
tick it filters the prior tick's actual wood power:

```text
previous_estimate = wood_estimate
wood_estimate += (wood_power - wood_estimate)/45
wood_rate += 0.025 (wood_estimate - previous_estimate - wood_rate)
predicted_wood = clamp(wood_estimate + 120 wood_rate,
                      0, 2 wood_estimate + 200)
```

The estimate is in W, rate in W/s and wood prediction in W. This predictor
anticipates an observed wood-power rise or decay over 120 seconds. It does not
know a fresh split's future ignition curve before it begins releasing heat.
Chamber trend uses a separate filtered derivative:

```text
pit_rate += 0.025 (T_pit_new - T_pit_previous - pit_rate)
anticipated_rise_C = clamp(240 pit_rate, -12, 50)
e = T_target - T_pit - anticipated_rise_C
```

The thermal feed-forward solves the current lumped heat balance at the target,
using current wall and meat-surface temperatures:

```text
Q_target = (3 + 0.35 wind + 1005 air_kg_s) (T_target - T_ambient)
           + 32 (T_target - T_wall)
           + 3.2 area_factor (T_target - T_surface)
T_fire_target = T_target + Q_target/4
P_ff = Q_target + (1 + 0.08 wind) (T_fire_target - T_ambient)
       + max(0, Q_fuel_wood) + 100
P_stored = clamp(C_f (T_fire - T_fire_target)/240, -1000, 2500)
P_demand = max(0, P_ff + 40 e + I_W - P_stored)
```

The 100 W term is a nominal pellet-bed heating allowance. The stored-firebox
correction reduces fresh heat demand while the firebox contains excess sensible
energy. It partially compensates pellet-bed delay through observed firebox
temperature; `committedPelletPowerW` is diagnostic potential power, not an
independent subtraction of the current pellet flame from the commanded future
feed. Subtracting the same steady pellet contribution twice would bias demand.

The residual wood-subtracted pellet demand and feed target are:

```text
E_wet = (1 - hopper_moisture) H_d - hopper_moisture L
P_pellet_max = E_wet × 2.5/3600
P_raw = P_demand - predicted_wood
P_residual = clamp(P_raw, 0, P_pellet_max)
feed_target_kg_h = 3600 P_residual/E_wet
effort_target = feed_target_kg_h/2.5
```

`E_wet` is an approximate net heat available from one kg of wet pellet fuel,
after its initial water evaporates. Unlike the chemical-energy ledger, it is
a feed-sizing quantity that includes moisture's latent thermal cost.

The PI integral has units W, nominal gain 0.045 W/(K s), and limits ±2500 W.
It updates only outside lid recovery, when residual demand lies within the
actuator range or the error would move it away from a saturated limit. Integral
action that would increase heat demand is also blocked when the requested
combustion airflow exceeds fully open intake capacity at the selected exhaust.
An empty hopper blocks positive integration while still allowing negative
unwinding; the controller does not accumulate a demand debt for unavailable
pellet fuel.
Pellet effort increases by at most 0.003 per second and decreases by at most 0.01 per
second, bounded toward the desired effort. A zero pellet target therefore
allows a brief auger rundown; it does not erase previously delivered pellets.
The simulation distinguishes a zero command from actual delivered feed.

Automatic damper-only mode retains the configured fixed pellet feed. Its
temperature-related intake effort is clamped to the hybrid draft floor and
maximum opening; a combustion-air floor may open it further. This mode shows
why dampers alone cannot cancel excessive fuel delivery while preserving
combustion air. Manual mode uses the configured dampers and pellet feed directly
and retains the physical shared-oxygen limitation.

### Air coordination and control-authority diagnostic

Using the prior tick's gas/char potentials and char burn, the controller requests
air for both observed committed fuel and intended new pellet delivery:

```text
air_floor = max(airFlow(intake=0.12, exhaust=0.72),
                (g_w + g_p) r_v × 1.25/0.232)
dry_feed_kg_s = (hopper_kg > 0 ? feed_target_kg_h : 0)
                × (1 - hopper_moisture)/3600
O_feed = dry_feed_kg_s ((1 - y_c) r_v + y_c r_c)
O_recent_char = P_char/H_c × r_c
air_request = max(air_floor,
  (max(O_feed, g_p r_v) + g_w r_v + O_recent_char) × 1.8/0.232)
exhaust = clamp(0.72 + (air_request/0.006) × 0.28, 0.72, 1)
```

The greater of the expected pellet-feed oxygen demand and the pellet bed's
observed gas demand avoids giving the same gas two independent air budgets.
Recent char demand is an approximate extra requirement. A ten-iteration
bisection chooses intake from 0.12 to 1 to meet the requested air through the
shared draft model; actual available oxygen still comes exclusively from the
resulting airflow. Exhaust stays at least 0.72 in automatic hybrid operation.
This is a clean-combustion **target**: insufficient physical flow, delayed fuel
response or a cold flame can still cause escaping gas. `cleanAirLimited`
explicitly reports a request greater than available flow, and positive
integral action is frozen at that capacity limit.
An empty hopper removes expected new-feed demand from the air calculation;
pellet gas and char already committed to the bed remain in the oxygen request.

`unavoidableWoodPowerW` evaluates the previous tick's hot-fuel potentials at
the requested minimum clean airflow, capped by available intake capacity.
It uses exactly the same combined-gas mixing/proportional allocation and
remaining-oxygen char allocation as combustion. Thus it is a one-tick
constraint diagnostic for the current model state, not a theorem about the
whole future trajectory. `woodOverpower` is true in feed-controlled mode when
the pellet feed target is effectively zero and this diagnostic exceeds current
heat demand by more than 150 W.

A sufficiently large hot wood charge continues releasing energy with pellet
delivery at zero. Existing char, evolved gases, pellets already in the bed and
stored firebox/wall energy continue influencing the chamber. The controller
has no cooling actuator or negative pellet feed. It reports the loss of control
authority and allows overshoot in the model; reducing the wood load or adding a
designed heat-removal/bypass actuator would be a physical architecture change.
Starving the exhaust is not treated as a clean way to remove excess heat.

### Lid and flameout handling

For a known lid opening, automatic control holds the preceding dampers and
auger effort and freezes the integral. The wood observer continues updating,
and the thermal plant continues burning/cooling. After closure, integral
updates stay frozen for 120 seconds while proportional/feed-forward recovery
continues. This prevents a transient fall in measured air temperature from
immediately creating a large delayed fuel-energy surge.

If the firebox is below 120°C after the first 300 simulated seconds, automatic
pellet delivery is inhibited. Refueling a cooled cooker does not add ignition
energy; reset starts a new established-fire demonstration. Manual mode does
not implement that automatic feed inhibit. There is no actual ignition,
shutdown, fault-rated purge or hardware interlock sequence in this browser lab.

## What real hardware needs

The simulated observer can read both fuel-origin heat releases; a real
controller cannot. The present algorithm is therefore an engineering
demonstration, not deployable firmware with a completed physical-state
observer. A useful measurement/calibration program would include:

1. Identify the actual firebox, pellet-pot and damper/fan topology. Measure
   chamber/firebox geometry, leakage, thermal mass and spatial temperature
   variation with empty and loaded racks.
2. Calibrate pit, firebox and meat probes, log their lag and accuracy, and
   measure actuator position/delay and auger wet-mass delivery against duty
   cycle. Hopper weight or a verified fuel-flow calibration is useful for
   detecting depletion, bridging and blocked delivery.
3. Measure wood mass, moisture and split dimensions. Log single-split and
   repeated-refuel burns over airflow levels to identify heating, drying,
   pyrolysis, char kinetics and energy-transfer fractions. Repeat for the
   intended pellet types and moisture range.
4. Measure pressure/draft or flow and combustion-gas oxygen, and use CO or
   another appropriate combustion-quality measurement during development.
   Airflow, firebox temperature, pellet delivery and known refuel events can
   constrain a wood-heat observer. One pit-temperature probe cannot generally
   identify wood heat, pellet heat, wall storage and changing losses separately.
5. Fit the heat-loss and transfer model using steady burns, fuel changes,
   setpoint changes, lid openings, load changes and weather disturbances.
   Validate on independent runs, quantify uncertainty, then tune/controller-test
   the intended hardware within measured actuator and clean-combustion limits.

A production design also needs its own sensor-failure, over-temperature,
flameout, back-burn, power-loss and actuator-stall handling with independent
hardware protection where appropriate. These real operating constraints are
not certified or guaranteed by a numerical lab result. Food outcome and smoke
flavor would require additional measured objectives; the current objective is
nominal chamber-temperature regulation under constrained combustion.

## Verification and scope

`npm run test:smoker` checks source-origin mass and chemical-energy accounting,
shared oxygen consumption, independent moisture/inventories, simultaneous
combustion, feed compensation, finite fuel, disturbances and controller limits.
The model runs at a fixed one-second step and accepts batched advancement
without altering deterministic state history. Tests demonstrate arithmetic
invariants and the defined nominal behaviors; they do not validate the model
against a physical smoker or guarantee setpoint reachability for every fuel
load and weather condition.

## If the hardware layout changes

The prototype layout is undecided. The executable simulation evaluates a
shared-firebox candidate. For separate wood and pellet fireboxes feeding one
cooking chamber, replace the shared fire temperature with two thermal states
and allocate measured airflow to each branch. A conceptual extension is:

```text
C_fw dT_fw/dt = P_wood - G_wp (T_fw - T_pit) - Q_w_loss - Q_w_fuel
C_fp dT_fp/dt = P_pellet - G_pp (T_fp - T_pit) - Q_p_loss - Q_p_fuel
C_pit dT_pit/dt = G_wp (T_fw - T_pit) + G_pp (T_fp - T_pit)
                  - Q_walls - Q_meat - Q_chamber_loss
O2_wood_available   = 0.232 air_wood_kg_s
O2_pellet_available = 0.232 air_pellet_kg_s
```

Each bed would be limited by its own branch oxygen, rather than receiving the
full summed supply. The branch airflow model must account for their common
exhaust pressure if they share a chimney. Independent air actuators could
provide additional control authority, but a large already-burning split still
cannot produce negative heat. These equations describe an extension to
evaluate; separate fireboxes are **not implemented** in the current UI/model.
Choosing between layouts needs dimensions, leakage/draft measurements, thermal
response and practical fuel-handling constraints. The simulated temperature
response does not by itself settle that engineering choice.
