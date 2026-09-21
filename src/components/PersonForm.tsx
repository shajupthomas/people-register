import { useState } from "react";
import type { Person, PersonInput } from "../types";

interface Props {
  initial?: Person | null;
  onSubmit: (input: PersonInput) => void | Promise<void>;
  onCancel?: () => void;
}

const EMPTY: PersonInput = { name: "", email: "", phone: "", role: "" };

export function PersonForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<PersonInput>(
    initial
      ? {
          name: initial.name,
          email: initial.email,
          phone: initial.phone,
          role: initial.role,
        }
      : EMPTY
  );

  const update = (field: keyof PersonInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    if (!initial) setForm(EMPTY);
  };

  return (
    <form className="form" onSubmit={submit}>
      <label>
        <span>Name</span>
        <input
          required
          value={form.name}
          onChange={update("name")}
          placeholder="Ada Lovelace"
        />
      </label>
      <label>
        <span>Email</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="ada@example.com"
        />
      </label>
      <label>
        <span>Phone</span>
        <input
          value={form.phone}
          onChange={update("phone")}
          placeholder="555-0100"
        />
      </label>
      <label>
        <span>Role</span>
        <input
          value={form.role}
          onChange={update("role")}
          placeholder="Engineer"
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn primary">
          {initial ? "Save changes" : "Add person"}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
