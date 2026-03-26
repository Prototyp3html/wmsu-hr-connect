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

const APPLICANTS_TO_KEEP = [
  "Guilmar Quimba",
  "Rhodmin Lou Berioso",
  "Alshameer Payao"
];

async function cleanup() {
  try {
    // Get all applicants
    const result = await pool.query("SELECT id, full_name FROM applicants ORDER BY full_name");
    const allApplicants = result.rows;

    console.log(`Found ${allApplicants.length} total applicants`);
    console.log("\nApplicants in database:");
    allApplicants.forEach(a => console.log(`  - ${a.full_name} (${a.id})`));

    // Identify applicants to delete
    const applicantsToDelete = allApplicants.filter(
      applicant => !APPLICANTS_TO_KEEP.includes(applicant.full_name)
    );

    const applicantsToKeep = allApplicants.filter(
      applicant => APPLICANTS_TO_KEEP.includes(applicant.full_name)
    );

    console.log(`\n📌 Applicants to KEEP (${applicantsToKeep.length}):`);
    applicantsToKeep.forEach(a => console.log(`  ✓ ${a.full_name}`));

    console.log(`\n🗑️  Applicants to DELETE (${applicantsToDelete.length}):`);
    applicantsToDelete.forEach(a => console.log(`  ✗ ${a.full_name}`));

    if (applicantsToDelete.length === 0) {
      console.log("\nNo applicants to delete. Exiting...");
      await pool.end();
      return;
    }

    // Confirm deletion
    if (process.argv[2] !== "--force") {
      console.log("\n⚠️  Run with --force flag to confirm deletion:");
      console.log("   npm run cleanup-applicants -- --force");
      await pool.end();
      return;
    }

    // Delete applicants (in reverse order to handle dependent records)
    for (const applicant of applicantsToDelete) {
      console.log(`\nDeleting ${applicant.full_name}...`);

      // Delete evaluations
      await pool.query(
        "DELETE FROM evaluations WHERE application_id IN (SELECT id FROM applications WHERE applicant_id = $1)",
        [applicant.id]
      );

      // Delete status history
      await pool.query(
        "DELETE FROM status_history WHERE application_id IN (SELECT id FROM applications WHERE applicant_id = $1)",
        [applicant.id]
      );

      // Delete applications
      await pool.query("DELETE FROM applications WHERE applicant_id = $1", [applicant.id]);

      // Delete applicant documents
      await pool.query("DELETE FROM applicant_documents WHERE applicant_id = $1", [applicant.id]);

      // Delete applicant
      await pool.query("DELETE FROM applicants WHERE id = $1", [applicant.id]);

      console.log(`✓ Deleted ${applicant.full_name}`);
    }

    console.log(`\n✅ Successfully deleted ${applicantsToDelete.length} applicants!`);
    console.log(`Remaining applicants: ${applicantsToKeep.length}`);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {
      // Ignore pool end errors
    }
  }
}

cleanup();
