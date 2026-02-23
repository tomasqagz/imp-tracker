"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchService, fetchAllServices, ServiceData } from "@/lib/api";
import { fetchSplit, SplitResult } from "@/lib/split-api";
import ServiceCard from "@/components/ServiceCard";
import MonthlyTable from "@/components/MonthlyTable";

const SERVICE_NAMES = ["Aysa", "Edenor", "Naturgy"];
const CACHE_KEY = (name: string) => `imp-tracker-${name}`;

type CardState = {
  data: ServiceData | null;
  loading: boolean;
  updatedAt: string | null;
};

function loadFromCache(name: string): { data: ServiceData; updatedAt: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(name));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToCache(name: string, data: ServiceData, updatedAt: string) {
  try {
    localStorage.setItem(CACHE_KEY(name), JSON.stringify({ data, updatedAt }));
  } catch {}
}

function now(): string {
  return new Date().toISOString();
}

const initialState = (): Record<string, CardState> =>
  Object.fromEntries(
    SERVICE_NAMES.map((n) => [n, { data: null, loading: true, updatedAt: null }])
  );

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(Math.abs(value));
}

const PERSON_COLORS = [
  "border-l-violet-500",
  "border-l-orange-500",
  "border-l-emerald-500",
  "border-l-pink-500",
];

export default function Home() {
  const [cards, setCards] = useState<Record<string, CardState>>(initialState);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [split, setSplit] = useState<SplitResult | null>(null);

  const setCard = (name: string, patch: Partial<CardState>) =>
    setCards((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));

  const loadSplit = useCallback(async (cardsState: Record<string, CardState>) => {
    const total = SERVICE_NAMES.reduce((sum, n) => {
      const b = cardsState[n]?.data?.balance;
      return b != null && b > 0 ? sum + b : sum;
    }, 0);
    try {
      const result = await fetchSplit(total);
      setSplit(result);
    } catch {}
  }, []);

  const refreshSplit = useCallback(async () => {
    const total = SERVICE_NAMES.reduce((sum, n) => {
      const b = cards[n]?.data?.balance;
      return b != null && b > 0 ? sum + b : sum;
    }, 0);
    try {
      const result = await fetchSplit(total);
      setSplit(result);
    } catch {}
  }, [cards]);

  const refreshOne = useCallback(async (name: string) => {
    setCard(name, { loading: true });
    try {
      const data = await fetchService(name);
      const updatedAt = now();
      saveToCache(name, data, updatedAt);
      setCards((prev) => {
        const next = { ...prev, [name]: { data, loading: false, updatedAt } };
        loadSplit(next);
        return next;
      });
    } catch (e) {
      setCard(name, {
        data: { name, status: "error", error: String(e) },
        loading: false,
        updatedAt: null,
      });
    }
  }, [loadSplit]);

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true);
    SERVICE_NAMES.forEach((n) => setCard(n, { loading: true }));
    try {
      const results = await fetchAllServices();
      const updatedAt = now();
      setCards((prev) => {
        const next = { ...prev };
        results.forEach((d) => {
          saveToCache(d.name, d, updatedAt);
          next[d.name] = { data: d, loading: false, updatedAt };
        });
        loadSplit(next);
        return next;
      });
    } catch {
      await Promise.all(SERVICE_NAMES.map(refreshOne));
    } finally {
      setRefreshingAll(false);
    }
  }, [refreshOne]);

  // Carga inicial: usa caché si existe, sino fetcha
  useEffect(() => {
    const cached = SERVICE_NAMES.map((n) => ({ name: n, entry: loadFromCache(n) }));
    const allCached = cached.every((c) => c.entry !== null);

    if (allCached) {
      setCards((prev) => {
        const next = { ...prev };
        cached.forEach(({ name, entry }) => {
          next[name] = { data: entry!.data, loading: false, updatedAt: entry!.updatedAt };
        });
        loadSplit(next);
        return next;
      });
    } else {
      cached.forEach(({ name, entry }) => {
        if (entry) {
          setCard(name, { data: entry.data, loading: false, updatedAt: entry.updatedAt });
        } else {
          refreshOne(name);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Imp Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">Estado de servicios públicos</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/split"
            className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            División de gastos
          </Link>
          <button
            onClick={refreshAll}
            disabled={refreshingAll}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold
              hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshingAll ? "Actualizando..." : "Actualizar todo"}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {SERVICE_NAMES.map((name) => (
          <ServiceCard
            key={name}
            data={cards[name].data}
            loading={cards[name].loading}
            updatedAt={cards[name].updatedAt}
            onRefresh={() => refreshOne(name)}
          />
        ))}
      </div>

      {/* Split summary */}
      {split && split.people_count > 0 && (
        <div className="mt-8 bg-gray-900 rounded-2xl border border-gray-700 p-5">
          <div className="mb-3">
            <h2 className="font-bold text-gray-100">División de gastos</h2>
          </div>
          <div className="flex gap-6 text-sm mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="font-bold text-gray-100">{formatCurrency(split.total_balance)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cuota ({split.people_count} personas)</p>
              <p className="font-bold text-gray-100">{formatCurrency(split.share_per_person)}</p>
            </div>
          </div>
          {(split.services_balance > 0 || split.monthly_total > 0) && (
            <div className="flex gap-4 text-xs text-gray-500 mb-4">
              {split.services_balance > 0 && (
                <span>Servicios: <span className="font-medium text-gray-300">{formatCurrency(split.services_balance)}</span></span>
              )}
              {split.monthly_total > 0 && (
                <span>Facturas: <span className="font-medium text-gray-300">{formatCurrency(split.monthly_total)}</span></span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {split.summary.map(({ person, total_paid, balance }, i) => (
              <div key={person.id} className={`flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 border-l-4 ${PERSON_COLORS[i % PERSON_COLORS.length]}`}>
                <div>
                  <p className="text-sm font-medium text-gray-100">{person.name}</p>
                  <p className="text-xs text-gray-500">Saldo {formatCurrency(total_paid)}</p>
                </div>
                <span className={`text-sm font-bold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {balance >= 0 ? "+" : "-"}{formatCurrency(balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly table */}
      <MonthlyTable onUpdate={refreshSplit} />
    </main>
  );
}
