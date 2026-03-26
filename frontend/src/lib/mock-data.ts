export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface JobVacancy {
  id: string;
  positionTitle: string;
  departmentId: string;
  salaryGrade: number;
  qualifications: string;
  postingDate: string;
  closingDate: string;
  status: "Open" | "Closed" | "Filled";
}

export type ApplicationStatus =
  | "Application Received"
  | "Under Initial Screening"
  | "For Examination"
  | "For Interview"
  | "For Final Evaluation"
  | "Approved"
  | "Hired"
  | "Rejected";

export interface Applicant {
  id: string;
  fullName: string;
  contactNumber: string;
  email: string;
  address: string;
  educationalBackground: string;
  workExperience: string;
  applicationId?: string;
}

export interface Application {
  id: string;
  applicantId: string;
  vacancyId: string;
  status: ApplicationStatus;
  dateApplied: string;
  remarks?: string;
}

export interface StatusHistory {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  remarks: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Evaluation {
  id: string;
  applicationId: string;
  examScore: number;
  interviewScore: number;
  totalScore: number;
  remarks: string;
  evaluatedBy: string;
  evaluatedAt: string;
}

export const departments: Department[] = [];

export const users: User[] = [];

export const jobVacancies: JobVacancy[] = [];

export const applicants: Applicant[] = [];

export const applications: Application[] = [];

export const statusHistory: StatusHistory[] = [];

export const evaluations: Evaluation[] = [];

export const allStatuses: ApplicationStatus[] = [
  "Application Received",
  "Under Initial Screening",
  "For Examination",
  "For Interview",
  "For Final Evaluation",
  "Approved",
  "Hired",
  "Rejected",
];

export function getDepartmentName(id: string): string {
  return departments.find((d) => d.id === id)?.name ?? "Unknown";
}

export function getApplicantName(id: string): string {
  return applicants.find((a) => a.id === id)?.fullName ?? "Unknown";
}

export function getVacancyTitle(id: string): string {
  return jobVacancies.find((v) => v.id === id)?.positionTitle ?? "Unknown";
}

export function getStatusColor(status: ApplicationStatus): string {
  const colors: Record<ApplicationStatus, string> = {
    "Application Received": "bg-info/10 text-info",
    "Under Initial Screening": "bg-warning/10 text-warning",
    "For Examination": "bg-chart-5/10 text-chart-5",
    "For Interview": "bg-chart-6/10 text-chart-6",
    "For Final Evaluation": "bg-primary/10 text-primary",
    "Approved": "bg-success/10 text-success",
    "Hired": "bg-success text-success-foreground",
    "Rejected": "bg-destructive/10 text-destructive",
  };
  return colors[status];
}

export function getVacancyStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Open: "bg-success/10 text-success",
    Closed: "bg-muted text-muted-foreground",
    Filled: "bg-info/10 text-info",
  };
  return colors[status] ?? "bg-muted text-muted-foreground";
}
