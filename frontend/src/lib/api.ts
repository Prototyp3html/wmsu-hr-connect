import type {
  Applicant,
  Application,
  ApplicationStatus,
  Department,
  Evaluation,
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

export async function login(email: string, password: string) {
  return apiFetch<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function fetchMe() {
  return apiFetch<{ user: User }>("/me");
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

export async function fetchApplicants() {
  return apiFetch<Applicant[]>("/applicants");
}

export async function createApplicant(payload: Omit<Applicant, "id" | "applicationId">) {
  return apiFetch<Applicant>("/applicants", {
    method: "POST",
    body: JSON.stringify(payload)
  });
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

export async function fetchReportsSummary() {
  return apiFetch<{
    totalJobs: number;
    totalApplicants: number;
    totalApplications: number;
    applicationsByStatus: Array<{ status: string; count: number }>;
    vacanciesByStatus: Array<{ status: string; count: number }>;
  }>("/reports/summary");
}
