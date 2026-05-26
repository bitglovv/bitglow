import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children, footer }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Rise above the keyboard when it opens (mobile visualViewport)
  useEffect(() => {
    if (!isOpen) return;

    const handleViewport = () => {
      const vv = window.visualViewport;
      if (!vv || !sheetRef.current) return;
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      sheetRef.current.style.transform = `translateY(-${Math.max(0, offset)}px)`;
    };

    window.visualViewport?.addEventListener('resize', handleViewport);
    window.visualViewport?.addEventListener('scroll', handleViewport);
    handleViewport();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
      if (sheetRef.current) sheetRef.current.style.transform = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4 touch-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative w-full sm:max-w-md bg-zinc-950 sm:rounded-2xl rounded-t-3xl border-t sm:border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 pointer-events-auto transition-transform will-change-transform"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-0">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-white/5 px-4 py-3 bg-zinc-950/95 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
