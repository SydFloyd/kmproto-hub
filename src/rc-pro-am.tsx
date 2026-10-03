import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RCProAmPage from "../app/lab/games/rc-pro-am/page";
import "../app/globals.css";
createRoot(document.getElementById("root")!).render(<StrictMode><RCProAmPage /></StrictMode>);
