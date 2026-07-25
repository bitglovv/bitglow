export const EmptyChatState = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h3 className="mb-2 text-xl font-black tracking-tight text-white">Your Inbox</h3>
      <p className="max-w-[300px] text-sm leading-6 text-zinc-500">
        Pick a thread or search for a friend to start a private conversation.
      </p>
    </div>
  );
};