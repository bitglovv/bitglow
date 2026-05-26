import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import Router from "./Router";
import { useSettingsStore } from "../store/settingsStore";

export default function App() {
    const { theme } = useSettingsStore();
    
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("theme-dark", "theme-white", "theme-amoled", "theme-light");
        root.classList.add(`theme-${theme}`);
    }, [theme]);

    return (
        <BrowserRouter>
            <AuthProvider>
                <Router />
            </AuthProvider>
        </BrowserRouter>
    );
}
