import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { enforceHTTPS } from "./utils/securityHeaders";

// Enforce HTTPS in production before rendering any content
enforceHTTPS();

createRoot(document.getElementById("root")!).render(<App />);
