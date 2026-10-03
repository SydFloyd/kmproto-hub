import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BubbleBobblePage from "../app/lab/games/bubble-bobble/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><BubbleBobblePage/></StrictMode>);
