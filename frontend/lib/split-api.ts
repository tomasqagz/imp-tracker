const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Person {
  id: string;
  name: string;
}

export interface Payment {
  id: string;
  person_id: string;
  amount: number;
  date: string;
  note: string;
  person?: Person;
}

export interface PersonSummary {
  person: Person;
  total_paid: number;
  share: number;
  balance: number;
}

export interface SplitResult {
  total_balance: number;
  services_balance: number;
  monthly_total: number;
  people_count: number;
  share_per_person: number;
  summary: PersonSummary[];
}

export async function fetchPeople(): Promise<Person[]> {
  const res = await fetch(`${API_BASE}/api/people`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function addPerson(name: string): Promise<Person> {
  const res = await fetch(`${API_BASE}/api/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function deletePerson(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/people/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

export async function fetchPayments(): Promise<Payment[]> {
  const res = await fetch(`${API_BASE}/api/payments`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function addPayment(data: {
  person_id: string;
  amount: number;
  date: string;
  note?: string;
}): Promise<Payment> {
  const res = await fetch(`${API_BASE}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function deletePayment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/payments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

export async function fetchSplit(totalBalance: number): Promise<SplitResult> {
  const res = await fetch(`${API_BASE}/api/split?total_balance=${totalBalance}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export interface MonthlyPayment {
  id: string;
  year: number;
  month: number;
  service: string;
  amount: number;
}

export async function fetchMonthlyPayments(year: number): Promise<MonthlyPayment[]> {
  const res = await fetch(`${API_BASE}/api/monthly-payments?year=${year}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function upsertMonthlyPayment(data: Omit<MonthlyPayment, "id">): Promise<MonthlyPayment> {
  const res = await fetch(`${API_BASE}/api/monthly-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function deleteMonthlyPayment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/monthly-payments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}
