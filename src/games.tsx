import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GamesPage from "../app/lab/games/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><GamesPage /></StrictMode>);
