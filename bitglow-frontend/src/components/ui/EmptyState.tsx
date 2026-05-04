import React from "react";
import { Button } from "./Button";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export default function EmptyState({ icon, title, description, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.02] px-6 py-10 text-center backdrop-blur-xl ${className}`}>
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{description}</p>
      {action ? (
        <div className="mt-5">
          <Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
