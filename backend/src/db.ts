import { Pool, QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
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

    CREATE TABLE IF NOT EXISTS applicant_documents (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}
