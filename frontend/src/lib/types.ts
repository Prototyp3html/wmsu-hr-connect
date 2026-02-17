export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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

export interface ApplicantDocument {
  id: string;
  applicantId: string;
  docType: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
