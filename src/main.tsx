import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToolProvider } from "./contexts/tool-context";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToolProvider>
        <App />
      </ToolProvider>
    </BrowserRouter>
  </React.StrictMode>
);
