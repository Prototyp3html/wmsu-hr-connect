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
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
      status TEXT NOT NULL,
      position_level TEXT DEFAULT 'first_level'
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
      position_level TEXT NOT NULL DEFAULT 'first_level',
      communication_skills REAL,
      ability_to_present REAL,
      alertness REAL,
      judgement REAL,
      emotional_stability REAL,
      self_confidence REAL,
      first_level_total REAL,
      oral_communication REAL,
      analytical_ability REAL,
      initiative REAL,
      stress_tolerance REAL,
      sensitivity REAL,
      service_orientation REAL,
      second_level_total REAL,
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

  // Add position_level column if it doesn't exist (for existing databases)
  await query(`
    ALTER TABLE job_vacancies 
    ADD COLUMN IF NOT EXISTS position_level TEXT DEFAULT 'first_level';
  `).catch(() => {
    // Ignore errors if column already exists
  });

  // Add user activation flag for existing databases
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
  `).catch(() => {});

  // Add position_level column to evaluations if it doesn't exist
  await query(`
    ALTER TABLE evaluations 
    ADD COLUMN IF NOT EXISTS position_level TEXT DEFAULT 'first_level';
  `).catch(() => {});

  // Add all missing assessment score columns to evaluations
  await query(`
    ALTER TABLE evaluations 
    ADD COLUMN IF NOT EXISTS communication_skills REAL,
    ADD COLUMN IF NOT EXISTS ability_to_present REAL,
    ADD COLUMN IF NOT EXISTS alertness REAL,
    ADD COLUMN IF NOT EXISTS judgement REAL,
    ADD COLUMN IF NOT EXISTS emotional_stability REAL,
    ADD COLUMN IF NOT EXISTS self_confidence REAL,
    ADD COLUMN IF NOT EXISTS first_level_total REAL,
    ADD COLUMN IF NOT EXISTS oral_communication REAL,
    ADD COLUMN IF NOT EXISTS analytical_ability REAL,
    ADD COLUMN IF NOT EXISTS initiative REAL,
    ADD COLUMN IF NOT EXISTS stress_tolerance REAL,
    ADD COLUMN IF NOT EXISTS sensitivity REAL,
    ADD COLUMN IF NOT EXISTS service_orientation REAL,
    ADD COLUMN IF NOT EXISTS second_level_total REAL;
  `).catch(() => {});

  // Make exam_score nullable if it exists (for backward compatibility)
  await query(`
    ALTER TABLE evaluations 
    ALTER COLUMN exam_score DROP NOT NULL;
  `).catch(() => {});

  // Make interview_score and other old columns nullable
  await query(`
    ALTER TABLE evaluations 
    ALTER COLUMN interview_score DROP NOT NULL;
  `).catch(() => {});

  // Make written_exam_score nullable
  await query(`
    ALTER TABLE evaluations 
    ALTER COLUMN written_exam_score DROP NOT NULL;
  `).catch(() => {});

  // Drop old columns if they exist (we're replacing them with new assessment columns)
  await query(`
    ALTER TABLE evaluations 
    DROP COLUMN IF EXISTS exam_score,
    DROP COLUMN IF EXISTS interview_score,
    DROP COLUMN IF EXISTS written_exam_score;
  `).catch(() => {});
}
