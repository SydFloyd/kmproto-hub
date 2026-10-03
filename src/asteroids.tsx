import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AsteroidsPage from "../app/lab/games/asteroids/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AsteroidsPage /></StrictMode>);
