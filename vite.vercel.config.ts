import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: page("./index.html"), lab: page("./lab.html"), games: page("./lab/games.html"), pricing: page("./pricing.html"), asteroids: page("./lab/games/asteroids.html"), contra: page("./lab/games/contra.html"), bubbleBobble: page("./lab/games/bubble-bobble.html"), rcProAm: page("./lab/games/rc-pro-am.html") },
    },
  },
});
