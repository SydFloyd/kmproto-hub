// The portal uses static previews; each game loads its engine on its own page.
export const games = [
  {
    id: "asteroids", name: "Asteroids", href: "/lab/games/asteroids", year: 1979,
    category: "Space shooter", players: "1 player",
    description: "Thrust, drift and blast your way through splitting rocks and flying saucers.",
    preview: "/games/asteroids.png", width: 768, height: 576,
  },
  {
    id: "contra", name: "Contra", href: "/lab/games/contra", year: 1987,
    category: "Run and gun", players: "1–2 players",
    description: "Eight zones of running, jumping, weapon upgrades and boss fights. Bring a friend.",
    preview: "/games/contra.png", width: 640, height: 480,
  },
  {
    id: "bubble-bobble", name: "Bubble Bobble", href: "/lab/games/bubble-bobble", year: 1986,
    category: "Platformer", players: "1–2 players",
    description: "Trap monsters, ride bubbles and chain your pops through a hundred arcade rounds.",
    preview: "/games/bubble-bobble.png", width: 512, height: 448,
  },
] as const;
