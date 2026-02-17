import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { QueryResultRow } from "pg";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { initDb, query } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev_secret";
const TOKEN_EXPIRES_IN = (process.env.TOKEN_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];
const corsOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
const trustProxy = process.env.TRUST_PROXY === "true";

const app = express();
app.set("trust proxy", trustProxy);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

const uploadDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) =>
    cb(null, uploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use("/uploads", express.static(uploadDir));

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthedRequest extends Request {
  user?: AuthUser;
  file?: Express.Multer.File;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

const asyncHandler = (handler: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function createToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

async function logAudit(req: Request, action: string, userId?: string, details?: Record<string, unknown>) {
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] ?? null;
  // Fire-and-forget: don't await audit logging to avoid blocking auth requests
  query(
    "INSERT INTO audit_logs (id, user_id, action, ip, user_agent, details, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      randomUUID(),
      userId ?? null,
      action,
      ip,
      userAgent,
      details ? JSON.stringify(details) : null,
      new Date().toISOString()
    ]
  ).catch(() => {
    // Silently ignore audit log failures to avoid impacting auth performance
  });
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = auth.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

async function fetchOne<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  const result = await query<T>(sql, params);
  return result.rows[0] ?? null;
}

function mapJob(row: any) {
  return {
    id: row.id,
    positionTitle: row.position_title,
    departmentId: row.department_id,
    salaryGrade: row.salary_grade,
    qualifications: row.qualifications,
    postingDate: row.posting_date,
    closingDate: row.closing_date,
    status: row.status
  };
}

function mapApplicant(row: any) {
  return {
    id: row.id,
    fullName: row.full_name,
    contactNumber: row.contact_number,
    email: row.email,
    address: row.address,
    educationalBackground: row.educational_background,
    workExperience: row.work_experience
  };
}

function mapApplication(row: any) {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    vacancyId: row.vacancy_id,
    status: row.status,
    dateApplied: row.date_applied,
    remarks: row.remarks ?? undefined
  };
}

function mapHistory(row: any) {
  return {
    id: row.id,
    applicationId: row.application_id,
    status: row.status,
    remarks: row.remarks ?? "",
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  };
}

function mapEvaluation(row: any) {
  return {
    id: row.id,
    applicationId: row.application_id,
    examScore: row.exam_score,
    interviewScore: row.interview_score,
    totalScore: row.total_score,
    remarks: row.remarks ?? "",
    evaluatedBy: row.evaluated_by,
    evaluatedAt: row.evaluated_at
  };
}

function mapUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role
  };
}

function mapDocument(row: any) {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    docType: row.doc_type,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    uploadedAt: row.uploaded_at,
    url: `/uploads/${row.file_name}`
  };
}

function removeFileSafe(fileName: string) {
  const filePath = path.join(uploadDir, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "POST"
});

app.post("/api/auth/login", authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const row = await fetchOne<any>("SELECT * FROM users WHERE email = $1", [email]);
  if (!row) {
    logAudit(req, "login_failed", undefined, { email });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isValid = bcrypt.compareSync(password, row.password_hash);
  if (!isValid) {
    logAudit(req, "login_failed", row.id, { email });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = mapUser(row);
  const token = createToken(user);
  logAudit(req, "login_success", user.id);
  res.json({ token, user });
}));

app.post("/api/auth/logout", authLimiter, requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  logAudit(req, "logout", req.user?.id);
  res.status(204).send();
}));

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await fetchOne("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    role: role ?? "staff"
  };

  const passwordHash = bcrypt.hashSync(password, 10);
  await query(
    "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [user.id, user.name, user.email, user.role, passwordHash, new Date().toISOString()]
  );

  const token = createToken(user);
  res.status(201).json({ token, user });
}));

app.get("/api/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

app.get("/api/audit-logs", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const result = await query(
    `
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.ip,
        al.user_agent,
        al.details,
        al.created_at,
        u.name AS user_name,
        u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT $1
    `,
    [limit]
  );

  const logs = result.rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? undefined,
    userEmail: row.user_email ?? undefined,
    action: row.action,
    ip: row.ip ?? undefined,
    userAgent: row.user_agent ?? undefined,
    details: row.details ? JSON.parse(row.details) : undefined,
    createdAt: row.created_at
  }));

  res.json(logs);
}));

app.get("/api/users", asyncHandler(async (_req, res) => {
  const result = await query("SELECT id, name, email, role FROM users ORDER BY name");
  res.json(result.rows.map(mapUser));
}));

app.post("/api/users", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await fetchOne("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    role: role ?? "staff"
  };

  const passwordHash = bcrypt.hashSync(password, 10);
  await query(
    "INSERT INTO users (id, name, email, role, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [user.id, user.name, user.email, user.role, passwordHash, new Date().toISOString()]
  );

  res.status(201).json(user);
}));

app.put("/api/users/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { name, email, role, password } = req.body as {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
  };

  if (!name || !email || !role) {
    res.status(400).json({ error: "Name, email, and role are required" });
    return;
  }

  const duplicate = await fetchOne("SELECT id FROM users WHERE email = $1 AND id <> $2", [email, req.params.id]);
  if (duplicate) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
  const result = passwordHash
    ? await query(
        "UPDATE users SET name=$2, email=$3, role=$4, password_hash=$5 WHERE id=$1 RETURNING id, name, email, role",
        [req.params.id, name, email, role, passwordHash]
      )
    : await query(
        "UPDATE users SET name=$2, email=$3, role=$4 WHERE id=$1 RETURNING id, name, email, role",
        [req.params.id, name, email, role]
      );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(mapUser(result.rows[0]));
}));

app.delete("/api/users/:id", requireAuth, asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM users WHERE id = $1", [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.status(204).send();
}));

app.get("/api/departments", asyncHandler(async (_req, res) => {
  const rows = await query("SELECT * FROM departments ORDER BY name");
  res.json(rows.rows);
}));

app.get("/api/jobs", asyncHandler(async (_req, res) => {
  const rows = await query("SELECT * FROM job_vacancies ORDER BY posting_date DESC");
  res.json(rows.rows.map(mapJob));
}));

app.get("/api/jobs/:id", asyncHandler(async (req, res) => {
  const row = await fetchOne("SELECT * FROM job_vacancies WHERE id = $1", [req.params.id]);
  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(mapJob(row));
}));

app.post("/api/jobs", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { positionTitle, departmentId, salaryGrade, qualifications, postingDate, closingDate, status } = req.body as any;
  if (!positionTitle || !departmentId || !salaryGrade || !qualifications || !postingDate || !closingDate || !status) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const job = {
    id: randomUUID(),
    positionTitle,
    departmentId,
    salaryGrade,
    qualifications,
    postingDate,
    closingDate,
    status
  };

  await query(
    "INSERT INTO job_vacancies (id, position_title, department_id, salary_grade, qualifications, posting_date, closing_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [job.id, job.positionTitle, job.departmentId, job.salaryGrade, job.qualifications, job.postingDate, job.closingDate, job.status]
  );

  res.status(201).json(job);
}));

app.put("/api/jobs/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { positionTitle, departmentId, salaryGrade, qualifications, postingDate, closingDate, status } = req.body as any;
  const result = await query(
    "UPDATE job_vacancies SET position_title=$2, department_id=$3, salary_grade=$4, qualifications=$5, posting_date=$6, closing_date=$7, status=$8 WHERE id=$1 RETURNING *",
    [req.params.id, positionTitle, departmentId, salaryGrade, qualifications, postingDate, closingDate, status]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(mapJob(result.rows[0]));
}));

app.delete("/api/jobs/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const result = await query("DELETE FROM job_vacancies WHERE id = $1", [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.status(204).send();
}));

app.get("/api/applicants", asyncHandler(async (_req, res) => {
  const rows = await query("SELECT * FROM applicants ORDER BY full_name");
  res.json(rows.rows.map(mapApplicant));
}));

app.get("/api/applicants/:id", asyncHandler(async (req, res) => {
  const row = await fetchOne("SELECT * FROM applicants WHERE id = $1", [req.params.id]);
  if (!row) {
    res.status(404).json({ error: "Applicant not found" });
    return;
  }
  res.json(mapApplicant(row));
}));

app.post("/api/applicants", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { fullName, contactNumber, email, address, educationalBackground, workExperience } = req.body as any;
  if (!fullName || !contactNumber || !email || !address || !educationalBackground || !workExperience) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const applicant = {
    id: randomUUID(),
    fullName,
    contactNumber,
    email,
    address,
    educationalBackground,
    workExperience
  };

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

  res.status(201).json(applicant);
}));

app.put("/api/applicants/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { fullName, contactNumber, email, address, educationalBackground, workExperience } = req.body as any;
  const result = await query(
    "UPDATE applicants SET full_name=$2, contact_number=$3, email=$4, address=$5, educational_background=$6, work_experience=$7 WHERE id=$1 RETURNING *",
    [req.params.id, fullName, contactNumber, email, address, educationalBackground, workExperience]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Applicant not found" });
    return;
  }

  res.json(mapApplicant(result.rows[0]));
}));

app.delete("/api/applicants/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const docs = await query("SELECT file_name FROM applicant_documents WHERE applicant_id = $1", [req.params.id]);
  docs.rows.forEach((doc) => removeFileSafe(doc.file_name));

  const result = await query("DELETE FROM applicants WHERE id = $1", [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Applicant not found" });
    return;
  }
  res.status(204).send();
}));

app.get("/api/applicants/:id/documents", requireAuth, asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM applicant_documents WHERE applicant_id = $1 ORDER BY uploaded_at DESC", [req.params.id]);
  res.json(rows.rows.map(mapDocument));
}));

app.post("/api/applicants/:id/documents", requireAuth, upload.single("file"), asyncHandler(async (req: AuthedRequest, res) => {
  const docType = String(req.body.type ?? "");
  if (!req.file || !docType) {
    res.status(400).json({ error: "File and type are required" });
    return;
  }

  const doc = {
    id: randomUUID(),
    applicantId: req.params.id,
    docType,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date().toISOString()
  };

  await query(
    "INSERT INTO applicant_documents (id, applicant_id, doc_type, file_name, original_name, mime_type, size, uploaded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [doc.id, doc.applicantId, doc.docType, doc.fileName, doc.originalName, doc.mimeType, doc.size, doc.uploadedAt]
  );

  res.status(201).json({ ...doc, url: `/uploads/${doc.fileName}` });
}));

app.get("/api/applications", asyncHandler(async (_req, res) => {
  const rows = await query("SELECT * FROM applications ORDER BY date_applied DESC");
  res.json(rows.rows.map(mapApplication));
}));

app.get("/api/applications/:id", asyncHandler(async (req, res) => {
  const row = await fetchOne("SELECT * FROM applications WHERE id = $1", [req.params.id]);
  if (!row) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(mapApplication(row));
}));

app.post("/api/applications", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { applicantId, vacancyId, status, dateApplied, remarks } = req.body as any;
  if (!applicantId || !vacancyId || !status || !dateApplied) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const application = {
    id: randomUUID(),
    applicantId,
    vacancyId,
    status,
    dateApplied,
    remarks: remarks ?? null
  };

  await query(
    "INSERT INTO applications (id, applicant_id, vacancy_id, status, date_applied, remarks) VALUES ($1, $2, $3, $4, $5, $6)",
    [application.id, application.applicantId, application.vacancyId, application.status, application.dateApplied, application.remarks]
  );

  res.status(201).json(application);
}));

app.put("/api/applications/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { applicantId, vacancyId, status, dateApplied, remarks } = req.body as any;
  const result = await query(
    "UPDATE applications SET applicant_id=$2, vacancy_id=$3, status=$4, date_applied=$5, remarks=$6 WHERE id=$1 RETURNING *",
    [req.params.id, applicantId, vacancyId, status, dateApplied, remarks ?? null]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json(mapApplication(result.rows[0]));
}));

app.delete("/api/applications/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const result = await query("DELETE FROM applications WHERE id = $1", [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.status(204).send();
}));

app.patch("/api/applications/:id/status", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { status, remarks } = req.body as { status?: string; remarks?: string };
  if (!status) {
    res.status(400).json({ error: "Status is required" });
    return;
  }

  const result = await query(
    "UPDATE applications SET status=$2, remarks=$3 WHERE id=$1 RETURNING *",
    [req.params.id, status, remarks ?? null]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const history = {
    id: randomUUID(),
    applicationId: req.params.id,
    status,
    remarks: remarks ?? "",
    updatedBy: req.user?.name ?? "System",
    updatedAt: new Date().toISOString().slice(0, 10)
  };

  await query(
    "INSERT INTO status_history (id, application_id, status, remarks, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [history.id, history.applicationId, history.status, history.remarks, history.updatedBy, history.updatedAt]
  );

  res.json({ application: mapApplication(result.rows[0]), history });
}));

app.get("/api/status-history", asyncHandler(async (req, res) => {
  const applicationId = req.query.applicationId as string | undefined;
  if (!applicationId) {
    res.status(400).json({ error: "applicationId is required" });
    return;
  }
  const rows = await query("SELECT * FROM status_history WHERE application_id = $1 ORDER BY updated_at", [applicationId]);
  res.json(rows.rows.map(mapHistory));
}));

app.get("/api/evaluations", asyncHandler(async (_req, res) => {
  const rows = await query("SELECT * FROM evaluations");
  res.json(rows.rows.map(mapEvaluation));
}));

app.post("/api/evaluations", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { applicationId, examScore, interviewScore, remarks } = req.body as any;
  if (!applicationId || examScore === undefined || interviewScore === undefined) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const totalScore = Number(examScore) * 0.5 + Number(interviewScore) * 0.5;
  const evaluation = {
    id: randomUUID(),
    applicationId,
    examScore: Number(examScore),
    interviewScore: Number(interviewScore),
    totalScore,
    remarks: remarks ?? "",
    evaluatedBy: req.user?.name ?? "System",
    evaluatedAt: new Date().toISOString().slice(0, 10)
  };

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

  res.status(201).json(evaluation);
}));

app.put("/api/evaluations/:id", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { examScore, interviewScore, remarks } = req.body as any;
  if (examScore === undefined || interviewScore === undefined) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const totalScore = Number(examScore) * 0.5 + Number(interviewScore) * 0.5;
  const result = await query(
    "UPDATE evaluations SET exam_score=$2, interview_score=$3, total_score=$4, remarks=$5 WHERE id=$1 RETURNING *",
    [req.params.id, Number(examScore), Number(interviewScore), totalScore, remarks ?? ""]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }

  res.json(mapEvaluation(result.rows[0]));
}));

app.delete("/api/evaluations/:id", requireAuth, asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM evaluations WHERE id = $1", [req.params.id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Evaluation not found" });
    return;
  }
  res.status(204).send();
}));

app.get("/api/reports/summary", asyncHandler(async (_req, res) => {
  const totalJobs = await query<{ count: string }>("SELECT COUNT(*) as count FROM job_vacancies");
  const totalApplicants = await query<{ count: string }>("SELECT COUNT(*) as count FROM applicants");
  const totalApplications = await query<{ count: string }>("SELECT COUNT(*) as count FROM applications");

  const statusCounts = await query<{ status: string; count: string }>(
    "SELECT status, COUNT(*) as count FROM applications GROUP BY status"
  );
  const vacancyStatusCounts = await query<{ status: string; count: string }>(
    "SELECT status, COUNT(*) as count FROM job_vacancies GROUP BY status"
  );

  res.json({
    totalJobs: Number(totalJobs.rows[0]?.count ?? 0),
    totalApplicants: Number(totalApplicants.rows[0]?.count ?? 0),
    totalApplications: Number(totalApplications.rows[0]?.count ?? 0),
    applicationsByStatus: statusCounts.rows.map((row) => ({
      status: row.status,
      count: Number(row.count)
    })),
    vacanciesByStatus: vacancyStatusCounts.rows.map((row) => ({
      status: row.status,
      count: Number(row.count)
    }))
  });
}));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

async function start() {
  await initDb();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
