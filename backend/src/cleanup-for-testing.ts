import { Pool } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function cleanup() {
  try {
    console.log("\n🧹 Cleaning up dummy data for client testing...\n");
    console.log("✓ KEEPING: Job Vacancies");
    console.log("✗ DELETING: Applicants, Applications, Evaluations, Status History\n");

    // Get counts before deletion
    const applicantCount = await pool.query("SELECT COUNT(*) as count FROM applicants");
    const applicationCount = await pool.query("SELECT COUNT(*) as count FROM applications");
    const evaluationCount = await pool.query("SELECT COUNT(*) as count FROM evaluations");
    const statusHistoryCount = await pool.query("SELECT COUNT(*) as count FROM status_history");
    const vacancyCount = await pool.query("SELECT COUNT(*) as count FROM job_vacancies");

    console.log("📊 Current database state:");
    console.log(`  • Job Vacancies: ${vacancyCount.rows[0].count}`);
    console.log(`  • Applicants: ${applicantCount.rows[0].count}`);
    console.log(`  • Applications: ${applicationCount.rows[0].count}`);
    console.log(`  • Evaluations: ${evaluationCount.rows[0].count}`);
    console.log(`  • Status History: ${statusHistoryCount.rows[0].count}`);

    if (process.argv[2] !== "--force") {
      console.log("\n⚠️  Run with --force flag to confirm deletion:");
      console.log("   npm run cleanup-for-testing -- --force");
      await pool.end();
      return;
    }

    console.log("\n🚀 Proceeding with cleanup...\n");

    // Delete in order of dependencies (reverse foreign key order)
    console.log("  Deleting evaluations...");
    const evalResult = await pool.query("DELETE FROM evaluations");
    console.log(`    Deleted ${evalResult.rowCount} evaluation records`);

    console.log("  Deleting status history...");
    const historyResult = await pool.query("DELETE FROM status_history");
    console.log(`    Deleted ${historyResult.rowCount} status history records`);

    console.log("  Deleting applications...");
    const appResult = await pool.query("DELETE FROM applications");
    console.log(`    Deleted ${appResult.rowCount} application records`);

    console.log("  Deleting applicant documents...");
    const docsResult = await pool.query("DELETE FROM applicant_documents");
    console.log(`    Deleted ${docsResult.rowCount} document records`);

    console.log("  Deleting applicants...");
    const applicantResult = await pool.query("DELETE FROM applicants");
    console.log(`    Deleted ${applicantResult.rowCount} applicant records`);

    // Verify job vacancies are still there
    const finalVacancyCount = await pool.query("SELECT COUNT(*) as count FROM job_vacancies");
    console.log("\n✅ Job Vacancies preserved:", finalVacancyCount.rows[0].count);

    console.log("\n✨ Cleanup complete! System is ready for client testing.\n");

    await pool.end();
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    await pool.end();
    process.exit(1);
  }
}

cleanup();
