import { Pool, QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_vacancies (
      id TEXT PRIMARY KEY,
      position_title TEXT NOT NULL,
      department_id TEXT NOT NULL REFERENCES departments(id),
      salary_grade INTEGER NOT NULL,
      qualifications TEXT NOT NULL,
      posting_date TEXT NOT NULL,
      closing_date TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      educational_background TEXT NOT NULL,
      work_experience TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL REFERENCES applicants(id),
      vacancy_id TEXT NOT NULL REFERENCES job_vacancies(id),
      status TEXT NOT NULL,
      date_applied TEXT NOT NULL,
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id),
      status TEXT NOT NULL,
      remarks TEXT,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id),
      exam_score REAL NOT NULL,
      interview_score REAL NOT NULL,
      total_score REAL NOT NULL,
      remarks TEXT,
      evaluated_by TEXT NOT NULL,
      evaluated_at TEXT NOT NULL
    );
  `);
}
