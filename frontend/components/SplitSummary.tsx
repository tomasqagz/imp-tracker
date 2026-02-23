"use client";

import { SplitResult } from "@/lib/split-api";

interface Props {
  result: SplitResult | null;
  loading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
}

export default function SplitSummary({ result, loading }: Props) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5 flex flex-col gap-4">
      <h2 className="font-bold text-gray-100 text-base">Resumen</h2>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
        </div>
      ) : !result || result.people_count === 0 ? (
        <p className="text-sm text-gray-500">Agregá personas para ver el resumen.</p>
      ) : (
        <>
          {/* Totals */}
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total deuda</p>
              <p className="font-bold text-gray-100 text-lg">{formatCurrency(result.total_balance)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cuota ({result.people_count} personas)</p>
              <p className="font-bold text-gray-100 text-lg">{formatCurrency(result.share_per_person)}</p>
            </div>
          </div>

          <hr className="border-gray-800" />

          {/* Per-person table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left pb-2">Persona</th>
                <th className="text-right pb-2">Aportó</th>
                <th className="text-right pb-2">Cuota</th>
                <th className="text-right pb-2">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {result.summary.map(({ person, total_paid, share, balance }) => (
                <tr key={person.id}>
                  <td className="py-2 font-medium text-gray-100">{person.name}</td>
                  <td className="py-2 text-right text-gray-400">{formatCurrency(total_paid)}</td>
                  <td className="py-2 text-right text-gray-400">{formatCurrency(share)}</td>
                  <td className={`py-2 text-right font-semibold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {balance >= 0 ? "+" : "-"}{formatCurrency(balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-gray-600">
            Saldo positivo: pagó de más · Saldo negativo: debe
          </p>
        </>
      )}
    </div>
  );
}
