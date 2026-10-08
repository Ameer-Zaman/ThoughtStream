import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <GoogleOAuthProvider
            clientId="787044377599-g9j8m7egnoa2a60l8op360v6dc9eh8b3.apps.googleusercontent.com">
            <App />
        </GoogleOAuthProvider> 
    </StrictMode>
);