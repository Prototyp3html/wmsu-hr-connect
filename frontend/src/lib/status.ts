import type { ApplicationStatus } from "./types";

export const allStatuses: ApplicationStatus[] = [
  "Application Received",
  "Under Initial Screening",
  "For Examination",
  "For Interview",
  "For Final Evaluation",
  "Approved",
  "Hired",
  "Rejected"
];

export function getStatusColor(status: ApplicationStatus): string {
  const colors: Record<ApplicationStatus, string> = {
    "Application Received": "bg-info/10 text-info",
    "Under Initial Screening": "bg-warning/10 text-warning",
    "For Examination": "bg-chart-5/10 text-chart-5",
    "For Interview": "bg-chart-6/10 text-chart-6",
    "For Final Evaluation": "bg-primary/10 text-primary",
    "Approved": "bg-success/10 text-success",
    "Hired": "bg-success text-success-foreground",
    "Rejected": "bg-destructive/10 text-destructive"
  };
  return colors[status];
}

export function getVacancyStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Open: "bg-success/10 text-success",
    Closed: "bg-muted text-muted-foreground",
    Filled: "bg-info/10 text-info"
  };
  return colors[status] ?? "bg-muted text-muted-foreground";
}
