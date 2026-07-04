FROM python:3.12-slim

WORKDIR /app

COPY backend/ ./backend/
COPY api/ ./api/

RUN pip install --no-cache-dir -r api/requirements.txt \
    && playwright install chromium \
    && playwright install-deps chromium

WORKDIR /app/api

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
