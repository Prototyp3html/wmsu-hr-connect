import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};

export function SectionTitle({ children, className }: SectionTitleProps) {
  return <h2 className={cn("text-section font-semibold text-foreground", className)}>{children}</h2>;
}
