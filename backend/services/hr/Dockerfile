# MindFlow HR Service Dockerfile
# Per TECH_STACK.md: Python 3.11+

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy shared requirements and install
COPY shared/requirements.txt /app/shared/requirements.txt
RUN pip install --no-cache-dir -r shared/requirements.txt

# Copy service requirements and install (if exists)
COPY services/hr/requirements.txt /app/services/hr/requirements.txt
RUN pip install --no-cache-dir -r services/hr/requirements.txt || true

# Copy shared code
COPY shared /app/shared

# Copy service code
COPY services/hr /app/services/hr

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8102

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8102/health || exit 1

# Run the service
CMD ["uvicorn", "services.hr.main:app", "--host", "0.0.0.0", "--port", "8102"]
