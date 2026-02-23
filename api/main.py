import sys
import os
import json
import uuid
from pathlib import Path
from typing import Optional

# Permite importar los clientes desde backend/ sin duplicar código
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from widergy_client import WidgergyClient
from aysa_client import AysaClient
from config import SERVICES

app = FastAPI(title="Imp Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# ── Data storage ──────────────────────────────────────────────────────────────

DATA_FILE = Path(__file__).parent / "data.json"


def _read_data() -> dict:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def _write_data(data: dict) -> None:
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Pydantic models ───────────────────────────────────────────────────────────

class PersonCreate(BaseModel):
    name: str

class PaymentCreate(BaseModel):
    person_id: str
    amount: float
    date: str
    note: Optional[str] = None

class MonthlyPaymentUpsert(BaseModel):
    year: int
    month: int
    service: str
    amount: float


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fetch_widergy(service: dict) -> dict:
    email = os.getenv(service["email_var"])
    password = os.getenv(service["password_var"])
    strategy = service.get("balance_strategy", "direct")

    client = WidgergyClient(email, password, service["utility_id"])
    client.login()

    accounts = client.get_accounts()
    if not accounts:
        return {"name": service["name"], "status": "error", "error": "No se encontraron cuentas"}

    account = accounts[0]

    if strategy == "async":
        concepts = client.get_balance_async(account["id"])
        total = next((c for c in concepts if c["concept"] == "total_balance"), None)
        balance = total["amount"] if total else None
    else:
        balance = account.get("balance")

    bill = client.get_last_bill(account["id"])

    return {
        "name": service["name"],
        "status": "ok",
        "balance": balance,
        "last_bill": {
            "amount": bill.get("amount"),
            "due_date": bill.get("first_expiration_on", bill.get("due_date")),
        } if bill else None,
        "details": {
            "client_number": str(account.get("client_number", "N/A")),
            "holder_name": account.get("holder_name"),
            "address": account.get("address"),
            "city": account.get("city"),
            "district": account.get("district"),
            "rate": account.get("rate"),
            "status_label": account.get("status_label", account.get("status")),
        },
    }


def _fetch_aysa(service: dict) -> dict:
    email = os.getenv(service["email_var"])
    password = os.getenv(service["password_var"])

    client = AysaClient(email, password)
    client.fetch_all()
    accounts = client.get_accounts()

    if not accounts:
        return {"name": service["name"], "status": "error", "error": "No se encontraron cuentas"}

    account = accounts[0]
    bill = account.get("last_bill")

    return {
        "name": service["name"],
        "status": "ok",
        "balance": account.get("balance"),
        "last_bill": {
            "amount": bill.get("amount"),
            "due_date": bill.get("due_date"),
        } if bill else None,
        "details": {
            "client_number": account.get("contrato"),
            "address": account.get("domicilio"),
            "alias": account.get("alias"),
            "rate": account.get("tarifa"),
            "status_label": account.get("estado"),
            "mensaje": account.get("mensaje"),
        },
    }


def _fetch_service(service: dict) -> dict:
    try:
        email = os.getenv(service["email_var"])
        password = os.getenv(service["password_var"])
        if not email or not password:
            return {"name": service["name"], "status": "error", "error": "Credenciales no configuradas"}

        if service.get("client_type") == "aysa":
            return _fetch_aysa(service)
        return _fetch_widergy(service)
    except Exception as e:
        return {"name": service["name"], "status": "error", "error": str(e)}


# ── Rutas ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/services")
def get_all_services():
    return [_fetch_service(s) for s in SERVICES]


@app.get("/api/services/{name}")
def get_service(name: str):
    service = next(
        (s for s in SERVICES if s["name"].lower() == name.lower()), None
    )
    if not service:
        raise HTTPException(status_code=404, detail=f"Servicio '{name}' no encontrado")
    return _fetch_service(service)


# ── People ────────────────────────────────────────────────────────────────────

@app.get("/api/people")
def get_people():
    return _read_data()["people"]


@app.post("/api/people", status_code=201)
def add_person(body: PersonCreate):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
    data = _read_data()
    person = {"id": str(uuid.uuid4()), "name": name}
    data["people"].append(person)
    _write_data(data)
    return person


@app.delete("/api/people/{person_id}", status_code=204)
def delete_person(person_id: str):
    data = _read_data()
    if not any(p["id"] == person_id for p in data["people"]):
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    data["people"] = [p for p in data["people"] if p["id"] != person_id]
    data["payments"] = [p for p in data["payments"] if p["person_id"] != person_id]
    _write_data(data)


# ── Payments ──────────────────────────────────────────────────────────────────

@app.get("/api/payments")
def get_payments():
    data = _read_data()
    people_map = {p["id"]: p for p in data["people"]}
    return [
        {**pay, "person": people_map.get(pay["person_id"])}
        for pay in sorted(data["payments"], key=lambda x: x["date"], reverse=True)
    ]


@app.post("/api/payments", status_code=201)
def add_payment(body: PaymentCreate):
    data = _read_data()
    if not any(p["id"] == body.person_id for p in data["people"]):
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    payment = {
        "id": str(uuid.uuid4()),
        "person_id": body.person_id,
        "amount": body.amount,
        "date": body.date,
        "note": body.note or "",
    }
    data["payments"].append(payment)
    _write_data(data)
    return payment


@app.delete("/api/payments/{payment_id}", status_code=204)
def delete_payment(payment_id: str):
    data = _read_data()
    if not any(p["id"] == payment_id for p in data["payments"]):
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    data["payments"] = [p for p in data["payments"] if p["id"] != payment_id]
    _write_data(data)


# ── Monthly payments ──────────────────────────────────────────────────────────

@app.get("/api/monthly-payments")
def get_monthly_payments(year: int = 0):
    data = _read_data()
    entries = data.get("monthly_payments", [])
    if year:
        entries = [e for e in entries if e["year"] == year]
    return entries


@app.post("/api/monthly-payments", status_code=201)
def upsert_monthly_payment(body: MonthlyPaymentUpsert):
    data = _read_data()
    entries = data.setdefault("monthly_payments", [])
    existing = next(
        (e for e in entries if e["year"] == body.year and e["month"] == body.month and e["service"] == body.service),
        None,
    )
    if existing:
        existing["amount"] = body.amount
        _write_data(data)
        return existing
    entry = {"id": str(uuid.uuid4()), "year": body.year, "month": body.month, "service": body.service, "amount": body.amount}
    entries.append(entry)
    _write_data(data)
    return entry


@app.delete("/api/monthly-payments/{entry_id}", status_code=204)
def delete_monthly_payment(entry_id: str):
    data = _read_data()
    entries = data.get("monthly_payments", [])
    if not any(e["id"] == entry_id for e in entries):
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    data["monthly_payments"] = [e for e in entries if e["id"] != entry_id]
    _write_data(data)


# ── Split ─────────────────────────────────────────────────────────────────────

@app.get("/api/split")
def get_split(total_balance: float = 0):
    data = _read_data()
    people = data["people"]
    payments = data["payments"]

    services_balance = total_balance
    monthly_total = sum(e["amount"] for e in data.get("monthly_payments", []))
    total_balance = services_balance + monthly_total

    if not people:
        return {"total_balance": total_balance, "services_balance": services_balance, "monthly_total": monthly_total, "people_count": 0, "share_per_person": 0, "summary": []}

    share = total_balance / len(people)

    paid_by = {p["id"]: 0.0 for p in people}
    for pay in payments:
        if pay["person_id"] in paid_by:
            paid_by[pay["person_id"]] += pay["amount"]

    summary = [
        {
            "person": person,
            "total_paid": paid_by[person["id"]],
            "share": round(share, 2),
            "balance": round(paid_by[person["id"]] - share, 2),
        }
        for person in people
    ]

    return {
        "total_balance": total_balance,
        "services_balance": services_balance,
        "monthly_total": monthly_total,
        "people_count": len(people),
        "share_per_person": round(share, 2),
        "summary": summary,
    }
