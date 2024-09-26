import { exec } from "child_process";
import { promisify } from "util";
import { checkbox, confirm, input } from "@inquirer/prompts";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const connectionString = process.env.DATABASE_URL;
const url = new URL(connectionString);
const host = url.hostname;
const port = url.port || 5432;
const username = url.username;
const password = url.password;
const dbname = url.pathname.slice(1); // Remove leading '/'

const sql = postgres(connectionString);

const execAsync = promisify(exec);

async function getActivePartitions(parentTable: string) {
  const result = await sql`
    SELECT c.relname AS partition_name
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = ${parentTable}
    ORDER BY pg_get_expr(c.relpartbound, c.oid)::text
  `;

  return result.map((r) => r.partition_name);
}

async function main() {
  try {
    // Ask for parent table name
    const parentTable = await input({
      message: "Enter the name of the parent table:",
    });

    console.log(`Getting active partitions for ${parentTable}...`);

    const partitions = await getActivePartitions(parentTable);

    if (partitions.length === 0) {
      console.log("No partitions found. Exiting.");
      process.exit(1);
    }

    // Select partitions to process
    const selectedPartitions = await checkbox({
      message: "Select partitions to process:",
      choices: partitions.map((p) => ({ name: p, value: p })),
    });

    if (selectedPartitions.length === 0) {
      console.log("No partitions selected. Exiting.");
      process.exit();
    }

    // Confirm before processing
    const shouldProceed = await confirm({
      message: "Are you sure you want to process these partitions?",
    });

    if (!shouldProceed) {
      console.log("Operation cancelled. Exiting.");
      process.exit();
    }

    // Process selected partitions
    for (const partition of selectedPartitions) {
      console.log(`Processing ${partition}`);

      // First detach the partition
      console.log(`Detaching ${partition}`);
      await sql`ALTER TABLE ${sql(parentTable)} DETACH PARTITION ${sql(
        partition
      )}`;
      console.log(`${partition} detached successfully.`);

      // Backup the partition
      console.log(`Backing up ${partition}`);

      const backupFile = `${partition}.dump`;

      // Update pg_dump command with connection details
      const pgDumpCommand = [
        "pg_dump",
        `-h ${host}`,
        `-p ${port}`,
        username && `-U ${username}`,
        dbname,
        "-O -Fc -Z zstd:9",
        `-t ${partition}`,
        `-f ${backupFile}`,
        `--no-password`,
      ]
        .filter(Boolean)
        .join(" ");

      await execAsync(
        password ? `PGPASSWORD=${password} ${pgDumpCommand}` : pgDumpCommand
      );

      console.log(`Backup created: ${backupFile}`);
    }

    // Ask for drop commands at the end
    const partitionsToDrop = await checkbox({
      message: "Select partitions to drop:",
      choices: selectedPartitions.map((p) => ({ name: p, value: p })),
    });

    if (partitionsToDrop.length > 0) {
      const confirmDrop = await confirm({
        message: `Are you sure you want to drop ${partitionsToDrop.length} partition(s)?`,
      });

      if (confirmDrop) {
        for (const partition of partitionsToDrop) {
          console.log(`Dropping ${partition}`);
          await sql`DROP TABLE ${sql(partition)}`;
          console.log(`${partition} dropped successfully.`);
        }
      } else {
        console.log("Skipped dropping partitions.");
      }
    } else {
      console.log("No partitions selected for dropping.");
    }

    console.log("All selected partitions have been processed.");
    process.exit();
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

main();
