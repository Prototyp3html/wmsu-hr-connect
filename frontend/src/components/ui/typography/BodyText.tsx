import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BodyTextProps = {
  children: ReactNode;
  className?: string;
};

export function BodyText({ children, className }: BodyTextProps) {
  return <p className={cn("text-body text-foreground/85", className)}>{children}</p>;
}
