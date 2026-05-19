# MindFlow Notification Service Dockerfile
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
COPY services/notification/requirements.txt /app/services/notification/requirements.txt
RUN pip install --no-cache-dir -r services/notification/requirements.txt || true

# Copy shared code
COPY shared /app/shared

# Copy service code
COPY services/notification /app/services/notification

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8109

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8109/health || exit 1

# Run the service
CMD ["uvicorn", "services.notification.main:app", "--host", "0.0.0.0", "--port", "8109"]
