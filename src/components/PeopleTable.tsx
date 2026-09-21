import type { Person } from "../types";

interface Props {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function PeopleTable({ people, onEdit, onDelete }: Props) {
  if (people.length === 0) {
    return <p className="muted empty">No people yet. Add your first one!</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
          <th>Role</th>
          <th aria-label="actions" />
        </tr>
      </thead>
      <tbody>
        {people.map((person) => (
          <tr key={person.id}>
            <td>
              <div className="person-cell">
                <span className="avatar">{initials(person.name) || "?"}</span>
                <span className="person-name">{person.name}</span>
              </div>
            </td>
            <td>
              <div className="contact">
                <a href={`mailto:${person.email}`}>{person.email}</a>
                {person.phone && <span className="muted">{person.phone}</span>}
              </div>
            </td>
            <td>
              {person.role ? (
                <span className="chip">{person.role}</span>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
            <td className="row-actions">
              <button className="btn small" onClick={() => onEdit(person)}>
                Edit
              </button>
              <button
                className="btn small danger"
                onClick={() => onDelete(person)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
