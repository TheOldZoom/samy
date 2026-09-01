import { Client } from "pg";

const LOCK_KEY = 1234567890;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query<{ pg_advisory_unlock: boolean }>(
      "SELECT pg_advisory_unlock($1)",
      [LOCK_KEY],
    );

    if (result.rows[0]?.pg_advisory_unlock) {
      console.log("Shard lock released successfully.");
      return;
    }

    const locks = await client.query<{ pid: string }>(
      `SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted`,
      [LOCK_KEY],
    );

    if (locks.rows.length === 0) {
      console.log("No shard lock was held.");
      return;
    }

    for (const row of locks.rows) {
      await client.query("SELECT pg_terminate_backend($1)", [row.pid]);
      console.log(`Terminated backend ${row.pid} holding the shard lock.`);
    }
  } catch (err) {
    console.error("Failed to release shard lock:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
