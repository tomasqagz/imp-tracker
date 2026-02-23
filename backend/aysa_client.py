import re
import urllib3
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

urllib3.disable_warnings()

PORTAL_URL = "https://portal.web.aysa.com.ar/index.html"


def _parse_saldo(raw: str) -> float | None:
    """Convierte '$    1145790.03' → 1145790.03"""
    try:
        return float(re.sub(r"[^\d.]", "", raw))
    except (ValueError, TypeError):
        return None


class AysaClient:
    def __init__(self, email: str, password: str):
        self.email = email
        self.password = password
        self._cuentas: dict | None = None
        self._deuda: dict | None = None

    def fetch_all(self) -> None:
        """
        Abre el portal con Playwright, hace login e intercepta las respuestas
        de /cuentas y /estdeudanocont que el portal carga automáticamente.
        """
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(ignore_https_errors=True)
            page = context.new_page()

            # Interceptar respuestas de la API
            def on_response(resp):
                url = resp.url
                if "/ov/cuentas" in url:
                    try:
                        self._cuentas = resp.json()
                    except Exception:
                        pass
                elif "estdeudanocont" in url and resp.status == 200:
                    try:
                        self._deuda = resp.json()
                    except Exception:
                        pass

            page.on("response", on_response)

            print("  Navegando al portal...")
            page.goto(PORTAL_URL, wait_until="networkidle", timeout=30000)

            print("  Completando formulario de login...")
            try:
                page.wait_for_selector("#j_username", timeout=15000)
                page.fill("#j_username", self.email)
                page.fill("#j_password", self.password)
                page.click("#logOnFormSubmit")
            except Exception as e:
                page.screenshot(path="aysa_debug.png")
                browser.close()
                raise RuntimeError(f"Error en el formulario de login: {e}")

            print("  Esperando que carguen los datos...")
            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except PWTimeout:
                pass

            # Espera extra para que el portal haga todas sus llamadas
            page.wait_for_timeout(5000)

            if self._deuda is None:
                page.screenshot(path="aysa_debug.png")
            browser.close()

        if self._cuentas is None:
            raise RuntimeError("No se pudo obtener las cuentas de Aysa")

    def get_accounts(self) -> list[dict]:
        """Devuelve las cuentas con el saldo ya parseado."""
        if self._cuentas is None:
            raise RuntimeError("Primero llamá a fetch_all()")

        relaciones = self._cuentas.get("RELACIONES", [])
        results = []

        for rel in relaciones:
            account = {
                "contrato": rel.get("CONTRATO", "N/A").strip(),
                "domicilio": rel.get("DOMICILIO", "N/A").strip(),
                "alias": rel.get("ALIAS_CONT", "").strip(),
                "balance": None,
                "estado": None,
                "mensaje": None,
            }

            if self._deuda:
                exports = self._deuda.get("EXPORTS", {})
                partner = exports.get("E_PARTNER", {})
                saldo_raw = partner.get("ZZSALDO", "")
                account["balance"] = _parse_saldo(saldo_raw)
                account["estado"] = "ACTIVO"
                account["mensaje"] = exports.get("PE_MSJ_USR") or exports.get("M_TEXTO", "")

                # Datos de la cuenta desde T_ACCOUNT
                t_account = self._deuda.get("TABLES", {}).get("T_ACCOUNT", [])
                if t_account:
                    ta = t_account[0]
                    account["tarifa"] = ta.get("KTOTX", "N/A")
                    account["iva"] = ta.get("ZZIVA", "N/A")

            results.append(account)

        return results
