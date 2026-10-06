import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SmokerPage from "../app/lab/smoker/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><SmokerPage /></StrictMode>);
