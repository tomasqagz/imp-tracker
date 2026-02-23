"use client";

import { useState } from "react";
import { Person, addPayment } from "@/lib/split-api";

interface Props {
  people: Person[];
  onChange: () => void;
}

function todayDMY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function dmyToIso(dmy: string): string {
  const [d, m, y] = dmy.split("/");
  return `${y}-${m}-${d}`;
}

export default function PaymentForm({ people, onChange }: Props) {
  const [personId, setPersonId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDMY);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!personId || !amount || !date) return;
    setLoading(true);
    try {
      await addPayment({
        person_id: personId,
        amount: parseFloat(amount),
        date: dmyToIso(date),
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      onChange();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5 flex flex-col gap-4">
      <h2 className="font-bold text-gray-100 text-base">Registrar pago</h2>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="flex-1 text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-500 bg-gray-800 text-gray-100"
          >
            <option value="">Persona...</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="DD/MM/YYYY"
            className="w-28 text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-500 bg-gray-800 text-gray-100"
          />
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          onChange={(e) => setAmount(e.target.value.replace(/\./g, ""))}
          placeholder="Monto ($)"
          className="text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-500 bg-gray-800 text-gray-100"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="flex-1 text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-500 bg-gray-800 text-gray-100"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !personId || !amount || !date}
            className="px-3 py-2 bg-gray-100 text-gray-900 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors whitespace-nowrap font-semibold"
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
