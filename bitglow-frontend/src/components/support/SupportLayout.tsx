import React from "react";
import { SupportHeader } from "./SupportHeader";
import { SupportFooter } from "./SupportFooter";

interface SupportLayoutProps {
    title: string;
    icon?: React.ReactNode;
    showPills?: boolean;
    showFooter?: boolean;
    children: React.ReactNode;
}

export const SupportLayout: React.FC<SupportLayoutProps> = ({
    title,
    icon,
    showPills = true,
    showFooter = true,
    children,
}) => {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
            {/* Glassmorphic Header */}
            <SupportHeader title={title} icon={icon} showPills={showPills} />

            {/* Main Content Area */}
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
                {children}
            </main>

            {/* Footer */}
            {showFooter && <SupportFooter />}
        </div>
    );
};
