/**
 * Lightweight end-to-end API smoke test.
 * Boots the app against a throwaway SQLite DB and exercises the full CRUD flow.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Person } from "./db.ts";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "people-test-")), "test.db");
process.env.SERVER_PORT = process.env.TEST_PORT ?? "3999";

const BASE = `http://localhost:${process.env.SERVER_PORT}`;

let passed = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`  ok - ${msg}`);
}

async function main(): Promise<void> {
  // Import after env vars are set so the server binds to the test port/DB.
  await import("./index.ts");
  await new Promise((r) => setTimeout(r, 800));

  const health = (await (await fetch(`${BASE}/api/health`)).json()) as {
    status: string;
  };
  assert(health.status === "ok", "health endpoint returns ok");

  let people = (await (await fetch(`${BASE}/api/people`)).json()) as Person[];
  assert(Array.isArray(people) && people.length === 0, "register starts empty");

  const created = (await (
    await fetch(`${BASE}/api/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
        role: "Engineer",
      }),
    })
  ).json()) as Person;
  assert(created.id > 0 && created.name === "Ada Lovelace", "creates a person");

  const badRes = await fetch(`${BASE}/api/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", email: "nope" }),
  });
  assert(badRes.status === 400, "rejects invalid input with 400");

  const updated = (await (
    await fetch(`${BASE}/api/people/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "555-0100",
        role: "Lead Engineer",
      }),
    })
  ).json()) as Person;
  assert(updated.role === "Lead Engineer", "updates a person");

  const search = (await (
    await fetch(`${BASE}/api/people?search=lovelace`)
  ).json()) as Person[];
  assert(search.length === 1, "search finds the person");

  const delRes = await fetch(`${BASE}/api/people/${created.id}`, {
    method: "DELETE",
  });
  assert(delRes.status === 204, "deletes a person");

  people = (await (await fetch(`${BASE}/api/people`)).json()) as Person[];
  assert(people.length === 0, "register is empty again");

  console.log(`\nAll ${passed} assertions passed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
