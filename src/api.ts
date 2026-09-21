import type { Person, PersonInput } from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchPeople(search: string): Promise<Person[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return handle<Person[]>(await fetch(`/api/people${query}`));
}

export async function createPerson(input: PersonInput): Promise<Person> {
  return handle<Person>(
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updatePerson(
  id: number,
  input: PersonInput
): Promise<Person> {
  return handle<Person>(
    await fetch(`/api/people/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deletePerson(id: number): Promise<void> {
  return handle<void>(
    await fetch(`/api/people/${id}`, { method: "DELETE" })
  );
}
