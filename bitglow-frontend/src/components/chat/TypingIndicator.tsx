export const TypingIndicator = () => {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl border border-white/[0.055] bg-white/[0.055] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] animate-typing-in">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
};
