import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type LabelTextProps = {
  children: ReactNode;
  className?: string;
};

export function LabelText({ children, className }: LabelTextProps) {
  return (
    <span className={cn("text-xs font-medium uppercase leading-[1.25] tracking-[0.035em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}
