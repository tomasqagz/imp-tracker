"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Person, Payment, SplitResult,
  fetchPeople, fetchPayments, fetchSplit, deletePayment,
} from "@/lib/split-api";
import PeopleManager from "@/components/PeopleManager";
import PaymentForm from "@/components/PaymentForm";

const CACHE_KEYS = ["Naturgy", "Edenor", "Aysa"].map((n) => `imp-tracker-${n}`);

const PERSON_ACCENT = [
  { border: "border-l-violet-500", dot: "bg-violet-500" },
  { border: "border-l-orange-500",  dot: "bg-orange-500"  },
  { border: "border-l-emerald-500", dot: "bg-emerald-500" },
  { border: "border-l-pink-500",    dot: "bg-pink-500"    },
];

function getTotalBalanceFromCache(): number {
  let total = 0;
  for (const key of CACHE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const { data } = JSON.parse(raw);
      if (data?.status === "ok" && typeof data.balance === "number" && data.balance > 0) {
        total += data.balance;
      }
    } catch {}
  }
  return total;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
}

function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}


export default function SplitPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [split, setSplit] = useState<SplitResult | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);

  // Filters
  const [filterPersonId, setFilterPersonId] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const loadAll = useCallback(async () => {
    const [p, pay] = await Promise.all([fetchPeople(), fetchPayments()]);
    setPeople(p);
    setPayments(pay);

    const total = getTotalBalanceFromCache();
    setTotalBalance(total);
    try {
      const s = await fetchSplit(total);
      setSplit(s);
    } catch {}
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar este pago?")) return;
    await deletePayment(id);
    loadAll();
  }

  // Map person_id → accent index (based on order in people array)
  const personAccentIndex = Object.fromEntries(people.map((p, i) => [p.id, i]));

  const filteredPayments = payments
    .filter((pay) => !filterPersonId || pay.person_id === filterPersonId)
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-1 inline-block">
            ← Servicios
          </Link>
          <h1 className="text-2xl font-bold text-gray-100">Pagos</h1>
        </div>
      </div>

      {/* Top row: People + Payment form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <PeopleManager people={people} onChange={loadAll} />
        <PaymentForm people={people} onChange={loadAll} />
      </div>

      {/* Per-person balance summary */}
      {split && split.summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {split.summary.map(({ person, total_paid, balance }, i) => {
            const accent = PERSON_ACCENT[i % PERSON_ACCENT.length];
            return (
              <div key={person.id} className={`bg-gray-900 rounded-xl border border-gray-700 border-l-4 ${accent.border} px-4 py-3 flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-medium text-gray-100">{person.name}</p>
                  <p className="text-xs text-gray-500">Saldo {formatCurrency(total_paid)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {balance >= 0 ? "+" : "-"}{formatCurrency(balance)}
                  </p>
                  {balance >= 0 && (
                    <p className="text-xs text-gray-500">a favor</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment history */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5 flex flex-col gap-4">
        <h2 className="font-bold text-gray-100 text-base">Historial de pagos</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterPersonId}
            onChange={(e) => setFilterPersonId(e.target.value)}
            className="text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-500 bg-gray-800 text-gray-100"
          >
            <option value="">Todas las personas</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setSortAsc((v) => !v)}
            className="text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none hover:border-gray-500 bg-gray-800 text-gray-300 transition-colors"
          >
            Fecha {sortAsc ? "↑ más antiguo" : "↓ más reciente"}
          </button>
        </div>

        {/* List */}
        <ul className="flex flex-col gap-1">
          {filteredPayments.length === 0 && (
            <li className="text-sm text-gray-500">Sin pagos registrados</li>
          )}
          {filteredPayments.map((pay) => {
            const idx = personAccentIndex[pay.person_id] ?? 0;
            const accent = PERSON_ACCENT[idx % PERSON_ACCENT.length];
            return (
              <li key={pay.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-800 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${accent.dot}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-gray-100">{pay.person?.name ?? "—"}</span>
                    <span className="text-xs text-gray-500">
                      {isoToDmy(pay.date)}{pay.note && ` · ${pay.note}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-gray-200">{formatCurrency(pay.amount)}</span>
                  <button
                    onClick={() => handleDelete(pay.id)}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
