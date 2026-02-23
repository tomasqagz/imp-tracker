const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LastBill {
  amount: number | null;
  due_date: string | null;
}

export interface ServiceDetails {
  client_number?: string;
  holder_name?: string;
  address?: string;
  city?: string;
  district?: string;
  rate?: string;
  status_label?: string;
  alias?: string;
  mensaje?: string;
}

export interface ServiceData {
  name: string;
  status: "ok" | "error";
  balance?: number | null;
  last_bill?: LastBill | null;
  details?: ServiceDetails;
  error?: string;
}

export async function fetchService(name: string): Promise<ServiceData> {
  const res = await fetch(`${API_BASE}/api/services/${name}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function fetchAllServices(): Promise<ServiceData[]> {
  const res = await fetch(`${API_BASE}/api/services`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
