type ToastProps = {
  message: string;
  isOpen: boolean;
};

export function Toast({ message, isOpen }: ToastProps) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[500] flex justify-center px-4">
      <div className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-3 duration-200">
        {message}
      </div>
    </div>
  );
}
