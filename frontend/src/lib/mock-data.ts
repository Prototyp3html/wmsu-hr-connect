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

export const departments: Department[] = [
  { id: "d1", name: "College of Engineering" },
  { id: "d2", name: "College of Education" },
  { id: "d3", name: "College of Science and Mathematics" },
  { id: "d4", name: "College of Business Administration" },
  { id: "d5", name: "College of Nursing" },
  { id: "d6", name: "Human Resource Office" },
  { id: "d7", name: "College of Information Technology" },
  { id: "d8", name: "College of Law" },
];

export const users: User[] = [
  { id: "u1", email: "admin@wmsu.edu.ph", name: "Maria Santos", role: "admin" },
  { id: "u2", email: "hrstaff@wmsu.edu.ph", name: "Juan Dela Cruz", role: "staff" },
];

export const jobVacancies: JobVacancy[] = [
  { id: "v1", positionTitle: "Instructor I", departmentId: "d1", salaryGrade: 12, qualifications: "Bachelor's degree in Engineering, LET passer preferred", postingDate: "2026-01-15", closingDate: "2026-02-28", status: "Open" },
  { id: "v2", positionTitle: "Professor III", departmentId: "d2", salaryGrade: 20, qualifications: "PhD in Education, 5+ years teaching experience", postingDate: "2026-01-10", closingDate: "2026-02-15", status: "Closed" },
  { id: "v3", positionTitle: "Administrative Aide IV", departmentId: "d6", salaryGrade: 4, qualifications: "College graduate, computer literate", postingDate: "2026-02-01", closingDate: "2026-03-15", status: "Open" },
  { id: "v4", positionTitle: "IT Officer II", departmentId: "d7", salaryGrade: 15, qualifications: "BS in IT/CS, 3 years relevant experience", postingDate: "2026-01-20", closingDate: "2026-02-20", status: "Filled" },
  { id: "v5", positionTitle: "Nurse II", departmentId: "d5", salaryGrade: 15, qualifications: "BSN, valid PRC license, 2 years hospital experience", postingDate: "2026-02-05", closingDate: "2026-03-05", status: "Open" },
];

export const applicants: Applicant[] = [
  { id: "a1", fullName: "Ana Marie Reyes", contactNumber: "09171234567", email: "ana.reyes@gmail.com", address: "Zamboanga City", educationalBackground: "BS Civil Engineering - WMSU", workExperience: "2 years at DPWH" },
  { id: "a2", fullName: "Roberto Garcia", contactNumber: "09189876543", email: "roberto.garcia@yahoo.com", address: "Zamboanga City", educationalBackground: "PhD Education - UP Diliman", workExperience: "8 years teaching at MSU" },
  { id: "a3", fullName: "Christine Lim", contactNumber: "09201112233", email: "christine.lim@gmail.com", address: "Zamboanga City", educationalBackground: "BS Computer Science - AdZU", workExperience: "4 years as Software Developer" },
  { id: "a4", fullName: "Mark Anthony Cruz", contactNumber: "09175556677", email: "mark.cruz@gmail.com", address: "Zamboanga City", educationalBackground: "AB Political Science - WMSU", workExperience: "1 year admin assistant" },
  { id: "a5", fullName: "Fatima Abdullah", contactNumber: "09162223344", email: "fatima.a@gmail.com", address: "Zamboanga City", educationalBackground: "BSN - WMSU", workExperience: "3 years at Zamboanga City Medical Center" },
  { id: "a6", fullName: "Jose Mendoza", contactNumber: "09183334455", email: "jose.mendoza@gmail.com", address: "Zamboanga City", educationalBackground: "BS Electrical Engineering - WMSU", workExperience: "1 year intern at ZAMCELCO" },
  { id: "a7", fullName: "Liza Mae Torres", contactNumber: "09194445566", email: "liza.torres@gmail.com", address: "Zamboanga City", educationalBackground: "BS Information Technology - WMSU", workExperience: "2 years IT Support" },
];

export const applications: Application[] = [
  { id: "app1", applicantId: "a1", vacancyId: "v1", status: "For Interview", dateApplied: "2026-01-20", remarks: "Strong technical background" },
  { id: "app2", applicantId: "a2", vacancyId: "v2", status: "Hired", dateApplied: "2026-01-12", remarks: "Exceptional qualifications" },
  { id: "app3", applicantId: "a3", vacancyId: "v4", status: "Hired", dateApplied: "2026-01-22", remarks: "Best fit for the role" },
  { id: "app4", applicantId: "a4", vacancyId: "v3", status: "Under Initial Screening", dateApplied: "2026-02-05" },
  { id: "app5", applicantId: "a5", vacancyId: "v5", status: "For Examination", dateApplied: "2026-02-08" },
  { id: "app6", applicantId: "a6", vacancyId: "v1", status: "Application Received", dateApplied: "2026-02-10" },
  { id: "app7", applicantId: "a7", vacancyId: "v4", status: "Rejected", dateApplied: "2026-01-25", remarks: "Did not meet minimum requirements" },
  { id: "app8", applicantId: "a1", vacancyId: "v3", status: "For Final Evaluation", dateApplied: "2026-02-03" },
];

export const statusHistory: StatusHistory[] = [
  { id: "sh1", applicationId: "app1", status: "Application Received", remarks: "Documents complete", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-20" },
  { id: "sh2", applicationId: "app1", status: "Under Initial Screening", remarks: "Qualifications verified", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-25" },
  { id: "sh3", applicationId: "app1", status: "For Examination", remarks: "Scheduled for Jan 30", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-28" },
  { id: "sh4", applicationId: "app1", status: "For Interview", remarks: "Passed examination", updatedBy: "Maria Santos", updatedAt: "2026-02-02" },
  { id: "sh5", applicationId: "app2", status: "Application Received", remarks: "", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-12" },
  { id: "sh6", applicationId: "app2", status: "Hired", remarks: "Board approved", updatedBy: "Maria Santos", updatedAt: "2026-02-10" },
];

export const evaluations: Evaluation[] = [
  { id: "e1", applicationId: "app1", examScore: 88, interviewScore: 92, totalScore: 90, remarks: "Excellent candidate", evaluatedBy: "Maria Santos", evaluatedAt: "2026-02-02" },
  { id: "e2", applicationId: "app2", examScore: 95, interviewScore: 97, totalScore: 96, remarks: "Outstanding", evaluatedBy: "Maria Santos", evaluatedAt: "2026-02-08" },
  { id: "e3", applicationId: "app3", examScore: 90, interviewScore: 88, totalScore: 89, remarks: "Very good technical skills", evaluatedBy: "Maria Santos", evaluatedAt: "2026-02-05" },
  { id: "e4", applicationId: "app5", examScore: 85, interviewScore: 0, totalScore: 42.5, remarks: "Pending interview", evaluatedBy: "Juan Dela Cruz", evaluatedAt: "2026-02-12" },
];

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
