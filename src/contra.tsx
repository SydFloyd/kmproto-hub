import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ContraPage from "../app/lab/games/contra/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><ContraPage /></StrictMode>);
