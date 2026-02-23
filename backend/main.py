import sys
sys.stdout.reconfigure(encoding="utf-8")

import os
from dotenv import load_dotenv
from widergy_client import WidgergyClient
from aysa_client import AysaClient
from config import SERVICES

load_dotenv()


def format_currency(value) -> str:
    if value is None:
        return "N/A"
    return f"${value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# ── Widergy ──────────────────────────────────────────────────────────────────

def get_widergy_balance(client: WidgergyClient, account: dict, strategy: str):
    if strategy == "async":
        concepts = client.get_balance_async(account["id"])
        total = next((c for c in concepts if c["concept"] == "total_balance"), None)
        return total["amount"] if total else None
    return account.get("balance")


def format_date(iso: str | None) -> str:
    """Convierte '2026-03-18T00:00:00.000-03:00' → '18/03/2026'"""
    if not iso:
        return "N/A"
    try:
        return iso[:10].split("-")[2] + "/" + iso[:10].split("-")[1] + "/" + iso[:10].split("-")[0]
    except Exception:
        return iso


def print_account(service_name: str, account: dict, balance, bill: dict | None = None):
    separator = "=" * 52
    label = "SALDO A FAVOR" if balance is not None and balance < 0 else "SALDO DEUDOR "
    print(f"\n{separator}")
    print(f"  [{service_name}] SUMINISTRO #{account.get('client_number', 'N/A')}")
    print(separator)
    print(f"  Titular       : {account.get('holder_name', 'N/A')}")
    print(f"  Dirección     : {account.get('address', 'N/A')}")
    print(f"  Localidad     : {account.get('city', 'N/A')}, {account.get('district', 'N/A')}")
    print(f"  Tarifa        : {account.get('rate', 'N/A')}")
    print(f"  Estado        : {account.get('status_label', account.get('status', 'N/A'))}")
    print(separator)
    print(f"  {label}: {format_currency(abs(balance) if balance is not None else None)}")
    if bill:
        print(f"  Últ. factura  : {format_currency(bill.get('amount'))}  |  Vence: {format_date(bill.get('due_date') or bill.get('first_expiration_on'))}")
    print(separator)


def fetch_widergy(service: dict):
    name = service["name"]
    email = os.getenv(service["email_var"])
    password = os.getenv(service["password_var"])
    strategy = service.get("balance_strategy", "direct")

    print(f"\n[{name}] Conectando...")
    client = WidgergyClient(email, password, service["utility_id"])
    client.login()
    for account in client.get_accounts():
        balance = get_widergy_balance(client, account, strategy)
        bill = client.get_last_bill(account["id"])
        print_account(name, account, balance, bill)


# ── Aysa ─────────────────────────────────────────────────────────────────────

def print_aysa_account(account: dict):
    separator = "=" * 52
    balance = account.get("balance")
    bill = account.get("last_bill")
    label = "SALDO A FAVOR" if balance is not None and balance < 0 else "SALDO DEUDOR "
    print(f"\n{separator}")
    print(f"  [Aysa] CONTRATO #{account.get('contrato', 'N/A')}")
    print(separator)
    print(f"  Dirección     : {account.get('domicilio', 'N/A')}")
    if account.get("alias"):
        print(f"  Alias         : {account.get('alias')}")
    if account.get("tarifa"):
        print(f"  Tarifa        : {account.get('tarifa', 'N/A')}")
    if account.get("estado"):
        print(f"  Estado        : {account.get('estado', 'N/A')}")
    if account.get("mensaje"):
        print(f"  Aviso         : {account.get('mensaje')}")
    print(separator)
    print(f"  {label}: {format_currency(abs(balance) if balance is not None else None)}")
    if bill:
        print(f"  Últ. factura  : {format_currency(bill.get('amount'))}  |  Vence: {bill.get('due_date', 'N/A')}")
    print(separator)


def fetch_aysa(service: dict):
    name = service["name"]
    email = os.getenv(service["email_var"])
    password = os.getenv(service["password_var"])

    print(f"\n[{name}] Conectando via browser...")
    client = AysaClient(email, password)
    client.fetch_all()
    for account in client.get_accounts():
        print_aysa_account(account)


# ── Main ──────────────────────────────────────────────────────────────────────

def fetch_service(service: dict):
    name = service["name"]
    email = os.getenv(service["email_var"])
    password = os.getenv(service["password_var"])

    if not email or not password:
        print(f"\n[{name}] Credenciales no configuradas en .env — omitiendo.")
        return

    try:
        client_type = service.get("client_type", "widergy")
        if client_type == "aysa":
            fetch_aysa(service)
        else:
            fetch_widergy(service)
    except Exception as e:
        print(f"[{name}] Error: {e}")


def main():
    for service in SERVICES:
        fetch_service(service)


if __name__ == "__main__":
    main()
