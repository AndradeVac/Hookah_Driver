import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { AppRouter } from "./app/router";
import { Providers } from "./app/providers";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
    <Toaster position="bottom-center" richColors expand theme="dark" />
  </StrictMode>,
);
