FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Data folders (company_docs, ecovadis) must be copied into backend/api/data/
# before building. Use: copy from ../../data/ into ./data/ pre-deploy.
# They will then be included via "COPY . ." above.
ENV DATA_DIR=/app/data

# Cloud Run expects the port to be defined by the PORT environment variable
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
