import bcrypt from "bcryptjs";
import { query } from "./db.js";

const departments = [
  { id: "d1", name: "College of Engineering" },
  { id: "d2", name: "College of Education" },
  { id: "d3", name: "College of Science and Mathematics" },
  { id: "d4", name: "College of Business Administration" },
  { id: "d5", name: "College of Nursing" },
  { id: "d6", name: "Human Resource Office" },
  { id: "d7", name: "College of Information Technology" },
  { id: "d8", name: "College of Law" }
];

const users = [
  { id: "u1", email: "admin@wmsu.edu.ph", name: "Maria Santos", role: "admin" },
  { id: "u2", email: "hrstaff@wmsu.edu.ph", name: "Juan Dela Cruz", role: "staff" }
];

const jobVacancies = [
  { id: "v1", positionTitle: "Instructor I", departmentId: "d1", salaryGrade: 12, qualifications: "Bachelor's degree in Engineering, LET passer preferred", postingDate: "2026-01-15", closingDate: "2026-02-28", status: "Open" },
  { id: "v2", positionTitle: "Professor III", departmentId: "d2", salaryGrade: 20, qualifications: "PhD in Education, 5+ years teaching experience", postingDate: "2026-01-10", closingDate: "2026-02-15", status: "Closed" },
  { id: "v3", positionTitle: "Administrative Aide IV", departmentId: "d6", salaryGrade: 4, qualifications: "College graduate, computer literate", postingDate: "2026-02-01", closingDate: "2026-03-15", status: "Open" },
  { id: "v4", positionTitle: "IT Officer II", departmentId: "d7", salaryGrade: 15, qualifications: "BS in IT/CS, 3 years relevant experience", postingDate: "2026-01-20", closingDate: "2026-02-20", status: "Filled" },
  { id: "v5", positionTitle: "Nurse II", departmentId: "d5", salaryGrade: 15, qualifications: "BSN, valid PRC license, 2 years hospital experience", postingDate: "2026-02-05", closingDate: "2026-03-05", status: "Open" }
];

const applicants = [
  { id: "a1", fullName: "Ana Marie Reyes", contactNumber: "09171234567", email: "ana.reyes@gmail.com", address: "Zamboanga City", educationalBackground: "BS Civil Engineering - WMSU", workExperience: "2 years at DPWH" },
  { id: "a2", fullName: "Roberto Garcia", contactNumber: "09189876543", email: "roberto.garcia@yahoo.com", address: "Zamboanga City", educationalBackground: "PhD Education - UP Diliman", workExperience: "8 years teaching at MSU" },
  { id: "a3", fullName: "Christine Lim", contactNumber: "09201112233", email: "christine.lim@gmail.com", address: "Zamboanga City", educationalBackground: "BS Computer Science - AdZU", workExperience: "4 years as Software Developer" },
  { id: "a4", fullName: "Mark Anthony Cruz", contactNumber: "09175556677", email: "mark.cruz@gmail.com", address: "Zamboanga City", educationalBackground: "AB Political Science - WMSU", workExperience: "1 year admin assistant" },
  { id: "a5", fullName: "Fatima Abdullah", contactNumber: "09162223344", email: "fatima.a@gmail.com", address: "Zamboanga City", educationalBackground: "BSN - WMSU", workExperience: "3 years at Zamboanga City Medical Center" },
  { id: "a6", fullName: "Jose Mendoza", contactNumber: "09183334455", email: "jose.mendoza@gmail.com", address: "Zamboanga City", educationalBackground: "BS Electrical Engineering - WMSU", workExperience: "1 year intern at ZAMCELCO" },
  { id: "a7", fullName: "Liza Mae Torres", contactNumber: "09194445566", email: "liza.torres@gmail.com", address: "Zamboanga City", educationalBackground: "BS Information Technology - WMSU", workExperience: "2 years IT Support" }
];

const applications = [
  { id: "app1", applicantId: "a1", vacancyId: "v1", status: "For Interview", dateApplied: "2026-01-20", remarks: "Strong technical background" },
  { id: "app2", applicantId: "a2", vacancyId: "v2", status: "Hired", dateApplied: "2026-01-12", remarks: "Exceptional qualifications" },
  { id: "app3", applicantId: "a3", vacancyId: "v4", status: "Hired", dateApplied: "2026-01-22", remarks: "Best fit for the role" },
  { id: "app4", applicantId: "a4", vacancyId: "v3", status: "Under Initial Screening", dateApplied: "2026-02-05" },
  { id: "app5", applicantId: "a5", vacancyId: "v5", status: "For Examination", dateApplied: "2026-02-08" },
  { id: "app6", applicantId: "a6", vacancyId: "v1", status: "Application Received", dateApplied: "2026-02-10" },
  { id: "app7", applicantId: "a7", vacancyId: "v4", status: "Rejected", dateApplied: "2026-01-25", remarks: "Did not meet minimum requirements" },
  { id: "app8", applicantId: "a1", vacancyId: "v3", status: "For Final Evaluation", dateApplied: "2026-02-03" }
];

const statusHistory = [
  { id: "sh1", applicationId: "app1", status: "Application Received", remarks: "Documents complete", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-20" },
  { id: "sh2", applicationId: "app1", status: "Under Initial Screening", remarks: "Qualifications verified", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-25" },
  { id: "sh3", applicationId: "app1", status: "For Examination", remarks: "Scheduled for Jan 30", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-28" },
  { id: "sh4", applicationId: "app1", status: "For Interview", remarks: "Passed examination", updatedBy: "Maria Santos", updatedAt: "2026-02-02" },
  { id: "sh5", applicationId: "app2", status: "Application Received", remarks: "", updatedBy: "Juan Dela Cruz", updatedAt: "2026-01-12" },
  { id: "sh6", applicationId: "app2", status: "Hired", remarks: "Board approved", updatedBy: "Maria Santos", updatedAt: "2026-02-10" }
];

const evaluations = [
  { id: "e1", applicationId: "app1", examScore: 88, interviewScore: 92, totalScore: 90, remarks: "Excellent candidate", evaluatedBy: "Maria Santos", evaluatedAt: "2026-02-02" },
  { id: "e2", applicationId: "app2", examScore: 95, interviewScore: 97, totalScore: 96, remarks: "Outstanding", evaluatedBy: "Maria Santos", evaluatedAt: "2026-02-08" },
  { id: "e3", applicationId: "app3", examScore: 90, interviewScore: 88, totalScore: 89, remarks: "Very good technical skills", evaluatedBy: "Maria Santos", evaluatedAt: "2026-02-05" },
  { id: "e4", applicationId: "app5", examScore: 85, interviewScore: 0, totalScore: 42.5, remarks: "Pending interview", evaluatedBy: "Juan Dela Cruz", evaluatedAt: "2026-02-12" }
];

export async function seedIfEmpty() {
  const userCount = await query<{ count: string }>("SELECT COUNT(*) as count FROM users");
  if (Number(userCount.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync("password123", 10);

  for (const user of users) {
    await query(
      "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [user.id, user.name, user.email, user.role, passwordHash, now]
    );
  }

  for (const dept of departments) {
    await query(
      "INSERT INTO departments (id, name) VALUES ($1, $2)",
      [dept.id, dept.name]
    );
  }

  for (const vacancy of jobVacancies) {
    await query(
      "INSERT INTO job_vacancies (id, position_title, department_id, salary_grade, qualifications, posting_date, closing_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        vacancy.id,
        vacancy.positionTitle,
        vacancy.departmentId,
        vacancy.salaryGrade,
        vacancy.qualifications,
        vacancy.postingDate,
        vacancy.closingDate,
        vacancy.status
      ]
    );
  }

  for (const applicant of applicants) {
    await query(
      "INSERT INTO applicants (id, full_name, contact_number, email, address, educational_background, work_experience) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        applicant.id,
        applicant.fullName,
        applicant.contactNumber,
        applicant.email,
        applicant.address,
        applicant.educationalBackground,
        applicant.workExperience
      ]
    );
  }

  for (const application of applications) {
    await query(
      "INSERT INTO applications (id, applicant_id, vacancy_id, status, date_applied, remarks) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        application.id,
        application.applicantId,
        application.vacancyId,
        application.status,
        application.dateApplied,
        application.remarks ?? null
      ]
    );
  }

  for (const history of statusHistory) {
    await query(
      "INSERT INTO status_history (id, application_id, status, remarks, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        history.id,
        history.applicationId,
        history.status,
        history.remarks,
        history.updatedBy,
        history.updatedAt
      ]
    );
  }

  for (const evaluation of evaluations) {
    await query(
      "INSERT INTO evaluations (id, application_id, exam_score, interview_score, total_score, remarks, evaluated_by, evaluated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        evaluation.id,
        evaluation.applicationId,
        evaluation.examScore,
        evaluation.interviewScore,
        evaluation.totalScore,
        evaluation.remarks,
        evaluation.evaluatedBy,
        evaluation.evaluatedAt
      ]
    );
  }
}
