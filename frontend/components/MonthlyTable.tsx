"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MonthlyPayment,
  fetchMonthlyPayments,
  upsertMonthlyPayment,
  deleteMonthlyPayment,
} from "@/lib/split-api";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const SERVICES = [
  { key: "Aysa",    label: "Agua", bg: "", header: "", text: "text-cyan-300"   },
  { key: "Edenor",  label: "Luz",  bg: "", header: "", text: "text-yellow-300" },
  { key: "Naturgy", label: "Gas",  bg: "", header: "", text: "text-blue-300"   },
];

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function entryKey(year: number, month: number, service: string): string {
  return `${year}-${month}-${service}`;
}

const TAB_YEARS = [2025, 2026];

export default function MonthlyTable({ onUpdate }: { onUpdate?: () => void }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entries, setEntries] = useState<Record<string, MonthlyPayment>>({});
  const [editing, setEditing] = useState<{ month: number; service: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (y: number) => {
    const data = await fetchMonthlyPayments(y);
    const map: Record<string, MonthlyPayment> = {};
    data.forEach((e) => { map[entryKey(e.year, e.month, e.service)] = e; });
    setEntries(map);
    return data.length;
  }, []);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    load(currentYear).then((count) => {
      if (count === 0 && currentYear > TAB_YEARS[0]) {
        setYear(TAB_YEARS[0]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(year); }, [year, load]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit(month: number, service: string) {
    const key = entryKey(year, month, service);
    const existing = entries[key];
    setEditValue(existing ? String(existing.amount) : "");
    setEditing({ month, service });
  }

  async function commitEdit() {
    if (!editing) return;
    const { month, service } = editing;
    const key = entryKey(year, month, service);
    const existing = entries[key];
    const raw = editValue.trim();

    setEditing(null);
    setEditValue("");

    if (raw === "") {
      if (existing) {
        await deleteMonthlyPayment(existing.id);
        setEntries((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        onUpdate?.();
      }
      return;
    }

    const amount = parseFloat(raw);
    if (isNaN(amount)) return;

    const updated = await upsertMonthlyPayment({ year, month, service, amount });
    setEntries((prev) => ({ ...prev, [key]: updated }));
    onUpdate?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") { setEditing(null); setEditValue(""); }
  }

  return (
    <div className="mt-6 bg-gray-900 rounded-2xl border border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-100 text-base">Facturación mensual</h2>
        <div className="flex gap-1">
          {TAB_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                year === y
                  ? "bg-gray-100 text-gray-900"
                  : "border border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left font-semibold text-gray-500 py-2 pr-4 w-28">Mes</th>
              {SERVICES.map((s) => (
                <th
                  key={s.key}
                  className={`font-semibold py-2 px-4 rounded-t-lg ${s.header} ${s.text} text-center`}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((monthName, idx) => {
              const month = idx + 1;
              return (
                <tr key={month} className="border-t border-gray-800">
                  <td className="py-2 pr-4 text-gray-400 font-medium">{monthName}</td>
                  {SERVICES.map((s) => {
                    const key = entryKey(year, month, s.key);
                    const entry = entries[key];
                    const isEditing = editing?.month === month && editing?.service === s.key;

                    return (
                      <td key={s.key} className={`py-1 px-2 text-center ${s.bg} first:rounded-l last:rounded-r`}>
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value.replace(/\./g, ""))}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full text-center text-sm outline-none bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-gray-100"
                            placeholder="0"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(month, s.key)}
                            className="w-full text-center py-0.5 rounded hover:bg-white/10 transition-colors"
                          >
                            {entry ? (
                              <span className="font-medium text-gray-100">{formatAmount(entry.amount)}</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
