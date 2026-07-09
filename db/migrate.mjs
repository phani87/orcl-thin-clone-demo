import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function splitSql(script) {
  return script
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const oracleModule = await import("oracledb");
  const oracledb = oracleModule.default ?? oracleModule;
  const connection = await oracledb.getConnection({
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    connectString: requireEnv("DB_CONNECT_STRING")
  });

  try {
    const migrationsDir = path.join(__dirname, "migrations");
    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const script = await fs.readFile(path.join(migrationsDir, file), "utf8");
      const statements = splitSql(script);
      console.log(`Applying ${file} (${statements.length} statements)`);

      for (const statement of statements) {
        try {
          await connection.execute(statement);
        } catch (error) {
          if (error.errorNum === 955 || error.errorNum === 2261 || error.errorNum === 1408) {
            console.log(`Skipping existing object in ${file}: ORA-${error.errorNum}`);
            continue;
          }
          throw error;
        }
      }
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
