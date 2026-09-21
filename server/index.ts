import express, { type Request, type Response } from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPerson,
  deletePerson,
  listPeople,
  updatePerson,
  type PersonInput,
} from "./db.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SERVER_PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json());

function validate(body: unknown): { ok: true; value: PersonInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object." };
  }
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (name === "") return { ok: false, error: "Name is required." };
  if (email === "" || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }
  return {
    ok: true,
    value: {
      name,
      email,
      phone: typeof b.phone === "string" ? b.phone.trim() : "",
      role: typeof b.role === "string" ? b.role.trim() : "",
    },
  };
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/people", (req: Request, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  res.json(listPeople(search));
});

app.post("/api/people", (req: Request, res: Response) => {
  const parsed = validate(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  res.status(201).json(createPerson(parsed.value));
});

app.put("/api/people/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const parsed = validate(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const updated = updatePerson(id, parsed.value);
  if (!updated) return res.status(404).json({ error: "Person not found." });
  res.json(updated);
});

app.delete("/api/people/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const removed = deletePerson(id);
  if (!removed) return res.status(404).json({ error: "Person not found." });
  res.status(204).end();
});

// Serve the built client in production.
const clientDir = resolve(__dirname, "../dist/client");
if (process.env.NODE_ENV === "production" && existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(resolve(clientDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`people-register API listening on http://localhost:${PORT}`);
});
