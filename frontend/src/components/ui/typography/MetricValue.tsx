import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type MetricValueProps = {
  children: ReactNode;
  className?: string;
};

export function MetricValue({ children, className }: MetricValueProps) {
  return (
    <p className={cn("text-metric font-bold tracking-tight [font-variant-numeric:tabular-nums] text-foreground", className)}>
      {children}
    </p>
  );
}
