import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SpotifyToTxtPage from "../app/lab/spotify-to-txt/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><SpotifyToTxtPage /></StrictMode>);
