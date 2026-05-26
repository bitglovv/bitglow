import { MessageSquare, Search } from "lucide-react";

export const EmptyChatState = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-black p-8 text-center animate-chat-fade">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-brand/20 blur-3xl animate-pulse-slow" />
        <div className="absolute inset-[-18px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_62%)]" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/[0.085] to-white/[0.04] shadow-[0_20px_64px_rgba(0,0,0,0.36)] transition-transform duration-500 hover:scale-[1.03]">
          <MessageSquare className="h-9 w-9 text-brand" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-black tracking-tight text-white">Your Inbox</h3>
      <p className="max-w-[300px] text-sm leading-6 text-zinc-500">
        Pick a thread or search for a friend to start a private conversation.
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-400 shadow-[0_12px_36px_rgba(0,0,0,0.18)] transition-all duration-300 hover:border-brand/25 hover:bg-white/[0.06] hover:text-zinc-200">
        <Search className="h-3.5 w-3.5 text-brand" />
        Find someone from the sidebar to start chatting
      </div>
    </div>
  );
};
