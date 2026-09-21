import { useCallback, useEffect, useMemo, useState } from "react";
import type { Person, PersonInput } from "./types";
import {
  createPerson,
  deletePerson,
  fetchPeople,
  updatePerson,
} from "./api";
import { PersonForm } from "./components/PersonForm";
import { PeopleTable } from "./components/PeopleTable";

export function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      setPeople(await fetchPeople(query));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(search), 200);
    return () => clearTimeout(id);
  }, [search, load]);

  const handleSubmit = async (input: PersonInput) => {
    try {
      if (editing) {
        await updatePerson(editing.id, input);
        setEditing(null);
      } else {
        await createPerson(input);
      }
      await load(search);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save person.");
    }
  };

  const handleDelete = async (person: Person) => {
    try {
      await deletePerson(person.id);
      if (editing?.id === person.id) setEditing(null);
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete person.");
    }
  };

  const count = useMemo(() => people.length, [people]);

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="logo" aria-hidden>◎</span>
          <div>
            <h1>People Register</h1>
            <p>Keep track of everyone in one tidy place.</p>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel form-panel">
          <h2>{editing ? "Edit person" : "Add a person"}</h2>
          <PersonForm
            key={editing?.id ?? "new"}
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
        </section>

        <section className="panel list-panel">
          <div className="list-header">
            <h2>
              Directory <span className="badge">{count}</span>
            </h2>
            <input
              className="search"
              type="search"
              placeholder="Search by name, email, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {error && <div className="alert">{error}</div>}

          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <PeopleTable
              people={people}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          )}
        </section>
      </main>
    </div>
  );
}
