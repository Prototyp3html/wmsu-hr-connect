import type {
  Applicant,
  ApplicantDocument,
  Application,
  ApplicationStatus,
  Department,
  Evaluation,
  AuditLog,
  JobVacancy,
  StatusHistory,
  User
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "wmsu_hr_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return apiFetch<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export async function fetchMe() {
  return apiFetch<{ user: User }>("/me");
}

export async function fetchAuditLogs(limit = 200) {
  return apiFetch<AuditLog[]>(`/audit-logs?limit=${limit}`);
}

export async function fetchUsers() {
  return apiFetch<User[]>("/users");
}

export async function createUser(payload: { name: string; email: string; password: string; role: string }) {
  return apiFetch<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateUser(id: string, payload: { name: string; email: string; role: string; password?: string }) {
  return apiFetch<User>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteUser(id: string) {
  return apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export async function fetchDepartments() {
  return apiFetch<Department[]>("/departments");
}

export async function fetchJobs() {
  return apiFetch<JobVacancy[]>("/jobs");
}

export async function createJob(payload: Omit<JobVacancy, "id">) {
  return apiFetch<JobVacancy>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateJob(id: string, payload: Omit<JobVacancy, "id">) {
  return apiFetch<JobVacancy>(`/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteJob(id: string) {
  return apiFetch<void>(`/jobs/${id}`, { method: "DELETE" });
}

export async function fetchApplicants() {
  return apiFetch<Applicant[]>("/applicants");
}

export async function createApplicant(payload: Omit<Applicant, "id" | "applicationId">) {
  return apiFetch<Applicant>("/applicants", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateApplicant(id: string, payload: Omit<Applicant, "id" | "applicationId">) {
  return apiFetch<Applicant>(`/applicants/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteApplicant(id: string) {
  return apiFetch<void>(`/applicants/${id}`, { method: "DELETE" });
}

export async function fetchApplicantDocuments(applicantId: string) {
  return apiFetch<ApplicantDocument[]>(`/applicants/${applicantId}/documents`);
}

export async function uploadApplicantDocument(applicantId: string, type: string, file: File) {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);
  return apiUpload<ApplicantDocument>(`/applicants/${applicantId}/documents`, formData);
}

export async function fetchApplications() {
  return apiFetch<Application[]>("/applications");
}

export async function updateApplicationStatus(payload: { id: string; status: ApplicationStatus; remarks?: string }) {
  return apiFetch<{ application: Application; history: StatusHistory }>(`/applications/${payload.id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: payload.status, remarks: payload.remarks })
  });
}

export async function fetchStatusHistory(applicationId: string) {
  return apiFetch<StatusHistory[]>(`/status-history?applicationId=${encodeURIComponent(applicationId)}`);
}

export async function fetchEvaluations() {
  return apiFetch<Evaluation[]>("/evaluations");
}

export async function createEvaluation(payload: { applicationId: string; examScore: number; interviewScore: number; remarks?: string }) {
  return apiFetch<Evaluation>("/evaluations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateEvaluation(id: string, payload: { examScore: number; interviewScore: number; remarks?: string }) {
  return apiFetch<Evaluation>(`/evaluations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteEvaluation(id: string) {
  return apiFetch<void>(`/evaluations/${id}`, { method: "DELETE" });
}

export async function fetchReportsSummary() {
  return apiFetch<{
    totalJobs: number;
    totalApplicants: number;
    totalApplications: number;
    applicationsByStatus: Array<{ status: string; count: number }>;
    vacanciesByStatus: Array<{ status: string; count: number }>;
  }>("/reports/summary");
}
