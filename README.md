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

The homepage's ASCII ripple tank lives in `app/components/ripple-tank/`.
Its fixed-step damped wave field reflects from a hidden KM monogram, revealing
the letters only while waves pass. The water uses only `· , : ~ ≈`; pointer
movement leaves a wake, clicking or tapping drops a pebble, and arrow keys plus
Space/Enter provide keyboard interaction; P pauses or resumes the water.
Transparent rendering and softly fading edges blend the water into the hero,
with no frame or visible text. A small corner icon expands the tank using the
browser full-screen API with an immersive viewport fallback. Reduced-motion
users start with a still surface that responds to input; rendering stops offscreen.
The hero uses a deep ocean palette with curved cyan currents and warm gold
glints when ripples reach KM. Its strokes emerge in a soft champagne
reflection that gathers gently and fades back into the water. Punctuation
uses a finer grid for KM, with partial edge brightness to keep the strokes
even on mobile. The letter nodes sample the existing wave field and draw
only during a reveal. Cached glyphs and a shared ceiling of 4,400 water
points plus 1,200 letter points bound the rendering work. The display paints
at 30 fps while the solver retains its fixed timestep.
Run `npm run test:ripple-tank` for reflection, reveal, damping and stability.

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
