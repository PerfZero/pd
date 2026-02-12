/**
 * Reports legacy plaintext coverage for document fields.
 *
 * Usage:
 *   node src/scripts/reportLegacyDocPlaintext.js
 */

import { sequelize } from "../config/database.js";

const getEmployeesColumns = async () => {
  const [rows] = await sequelize.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
  `);
  return new Set(rows.map((row) => row.column_name));
};

const countEmployees = async (extraWhere = "TRUE") => {
  const [rows] = await sequelize.query(`
    SELECT COUNT(*)::int AS count
    FROM public.employees
    WHERE is_deleted = FALSE
      AND ${extraWhere}
  `);
  return rows[0]?.count ?? 0;
};

const run = async () => {
  await sequelize.authenticate();

  const columns = await getEmployeesColumns();
  const hasPassportPlain = columns.has("passport_number");
  const hasKigPlain = columns.has("kig");
  const hasPatentPlain = columns.has("patent_number");

  const stats = {
    total: await countEmployees(),
    passportPlaintext: hasPassportPlain
      ? await countEmployees("passport_number IS NOT NULL")
      : 0,
    passportReadyToClear: hasPassportPlain
      ? await countEmployees(`
          passport_number IS NOT NULL
          AND passport_number_enc IS NOT NULL
          AND passport_number_hash IS NOT NULL
          AND passport_number_key_version IS NOT NULL
        `)
      : 0,
    kigPlaintext: hasKigPlain ? await countEmployees("kig IS NOT NULL") : 0,
    kigReadyToClear: hasKigPlain
      ? await countEmployees(`
          kig IS NOT NULL
          AND kig_enc IS NOT NULL
          AND kig_hash IS NOT NULL
          AND kig_key_version IS NOT NULL
        `)
      : 0,
    patentPlaintext: hasPatentPlain
      ? await countEmployees("patent_number IS NOT NULL")
      : 0,
    patentReadyToClear: hasPatentPlain
      ? await countEmployees(`
          patent_number IS NOT NULL
          AND patent_number_enc IS NOT NULL
          AND patent_number_hash IS NOT NULL
          AND patent_number_key_version IS NOT NULL
        `)
      : 0,
  };

  console.log("Legacy plaintext report (employees, not deleted):");
  console.log(`  total: ${stats.total}`);
  console.log(
    `  passport plaintext: ${stats.passportPlaintext}, readyToClear: ${stats.passportReadyToClear}${hasPassportPlain ? "" : " (column dropped)"}`,
  );
  console.log(
    `  kig plaintext: ${stats.kigPlaintext}, readyToClear: ${stats.kigReadyToClear}${hasKigPlain ? "" : " (column dropped)"}`,
  );
  console.log(
    `  patent plaintext: ${stats.patentPlaintext}, readyToClear: ${stats.patentReadyToClear}${hasPatentPlain ? "" : " (column dropped)"}`,
  );

  await sequelize.close();
};

run().catch(async (error) => {
  console.error("Legacy plaintext report failed:", error.message);
  try {
    await sequelize.close();
  } catch (_closeError) {
    // noop
  }
  process.exit(1);
});
