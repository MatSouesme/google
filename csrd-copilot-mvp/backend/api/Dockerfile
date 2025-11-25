FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run expects the port to be defined by the PORT environment variable
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
