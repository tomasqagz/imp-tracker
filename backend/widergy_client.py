import time
import requests


LOGIN_URL = "https://utilitygo.widergy.com/api/v1/users/sessions"
PORTAL_BASE = "https://utilitygo.widergy.com"
API_BASE = "https://utilitygo-api-3.widergy.com"
API_BASE_ALT = "https://utilitygo-api.widergy.com"

_BASE_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

PENDING_STATUSES = ("processing", "pending", "queued", "active")


class WidgergyClient:
    def __init__(self, email: str, password: str, utility_id: str | int):
        self.email = email
        self.password = password
        self.utility_id = str(utility_id)
        self._token: str | None = None

    @property
    def _headers(self) -> dict:
        headers = {**_BASE_HEADERS, "Utility-ID": self.utility_id}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def login(self) -> None:
        resp = requests.post(
            LOGIN_URL,
            json={"email": self.email, "password": self.password},
            headers=self._headers,
        )
        if not resp.ok:
            raise RuntimeError(f"Login fallido ({resp.status_code}): {resp.text}")
        self._token = resp.json()["access_token"]

    def get_accounts(self) -> list[dict]:
        """Devuelve la lista de cuentas. El campo 'balance' puede venir en 0 para algunos servicios."""
        resp = requests.get(f"{API_BASE}/api/v1/accounts", headers=self._headers)
        if not resp.ok:
            raise RuntimeError(f"Error al obtener cuentas ({resp.status_code}): {resp.text}")
        data = resp.json()
        return data if isinstance(data, list) else [data]

    def get_last_bill(self, account_id: int | str) -> dict:
        """Obtiene la última factura via job async."""
        resp = requests.get(
            f"{PORTAL_BASE}/api/v1/accounts/{account_id}/bills/last",
            headers=self._headers,
        )
        if not resp.ok:
            raise RuntimeError(f"Error al crear job de última factura ({resp.status_code}): {resp.text}")

        job_url = resp.json()["url"]

        for _ in range(20):
            time.sleep(2)
            r = requests.get(job_url, headers=self._headers)
            r.raise_for_status()
            result = r.json()
            if isinstance(result, dict) and result.get("status") in PENDING_STATUSES:
                continue
            return result

        raise TimeoutError("El job de última factura no terminó en el tiempo esperado.")

    def get_balance_async(self, account_id: int | str) -> list[dict]:
        """
        Obtiene el saldo via job async (usado por Edenor y similares).
        Devuelve una lista de conceptos: total_balance, last_bill, overdue_balance, etc.
        """
        # 1. Crear el job
        resp = requests.get(
            f"{PORTAL_BASE}/api/v1/accounts/balance",
            params={"account_id": account_id},
            headers=self._headers,
        )
        if not resp.ok:
            raise RuntimeError(f"Error al crear job de saldo ({resp.status_code}): {resp.text}")

        job_url = resp.json()["url"]

        # 2. Pollear hasta obtener el resultado
        for attempt in range(20):
            time.sleep(2)
            r = requests.get(job_url, headers=self._headers)
            r.raise_for_status()
            result = r.json()

            if isinstance(result, list):
                return result

            status = result.get("status") if isinstance(result, dict) else None
            if status not in PENDING_STATUSES:
                raise RuntimeError(f"Job terminó con estado inesperado: {result}")

        raise TimeoutError("El job de saldo no terminó en el tiempo esperado.")
