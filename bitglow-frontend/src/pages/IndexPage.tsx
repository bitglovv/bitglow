import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Zap, Sparkles, Code, Globe, Layout, Database } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

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
        <div className="min-h-screen bg-[#050505] flex flex-col relative overflow-x-hidden text-white selection:bg-brand/30">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-brand/5 blur-[150px] opacity-50" />
                <div className="absolute inset-0 bg-mesh opacity-[0.02]" />
            </div>

            <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center backdrop-blur-md">
                        <Zap className="w-5 h-5 text-brand" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">BitGlow</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                    <a href="#" className="hover:text-white transition">Features</a>
                    <a href="#" className="hover:text-white transition">Pricing</a>
                    <a href="#" className="hover:text-white transition">Docs</a>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-sm font-semibold text-zinc-400 hover:text-white transition px-4">Login</Link>
                    <Link to="/signup">
                        <Button size="sm">Sign Up</Button>
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 flex-1 flex flex-col items-center pt-24 pb-32 px-4 max-w-7xl mx-auto">
                {/* Hero Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-widest mb-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    v1.0 is now live
                </div>

                <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 text-center max-w-4xl leading-tight">
                    Connect in<br />
                    <span className="text-zinc-500">Real-Time</span>
                </h1>

                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 text-center leading-relaxed">
                    Experience zero-latency communication APIs. Built for developers building communities that move fast.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-20">
                    <Link to="/signup">
                        <Button size="lg" className="w-full sm:w-auto h-14 px-10">
                            Join Now <Zap className="ml-2 w-4 h-4 fill-current" />
                        </Button>
                    </Link>
                    <Link to="/docs">
                        <Button variant="secondary" size="lg" className="w-full sm:w-auto h-14 px-10 bg-white/5 border-white/5">
                            Read Documentation
                        </Button>
                    </Link>
                </div>

                {/* Code Snippet */}
                <Card variant="dark" padding="none" className="w-full max-w-3xl overflow-hidden border-white/5 shadow-2xl mb-32">
                    <div className="bg-white/[0.02] border-b border-white/5 px-4 py-3 flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                        <span className="text-[10px] text-zinc-500 font-mono ml-2 uppercase">npm install bitglow-sdk</span>
                    </div>
                    <div className="p-8 font-mono text-sm leading-relaxed overflow-x-auto">
                        <div className="flex gap-4">
                            <span className="text-zinc-600 select-none">1</span>
                            <span><span className="text-purple-400">import</span> {"{ "} <span className="text-brand">BitGlow</span> {" }"} <span className="text-purple-400">from</span> <span className="text-emerald-400">'bitglow-sdk'</span>;</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-zinc-600 select-none">2</span>
                            <span />
                        </div>
                        <div className="flex gap-4">
                            <span className="text-zinc-600 select-none">3</span>
                            <span><span className="text-purple-400">const</span> client = <span className="text-purple-400">new</span> <span className="text-brand">BitGlow</span>({"{ "}</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-zinc-600 select-none">4</span>
                            <span>  apiKey: <span className="text-emerald-400">'bg_live_....'</span>,</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-zinc-600 select-none">5</span>
                            <span>  realtime: <span className="text-brand-light">true</span></span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-zinc-600 select-none">6</span>
                            <span>{"})"};</span>
                        </div>
                        <div className="flex gap-4 mt-2">
                            <span className="text-zinc-600 select-none">7</span>
                            <span className="text-zinc-500 italic">// Connected in 12ms</span>
                        </div>
                    </div>
                </Card>

                {/* Features Section */}
                <div className="w-full">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-center">Powered by Modern Tech</h2>
                    <p className="text-zinc-500 text-center mb-16 max-w-xl mx-auto font-medium">Built with the latest technologies to ensure speed, reliability, and developer happiness.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard
                            icon={<Layout className="w-6 h-6" />}
                            title="React Components"
                            description="Pre-built UI kits for faster development."
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6" />}
                            title="WebSockets"
                            description="Bi-directional real-time event streams."
                        />
                        <FeatureCard
                            icon={<Globe className="w-6 h-6" />}
                            title="Edge Network"
                            description="Deployed globally on scalable infrastructure."
                        />
                        <FeatureCard
                            icon={<Database className="w-6 h-6" />}
                            title="GraphQL API"
                            description="Flexible data querying for modern apps."
                        />
                    </div>
                </div>

                <div className="mt-40 text-center">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 leading-tight">
                        Ready to <span className="text-brand">glow?</span>
                    </h2>
                    <p className="text-zinc-400 mb-12 max-w-xl mx-auto text-lg font-medium">
                        Join thousands of developers building the next generation of social apps with BitGlow.
                    </p>
                    <Link to="/signup">
                        <Button size="lg" className="h-14 px-12">
                            Get Started for Free
                        </Button>
                    </Link>
                    <p className="mt-6 text-zinc-600 text-xs uppercase tracking-widest font-bold">No credit card required. Free tier forever.</p>
                </div>
            </main>

            <footer className="relative z-10 py-16 px-6 border-t border-white/5 mt-20 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-brand fill-current" />
                        <span className="text-lg font-bold tracking-tight text-zinc-300">BitGlow</span>
                    </div>
                    <div className="flex gap-10 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                        <a href="#" className="hover:text-brand transition-colors">Terms</a>
                        <a href="#" className="hover:text-brand transition-colors">Privacy</a>
                        <a href="#" className="hover:text-brand transition-colors">Twitter</a>
                        <a href="#" className="hover:text-brand transition-colors">GitHub</a>
                    </div>
                    <div className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
                        © 2024 BitGlow Inc.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card padding="md" className="hover:border-brand/30 transition-colors group cursor-default">
            <div className="w-12 h-12 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center mb-6 text-brand group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
        </Card>
    );
}

