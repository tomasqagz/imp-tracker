"use client";

import { useState } from "react";
import { Person, addPerson, deletePerson } from "@/lib/split-api";

interface Props {
  people: Person[];
  onChange: () => void;
}

export default function PeopleManager({ people, onChange }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await addPerson(trimmed);
      setName("");
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    await deletePerson(id);
    onChange();
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5 flex flex-col gap-4">
      <h2 className="font-bold text-gray-100 text-base">Personas</h2>

      <ul className="flex flex-col gap-2">
        {people.length === 0 && (
          <li className="text-sm text-gray-500">Sin personas registradas</li>
        )}
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span className="text-sm text-gray-200">{p.name}</span>
            <button
              onClick={() => handleDelete(p.id, p.name)}
              className="text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 mt-auto">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nombre..."
          className="flex-1 text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-500 bg-gray-800 text-gray-100"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !name.trim()}
          className="px-3 py-2 bg-gray-100 text-gray-900 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors font-semibold"
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}
