import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function Container({ children, className = "", size = "md" }: Props) {
  const widths = {
    sm: "max-w-[var(--container-sm)]",
    md: "max-w-[var(--container-md)]",
    lg: "max-w-[var(--container-lg)]",
  };

  return <div className={clsx("mx-auto w-full px-4 sm:px-6", widths[size], className)}>{children}</div>;
}
