import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "data/people.db";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface Person {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

export interface PersonInput {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export function listPeople(search?: string): Person[] {
  if (search && search.trim() !== "") {
    const like = `%${search.trim()}%`;
    return db
      .prepare(
        `SELECT * FROM people
         WHERE name LIKE ? OR email LIKE ? OR role LIKE ?
         ORDER BY created_at DESC, id DESC`
      )
      .all(like, like, like) as Person[];
  }
  return db
    .prepare(`SELECT * FROM people ORDER BY created_at DESC, id DESC`)
    .all() as Person[];
}

export function getPerson(id: number): Person | undefined {
  return db.prepare(`SELECT * FROM people WHERE id = ?`).get(id) as
    | Person
    | undefined;
}

export function createPerson(input: PersonInput): Person {
  const result = db
    .prepare(
      `INSERT INTO people (name, email, phone, role) VALUES (?, ?, ?, ?)`
    )
    .run(input.name, input.email, input.phone ?? "", input.role ?? "");
  return getPerson(Number(result.lastInsertRowid))!;
}

export function updatePerson(
  id: number,
  input: PersonInput
): Person | undefined {
  const existing = getPerson(id);
  if (!existing) return undefined;
  db.prepare(
    `UPDATE people SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?`
  ).run(input.name, input.email, input.phone ?? "", input.role ?? "", id);
  return getPerson(id);
}

export function deletePerson(id: number): boolean {
  const result = db.prepare(`DELETE FROM people WHERE id = ?`).run(id);
  return result.changes > 0;
}
