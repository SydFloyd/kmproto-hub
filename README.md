# KM Proto

The business site for [kmproto.com](https://kmproto.com): websites, workflow
automation and custom software for small businesses and organizations.

- `/` — the business site (services, process, about, contact)
- `/lab` — the portal to KM Proto's independent apps
- `/lab/games` — the Games portal, linked from the Lab, with preview cards for every game
- `/lab/games/asteroids` — the browser arcade game
- `/lab/games/contra` — eight-zone run-and-gun recreation, with local two-player co-op
- `/lab/games/bubble-bobble` — 100-round arcade recreation, with bubble riding and local co-op
- `/lab/games/rc-pro-am` — NES isometric racing recreation, with weapons and vehicle upgrades
- `/lab/smoker` — wood, pellet and simultaneous hybrid combustion, damper control and meat heating simulation

Content lives in `app/data.ts` (email, services, process and Lab projects).
The homepage keeps a single “Websites starting at $1,200” line. Package pricing,
payment terms and the downloadable pricing guide are not published. Root pricing
documents are internal working files and are not copied into the public build.
Pages are `app/page.tsx` and `app/lab/page.tsx`;
styles are in `app/globals.css`.
The public Vercel build is a static multi-page Vite app: `index.html` → `src/main.tsx`
with matching entries for the Lab and games (served via `cleanUrls`).
`public/og.png` is the 1200×630 social card. Typography uses
system fonts; the site does not fetch external fonts.

The homepage always uses the ASCII ripple tank.
`app/components/HeroAnimation.tsx` lazy-loads the water engine with a placeholder
and error boundary.

The ASCII ripple tank lives in `app/components/ripple-tank/`. A damped wave
field reflects from the hidden KM and reveals it only during wave contact.
It starts flat, fills the entire hero ribbon, and attenuates beneath the copy.
Pointer movement leaves a wake; clicking or tapping drops a pebble. Full-screen
touch dragging leaves a wake while ordinary page swipes remain native. Arrow keys
move a cursor, Space/Enter drops a pebble, and P pauses or resumes. Scrolling,
text selection and links stay native. The corner icon offers native full screen
or a viewport fallback. Gentle currents continue without pointer input;
reduced motion slows their pace, and manual pause freezes them.

The solver runs in a request-driven worker with one reusable frame buffer and one
pending pointer segment. A tick has at most 12 solver steps and 16 wake samples.
WebGL draws the punctuation and fine, square KM lettering in one batch. Phone
budgets are 1,600 water nodes, 900 letter nodes, 1,100 solver cells and 650,000
backing pixels; desktop ceilings are 2,600 / 1,200 / 1,800 / 1,000,000. Quality
reduces under sustained pressure, including texture-upload and presentation
cost. An overloaded, unavailable or software-emulated GPU uses cached punctuation
stamps on a transferred OffscreenCanvas: both simulation and drawing stay in the
worker, with only a small completion message sent to the page. This path caps
water nodes at 450, letter nodes at 360, solver cells at 360 and pixels at 160,000.
Browsers without canvas transfer draw the same small surface on the page;
blocked or stalled workers also use the small field locally. Continued overload
switches the physical ripples to input-driven snapshots while ambient drawing
continues at 8 fps. Normal interaction targets 30 fps; quiet currents paint at
15 fps in software or 20 fps on the GPU without advancing the solver. The worker
reuses its last field for these ambient frames. The KM uses muted color and at
most 42% opacity. Hidden and offscreen
views stop scheduling work. Run `npm run test:ripple-tank` for field physics,
flat startup, node/pixel limits, bounded input, transfer reuse and quality control.

Browser games have their own Vite entry points, so their engines are loaded only
on game pages. `app/lab/games/catalog.ts` supplies the Games portal's cards;
add future games there and register their HTML entry in `vite.vercel.config.ts`.
The preview PNGs in `public/games/` are static scenes rendered from the games'
own canvas code. The portal loads those small images without loading any game
engines. Individual game pages link back to the portal.
Asteroids uses a fixed-step canvas engine, original stroke graphics and
procedural Web Audio in `app/lab/games/asteroids/`. Sound starts muted. Controls
are scoped to the playfield, with multi-touch buttons, pause, full screen and a
local high score. Leaving the game or hiding the tab pauses play.
Scoring, rock splitting, wave counts and saucers follow Atari's
[1979 operator manual](https://www.manualslib.com/manual/4171318/Atari-Asteroids.html?page=14).
This is a browser recreation, with no ROMs or original game assets.
Run `npm run test:asteroids` for the physics, collision and game-rule tests.

Contra uses an independent fixed-step engine in `app/lab/games/contra/`, with
side-scrolling zones, forward-facing base corridors and a vertical waterfall.
The controls, weapon badges, lives and continues follow the NES
[instruction manual](https://world-of-nintendo.com/manuals/nes/contra.shtml).
Level layouts, pixel art and synthesized music are original to this recreation;
it does not load ROMs or original assets. The shared cabinet styles live in
`app/lab/games/arcade.css`. Sound is optional and starts muted. Keyboard co-op
uses one keyboard; multi-touch controls operate Player 1. Run
`npm run test:contra` for movement, weapons, collisions, bosses, co-op, continues
and campaign progression. The traversal test plays all eight zones through
control inputs with protection from enemy damage to isolate navigation and aiming.

Bubble Bobble has an independent engine in `app/lab/games/bubble-bobble/`.
Its 100 platform layouts and spawn positions were transcribed from Will Mallia's
[arcade map collection](https://vgmaps.com/Atlas/Arcade/index.htm#BubbleBobble),
with manual corrections where sprites overlap. The original arcade
[instruction card](https://world-of-arcades.net/Taito/BubbleBobble/BubbleBobble_InstructionCard_2_x.jpg)
and Chris Moore's [arcade mechanics reference](https://www.arcadeheaven.com/images/Bubble%20Bobble%20FAQ%2023.pdf)
guide trapping, chain pops, bubble bouncing, candy, special bubbles, EXTEND and
secret doors. Includes eight monster families, Hurry Up, Skel-Monsta, the final
Super Drunk fight, co-op endings, title codes and a harder Super mode.
Physics, air currents, enemy AI, item timing, secret rooms, pixel art and
synthesized music are recreated approximations; this is not an emulator and
does not load ROMs, original sprites or sampled audio. It starts idle and muted,
supports keyboard and multi-touch controls, and saves high scores locally.
Run `npm run test:bubble-bobble` for movement, wrapping, trapping, chain scoring,
bubble riding, power-ups, co-op, time limits, continues and round progression.
The control-driven first-round test protects Bub from damage to isolate navigation;
the 100-round test uses controlled bubble fixtures to verify transitions and the
full-health final fight. A shared bitmap font is in `app/lab/games/pixel-text.ts`.

R.C. Pro-Am has an independent engine in `app/lab/games/rc-pro-am/`.
The relative steering, gas, horn, weapons, top-three advancement, pickups and
NINTENDO vehicle progression follow Nintendo's original
[instruction manual](https://www.world-of-nintendo.com/manuals/nes/rc_pro-am.shtml).
The 24 main course shapes in `courses.json` were traced from Rick Bruns's
[NES course maps](https://vgmaps.com/Atlas/NES/index.htm#RCProAm), with small
sprite/lettering holes filled and centerlines smoothed. Only geometry is shipped;
reference images, original sprites, ROMs and sampled audio are not included.
The repeating 24-course circuit and the orange drone's tenth-weapon-hit speedup
are informed by the TAS authors' [firsthand observations](https://tasvideos.org/UserFiles/Game/1840).
Driving physics, AI, hazard/pickup placement, scoring and lap counts are
approximations; split-road detours are represented by a single main route.
Pixel vehicles, scenery and chip effects are authored for this recreation.
It starts idle and muted, supports keyboard and simultaneous touch controls,
and saves the best score locally. Run `npm run test:rc-pro-am` for steering,
momentum, walls, progress validation, weapons, upgrades, continues and campaign
transitions. A control-driven test completes the first race; another drives all
24 courses with working opponents, without editing physics or progress during
a race. Campaign fixtures verify 49 transitions and the repeating circuit.

Bible Audio is listed in the Lab at https://bible-audio.kmproto.com. Its browser
player generates speech locally; Android, Windows, macOS and Linux downloads
are hosted in the public `bible-audio-v0.5.0-beta` release of this repository.
The app source repository remains private. A matching browser demo is also
served at `/bible-audio/`: the Vercel prebuild downloads the versioned public
bundle, verifies its SHA-256 in `tools/bible-audio-release.json`, and extracts it
to ignored `public/bible-audio/`. Voice models and installers are not committed
to this repository. Isolation and cache headers apply only to the demo path.

Smoker Control Lab is the last entry in the Lab. Its browser-local model lives in
`app/lab/smoker/model.ts`, with a separate Vite entry at `lab/smoker.html`.
The fixed one-second solver tracks drying, wood pyrolysis, charcoal oxidation,
oxygen-limited combustion, a finite pellet hopper, smoker thermal inertia and
losses, and an illustrative two-node meat temperature with evaporative cooling.
Wood is a finite batch; pellets share its chemistry but use smaller-particle
kinetics and metered feed. The automatic controller uses temperature feedback,
trend anticipation, integral limits, a minimum exhaust opening and optional
pellet feed control. Manual operation and fixed pellet feed demonstrate control
limits. A shadow cook with fixed dampers receives matching fuel additions and
weather/lid disturbances. Its temperature comparison samples every 15 seconds,
excluding the first 20 simulated minutes; fuel exhaustion remains part of the
comparison. Charts resize their coordinate system to keep phone labels readable.

The page cites USDA combustion research and distinguishes those physical
principles and fuel-energy values from assumed kinetics, geometry and tuning.
This is a nominal controller demonstration, not a device-calibrated prediction
or a doneness / food safety model. It starts with an established ember bed.
Refueling a cold bed does not relight it; reset starts a new lit cook. Simulation
starts paused, suspends in hidden tabs and stops at 12 simulated hours. No server,
external assets, telemetry or hardware connection is involved. Run
`npm run test:smoker` for mass/energy accounting, fuel phases, airflow, controller
response, disturbances and finite fuel behavior.

Hybrid is the default option: wood splits and pellets burn simultaneously in a
shared firebox. Each origin has its own moisture, dry fuel, charcoal, temperature
and exact fuel mass/chemical-energy ledger, while combustion allocates one
common oxygen budget. A nominal observer forecasts wood heat; a heat-balance
and PI supervisor meters the nonnegative pellet supplement and coordinates
intake/exhaust. It stops the auger for excess wood heat and reports inadequate
draft or unavailable control authority. Observer access to simulated wood heat
is idealized; it is not an implemented physical-device estimator. Independent
refills, moisture settings, small/large wood-charge scenarios, and source-power
charts demonstrate the handoff and its limits. Manual/fixed-feed displays show
the configured feed, and the controller-demand curve has gaps while inactive.

Full SI equations, nominal coefficients, predictor/feedback pseudocode, oxygen
allocation, ledgers, actuator limits, sensor requirements and a calibration
plan are in [HYBRID_MODEL.md](app/lab/smoker/HYBRID_MODEL.md), linked from the
page’s Hybrid math disclosure. The 23 model tests include the 14 original
regressions plus hybrid conservation, simultaneous burning, refuel response,
takeover, disturbances, depletion and infeasible large-wood loads.

## Local development

```bash
npm install
npm run dev
```

## Publishing

The public [KM Proto hub](https://www.kmproto.com) deploys through Vercel’s GitHub
integration when reviewed changes reach `main`. Use `npm run build:vercel`, `npm run
lint` and `npx tsc --noEmit` before publication. Preview that build with
`npx vite preview --config vite.vercel.config.ts`.

WORK.md records current deployment evidence and the older, unconfigured GitHub
Actions workflow. The owner-private Sites publication in `.openai/hosting.json` is
separate from the public Vercel destination; preserve its audience unless requested.
