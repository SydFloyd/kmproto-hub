import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Lab from "../app/lab/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Lab />
  </StrictMode>,
);
