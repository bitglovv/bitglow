import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Section({ children, className = "" }: Props) {
  return <section className={clsx("w-full", className)}>{children}</section>;
}
