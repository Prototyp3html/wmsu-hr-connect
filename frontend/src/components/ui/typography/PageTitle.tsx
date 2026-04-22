import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageTitleProps = {
  children: ReactNode;
  className?: string;
};

export function PageTitle({ children, className }: PageTitleProps) {
  return <h1 className={cn("text-display font-bold text-foreground", className)}>{children}</h1>;
}
