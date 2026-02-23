import sys
import os
from pathlib import Path

# Permite importar los clientes desde backend/ sin duplicar código
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from widergy_client import WidgergyClient
from aysa_client import AysaClient
from config import SERVICES

app = FastAPI(title="Imp Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


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
