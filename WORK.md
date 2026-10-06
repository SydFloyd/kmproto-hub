# Hybrid smoker control

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com/lab/smoker.

Added simultaneous wood/pellet Hybrid mode as the default in Smoker Control Lab,
which remains ninth and last in the Lab directory. Hardware layout is undecided;
the interface and engineering notes identify a shared firebox as the first
design candidate. Each fuel has independent water, dry biomass, char, temperature
and origin ledgers, with a common oxygen budget and cooker thermal network.
Pellet and wood gases divide available oxygen proportionally before the remaining
oxygen can burn char. Chemical energy and fuel-origin mass are conserved;
variable fuel heat capacities and omitted outgoing sensible enthalpy mean the
model does not claim a complete cooker thermal-energy ledger.

The controller forecasts observed wood heat, computes required heat from a
heat balance and bounded PI feedback, and allocates a nonnegative pellet
supplement with finite feed capacity and actuator slew. Chamber trend and
stored firebox heat account indirectly for delayed pellet heat. It maintains a
draft floor, freezes integral action during lid openings, inhibits automatic
feed after flameout and reports draft or excess-wood control limits. The wood
observer has ideal access to simulated states; a physical device requires
sensor-based estimation and measured calibration. It is a constrained nominal
controller, not a claim of global optimality or production firmware.

Separate moisture/refill controls, source heat/phase readouts, heat-budget and
handoff charts, and small/large wood-charge scenarios demonstrate simultaneous
combustion and its limits. Manual/fixed-feed modes show actual heat and configured
feed; the automatic demand trace has gaps while inactive. Full equations,
coefficients, discretization, pseudocode, ledgers, sensor requirements and
calibration steps are in app/lab/smoker/HYBRID_MODEL.md, linked from the UI.
The notes also describe the separate-firebox extension without claiming it is
implemented. Primary USDA sources support the physical principles; manufacturer
documentation confirms a commercial shared-firebox hybrid example.

Verification: 23 model tests (14 original regressions and nine hybrid tests),
production build, TypeScript, full ESLint and diff checks pass. Tests cover
independent mass/chemical-energy conservation, common oxygen limits, concurrent
burning, pellet takeover/refuel response, 225/250/275 F regulation, lid/weather
disturbances, finite fuel, cold-fire inhibit, deterministic batching and excess
wood heat. A separate 86,400-step audit found maximum fuel-mass residual
7.8e-13 kg, chemical-energy residual 2.4e-5 J and oxygen overdraw 2.2e-19 kg/s.
Those are numerical accounting checks, not measured hardware performance.

Browser checks pass at 1440/768/390/320 px for all three fuel modes, both hybrid
refills, manual/automatic and fixed-feed controls, source heat-budget consistency,
large-wood oversupply with zero feed, temperature units, math disclosures,
playback/reset, hidden-tab suspension, 12-hour bounds and last-position Lab
navigation. No page errors, horizontal overflow or automated WCAG A/AA violations;
desktop and phone screenshots were inspected. Evidence: ignored
outputs/check-hybrid.cjs, outputs/hybrid-browser.json and outputs/hybrid-*.png.
The older owner-private Sites publication and unrelated pricing files are unchanged.

Source 8848396b228ff0984ae919bad1db2418baca14d0 was pushed to main. Vercel
production deployment 6874676428 reports success. Live checks repeat the full
three-fuel workflow at 1440/768/390/320 px, including hybrid heat allocation,
manual/fixed-feed values, oversupply with zero feed, both refills, 12-hour limits
and final Lab position. No page errors, overflow or automated accessibility
violations. All seven Lab/smoker script and stylesheet references match the
tested build byte for byte. Live phone screenshot inspected. Evidence: ignored
outputs/hybrid-live.json, outputs/smoker-live-assets.json and
outputs/hybrid-live-*.png.

---

# Smoker Control Lab

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com/lab/smoker.

Added `/lab/smoker` as the ninth and last Lab entry, following Games. It has its
own static Vite entry and loads no simulation code on the business site or Lab
directory. The original navy/white site branding is retained, with amber heat
and teal airflow traces. Responsive SVG charts keep axis labels at their actual
pixel size, including phone layouts; temperatures can be shown in F or C.

The deterministic one-second model accounts for fuel water, dry wood, escaped
volatiles and charcoal, with independent wet-mass and chemical-energy ledgers.
A hardwood batch dries, devolatilizes and develops a coal-dominated tail. Pellets
use the same energy basis with faster particle kinetics, a metered feed and a
finite hopper. Both dampers constrain airflow in series. The lumped thermal
nodes include firebox, chamber, walls and illustrative meat surface/core, with
evaporation and boiling latent heat. USDA research supports burn-stage and
fuel-energy principles; kinetics, geometry, heat transfer and gains are clearly
identified as nominal assumptions. This is not calibrated to a specific cooker
and does not predict food safety, doneness, particulate emissions or flavor.

Automatic control uses temperature feedback, trend anticipation, bounded
integration and a minimum exhaust opening. Pellet feed can be controlled along
with air or held fixed to demonstrate damper-only limits. Lid openings freeze
integral action; a cooled automatic pellet fire inhibits feed until a new lit
cook is started. The simulation starts with an established ember bed; adding
cold fuel cannot relight a cold fire. Manual controls, matching shadow cooks
with fixed dampers, lid/wind disturbances, refueling and fuel/weather settings
are functional. Changing moisture affects the next fuel addition and preserves
existing water inventory; mixed pellet loads use weighted hopper moisture.

Verification: all 14 model tests, production Vercel build, TypeScript, ESLint and
diff checks pass. Tests cover mass/chemical-energy conservation, fixed-step
batching, fuel phases, wet-fuel delay, both dampers, 225/250/275 F control,
four-hour low-target pellet stability, lid recovery, colder/windier conditions,
fixed-feed limitations, flameout inhibition, moisture blending, finite fuel,
wet core boiling and extreme manual inputs. Default cooks hold approximately
250 F at two hours, while the paired fixed-damper cooks read 134 F (wood) and
330 F (pellets). These are model results, not measured device performance.

Browser checks at 1440/768/390/320 px pass for both default controllers, manual
actuators, pellet strategies, units, disturbances, refueling, playback, reset,
hidden-tab suspension, 12-hour bounded sessions and last-position Lab navigation.
No page errors, horizontal overflow or automated WCAG A/AA violations. Desktop
and phone screenshots were inspected. Evidence: ignored outputs/smoker-browser.json,
outputs/check-smoker.cjs and outputs/smoker-*.png. The older owner-private Sites
publication and unrelated internal pricing files are unchanged.

Source 2ca94f8aad41cbd0810a3c1385bebd0025d51f9e was pushed to main. Vercel
production deployment 6874235472 reports success. Live browser checks repeat the
full desktop/phone workflow at 1440/768/390/320 px, both 250 F default controllers,
12-hour limits and final Lab position, with no errors, overflow or automated
accessibility violations. All seven Lab/smoker script and stylesheet references
match the tested local build byte for byte. Live phone screenshot inspected.
Evidence: ignored outputs/smoker-live.json, outputs/smoker-live-assets.json and
outputs/smoker-live-*.png.

---

# Waves only

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

The homepage now always mounts the ripple tank. Random selection and theme query
overrides are removed. Marble components, model, renderer, styles, tests and npm
test command are deleted, along with its unused responsive canvas selectors.
Blueprint components, zoom logic, styles, tests and npm command were already
removed; a tracked-source audit confirms no implementation or references remain.
The wave simulation, renderer, continuous currents and softened KM are preserved.

Production build, TypeScript, lint and all 16 remaining wave physics/runtime
checks pass. The build contains six homepage/water assets and no removed-theme
chunks or strings. Browser checks at 1440/390/320 px confirm waves on normal
startup and old theme URLs, continuous currents, mouse/tap ripples, full screen,
keyboard pause/resume and no overflow or page errors. The worker bundle is
identical to the previously verified production version. Evidence: ignored
`outputs/waves-only-local.json` and screenshots.

Source fdc057844ce7c8b7cff8aaa536437ff3732139b7 was pushed to main. Vercel
production deployment 6873815704 reports success at 2026-10-06T02:00:55Z.
All six homepage/water assets on www.kmproto.com match the tested build; none
contains removed-theme code. Live checks at 1440/390/320 px pass for normal
startup and old theme URLs, continuous currents, pointer/tap interaction, full
screen, keyboard pause/resume, no overflow and no page errors. Evidence:
ignored `outputs/waves-only-live.json` and screenshots.

---

# Earlier release: Continuous hero motion and softer KM

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

The user reports that the Samsung waves are substantially more performant,
but stop without pointer input, and the desktop marble remains stationary.
The previous preview reproduces both failure paths: software water stops its
clock after its first paint; reduced-motion desktops start the marble paused.

Both themes now play automatically. Reduced motion slows the waves to half
pace and the marble to 60% pace; manual pause remains available. Quiet water
has coherent, continuously evolving drawn currents independent of the solver.
The worker repaints its cached field at 15 fps with no physical steps, encoding
or field copies, and hardware WebGL draws quiet currents at 20 fps. Interactions
still target 30 fps. Hidden/offscreen views suspend and resume without resetting
their state. An overloaded renderer keeps an 8 fps ambient current rather than
falling permanently still. Existing node, pixel, queue and input ceilings remain.

KM reveal opacity is capped at 42% and its highlight color is muted mint.
Ambient currents never expose it; real ripples still scatter off the same
square, finely sampled reflective geometry and briefly reveal its shape.

Production build, TypeScript, lint and 24 physics/runtime checks pass. Browser
checks pass at 1440/390/320/1024 px for startup, actual marble progression,
manual playback, slower default motion, native scrolling, hidden/offscreen
suspension, native/fallback full screen, rotation, GPU loss and worker fallback.
No page errors. Current evidence: ignored `outputs/continuous-motion-behavior.json`.

The five-minute 4x CPU run passes, including untouched water, continuous pointer
input/pebbles, landscape full screen, settling after input stops, and untouched
water again. Idle painting holds 15.0 fps with zero physical steps; interaction
holds 30.0 fps, and the settling minute averages 16.9 fps as it returns to idle.
There are no long tasks, emergency fallback or overlapping worker jobs. The
ambient clock advances roughly 60 seconds in every minute. Main-thread p95 work
stays at 0.4–0.6 ms; worker p95 is 0.9–2.8 ms. Backing pixels remain below
160,000 and retained main-thread heap growth is 240,438 bytes. The unattended
screenshots visibly differ. Evidence: ignored `outputs/continuous-motion-soak.json`.

Separate desktop checks verify actual visible drawing changes with no pointer
movement under both motion preferences. A fully revealed letter measures at
most 100/255 alpha in the software renderer. The hardware shader links and
draws with no GL errors. Screenshots were inspected. Evidence: ignored
`outputs/continuous-motion-visuals.json` and corresponding screenshots.

Source e8bd9dcd633c7ba0d90e271236651f75a359be60 deployed successfully as
Vercel preview 6863231674 at 2026-10-05T15:36:58Z:
https://kmproto-qwmy2qttu-kyle-millers-projects-456dcebb.vercel.app
All nine homepage/theme/worker assets match the tested local build. Live checks
verify tap-driven water, moving marble, and automatic desktop motion under
reduced-motion settings with no pointer input. No page errors or overflow.
Evidence: ignored `outputs/continuous-preview-verification.json`.

Automatic approval review initially rejected the main push because it could
not establish authorization for this release or completion of the prior device
check. The user's explicit “Please publish” resolved the release approval.

Approved source 0e2cc51e1af3334f771349bdac6b5bca90931f49 was promoted to main.
Vercel production deployment 6873298423 reports success at
2026-10-06T01:21:09Z. All nine homepage/theme/worker assets on www.kmproto.com
match the tested local build. Live phone and desktop checks verify flat water
startup, visible tap ripples, moving marble, automatic playback with a stationary
pointer under reduced-motion settings, selected-engine-only loading, no overflow
and no page errors. Live screenshots were inspected, including the softer KM.
The apex kmproto.com redirects to the verified www host. Evidence: ignored
`outputs/continuous-production-verification.json` and corresponding screenshots.

---

# Earlier mobile animation repair — preview verification

Updated: 2026-10-05
Status: sustained performance gate passes; Samsung device verification and
production promotion remain pending.

The user's Samsung froze on the previous wave implementation. Earlier desktop
and emulated-device checks did not establish acceptable performance on that
phone, and the earlier 9–11 fps throttled result was insufficient. This repair
replaces the expensive path rather than treating those checks as a release gate.

Blueprint and its tests are removed. Startup is now exactly 50/50 waves/marble;
the unselected engine is not fetched. Direct verification links use
`?animation=waves` and `?animation=marble`.

Waves now use a bounded worker field, one reusable frame buffer, coalesced
pointer input, capped catch-up, and one WebGL punctuation batch. Fine KM nodes
remain independent of the solver grid. Startup is flat, water covers the full
ribbon, and shader opacity protects the copy. Node/pixel ceilings and automatic
quality reduction cover ordinary and zoomed-out phone views. GPU loss/overload
or software-emulated WebGL uses a transferred OffscreenCanvas: the worker owns
the software punctuation drawing as well as the field, and replies with a small
completion message. Browsers without canvas transfer retain the small main-thread
renderer; blocked/stalled workers also use the small field locally. Further
overload fades to interactive still snapshots. Idle, hidden,
offscreen and reduced-motion scheduling are bounded. Waking from deliberate
idle must not count as a missed frame deadline.

The marble is solid ivory and at least 11 screen pixels in diameter, including
phone desktop mode. Explicit play overrides reduced motion; keyboard P and the
small playback button both pause/resume. Stationary railwork is cached by a
geometry revision, moving parts stay live, pointer work is coalesced, and the
loop stops scheduling when paused/hidden/offscreen. A stationary-obstruction
sweep verifies that the marble resumes and completes its loop.

Validation: production build, TypeScript, lint and 23 physics/runtime checks
pass. Browser checks cover 1440/390/320/1024 px, visible marble pixels and actual
phase progression, lazy loading, untouched scrolling, native/fallback full
screen, rotation, offscreen/hidden suspension, reduced-motion opt-in, lost GPU
contexts and stalled workers. Missing or failed canvas transfer falls back to
main-thread drawing, and blocked worker construction falls back to the local
solver; each path remains interactive. No page errors. The final five-minute stress run
uses 4x CPU throttling, continuous pointer input and pebbles, full screen and
rotation. Actual completed worker frames average 29.7–30.0 fps in every minute,
with zero long tasks, no emergency fallback and no overlapping worker jobs.
Main-thread p95 work is 0.3–0.4 ms in portrait and 1.8 ms during the landscape
minute. Worker p95 work is 1.1–1.2 ms in portrait and 6.8 ms in landscape. Backing
pixels remain below 160,000. Retained main-thread heap growth is 260,998 bytes;
garbage collection is forced only outside the timing window. This passes the
sustained performance gate on this host. It is not a physical Samsung benchmark.

Earlier five-minute runs are retained as failed evidence: software WebGL and
then main-thread software drawing triggered the 7.5 fps snapshot fallback under
sustained load. Hardware-backend detection, sparse glyph stamps and a governor
that tolerates isolated resize hitches helped short tests, but moving software
painting into the worker resolved the prolonged test. Full-screen finger
dragging leaves a wake while normal page gestures still scroll.

Final interaction checks pass for full-screen touch wakes without a tap and
exact 50/50 startup boundaries. Normal touch scrolling and accessibility checks
also pass. The remaining release gate is the actual Samsung/browser check;
a concise question with direct theme previews has been sent to the user.

Preview source 26f6618814f35cc9beaae27a3353ba241ae32914 deployed successfully
as Vercel preview 6861886459 at 2026-10-05T14:38:25Z:
https://kmproto-zlzk9ie54-kyle-millers-projects-456dcebb.vercel.app
All nine homepage/theme/worker assets match the tested local build. Public HTTP
200 and live phone-layout checks pass: flat water startup, tap-driven visible
ripples, worker-owned painting, moving marble, selected-engine-only loading,
no overflow and no page errors. Both screenshots were inspected. Production
remains unchanged pending actual Samsung feedback.
Final phone and zoomed-out desktop-phone screenshots were inspected; native
swiping and automated WCAG A/AA checks pass without overflow or page errors.

Current evidence is in ignored `outputs/worker-preview-verification.json`,
`outputs/worker-paint-soak.json`,
`outputs/check-worker-behavior.cjs`, `outputs/check-worker-touch.cjs`, and
the worker-paint screenshots. Historical evidence is in `outputs/animation-behavior.json`,
`outputs/animation-fallback-profile.json`, `outputs/animation-soak.json`,
`outputs/animation-soak-final.json` and `outputs/animation-final-visuals.json`.
Private pricing documents are excluded from staging and deployment.

---

# Calm water across the full hero ribbon

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

Production source: 9664e9883bf02b3816e73c84a719117c5c493180, pushed to main.
Vercel production deployment 6853325161 reports success at
2026-10-05T07:11:15Z. All homepage JavaScript and CSS assets match the
verified production build byte for byte. Evidence: ignored
outputs/ripple-ribbon-live-bundle.json.

Public wave checks pass at 1440/768/390/320px and phone desktop layouts
of 980px/1024px: flat startup, full ribbon bounds, protected copy, pointer
wakes over text, actual click/tap KM reveals, selection, working service
links, native wheel/touch scrolling, native/fallback full screen, reduced
motion and landscape. Fine-letter checks confirm square K corners and the
same node limits. Offscreen/hidden suspension, print and exact one-third
startup boundaries also pass. No page errors, overflow or desktop automated
WCAG A/AA violations. Evidence: ignored outputs/ripple-ribbon-live.json,
outputs/ripple-ribbon-shape-live.json, outputs/ripple-ribbon-lifecycle-live.json,
outputs/hero-thirds-selection-live.json and corresponding screenshots.

The waves now cover the entire hero section, including its padding and the
area behind the business copy. One continuous field carries pointer wakes
and pebble ripples across the ribbon. A soft, cached alpha mask keeps the
water at approximately 12% ink behind the text and full strength in open
water. Text selection, quote/service links, wheel scrolling and native
touch panning stay available. The small full-screen icon sits in the
ribbon's corner. The other two themes and equal one-third selection remain.

Removed the automatic startup pebble. The first paint is an even, still
field of dots; slow, quieter currents gradually emerge. The hidden KM
reflector remains beside the copy on desktop and below it on mobile,
with the same square K stem and fine, equally weighted lettering. Full
screen centers the KM and removes text protection. Native and viewport
fallback modes use the existing shared full-screen hook.

Touch devices use at most 2,600 background nodes and 3,200 solver nodes;
desktop retains the 4,400/5,600 limits. Lettering remains independent,
with up to 1,200 finer nodes. Cached glyph atlases, a text mask of at most
512 by 384 pixels, a three-million-pixel backing cap, DPR 2 and 30 fps
painting bound the rendering work. The solver sleeps at rest, wakes on
interaction, and sleeps again after ripples settle. Offscreen and hidden
pages stop painting. No dependency, external asset or network request added.

Production build, lint, TypeScript and diff checks pass. All eight wave,
six blueprint and six marble model tests pass. Wave tests cover flat
startup, coherent quiet currents, translated reflection/letter geometry,
equal stroke weights, wave decay and solver sleep/wake behavior. The other
two themes pass their desktop/mobile interaction checks, and all six exact
one-third boundary cases pass. Evidence: ignored outputs/blueprint-thirds-local.json,
outputs/marble-local.json and outputs/hero-thirds-selection-local.json.

Final wave browser checks pass at 1440/768/390/320px, plus phone desktop
layouts at 980px and 1024px. The first paint contains only dots, with zero
wave height, velocity or letter reveal. Canvas bounds match the entire hero.
Even deliberately saturated water stays at 31/255 alpha behind the copy;
the open water stays fully visible. Real mouse clicks and touch taps reveal
the KM, pointer wakes continue over text, text remains selectable, service
links work, and wheel/touch scrolling remains native. Keyboard pause,
reduced motion, native/fallback full screen, focus trapping/restoration,
landscape, square K corners and fine lettering pass. No page errors or
horizontal overflow; desktop automated WCAG A/AA checks find no violations.
Screenshots reviewed. Hidden/offscreen suspension and print also pass.
Evidence: ignored outputs/ripple-ribbon-local.json,
outputs/ripple-ribbon-shape-local.json, outputs/ripple-ribbon-lifecycle-local.json
and matching screenshots.

Synthetic Chromium profiles, with fully disturbed water and illuminated
letters, show mobile/phone desktop median paint intervals of 33.7/33.3ms
at normal speed, with p90 callback work of 7.3/6.2ms. Four-times CPU
throttling gives p90 callback work of 32.7ms and median paint intervals of
94.5/111.0ms; idle mobile p90 work is 20.6ms. Full screen at 1440 by 1000
has a 33.0ms median paint interval and 49.4ms p90 in the software renderer.
These are browser simulations, not physical-phone benchmarks. Evidence:
ignored outputs/ripple-ribbon-performance-final.json.

## Earlier release: Obliging marble machine and three equally likely themes

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

Production source: 1e0ef2a90e87004a22f5e887d15defc5ee31685f, pushed to main.
Vercel production deployment 6852770995 reports success at
2026-10-05T06:31:06Z. All homepage JavaScript and CSS assets match the
verified local build byte for byte. Live checks confirm all three startup
choices, exact one-third boundaries, a single mounted engine and stable
selection. The marble machine passes all three mechanical responses,
folding, keyboard, mouse/touch, native/fallback full screen, reduced motion,
page scrolling and focus restoration at 1440/768/390/320px. Landscape and
980px phone desktop mode pass. No page errors, overflow or automated WCAG
A/AA issues. Evidence: ignored outputs/marble-live.json,
outputs/hero-thirds-selection-live.json, outputs/hero-thirds-live-bundle.json
and corresponding screenshots.

The homepage selects waves, blueprint or the obliging marble machine with a
one-third chance each on startup. Selection stays fixed through interaction,
resize and full screen, and only the selected canvas engine is mounted.
The original wave and blueprint implementations are preserved.

The new scene is a monochrome mechanical drawing with one engraved marble,
twin rails, hinged trestles, a telescoping platform, reduction gears, a return
lift and a counterweight. The marble follows a continuous loop with downhill
speed changes, a steady lift and a brief release. An approaching pointer
opens a local detour with critically damped joints: the upper rail arches,
the platform extends and the counterweight drops to open the passage.
The marble waits when the detour is still opening, then carries on. Moving
away folds the exact original rail back into place. No visible text, frame,
score, extra control, face or audio was added to the animation.

Touch taps hold an obstruction for two seconds; vertical swipes and pinch
zoom remain native. Keyboard arrows move an imaginary obstruction,
Space/Enter places it, Escape clears it and P pauses the marble. Reduced
motion starts still and responds with immediate mechanical poses. The
small corner icon supports native full screen and a focused viewport
fallback, with Escape, focus restoration and scroll-lock cleanup.

The rail stays at 180 nodes at every display size. Static chassis detail is
cached in one sheet of at most 1.512 million pixels; the backing canvas is
capped at 3 million pixels and DPR 2. Drawing is capped at 30 fps, with no
painting offscreen or in a hidden tab. No new dependency, asset, font or
external request is introduced.

Production build, lint, TypeScript and diff checks pass. All six marble,
six blueprint and five wave-field tests pass. Marble tests cover continuous
loop transfers, clearance at 90 obstruction positions/sizes, exact folding,
courtesy waiting, immediate reduced-motion poses and finite rapid-input
behavior. Browser checks at 1440/768/390/320px pass all three mechanical
responses, mouse/touch, keyboard, full screen, reduced motion and normal
wheel/touch scrolling. Landscape and 980px phone desktop mode also pass.
No page errors, horizontal overflow or automated WCAG A/AA violations.
The selection checks verify both exact one-third boundaries and a single
stable engine. Screenshots reviewed. Evidence: ignored outputs/marble-local.json,
outputs/hero-thirds-selection-local.json and corresponding screenshots.

The original blueprint and ripple interaction checks also pass with the
updated selector. Evidence: ignored outputs/blueprint-thirds-local.json and
outputs/ripple-blueprint-pair-local.json. Synthetic software-Chromium profiles
cover idle motion and a continuously moving obstruction: under 4× CPU
throttling, p90 callback work is 1.0–1.2ms on mobile/phone desktop layouts and
median paint intervals are 33.2–33.4ms. Full screen at 1440×1000 and DPR 2
uses 2,998,554 backing pixels and 1,512,000 cached pixels, with median/p90
paint intervals of 33.3/39.3ms. Offscreen and hidden-state checks stop painting.
These are synthetic measurements, not physical-phone benchmarks. Evidence:
ignored outputs/marble-performance-local.json.

## Earlier release: Infinite blueprint and equally likely waves

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

Production source: cc6d422d0e2b165c0ded4a90f2140debcedb78b5, pushed to main.
Vercel production deployment 6852285535 reports success at
2026-10-05T05:52:33Z. Every homepage JavaScript and CSS asset matches the
verified local build byte for byte. Live selection checks confirm the exact
50/50 boundary and stable choice. Both themes pass the full interaction
checks at 1440/768/390/320px; blueprint also passes touch scrolling, Surface,
nested dives, landscape and phone desktop mode. No page errors, overflow or
automated WCAG A/AA issues. Evidence: ignored outputs/blueprint-live.json,
outputs/hero-selection-live.json, outputs/ripple-blueprint-pair-live.json,
outputs/blueprint-live-bundle.json and corresponding screenshots.

The homepage chooses waves or the infinite blueprint with equal probability
on each page load. The choice persists through resize, full screen and
interaction; only the chosen canvas engine is mounted. Existing ripple
physics, finer KM nodes, palette and controls are preserved.

Blueprint components contain previews of their actual child worlds. Circuits
open into street plans, buildings into mechanisms, and mechanisms into new
circuits. Deterministic layouts and inherited entrances connect each layer;
camera transforms match the preview exactly at the end of every dive.
Fine cyan linework, warm junctions, delicate dimensions and slow signals,
construction marks and turning spokes give the drawing quiet movement.
The small Surface control returns to the root; keyboard Backspace returns
one level. The corner icon supports native full screen and a focused,
scroll-locked viewport fallback. Wheel/touch scrolling and pinch zoom remain
native in the blueprint. Reduced-motion navigation completes immediately.

Static detail is cached with roughly 2-million-pixel sheets and a
3-million-pixel backing surface, capped DPR and 30 fps painting. The current
world and transition world are the only cached sheets. Offscreen and hidden
pages stop painting; exploration retains only a path of component IDs.
No new runtime dependency, font, image or external request is introduced.

Production build, lint, TypeScript and diff checks pass. All six blueprint
model tests and five ripple-field tests pass. Inheritance, exact camera
alignment, stable return paths and bounded geometry at 500 levels are covered.
Browser checks for both themes at 1440/768/390/320px pass interaction,
keyboard, native/fallback full screen, reduced motion, landscape and focus
restoration. Blueprint touch swipes scroll normally without accidental dives;
Surface does not change the page position. Phone desktop mode at 980px also
passes. No page errors, horizontal overflow or automated WCAG A/AA issues.
Selection checks verify both sides of the exact 0.5 boundary and a single
engine that stays selected on resize. Screenshots reviewed. Evidence:
ignored outputs/blueprint-local.json, outputs/hero-selection-local.json,
outputs/ripple-blueprint-pair-local.json and matching screenshots.

All three blueprint layers were profiled in a software Chromium browser.
With 4× CPU throttling, p90 callback work is 0.3–0.7ms in the mobile and
phone desktop layouts; median paint intervals are 33.2–33.4ms. Full-screen
1440×1000 at DPR 2 remains within the pixel budgets, with median paint
intervals of 33.3–33.4ms. These are synthetic browser measurements, not
physical-phone benchmarks. Offscreen painting stops. Evidence: ignored
outputs/blueprint-performance-local.json.

## Earlier release: Denser KM lettering with a bounded draw budget

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

Production source: 538a3ee8647b5db86531fc2796717054aa04c311, pushed to main.
Vercel production deployment 6851781215 reports success at
2026-10-05T05:08:20Z. The live application bundle matches the verified local
build byte for byte. Live shape checks at 1440px desktop, 390px mobile and
390px phone emulation with 980px/1024px desktop layouts confirm the finer
letter nodes, square K ends and combined draw cap. No page errors or overflow.
Evidence: ignored outputs/ripple-density-shape-live.json and screenshots.

Separated the reflected KM lettering from the background punctuation grid.
The letters use finer spacing and proportional edge opacity, computed from
shared signed-distance geometry. The K retains square corners. Letter light
samples wave contacts from the existing, coarser solver; its fixed timestep,
reflecting boundaries and physical grid sizes are preserved. At rest the
letter pass draws nothing.

The total draw ceiling remains 5,600 points: at most 4,400 water points and
1,200 letter points. The letter grid refines by up to three times per axis.
Mobile shape checks render 896 letter points versus the previous 111 solid
letter nodes; phone desktop layouts render 970/1,046 versus 207/234. The
background remains at 1,520/2,288/2,420 points in those layouts. Large views
reserve part of the previous background budget for lettering. Cached glyph
atlases, static sampling maps, 30 fps painting, and offscreen/hidden-tab
suspension bound the work without additional wave-solving steps.

Production build, lint, TypeScript, diff checks and all five wave-field tests
pass. The new regression check confirms equal integrated upright weights
across seven mobile/desktop grids. Browser checks at 1440/768/390/320px pass
pointer/touch, keyboard, native and fallback full screen, Escape/focus,
reduced motion and landscape. No page errors, overflow or automated WCAG
A/AA violations. Focused shape checks at 390px with 980px/1024px desktop
layouts confirm the extra letter points and the combined draw cap.
Screenshots reviewed. Evidence: ignored outputs/ripple-density-local.json,
outputs/ripple-density-shape-local.json and matching screenshots.

Worst-case headless Chromium checks hold every letter node fully lit over
90 samples. With 4× CPU throttling, median/p90 animation callback work is
17.0/17.8ms on mobile and 23.1/24.8ms in phone desktop mode; median paint
intervals are 55.3/77.6ms under that synthetic throttle. At 1440×1000 full
screen without CPU throttling, median/p90 paint intervals are 33.4/36.3ms.
These are software-browser measurements, not physical-phone benchmarks.
Evidence: ignored outputs/ripple-density-performance-final.json.

## Earlier release: Square K upright in mobile desktop view

Updated: 2026-10-05
Status: published and verified at https://www.kmproto.com.

Production source: 7b3d70d6c253ca9296356f3e8881289a0b68101d, pushed to main.
Vercel production deployment 6851336414 reports success at
2026-10-05T04:25:46Z. The live application bundle matches the verified local
build byte for byte. Focused live shape checks pass at 1440px desktop, 390px
mobile and 390px phone emulation with 980px/1024px desktop layouts. Both ends
of the K upright retain matching full-width corners. No page errors or
horizontal overflow. Evidence: ignored outputs/k-stem-live.json and screenshots.

Reproduced the tapered K stem in a 390px phone viewport with desktop layouts
of 980px and 1024px at device pixel ratio 3. The 980px view used a 52×44 wave
grid: its rounded tips narrowed from two columns to one. K now has a
rectangular upright with flat ends at the same stroke width and outer height.
Revealed monogram marks gently settle onto the fixed grid, preserving straight
edges while ambient water continues to drift. At rest the same ambient motion
still conceals the monogram.

Production build, lint, TypeScript, diff checks and all four wave-field tests
pass. Focused browser shape checks at desktop, mobile and both phone desktop
layouts confirm matching full-width top and bottom corners. Geometry snapshots
force full reveal only within the browser check so all corners can be inspected.
Before/after screenshots reviewed: ignored outputs/k-stem-before.json,
outputs/k-stem-local.json and matching screenshots. Interaction checks at
1440/768/390/320px pass pointer/touch, keyboard, native and fallback full screen,
Escape/focus, reduced motion and landscape, with no page errors, horizontal
overflow or automated WCAG A/AA violations. Evidence: ignored
outputs/ripple-square-k-local.json and screenshots.

## Earlier release: Fuller KM and softer reflections

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com.

Production source: 112bad89c6bfc05ec1960dfef948398d65822363, pushed to main.
Vercel production deployment 6851035600 reports success at
2026-10-05T03:58:06Z (October 4 in America/New_York). The public application
bundle matches the verified local build byte for byte. Live checks at
1440/768/390/320px pass pointer/touch, keyboard, full screen, reduced motion,
fallback/Escape and landscape with no page errors, horizontal overflow or
automated WCAG A/AA violations. Evidence: ignored outputs/ripple-km-live.json
and matching screenshots.

Increased the submerged KM stroke radius from 0.032 to 0.038 (about 19%).
Its reflected light now gathers over a brief, smooth attack and decays more
slowly. A pale champagne highlight with a softer glow gives the fuller
letters a gentler reveal while retaining the cyan currents and deep ocean
hero. Still water hides the monogram, and the punctuation-only surface,
frameless layout and single full-screen icon remain.

Production build, lint, TypeScript, diff checks and all four wave-field tests
pass. Browser checks at 1440/768/390/320px pass pointer/touch, keyboard, native
and fallback full screen, reduced motion and landscape. No page errors,
horizontal overflow or automated WCAG A/AA violations. Desktop, phone and
full-screen screenshots reviewed. Evidence: ignored outputs/ripple-km-local.json
and matching screenshots.

## Earlier release: Ocean hero and luminous ripples

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com.

Production source: 99d451ff70137246e0b701200eab452d43412880, pushed to main.
Vercel production deployment 6850846043 reports success at
2026-10-05T03:39:30Z (October 4 in America/New_York). Live checks at
1440/768/390/320px pass transparent rendering, no visible tank text, the
single corner icon, pointer/touch, keyboard and full screen. Native and
fallback full screen, Escape/focus, reduced motion and 568×320 landscape
pass. No page errors, horizontal overflow or automated WCAG A/AA violations.
Live evidence: ignored outputs/ripple-ocean-live.json and screenshots.

Reworked the homepage hero around a deep ocean backdrop, pale serif headlines
and warm ivory actions. The frameless water blends into that backdrop, with
cyan crests, blue troughs and gold contact glints around the submerged KM.
Curved interference currents and coherent punctuation drift give the surface
more depth. The pool still uses only · , : ~ ≈ and one corner full-screen icon.
At rest the monogram remains hidden; the reflecting wave field is preserved.

Larger punctuation and a 5,600-cell render cap keep the richer full-screen
surface legible and fluid. Atlas placement uses whole device pixels for crisp
marks. Headless Chromium at 1440×1000 measured 33.3ms median and 33.4ms p90
frame intervals over 80 samples. No external imagery or fonts were added.

Production build, lint, TypeScript, diff checks and all four wave-field tests
pass. Browser checks at 1440/768/390/320px pass transparency, no visible tank
text, the single icon, pointer/touch, keyboard, full screen, fallback/Escape,
focus handling and reduced motion. Landscape at 568×320 remains usable.
No page errors, overflow or automated WCAG A/AA violations. Screenshots
reviewed. Evidence: ignored outputs/ripple-ocean-local.json, performance
results and desktop/mobile/full-screen screenshots.

## Earlier release: Design contrast

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com.

Production source: 70c5a95549913eb421c74a9476eeacc41bc20882, pushed to main.
Vercel production deployment 6850441961 reports success at
2026-10-05T03:01:23Z (October 4 in America/New_York). Live homepage, Lab and
Games checks at 1440/390px confirm the stronger palette and no page errors,
horizontal overflow or automated WCAG A/AA violations. Ripple full screen
uses the new palette and remains icon-only.
Live evidence: ignored outputs/contrast-live.json and screenshots.

Deepened the shared navy/slate palette for headings, body copy, secondary
labels, links and buttons. Strengthened dividers and the contrast between
white sections and the cool-tinted hero. The contact section has brighter
light text on deeper navy. Ripple glyphs use darker ink with a stronger tonal
curve; the transparent surface, soft edges and single full-screen icon remain.

Production build, lint, TypeScript and diff checks pass. Browser checks of
the homepage, Lab and Games portal at 1440/390px pass with no page errors,
overflow or automated WCAG A/AA violations. Full screen uses the updated
palette and remains icon-only. Body contrast against the hero rises from
9.28:1 to 10.44:1; secondary text rises from 5.39:1 to 6.81:1. Screenshots
reviewed. Evidence: ignored outputs/contrast-local.json and screenshots.

## Earlier release: Seamless ripple tank

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com.

Production source: b2b454e3218a53d5cea68efe83be5ed16355f3ef, pushed to main.
Vercel production deployment 6849661336 reports success at
2026-10-05T01:47:50Z (October 4 in America/New_York). Live checks at
1440/768/390/320px pass transparent/no-frame rendering, no visible tank text,
the single corner icon, pointer/touch, keyboard and full screen. Reduced
motion, fallback/Escape/focus, 568×320 landscape and accessibility pass;
there are no page errors or horizontal overflow.
Live evidence: ignored outputs/ripple-seamless-live.json and screenshots.

Removed the tank frame, dark backing, heading, scales, instructions and text
controls. The punctuation now renders transparently in the homepage palette,
with softly fading edges. The only visible control is a small full-screen
icon in the corner. Wakes, pebble drops and the transient submerged KM remain.
Native and fallback full screen fill the viewport with the homepage tint.
Keyboard arrows, Space/Enter and P retain stirring, drops and pause/resume;
reduced-motion users can disturb the still water directly without automatic
animation. Accessible names remain invisible.

Production build, lint, TypeScript and diff checks pass. Browser checks at
1440/768/390/320px confirm transparent/no-frame rendering, no visible text,
one icon, pointer/touch, keyboard and full screen. Fallback focus trapping and
Escape, reduced-motion interaction and 568×320 landscape pass. No page errors,
horizontal overflow or automated WCAG A/AA violations. Screenshots reviewed.
Evidence: ignored outputs/ripple-seamless-local.json and screenshots.

## Earlier release: ASCII ripple tank

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com.

Production source: 033eb6f6a584355ec128e7f3d5e51e9b105657ad, pushed to main.
Vercel production deployment 6849521217 reports success at
2026-10-05T01:34:35Z (October 4 in America/New_York). Live browser checks at
1440/768/390/320px pass pointer/touch, pebble, pause, clearing, keyboard and
full screen. Native full screen, immersive fallback/Escape, reduced motion
and 568×320 landscape pass. No page errors or horizontal overflow.
Live evidence: ignored outputs/ripple-tank-live.json and screenshots.

Added an interactive punctuation-only ripple tank beside the homepage hero.
The shallow-water field has fixed-step propagation, damping, smooth currents,
directional pointer wakes and pebble impulses. A submerged KM mask reflects
waves and briefly lights the letters as wave fronts pass, fading back into
the quiet surface. The instrument has pause, still water and full-screen
controls, with an immersive fallback for browsers without native full screen.
Touch dragging and keyboard interaction are supported; reduced-motion users
start paused, and rendering stops when the tank is offscreen or the tab hidden.

Four wave-field tests pass: hidden idle mask, reflection/contact reveal, decay
back to stillness, and wake/stability/clear behavior. Browser checks at
1440/768/390/320px pass pointer/touch, keyboard, pebble, pause, clearing and
native full screen; fallback/Escape, offscreen rendering and reduced motion
also pass. Landscape full screen at 568×320 remains usable. No page errors,
horizontal overflow or automated WCAG A/AA violations. Screenshots reviewed.
Evidence: ignored outputs/ripple-tank-local.json, accessibility results and
desktop/mobile/full-screen screenshots. The production Vercel build, lint,
TypeScript and git diff checks pass.

## Earlier release: Pricing removal

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com.

Production source: f65200a778107a4448e135a109a8dd1e5fe65960, pushed to main.
Vercel production deployment 6849182037 reports success at
2026-10-05T01:02:02Z (October 4 in America/New_York). Live browser checks confirm
only the $1,200 starting price, no pricing section or links on any page, permanent
redirects from /pricing and /pricing.html to /#services, and a 404 for the removed
pricing guide. No page errors or horizontal overflow.

Removed the homepage pricing section, standalone pricing page, package data and
components, pricing links in the shared header/footer, pricing PDF download and
unused pricing styles. Removed fee, payment and monthly-plan terms from the
homepage. The only remaining price is “Websites starting at $1,200” in the hero.
The Websites service now links directly to a website inquiry email. Old /pricing
and /pricing.html links redirect permanently to /#services on the public site.
Root internal pricing documents are not published.

Vercel build, lint, TypeScript and diff checks pass. Built assets contain no old
pricing page, guide, package prices or payment terms. Browser checks at
1440/768/390/320px confirm the single starting price, removed section and links,
working Services navigation and no horizontal overflow or page errors. Shared
navigation also checked on the Lab, Games portal and all four game pages at
390px. Desktop and mobile screenshots reviewed.
Evidence: ignored outputs/pricing-removed-local.json, outputs/pricing-removed-live.json
and screenshots.

## Earlier release: Lab project order

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com/lab.

Production source: ac8cd7b8e3845b985ca464b5a87fed1159b35cc4, pushed to main.
Vercel production deployment 6843916029 reports success at
2026-10-04T16:59:16Z. Live checks at 1440/768/390/320px confirm the requested
eight-item order, Games as the final row, the eight-project count and keyboard
navigation to the four-game portal and back. No page errors or overflow.

The Lab directory now lists Stillcraft, Food Miller, Verseform, Shep Study,
ChordLift, Bible Audio, Milk Yeller and Games in that order. Games is a normal
final directory row linking to /lab/games; its former intro panel and unused
styles are removed. The Lab count is derived from all eight entries. The seven
external destinations are preserved; the homepage's shared project list uses
the same application order and does not gain a Games entry. The requested list
covers every existing Lab item.

Vercel build, lint, TypeScript and diff checks pass. Browser checks at
1440/768/390/320px verify the exact eight-item order and destinations, updated
count, removed intro panel, keyboard navigation to the four-game portal and
return navigation. No page errors, horizontal overflow or game-engine loads
on the Lab. Desktop and mobile screenshots reviewed.
Evidence: ignored outputs/lab-order-local.json, outputs/lab-order-live.json
and screenshots.

## Earlier release: R.C. Pro-Am end screen alignment

Updated: 2026-10-04
Status: published and verified at https://www.kmproto.com/lab/games/rc-pro-am.

Production source: f5971ddf2a62fb92f28c8880f599aabdb906c532, pushed to main.
Vercel production deployment 6840484286 reports success at
2026-10-04T11:39:07Z. Live checks confirm centered actions and trophy rows at
1440/768/390/320px, landscape full screen at 844x390 and 568x320, and the single
New game button after all continues are spent. Continue and New game work;
no clipping, overflow or page errors.

Centered the game-over Continue/New game buttons with explicit flex alignment.
Centered the trophy row across the playfield, accounting for the width of each
count. The shared trophy display also stays centered on race-complete screens.

Vercel build, lint, TypeScript and diff checks pass. Browser checks verify actual
game-over button and trophy positions at 1440/768/390/320px and landscape full
screen at 844x390 and 568x320. Continue and New game work; the remaining button
stays centered after all three continues are spent. No clipping, overflow or
page errors. Rendered trophy counts remain centered with one or two digits.
Evidence: ignored outputs/rc-pro-am-alignment-live.json and screenshots.

## Earlier release: R.C. Pro-Am

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/rc-pro-am.

Production source: cc8904b076bb3762be0460ecf4c595fd603b04e0, pushed to main.
Vercel production deployment 6834715156 reports success at
2026-10-04T00:03:05Z. Live checks pass at 1440/768/390/320px for keyboard,
touch, sound, pause, automatic pause, accessibility and portal navigation.
All four games start and return correctly; seven Lab projects remain available.
Mobile full screen, actual game over, continues, stored best scores, blocked
storage and unavailable audio pass. No page errors or horizontal overflow.

Added /lab/games/rc-pro-am and a fourth card in the Games portal. Its separate
Vite entry keeps the racing engine off directory and business pages. All seven
Lab projects and existing game links remain available.

The NES recreation includes isometric RC racing, relative steering and momentum,
three drone rivals, 24 traced main course shapes, top-three advancement and
first-finisher race endings. Includes missiles, bombs, shared ammo, horn, turbo,
engine/tire upgrades, roll cages, water, oil, rain, pop-up barriers, zippers,
trophies, NINTENDO letters, vehicle progression, three continues and repeated
circuits. Pixel vehicles/scenery and motor/chip effects are authored locally.
Reference provenance and approximation limits are recorded in README.md.
Sound and play start off; keyboard and simultaneous touch controls, pause,
automatic pause, full screen and optional local best scores are supported.

All 19 racing engine tests pass, including a complete first race and driving
all 24 courses through controls with functioning drone opponents. Campaign
fixtures verify 49 transitions. Existing 13 Asteroids, 18 Contra and 18 Bubble
Bobble tests also pass. Vinext and public Vercel builds, lint, TypeScript and
diff checks pass.

Browser checks at 1440/768/390/320px cover idle/muted startup, countdown pause,
keyboard, touch, sound, automatic pause and accessibility. Full screen fits
at 844x390 and 568x320. Actual game over and continuing pass at 320px; valid
stored best scores reload, and blocked storage/missing audio still allow play.
Portal checks cover all four cards, keyboard navigation, image loading,
responsive columns, return links and starting/pausing all four games. No page
errors, horizontal overflow or automated WCAG A/AA violations. Reviewed course,
portal and game artwork. Evidence is in ignored outputs/rc-pro-am-live-verification.json,
outputs/rc-pro-am-live-extras.json, outputs/games-live-verification.json and
screenshots.

## Earlier release: Games portal

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games.

Production source: b83e63108bf30c8ff75b2cb9e44c3d306ed7575e, pushed to main.
Vercel production deployment 6834273036 reports success at
2026-10-03T23:12:11Z. Live checks at 1440/768/390/320px pass the Lab → Games →
game journeys and return links, all previews and responsive card layouts,
keyboard navigation, starting and pausing all three games, and automated
accessibility checks. Seven Lab projects remain available. No page errors,
horizontal overflow or game-engine loads on the directory pages.
Evidence: ignored outputs/games-live-verification.json and screenshots.

The Lab now contains a Games entry linking to /lab/games. The portal presents
Asteroids, Contra and Bubble Bobble as cards with static gameplay artwork,
descriptions, player counts and a Play game link. Cards share one catalog and
use three columns on desktop, two on tablet and one on mobile. The previews
are rendered from the games' existing canvas code, total approximately 50 KB,
and do not load any game engine on the Lab or portal pages.

Removed the header Games dropdown and its unused component/styles. Header
navigation stays consistent across the site, with The Lab marked current on
its game pages. Individual games now link back to the portal. All seven Lab
project links remain in place. No game engine, control or scoring changes.

Vinext and public Vercel builds, lint, TypeScript and diff checks pass. Browser
checks at 1440/768/390/320px cover keyboard navigation from the Lab, loaded
previews, responsive cards, starting all three games, and returning to Games
and the Lab. Games remain idle and muted until started. No page errors,
horizontal overflow or automated WCAG A/AA violations. Reviewed desktop and
mobile screenshots.

## Earlier release: Bubble Bobble

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/bubble-bobble.

Production source: b14cdfed0b1846e47dbdef2b5f98f102bacbd035, pushed to main.
Vercel production deployment 6832801777 reports success at
2026-10-03T20:38:14Z. Live verification passes at 1440/768/390/320px, including
the three-game header menu, seven Lab projects, playable keyboard/touch controls,
co-op, sound, pause and saved scores. Landscape full screen, the Super title code
and continuing after actual game over pass. Live Contra and Asteroids regressions
pass at 1440/390px. No page errors, overflow or automated WCAG A/AA violations.
Evidence: ignored outputs/bubble-bobble-live-verification.json,
outputs/bubble-bobble-live-extras.json, outputs/contra-live-verification.json,
outputs/asteroids-live-verification.json and screenshots.

Added /lab/games/bubble-bobble to the Lab's shared Games menu, with its own Vite
entry so the game engine stays off the business and Lab pages. All seven Lab
projects and the existing Asteroids and Contra entries remain available.

The recreation follows the 1986 arcade game: 100 transcribed platform layouts,
Bub and Bob on one keyboard, bubble trapping and riding, touching chain pops,
food and separate player scores, candy upgrades, shoes, water/fire/lightning,
EXTEND, time limits and Skel-Monsta. Includes secret doors, umbrellas, title
codes, a harder Super variant, the full-health Super Drunk fight and co-op endings.
Pixel art and synthesized sound are authored for this implementation. Physics,
air currents, enemy patterns, item timing and secret rooms are approximations,
with reference provenance and limits recorded in README.md. No ROMs, sampled
music or original sprite files are distributed. Play and sound start off.

All 18 Bubble Bobble, 18 Contra and 13 Asteroids engine tests pass. A test clears
the first round using movement, jump and bubble controls with damage protection
to isolate traversal; campaign fixtures check all 100 round transitions and the
final fight at full health. Both the Vinext and public Vercel builds, lint,
TypeScript and diff checks pass. Reviewed rendered art for all 100 rounds.
Browser checks cover desktop/mobile navigation, keyboard co-op, joining Bob,
multi-touch input, sound, pause, automatic pause, high scores and blocked storage.
All four widths (1440/768/390/320px) pass without page errors, horizontal overflow
or automated WCAG A/AA violations. Contra and Asteroids browser regressions pass
at 1440/390px; the Lab still has seven project links and three game links.
Landscape full screen fits at 844×390 and 568×320, including readable touch labels.
The Super title code and continuing after an actual game over pass at 320px.
The shared bitmap font was extracted without changing Contra's rendering.

## Earlier release: Contra

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/contra.

Production source: b230c9075d3fa16891f05c212e3b2fb678ff9de5, pushed to main.
Vercel production deployment 6831895921 reports success at
2026-10-03T19:11:19Z. Live browser checks at 1440/768/390/320px pass the Games
menu, keyboard and touch controls, co-op, sound, pause, restart and saved scores.
Landscape full screen and continuing after actual game over also pass.
Asteroids regression checks pass on the live site at 1440/390px.
No page errors, horizontal overflow or automated WCAG A/AA violations.
Evidence: ignored outputs/contra-live-verification.json,
outputs/contra-live-extras.json, outputs/asteroids-live-verification.json and PNGs.

Added /lab/games/contra to the shared Games menu. Its separate Vite entry keeps
the engine off the business and Lab pages. Existing Asteroids and the seven Lab
project links remain available. Shared cabinet styles moved to games/arcade.css.
Asteroids already has optional, muted-by-default synthesized sound effects.

Contra is an eight-zone browser recreation modeled on the NES game: side-scrolling
areas, two forward-facing bases and the ascending waterfall; directional fire,
crouching, somersault jumps, swimming, weapon capsules, shielded bosses and local
two-player co-op. Includes three lives, three continues, stage-clear bonus lives,
the optional 30-life code, synthesized effects and original chiptune music.
Code, level layouts and pixel art are original; no ROMs or sampled game assets.
Sound is muted initially and play starts only on request. Keyboard and multi-touch
input, pause, automatic pause when leaving the playfield, full screen and optional
browser-local high scores match the existing cabinet behavior.

All 18 Contra engine tests and the existing 13 Asteroids tests pass. Campaign
verification traverses all eight zones and defeats full-health bosses using
control inputs, with enemy-damage protection to isolate navigation and aiming;
no level skips or reduced boss health. No falls during that run. Browser checks
at 1440/768/390/320px pass navigation, keyboard input, co-op, the 30-life code,
multi-touch input, pause, sound, restart, saved scores and blocked storage.
No page errors, horizontal overflow or automated WCAG A/AA violations.
Reviewed ready/playing screenshots and the art for all eight zones.
Landscape full screen fits at 844×390 and 568×320. The continue button restores
three lives after an actual browser game over, including at 320px width.
Vercel and Vinext builds, lint, TypeScript and git diff --check pass.
Evidence: ignored outputs/contra-*-verification.json and matching PNGs.

---

# Browser games: Asteroids

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/asteroids.

Production source: 755ddee2411e14026b5aef8d0534deb2de42dd7d, pushed to main.
Vercel production deployment 6831198566 reports success at
2026-10-03T18:07:22Z. Live browser checks at 1440/768/390/320px confirm navigation
from the Lab's Games menu, keyboard and simultaneous touch controls, pause and
resume, audio, desktop full screen, restart and saved high scores. The ready
screen stays still. Blocked browser storage remains playable. No page errors,
horizontal overflow or automated WCAG A/AA violations.
Evidence: ignored outputs/asteroids-live-verification.json and screenshots.

Added a Games menu to the Lab header and an independently loaded game page at
/lab/games/asteroids. The shared catalog supports future games without loading
their engines on the business or Lab pages. Existing project links are retained.

Asteroids recreates the original monochrome vector style and arcade rules:
inertial thrust/rotation, screen wrapping, four player shots, three rock sizes,
20/50/100-point splitting, large and small saucers, risky hyperspace, three ships
and a bonus ship every 10,000 points. Waves progress through 4/6/8/10 large rocks.
Scoring and waves were checked against Atari's 1979 operator manual. Canvas
graphics and Web Audio effects are authored here; no ROM or game assets are used.

Keyboard input belongs to the focused playfield; mobile buttons support
simultaneous pointers and cancellation. Includes pause/resume, restart, full
screen, muted-by-default sound and browser-local high scores. Leaving the
game, hiding the tab or scrolling the playfield out of view pauses play.
The ready screen stays still. Physics uses a fixed 120 Hz step independent of
render rate; collisions check the full bullet path across screen edges.

Checks: Vercel and Vinext builds, lint, TypeScript and git diff --check pass.
All 13 engine tests pass, covering inertia, wrapping, shot limits, splitting,
scoring, bonus lives, waves, respawn safety, game over, hyperspace, saucers and
pause. Browser checks at 1440/768/390/320px pass navigation, keyboard controls,
pause/resume, mute, desktop full screen, simultaneous touch inputs, restart,
saved-score loading and blocked storage. No page errors, horizontal overflow
or automated WCAG A/AA violations. Reviewed desktop/mobile screenshots.
Landscape full screen fits at 844×390 and 568×320, with controls alongside the
playfield. Actual browser gameplay scored 2,230 points; the high score survived
a new game and page reload.
Evidence: ignored outputs/asteroids-*-verification.json and matching PNGs.

---

# Bible Audio publication

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab and https://bible-audio.kmproto.com.

## UI refresh: 0.5.1-beta

Normal (Kitten Micro / Bella) is the first voice and default for new users.
Light (Amy) is the ultra-tiny alternative. Both player and installer download
buttons put Normal first. Existing saved voice choices are respected.
All browser and installer assets are rebuilt with the UI update. The versioned
browser bundle and checksum are recorded in `tools/bible-audio-release.json`.
The builders enforce the 100 MB download/payload budgets and Android signatures.
Published app source: `8c63bed`; standalone Vercel deployment
`dpl_D4aKbaT8vzG1nWx6zeaia5YGdysB` is READY and aliased to the main subdomain.
Hub source `9cdd6da` deployed successfully as `9JsoqPcG2CSFCXXXiJsehVvVzxn9`.
The fallback production page serves Normal first, selected by default, followed
by Light. Public release `bible-audio-v0.5.1-beta` contains all 15 expected assets.

## Initial publication: 0.5.0-beta

Bible Audio is live at https://bible-audio.kmproto.com. Dedicated Vercel project
`bible-audio`, deployment `dpl_9xQ9bDJZqo4FFEg3UzKs414Sv4Qo`, reports READY.
The custom domain is verified; HTTPS returns 200 using the current public DNS
address while this machine's earlier NXDOMAIN is cached. Public production alias:
https://bible-audio-dun.vercel.app. Both voices generate speech in a fresh browser
without login. Speed changes work during playback/pause; voice preview is removed.

Added a Bible Audio card to the Lab and the derived homepage project list. The
existing six destinations are retained. Added the same browser bundle under
`/bible-audio/` as a fallback, fetched and SHA-256 checked during Vercel prebuild.
Generated model assets stay outside Git. Headers are scoped to this demo path.

All 12 Android/Windows/macOS/Linux downloads are in the public release
https://github.com/SydFloyd/kmproto-hub/releases/tag/bible-audio-v0.5.0-beta.
GitHub's upload digests and sizes match every local package. Each is under 100 MB
compressed and extracted. Android APKs request no network/storage permissions;
native Windows/macOS and Android WebView checks remain device checks.
Application source commit `6a6c3dc` is pushed to the private Bible Audio repository;
the original backup branch and earlier private releases remain available.

Checks: Vercel build, lint, TypeScript and git diff --check pass. App browser
checks cover both voices, live speed, offline saving and all four download
platforms. App verification also passes chapter continuity and cold offline
reopening. Hub production source `195ed9b` deployed successfully as Vercel deployment
`HCGZgErtL54UoqFwWtVpoxk2pf3i`. Live browser checks confirm seven Lab entries,
all six original destinations, navigation into the speaking custom-domain player,
and the isolated `/bible-audio/` fallback. Both voices, live speed, offline saving
and all installer links also pass on the custom domain with public DNS. Evidence:
ignored `outputs/bible-audio-live.json` and matching screenshots.

---

# Current work

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com.

Production source: 20797edbcd86fb103f170bec095bbaa7ab11269c, pushed to main.
Vercel production deployment 6829388953 completed successfully at
2026-10-03T15:20:52Z. Live browser checks at 1440, 390 and 320px confirm the
animation is removed, the value offer and quote/service actions remain, and
there are no page errors or horizontal overflow.
Evidence: ignored outputs/animation-removed-live.json and matching PNGs.

Removed the optional workflow illustration, its controls, component and CSS.
The homepage introduction now uses the full content width, with the existing
value offer, local service-area copy and quote/service actions. Hero pricing
remains removed.

Checks: Vercel build, lint, TypeScript and git diff --check pass. Browser checks
at 1440, 390 and 320px confirm the animation and playback controls are gone,
the value offer and quote/service links work, and there are no page errors or
horizontal overflow. Desktop and mobile screenshots reviewed.
Evidence: ignored outputs/animation-removed-local.json and matching PNGs.

---

# October 2026 hero release

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com.

Production source: a9edf6f187877857ac03f9e7d765421ad9ecb31e, pushed to main.
Vercel production deployment 6823067965 completed successfully at
2026-10-03T04:08:39Z. Live desktop (1440px) and mobile (390px) checks confirm the
new value offer, no hero pricing, no autoplay, working play/pause/resume and a
single completed run. Reduced-motion playback shows the finished illustration
without animation. /pricing and /lab return 200, and the public social card and
pricing PDF match the released files. No page errors or horizontal overflow.
Evidence: ignored outputs/live-hero-verification.json and outputs/live-hero-*.png.

Replaced the homepage hero's Website projects price range and payment summary
with a high-level value offer and an optional workflow illustration. The hero now
reads “Make your business easier to find and run.” Its actions are Request a quote
and Explore services. The full pricing section and /pricing remain available.
The social card follows the same value offer and no longer advertises a price.

The illustration untangles four connections and sends a signal along each one.
It is still on load and plays once only after a click or keyboard activation.
Visitors can pause, resume, replay and reset it. Reduced-motion preferences skip
the transition, including when the preference changes during playback. Playback
pauses off screen or when the document is hidden. No new dependency was added.

Checks: Vercel build, lint, TypeScript and git diff --check pass. Browser checks at
1440, 768, 390 and 320px find no horizontal overflow, page errors or automated
WCAG A/AA violations. Verified no autoplay, keyboard play, pause/resume, one-run
completion, replay/reset, offscreen pause and reduced-motion behavior. Reviewed
idle, playing and completed screenshots. /pricing and /lab smoke checks pass.
Evidence: ignored outputs/workflow-verification.json and outputs/workflow-*.png.

---

# October 2026 redesign release

Updated: 2026-10-02
Status: published and verified at https://www.kmproto.com.

Production source: e3a7ee585b1ef1b062299694cdfa43a39aa9815f, pushed to main.
Vercel production deployment 6822499204 reports success at
2026-10-03T03:03:39Z. Public /, /pricing and /lab return 200 at 1440px and 390px,
with the new headings, lower Bucks County copy and no page errors or horizontal
overflow. The public PDF, social image and favicon match the released files
byte-for-byte. Evidence is in ignored outputs/live-verification.json.

The custom software page and broader business positioning remain proposed
follow-up work; this release publishes the reviewed redesign and service-area copy.

Pulled origin/main with --ff-only; already current at 538a24e. Recovered the
checkout's missing source files and Git references/objects before editing.

Replaced the orange palette, star glyphs, animated marquee, mock workbench and
Busywork Sorter with a navy/white layout, system typography and direct copy.
Updated the business page, Lab directory, favicon, social card and metadata.
All six project destinations are preserved.

Added “Serving lower Bucks County” near the homepage introduction, with in-person
meetings by appointment. Contact copy invites local project discussions in person;
homepage search and sharing descriptions include the service area.

Added /pricing, homepage package summaries and the original downloadable client
PDF. Prices, inclusions, add-ons, monthly services and terms follow the supplied
October 2026 guide. The quote-builder workbook remains outside the public build.

Validation: Vercel and Vinext builds, lint, TypeScript and git diff --check pass.
Browser checks cover /, /pricing and /lab at 1440, 768, 390 and 320px: no page
errors, horizontal overflow or automated WCAG A/AA violations. Checked package
inquiries, navigation, skip link, copy-email, all six project links, the $3,640
example and exact PDF bytes. Reviewed desktop/mobile screenshots and social card.
Evidence is in ignored outputs/verification.json and outputs/*.png.
The final dist/ is the public Vercel build with the new social card and PDF.

---

# September 2026 release

Updated: 2026-09-28
Outcome: turn kmproto.com into the KM Proto business site (websites, AI automation &
custom software for small businesses) and move the app portal behind it at `/lab`.

Outcome complete: the redesigned business site is live at https://kmproto.com and the
app portal serves at https://kmproto.com/lab. Publication used the existing Vercel Git
integration: `ca56608` (`a27cee4..ca56608` on `main`) built as deployment `6713977716`;
the commit status context `Vercel` reports `Deployment has completed` (success,
2026-09-28T15:36:01Z). A local `gh` (2.101.0, installed to `~/.local/bin`) authorized via
GitHub's device flow as `SydFloyd` because the host had no Git credentials; git now uses
`gh auth git-credential`.

Live verification with a headless browser against the public URLs: `/`, `/lab` and
`/og.png` all return 200; `/lab` resolves through Vercel `cleanUrls`, confirming the new
`lab.html` entry works in production and not just as a local `/lab.html`. Home titles as
"KM Proto | Websites, AI automation & custom software" with the expected `h1`; Lab titles
as "The Lab | KM Proto". Zero page errors and zero horizontal overflow at 1440px and
390px. The Busywork Sorter interacts on the live site, totals 7.5 h/week and 360 h/year for
three chores, and its button builds a `mailto:kyleaddison98@gmail.com` link. Screenshots
were visually inspected.

No further hub work is needed for this slice. The commit below records only this release
evidence.

## Previous redesign work — historical evidence

Implemented and pushed to `main`: full redesign replacing all prior styling. Vercel's Git
integration builds production from `main`.
Home has hero, services, the interactive Busywork Sorter (pick chores, mascot "Proto"
tallies hours saved and pre-fills a mailto), process, about, Lab teaser and contact with
the public email kyleaddison98@gmail.com. `/lab` lists the same six apps with the same
destinations. New favicon, OG image and metadata. Vite build gained a `lab.html` entry.
ESLint now disables Next's `<Link>`/page-font rules because production is plain Vite.

Checks: `npm run build:vercel`, `npm run build`, lint and `tsc --noEmit` pass. Checked at
1440px and 390px for horizontal overflow and page errors (none); screenshots reviewed.
Deployment and live verification are recorded in the completion note above.

## Previous hub work — historical evidence

Updated: 2026-09-08
Outcome: list Stillcraft’s usable early photo-editor preview on the public KM Proto
hub, under the user’s standing “Publish at will” authority for this app and listing.

Current follow-up: Stillcraft is now on Vercel at **https://stillcraft.kmproto.com**.
The user added its DNS record; Google and Cloudflare public resolvers agree on the
Vercel CNAME. HTTPS and the full desktop/phone-layout app workflow pass using that
public IP with certificate verification enabled; the development host's resolver
still has the earlier NXDOMAIN cached. Only Stillcraft's card destination changes.
The other five cards and derived count remain intact.

The temporary Vercel alias release `88ff3ed` deployed successfully (`6341829079`)
and its six-card listing was observed live, but the alias subsequently returned 404
during the custom-domain transition. The final link below replaces it. The app's
export-preview correction is published as `c8a2d6a`; exact app checks and deployment
IDs remain in `../stillcraft/WORK.md`. Hub production build, lint, TypeScript and
diff checks pass. Main release `106f2e25b1932af64114dcd8ff2c66a2252a0384`
deployed successfully through Vercel production `6341925335` at 2026-09-09 03:32:23 UTC.
The public hub shows six cards, retains the exact Verseform link and 06 count, and
its Stillcraft card opens the custom-domain editor with its photo picker enabled.
No page errors occurred. This check used the publicly resolved Stillcraft IP because
the host's ordinary resolver still returned NXDOMAIN; HTTPS verification stayed on.
The ignored live-check script initially sampled readiness before the worker had
started; waiting for the existing enabled picker condition completed the check.

Outcome complete: custom-domain link published and public hub-to-editor journey
verified. No further hub work is needed for this slice. The following commit records
only this release evidence; the built application remains identical.

## Earlier hub listing — historical evidence

Implemented on `codex/stillcraft-preview`: Stillcraft is the first of six cards, with
an original composition illustration and plain early-preview copy. It links to the
verified public app at `https://stillcraft.kyleaddison98.chatgpt.site` while
`stillcraft.kmproto.com` awaits Cloudflare DNS. The count derives from the collection.
A fetch found the newer Verseform work on remote main (`ca59638`); it was merged and
preserved, including its position before Shep Study and Milk Yeller. The only conflict
was the old fixed project count, resolved to the derived count. No reset or force-push.

Checks: Vercel production build, lint, TypeScript and diff checks pass. The card was
checked at 1440/390/320px for exact destinations, count, horizontal overflow, page
errors and automated WCAG A/AA checks. All three widths pass with six cards after merging
Verseform; zero overflow, page errors or automated accessibility violations. Final
screenshots were visually inspected. Live publication verification follows.

An existing ignored `outputs/verify-page.cjs` made repository lint fail on its CommonJS
imports. Added `outputs/**` to ESLint’s generated-output ignores; tracked app code is
still checked. Added generated `*.tsbuildinfo` to Git ignores. No runtime dependency
or deployment workflow changed. Local checks use the prepared Stillcraft Node/browser
toolchain; preview must use `--config vite.vercel.config.ts` to match the public build.
The default Vinext/Cloudflare preview requires a different build and is not this target.

Publication complete: `a415afaa52d842758e193e630ef7afe43653a5a2` was pushed to the
review branch and fast-forwarded to main. The existing Vercel Git integration’s
production deployment `6337854724` reports success. Live
`https://www.kmproto.com` verification found six cards, the exact Verseform destination,
the derived 06 count, and a Stillcraft card that opens the usable public editor with
no page errors. The source implementation is `02365ec` plus merge `c97afc5`, preserving
remote Verseform work through `ca59638`. The final follow-up only records this result.
The old GitHub Actions deploy workflow remains redundant and unconfigured; it is
not the active production path.

The `.openai/hosting.json` Sites project
`appgprj_6a8b5731a4c48191901cb5e31a749036` was inspected with Sites. It is an older
owner-private publication at `kmproto-hub.kyleaddison98.chatgpt.site`, with no custom
domains. Its audience and deployed version were not changed. This task does not
migrate the public hub between hosts.

App-side deployment IDs and exact DNS records live in
`../stillcraft/docs/HOSTING.md`; the owning app checkpoint is `../stillcraft/WORK.md`.
No app photo uploads or paid inference are involved.
