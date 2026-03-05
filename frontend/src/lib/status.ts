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
    "Application Received": "bg-blue-100 text-blue-700",
    "Under Initial Screening": "bg-amber-100 text-amber-700",
    "For Examination": "bg-purple-100 text-purple-700",
    "For Interview": "bg-cyan-100 text-cyan-700",
    "For Final Evaluation": "bg-pink-100 text-pink-700",
    "Approved": "bg-emerald-100 text-emerald-700",
    "Hired": "bg-green-500 text-white",
    "Rejected": "bg-red-100 text-red-700"
  };
  return colors[status];
}

export function getNextSuggestedStatus(currentStatus: ApplicationStatus): ApplicationStatus | null {
  const statusFlow: Record<ApplicationStatus, ApplicationStatus | null> = {
    "Application Received": "Under Initial Screening",
    "Under Initial Screening": "For Examination",
    "For Examination": "For Interview",
    "For Interview": "For Final Evaluation",
    "For Final Evaluation": "Approved",
    "Approved": "Hired",
    "Hired": null,
    "Rejected": null
  };
  return statusFlow[currentStatus] ?? null;
}

export function getVacancyStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Open: "bg-success/10 text-success",
    Closed: "bg-muted text-muted-foreground",
    Filled: "bg-info/10 text-info"
  };
  return colors[status] ?? "bg-muted text-muted-foreground";
}
