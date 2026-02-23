"use client";

import { ServiceData } from "@/lib/api";

const SERVICE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  Naturgy: {
    bg: "bg-gray-900",
    border: "border-blue-800",
    dot: "bg-blue-400",
  },
  Edenor: {
    bg: "bg-gray-900",
    border: "border-yellow-800",
    dot: "bg-yellow-400",
  },
  Aysa: {
    bg: "bg-gray-900",
    border: "border-cyan-800",
    dot: "bg-cyan-400",
  },
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
}

function formatDueDate(raw: string | null | undefined): string {
  if (!raw) return "N/A";
  // ISO: "2026-03-18T00:00:00.000-03:00" → "18/03/2026"
  if (raw.includes("T")) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  // Already "DD/MM/YYYY"
  return raw;
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}

interface Props {
  data: ServiceData | null;
  loading: boolean;
  updatedAt: string | null;
  onRefresh: () => void;
}

export default function ServiceCard({ data, loading, updatedAt, onRefresh }: Props) {
  const name = data?.name ?? "—";
  const colors = SERVICE_COLORS[name] ?? {
    bg: "bg-gray-900",
    border: "border-gray-700",
    dot: "bg-gray-400",
  };

  return (
    <div
      className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 flex flex-col gap-4 shadow-sm w-full`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
          <span className="font-bold text-lg text-gray-100">{name}</span>
        </div>
        {data?.status === "ok" && data.details?.status_label && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900 text-green-400">
            {data.details.status_label}
          </span>
        )}
        {data?.status === "error" && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-900 text-red-400">
            Error
          </span>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
        </div>
      ) : data?.status === "error" ? (
        <p className="text-sm text-red-400 flex-1">{data.error}</p>
      ) : data ? (
        <div className="flex flex-col gap-3">
          {/* Details */}
          {(data.details?.holder_name || data.details?.alias) && (
            <div className="text-sm text-gray-400">
              <p className="font-medium text-gray-200">
                {data.details.holder_name ?? data.details.alias}
              </p>
              {data.details.address && (
                <p>
                  {data.details.address}
                  {data.details.city ? `, ${data.details.city}` : ""}
                </p>
              )}
              {data.details.rate && (
                <p className="text-gray-500">Tarifa: {data.details.rate}</p>
              )}
              {data.details.mensaje && (
                <p className="text-xs text-amber-400 mt-1">{data.details.mensaje}</p>
              )}
            </div>
          )}

          <hr className="border-gray-700" />

          {/* Balance */}
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              {data.balance != null && data.balance < 0 ? "Saldo a favor" : "Saldo deudor"}
            </p>
            <p
              className={`text-3xl font-bold mt-0.5 ${
                data.balance != null && data.balance < 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {formatCurrency(data.balance)}
            </p>
          </div>

          {/* Last bill */}
          {data.last_bill && (
            <div className="text-sm text-gray-400 flex flex-col gap-0.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Últ. factura</span>
                <span className="font-medium text-gray-200">
                  {formatCurrency(data.last_bill.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vence</span>
                <span className="font-medium text-gray-200">
                  {formatDueDate(data.last_bill.due_date)}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Last updated */}
      {updatedAt && !loading && (
        <p className="text-xs text-gray-600 text-center -mb-1">
          Actualizado: {formatUpdatedAt(updatedAt)}
        </p>
      )}

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="mt-auto w-full py-2 rounded-xl text-sm font-semibold transition-colors
          bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Actualizando..." : "Actualizar"}
      </button>
    </div>
  );
}
