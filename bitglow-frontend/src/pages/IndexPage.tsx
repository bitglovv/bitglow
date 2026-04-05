import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LandingNav } from "../components/landing/sections/LandingNav";
import { HeroSection } from "../components/landing/sections/HeroSection";
import { LandingFooter } from "../components/landing/sections/LandingFooter";

export default function IndexPage() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && user) {
            navigate("/home");
        }
    }, [user, isLoading, navigate]);

    if (isLoading || user) return null;

    return (
        <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#050505] text-white selection:bg-brand/30">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-[16%] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-emerald-300/8 blur-[165px]" />
                <div className="absolute inset-0 bg-mesh opacity-[0.02]" />
            </div>

            <div className="relative z-10 flex min-h-[100svh] flex-col">
                <LandingNav />
                <HeroSection />
                <LandingFooter />
            </div>
        </div>
    );
}
