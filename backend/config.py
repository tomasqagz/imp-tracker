"""
Configuración de servicios.
Para agregar un nuevo servicio solo hay que añadir una entrada a SERVICES
y las credenciales correspondientes en el .env.

client_type:
  - "widergy"  → plataforma Widergy (Naturgy, Edenor, etc.)
  - "aysa"     → portal Aysa con SAP IAS SSO (usa Playwright)

balance_strategy (solo para widergy):
  - "direct"  → el balance viene en el campo 'balance' de /api/v1/accounts
  - "async"   → el balance se obtiene via job async en /api/v1/accounts/balance
"""

SERVICES = [
    {
        "name": "Naturgy",
        "utility_id": 8,
        "email_var": "NATURGY_EMAIL",
        "password_var": "NATURGY_PASSWORD",
        "balance_strategy": "direct",
    },
    {
        "name": "Edenor",
        "utility_id": 19,
        "email_var": "EDENOR_EMAIL",
        "password_var": "EDENOR_PASSWORD",
        "balance_strategy": "async",
    },
    {
        "name": "Aysa",
        "client_type": "aysa",
        "email_var": "AYSA_EMAIL",
        "password_var": "AYSA_PASSWORD",
    },
]
