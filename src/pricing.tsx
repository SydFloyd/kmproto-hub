import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Pricing from "../app/pricing/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Pricing />
  </StrictMode>,
);
