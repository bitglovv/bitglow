import { Outlet } from "react-router-dom";

export default function AppLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-black text-white font-sans overflow-x-hidden">
            {/* Main Content Area */}
            <main className="flex-1 relative w-full">
                <Outlet />
            </main>
        </div>
    );
}
