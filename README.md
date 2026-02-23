# Imp Tracker

Herramienta personal para centralizar y consultar el estado de deuda de servicios públicos (gas, electricidad, agua) desde la línea de comandos.

## Servicios soportados

| Servicio | Empresa | Plataforma |
|---|---|---|
| Gas | Naturgy | Widergy API |
| Electricidad | Edenor | Widergy API (async) |
| Agua | Aysa | Portal SAP (Playwright) |

## Estructura del proyecto

```
imp.tracker/
├── backend/
│   ├── main.py           # Punto de entrada — muestra todos los servicios
│   ├── client.py         # Cliente Widergy (Naturgy, Edenor, etc.)
│   ├── aysa_client.py    # Cliente Aysa (browser headless via Playwright)
│   ├── config.py         # Lista de servicios y su configuración
│   ├── requirements.txt  # Dependencias Python
│   ├── .env              # Credenciales (no commitear)
│   └── .env.example      # Plantilla de credenciales
└── README.md
```

## Instalación

### Requisitos
- Python 3.10+

### 1. Clonar e instalar dependencias

```bash
cd backend
pip install -r requirements.txt
python -m playwright install chromium
```

### 2. Configurar credenciales

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales
```

### 3. Ejecutar

```bash
cd backend
python main.py
```

### Salida esperada

```
[Naturgy] Conectando...
====================================================
  [Naturgy] SUMINISTRO #685325
====================================================
  Titular       : ...
  Dirección     : ...
  Estado        : ACTIVO
====================================================
  SALDO DEUDOR : $611.433,40
====================================================

[Edenor] Conectando...
...

[Aysa] Conectando via browser...
  Navegando al portal...
  Completando formulario de login...
  Esperando que carguen los datos...
...
```

## Agregar un nuevo servicio

### Si es una empresa en la plataforma Widergy

1. Buscá el `Utility-ID` en DevTools (header `Utility-ID` de cualquier request al portal)
2. Agregá las credenciales en `backend/.env`:
   ```
   NUEVO_EMAIL=tu_email@ejemplo.com
   NUEVO_PASSWORD=tu_contraseña
   ```
3. Agregá una entrada en `backend/config.py`:
   ```python
   {
       "name": "NombreServicio",
       "utility_id": 99,           # el Utility-ID que encontraste
       "email_var": "NUEVO_EMAIL",
       "password_var": "NUEVO_PASSWORD",
       "balance_strategy": "direct",  # o "async" si el balance viene por job
   }
   ```

### `balance_strategy`

| Valor | Cuándo usarlo |
|---|---|
| `"direct"` | El saldo viene directo en el campo `balance` de `/api/v1/accounts` |
| `"async"` | El saldo se obtiene via job asíncrono (requiere polling). Ej: Edenor |

## Stack técnico

- **requests** — HTTP para las APIs Widergy
- **python-dotenv** — Manejo de variables de entorno
- **playwright** — Browser headless para portales con SSO (Aysa)
