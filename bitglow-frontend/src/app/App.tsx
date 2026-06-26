import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import Router from "./Router";
import { useSettingsStore } from "../store/settingsStore";
import { SplashScreen } from "../components/ui/SplashLoader";

export default function App() {
    const { theme } = useSettingsStore();
    
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("theme-dark", "theme-white", "theme-amoled", "theme-light");
        root.classList.add(`theme-${theme}`);
    }, [theme]);

    return (
        <SplashScreen>
            <BrowserRouter>
                <AuthProvider>
                    <Router />
                </AuthProvider>
            </BrowserRouter>
        </SplashScreen>
    );
}

