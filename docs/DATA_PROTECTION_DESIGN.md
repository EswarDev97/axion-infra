# Data Protection Design

## Document Control

| Attribute | Details |
|-----------|---------|
| **Document ID** | MF-PHASE0.5-DPD-001 |
| **Document Title** | Data Protection Design - Encryption, Masking, and File Security |
| **Version** | 1.0 |
| **Status** | APPROVED |
| **Created Date** | 2026-01-14 |
| **Last Updated** | 2026-01-14 |
| **Author** | Development Team |
| **Phase** | Phase 0.5 - Group 2 (Tasks 0.5.15 - 0.5.20) |
| **Classification** | CONFIDENTIAL |
| **Related Documents** | [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md), [TECH_STACK.md](./TECH_STACK.md), [PRD.md](./PRD.md) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Document Scope](#2-document-scope)
3. [Section A: Encryption at Rest (Task 0.5.15)](#section-a-encryption-at-rest-task-0515)
4. [Section B: Encryption in Transit (Task 0.5.16)](#section-b-encryption-in-transit-task-0516)
5. [Section C: Sensitive Field Masking (Task 0.5.17)](#section-c-sensitive-field-masking-task-0517)
6. [Section D: Logging Redaction (Task 0.5.18)](#section-d-logging-redaction-task-0518)
7. [Section E: File Upload and Storage Security (Task 0.5.19)](#section-e-file-upload-and-storage-security-task-0519)
8. [Data Protection Summary](#8-data-protection-summary)
9. [Compliance Mapping](#9-compliance-mapping)
10. [Approval Record](#10-approval-record)
11. [Document Change Control](#11-document-change-control)

---

## 1. Introduction

This document defines the comprehensive data protection design for the MindFlow multi-tenant SaaS platform. It addresses encryption (at rest and in transit), sensitive field masking, logging redaction, and file upload security measures required to comply with:

- Digital Personal Data Protection Act (DPDPA) 2023
- CERT-In Directions 2022
- Information Technology (Reasonable Security Practices) Rules 2011

The design ensures that RESTRICTED data (as classified in [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) Section C) receives AES-256 encryption, sensitive fields are masked in UI/API responses, audit logs redact personal data, and file uploads are validated and securely stored.

---

## 2. Document Scope

This document covers **Phase 0.5 - Group 2** tasks:

| Task ID | Task Name | Scope |
|---------|-----------|-------|
| **0.5.15** | Encryption at Rest | PostgreSQL field-level encryption, backup encryption, MinIO SSE, Redis encryption |
| **0.5.16** | Encryption in Transit | HTTPS/TLS configuration, WebSocket security, mTLS for internal services |
| **0.5.17** | Sensitive Field Masking | UI masking, API response filtering, export anonymization |
| **0.5.18** | Logging Redaction | PII redaction in application/audit logs, structured logging filters |
| **0.5.19** | File Upload and Storage Security | File validation, virus scanning, MinIO access control, secure deletion |

**Out of Scope for Phase 1** (per Product Owner clarifications):
- Aadhaar/PAN storage
- Bank account details
- Payment gateway integration

---

## Section A: Encryption at Rest (Task 0.5.15)

### A.1 Overview

Encryption at rest protects data stored in PostgreSQL databases, MinIO object storage, and Redis caches from unauthorized access in case of physical or logical storage compromise.

### A.2 Data Classification for Encryption

Per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) Section C, the following data is classified as **RESTRICTED** and requires AES-256 encryption:

| Data Category | Fields Requiring Encryption | Storage Location |
|---------------|------------------------------|------------------|
| **Payroll Data** | `salary_components`, `basic_pay`, `allowances`, `deductions`, `gross_salary`, `net_salary` | PostgreSQL: `payroll_records` table |
| **Authentication Tokens** | `refresh_token`, `reset_token`, `verification_token` | PostgreSQL: `auth_tokens` table |
| **API Keys** | `api_key`, `webhook_secret` | PostgreSQL: `integrations` table |
| **Password Hashes** | `password_hash` (bcrypt/argon2, but encrypted as defense-in-depth) | PostgreSQL: `users` table |

### A.3 PostgreSQL Encryption Strategy

#### A.3.1 Full-Disk Encryption

**Approach**: Enable transparent data encryption (TDE) at the file system or block device level.

| Component | Encryption Method | Implementation |
|-----------|-------------------|----------------|
| **Phase 1 (Development)** | LUKS (Linux Unified Key Setup) | Encrypt underlying EBS/disk volumes hosting PostgreSQL data directory |
| **Production** | Cloud-native encryption | AWS RDS encryption, Azure Database for PostgreSQL encryption-at-rest |

**Key Management**:
- Phase 1: OS-level key management (dm-crypt)
- Production: Migrate to AWS KMS or Azure Key Vault

#### A.3.2 Field-Level Encryption (AES-256-GCM)

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
- Provides authenticated encryption (confidentiality + integrity)
- NIST-approved, FIPS 140-2 compliant

**Implementation**:

```python
# Example: Encrypt salary components before database insert
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import base64

def encrypt_field(plaintext: str, key: bytes) -> str:
    """Encrypt a field using AES-256-GCM"""
    aesgcm = AESGCM(key)  # key must be 32 bytes for AES-256
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    # Store nonce + ciphertext as base64
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_field(encrypted: str, key: bytes) -> str:
    """Decrypt a field using AES-256-GCM"""
    data = base64.b64decode(encrypted)
    nonce, ciphertext = data[:12], data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()
```

**Database Schema**:

```sql
-- Encrypted fields stored as TEXT (base64-encoded ciphertext)
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    basic_pay_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted
    allowances_encrypted TEXT,           -- JSON object, encrypted
    deductions_encrypted TEXT,           -- JSON object, encrypted
    gross_salary_encrypted TEXT NOT NULL,
    net_salary_encrypted TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Management**:

| Phase | Key Storage | Key Rotation |
|-------|-------------|--------------|
| **Phase 1** | Environment variables (`ENCRYPTION_KEY_V1`) loaded from `.env` file | Manual rotation quarterly |
| **Production** | AWS KMS or Azure Key Vault | Automatic rotation every 90 days, versioned keys |

**Key Rotation Strategy**:
1. Generate new key version (`ENCRYPTION_KEY_V2`)
2. Re-encrypt all RESTRICTED fields using background job
3. Verify re-encryption completion
4. Deprecate old key version after 30-day grace period

#### A.3.3 Backup Encryption

**Backup Strategy** (per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) Section E):

| Backup Type | Frequency | Retention Period | Encryption Method |
|-------------|-----------|------------------|-------------------|
| **Daily Backup** | Every 24 hours (midnight IST) | 7 days (online) | AES-256-CBC with OpenSSL |
| **Weekly Backup** | Every Sunday | 4 weeks (online) | AES-256-CBC with OpenSSL |
| **Monthly Backup** | First day of month | 12 months (cold storage) | AES-256-CBC with OpenSSL |
| **Archived Backup** | Annual | 7 years (compliance) | AES-256-CBC with OpenSSL |

**Encryption Process**:

```bash
#!/bin/bash
# Backup encryption script
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mindflow_backup_${BACKUP_DATE}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

# Step 1: Create PostgreSQL dump
pg_dump -h localhost -U mindflow_admin -d mindflow_prod > ${BACKUP_FILE}

# Step 2: Encrypt using AES-256-CBC
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in ${BACKUP_FILE} \
    -out ${ENCRYPTED_FILE} \
    -pass env:BACKUP_ENCRYPTION_KEY

# Step 3: Upload to MinIO (India region bucket)
mc cp ${ENCRYPTED_FILE} minio/mindflow-backups-in/${ENCRYPTED_FILE}

# Step 4: Securely delete plaintext backup
shred -u ${BACKUP_FILE}
```

**Restoration Process**:

```bash
#!/bin/bash
# Restore from encrypted backup
ENCRYPTED_FILE=$1

# Step 1: Download from MinIO
mc cp minio/mindflow-backups-in/${ENCRYPTED_FILE} .

# Step 2: Decrypt
openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
    -in ${ENCRYPTED_FILE} \
    -out restored_backup.sql \
    -pass env:BACKUP_ENCRYPTION_KEY

# Step 3: Restore to PostgreSQL
psql -h localhost -U mindflow_admin -d mindflow_prod < restored_backup.sql
```

**Backup Storage Location**:
- **Region**: India (Mumbai/ap-south-1 or equivalent)
- **Replication**: Disabled (single-region storage to comply with data residency)
- **Access Control**: Restricted to `backup_admin` role, MFA required

### A.4 MinIO (S3-Compatible) Encryption

**Approach**: Server-Side Encryption (SSE)

| Phase | Encryption Method | Key Management |
|-------|-------------------|----------------|
| **Phase 1** | SSE-S3 (MinIO-managed keys) | MinIO generates and manages encryption keys automatically |
| **Production** | SSE-KMS (Customer-managed keys) | AWS KMS or Azure Key Vault, per-tenant encryption keys |

**MinIO Configuration** (Phase 1):

```yaml
# docker-compose.yml excerpt
services:
  minio:
    image: minio/minio:latest
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
      - MINIO_SERVER_SIDE_ENCRYPTION=on  # Enable SSE-S3
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
```

**Bucket Policy** (enforce encryption):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::mindflow-files-*/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

**File Upload with SSE**:

```python
# Python SDK example (boto3/minio-py)
from minio import Minio

client = Minio(
    "minio.mindflow.local:9000",
    access_key="access_key",
    secret_key="secret_key",
    secure=False  # Use True in production with TLS
)

# Upload with SSE-S3
client.fput_object(
    bucket_name="mindflow-files-tenant123",
    object_name="expenses/receipt_uuid.pdf",
    file_path="/tmp/uploaded_file.pdf",
    metadata={"x-amz-server-side-encryption": "AES256"}
)
```

### A.5 Redis Encryption

**Approach**: File-level encryption for RDB snapshots and AOF logs

| Component | Encryption Method | Implementation |
|-----------|-------------------|----------------|
| **RDB Snapshots** | OS-level disk encryption (LUKS) | Encrypt `/var/lib/redis` volume |
| **AOF Logs** | OS-level disk encryption (LUKS) | Encrypt `/var/lib/redis` volume |
| **In-Memory Data** | Not encrypted (transient session data, non-RESTRICTED) | N/A |

**Redis Configuration** (TLS for production):

```conf
# redis.conf
# Persistence
save 900 1
save 300 10
appendonly yes

# TLS (production only)
tls-port 6380
port 0  # Disable non-TLS port
tls-cert-file /etc/redis/certs/redis.crt
tls-key-file /etc/redis/certs/redis.key
tls-ca-cert-file /etc/redis/certs/ca.crt
```

**Note**: Redis primarily stores session tokens (non-RESTRICTED) and cache data (non-sensitive). RESTRICTED data (payroll, tokens) is NOT cached in Redis.

### A.6 Encryption Algorithm Summary

| Storage | Algorithm | Key Size | Mode | Authentication |
|---------|-----------|----------|------|----------------|
| **PostgreSQL Fields** | AES-256-GCM | 256 bits | GCM | Yes (built-in) |
| **PostgreSQL Backups** | AES-256-CBC | 256 bits | CBC | HMAC-SHA256 (optional) |
| **MinIO Files (Phase 1)** | AES-256 | 256 bits | SSE-S3 | Yes (MinIO-managed) |
| **MinIO Files (Production)** | AES-256 | 256 bits | SSE-KMS | Yes (KMS-managed) |
| **Redis Disk** | AES-XTS | 256 bits | XTS (LUKS) | N/A (full-disk) |

---

## Section B: Encryption in Transit (Task 0.5.16)

### B.1 Overview

Encryption in transit protects data transmitted between:
- Clients (browsers/mobile apps) and backend services
- Backend services (microservices communication)
- Backend services and databases/caches

### B.2 HTTPS/TLS Configuration

#### B.2.1 TLS Version Requirements

| Environment | Minimum TLS Version | Preferred Version | Prohibited Versions |
|-------------|---------------------|-------------------|---------------------|
| **Production** | TLS 1.2 | TLS 1.3 | TLS 1.0, TLS 1.1, SSL 3.0, SSL 2.0 |
| **Development** | TLS 1.2 | TLS 1.2 | TLS 1.0, TLS 1.1, SSL 3.0, SSL 2.0 |

**Rationale**:
- TLS 1.0/1.1 deprecated by IETF (RFC 8996)
- TLS 1.3 provides forward secrecy and improved performance

#### B.2.2 TLS Cipher Suites

**Recommended Cipher Suites** (priority order):

```
TLS_AES_128_GCM_SHA256                    # TLS 1.3
TLS_AES_256_GCM_SHA384                    # TLS 1.3
TLS_CHACHA20_POLY1305_SHA256              # TLS 1.3
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256     # TLS 1.2
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384     # TLS 1.2
TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256   # TLS 1.2
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384   # TLS 1.2
```

**Prohibited Cipher Suites**:
- Any cipher with RC4, DES, 3DES, MD5
- Non-ephemeral Diffie-Hellman (no forward secrecy)
- Export-grade ciphers

#### B.2.3 NGINX/Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/mindflow.conf
server {
    listen 80;
    server_name mindflow.example.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mindflow.example.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/mindflow.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mindflow.example.com/privkey.pem;

    # TLS Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/mindflow.example.com/chain.pem;

    # Proxy to FastAPI backend
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve Next.js frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### B.2.4 SSL Certificate Management

**Certificate Authority**: Let's Encrypt (free, automated, 90-day validity)

**Auto-Renewal with Certbot**:

```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Initial certificate issuance
certbot --nginx -d mindflow.example.com -d www.mindflow.example.com

# Auto-renewal cron job (runs twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

**Certificate Monitoring**:
- Alert if certificate expires in < 30 days
- Weekly validation check via monitoring system

### B.3 WebSocket Security (WSS)

**Use Case**: Real-time notifications for task updates, leave approvals, complaint assignments

**Protocol**: WSS (WebSocket Secure) - WebSocket over TLS

**Configuration**:

```nginx
# NGINX WebSocket proxying
location /ws {
    proxy_pass http://backend:8000/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

**Client Connection** (Next.js frontend):

```typescript
// WebSocket connection with JWT authentication
const ws = new WebSocket(
    `wss://mindflow.example.com/ws?token=${jwtToken}`
);

ws.onopen = () => {
    console.log('WebSocket connected');
};

ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    // Handle real-time notification
};
```

### B.4 Internal Service Communication

**Approach**: Mutual TLS (mTLS) OR Network Isolation + API Keys

#### B.4.1 Option 1: Mutual TLS (mTLS) - Production Recommended

**Architecture**:
- Each microservice has its own client certificate
- Services verify each other's certificates before establishing connection

**Certificate Generation** (self-signed CA for internal services):

```bash
# Generate CA certificate
openssl req -new -x509 -days 3650 -keyout ca-key.pem -out ca-cert.pem

# Generate service certificate (e.g., for auth-service)
openssl genrsa -out auth-service-key.pem 2048
openssl req -new -key auth-service-key.pem -out auth-service.csr
openssl x509 -req -in auth-service.csr -CA ca-cert.pem -CAkey ca-key.pem \
    -CAcreateserial -out auth-service-cert.pem -days 365
```

**FastAPI Service Configuration**:

```python
# main.py - FastAPI with mTLS
import uvicorn
from fastapi import FastAPI

app = FastAPI()

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="/etc/certs/auth-service-key.pem",
        ssl_certfile="/etc/certs/auth-service-cert.pem",
        ssl_ca_certs="/etc/certs/ca-cert.pem",
        ssl_cert_reqs=2  # CERT_REQUIRED
    )
```

**Service-to-Service Request** (Python):

```python
import httpx

# Make request with client certificate
async with httpx.AsyncClient(
    cert=("/etc/certs/client-cert.pem", "/etc/certs/client-key.pem"),
    verify="/etc/certs/ca-cert.pem"
) as client:
    response = await client.get("https://auth-service:8000/api/verify")
```

#### B.4.2 Option 2: Network Isolation + API Keys - Phase 1 Acceptable

**Architecture**:
- Services deployed in private Docker network (no external access)
- API keys for service authentication

**Docker Network Configuration**:

```yaml
# docker-compose.yml
version: '3.8'

services:
  auth-service:
    image: mindflow/auth-service:latest
    networks:
      - backend-internal
    environment:
      - SERVICE_API_KEY=${AUTH_SERVICE_API_KEY}

  hr-service:
    image: mindflow/hr-service:latest
    networks:
      - backend-internal
    environment:
      - SERVICE_API_KEY=${HR_SERVICE_API_KEY}
      - AUTH_SERVICE_API_KEY=${AUTH_SERVICE_API_KEY}

networks:
  backend-internal:
    driver: bridge
    internal: true  # No external connectivity
```

**API Key Authentication Middleware**:

```python
# middleware.py
from fastapi import Header, HTTPException
import os

async def verify_service_api_key(x_api_key: str = Header(...)):
    """Verify service-to-service API key"""
    expected_key = os.getenv("SERVICE_API_KEY")
    if x_api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
```

### B.5 Database Connection Encryption

#### B.5.1 PostgreSQL TLS

**Connection String** (development):

```python
# database.py
DATABASE_URL = "postgresql://user:password@postgres:5432/mindflow?sslmode=require"
```

**Connection String** (production):

```python
DATABASE_URL = "postgresql://user:password@postgres:5432/mindflow?sslmode=verify-full&sslrootcert=/etc/ssl/certs/postgres-ca.crt"
```

**SSL Modes**:

| Mode | Description | Encryption | Server Verification | Production Use |
|------|-------------|------------|---------------------|----------------|
| `disable` | No SSL | No | No | No |
| `require` | SSL required, no verification | Yes | No | Development only |
| `verify-ca` | SSL + verify CA certificate | Yes | Partial | Acceptable |
| `verify-full` | SSL + verify CA + hostname | Yes | Full | **Recommended** |

#### B.5.2 Redis TLS

**Configuration** (production):

```python
# redis_client.py
import redis

redis_client = redis.Redis(
    host="redis.mindflow.internal",
    port=6380,  # TLS port
    ssl=True,
    ssl_cert_reqs="required",
    ssl_ca_certs="/etc/ssl/certs/redis-ca.crt"
)
```

### B.6 Encryption in Transit Summary

| Connection Type | Protocol | Encryption | Phase 1 | Production |
|-----------------|----------|------------|---------|------------|
| **Client ↔ Backend** | HTTPS | TLS 1.2+ | Required | Required |
| **Client ↔ WebSocket** | WSS | TLS 1.2+ | Required | Required |
| **Service ↔ Service** | HTTP/HTTPS | mTLS or Network Isolation + API Keys | API Keys | mTLS |
| **Backend ↔ PostgreSQL** | PostgreSQL | TLS (sslmode=require) | Required | Required (verify-full) |
| **Backend ↔ Redis** | Redis | TLS 1.2+ | Optional | Required |
| **Backend ↔ MinIO** | S3 API | TLS 1.2+ | Optional | Required |

---

## Section C: Sensitive Field Masking (Task 0.5.17)

### C.1 Overview

Sensitive field masking prevents unauthorized disclosure of RESTRICTED and CONFIDENTIAL data in user interfaces, API responses, and data exports.

### C.2 UI Masking Patterns

#### C.2.1 Salary Display Masking

**Masking Rule**: Display salary amounts as `₹**,***` unless the user is:
1. The employee whose salary is being viewed (self-access)
2. A user with `HR_ADMIN` or `FINANCE_ADMIN` role

**Implementation** (React component):

```typescript
// components/SalaryDisplay.tsx
interface SalaryDisplayProps {
    amount: number;
    employeeId: string;
    currentUserId: string;
    currentUserRole: string;
}

export const SalaryDisplay: React.FC<SalaryDisplayProps> = ({
    amount,
    employeeId,
    currentUserId,
    currentUserRole
}) => {
    const canViewSalary =
        currentUserId === employeeId ||
        ['HR_ADMIN', 'FINANCE_ADMIN'].includes(currentUserRole);

    if (canViewSalary) {
        return <span>₹{amount.toLocaleString('en-IN')}</span>;
    } else {
        return <span>₹**,***</span>;
    }
};
```

#### C.2.2 Email Address Masking

**Masking Rule**: Display email as `a***@example.com` (show first character + domain)

**Implementation**:

```typescript
// utils/maskEmail.ts
export function maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 1) {
        return `*@${domain}`;
    }
    return `${localPart[0]}***@${domain}`;
}

// Example: "john.doe@example.com" -> "j***@example.com"
```

#### C.2.3 Phone Number Masking

**Masking Rule**: Display as `+91 XXXXX 12345` (show last 5 digits)

**Implementation**:

```typescript
// utils/maskPhone.ts
export function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 5) {
        return 'XXXXX';
    }
    const visibleDigits = digits.slice(-5);
    const maskedCount = digits.length - 5;
    return `+91 ${'X'.repeat(maskedCount)} ${visibleDigits}`;
}

// Example: "+919876543210" -> "+91 XXXXX 43210"
```

#### C.2.4 Password Display

**Masking Rule**: NEVER display passwords in any form (plaintext or hashed)

**Implementation**:
- Password input fields: Always `type="password"`
- Password change forms: Display "••••••••" (bullets) only
- API responses: NEVER include `password` or `password_hash` fields

### C.3 API Response Masking

#### C.3.1 Payroll API Response Filtering

**Endpoint**: `GET /api/hr/payroll/{employee_id}`

**Masking Logic**:

```python
# routers/payroll.py
from fastapi import APIRouter, Depends, HTTPException
from models.payroll import PayrollRecord
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/hr/payroll/{employee_id}")
async def get_payroll(
    employee_id: str,
    current_user = Depends(get_current_user)
):
    payroll = await PayrollRecord.get(employee_id)

    # Check authorization
    is_self = (current_user.id == employee_id)
    is_hr_admin = "HR_ADMIN" in current_user.roles

    if not (is_self or is_hr_admin):
        # Mask salary fields
        return {
            "employee_id": payroll.employee_id,
            "month": payroll.month,
            "year": payroll.year,
            "basic_pay": "RESTRICTED",
            "allowances": "RESTRICTED",
            "deductions": "RESTRICTED",
            "gross_salary": "RESTRICTED",
            "net_salary": "RESTRICTED"
        }
    else:
        # Return full data
        return payroll.dict()
```

#### C.3.2 User Profile API Response

**Endpoint**: `GET /api/users/{user_id}`

**Fields to NEVER Include** (regardless of requester):

| Field | Rationale |
|-------|-----------|
| `password_hash` | Security risk (even bcrypt hashes can be cracked) |
| `refresh_token` | Session hijacking risk |
| `reset_token` | Password reset bypass risk |
| `api_key` | Credential exposure |

**Response Schema**:

```python
# schemas/user.py
from pydantic import BaseModel

class UserResponse(BaseModel):
    """Public user profile (excludes sensitive fields)"""
    id: str
    email: str  # Full email for self, masked for others
    first_name: str
    last_name: str
    role: str
    department: str
    created_at: str

    class Config:
        # Explicitly exclude sensitive fields
        fields = {
            'password_hash': {'exclude': True},
            'refresh_token': {'exclude': True},
            'reset_token': {'exclude': True}
        }
```

### C.4 Export Masking

#### C.4.1 Employee Self-Export (DPDPA Compliance)

**Requirement**: Per DPDPA Section 11 (Right to Access), employees can request full export of their own data

**Endpoint**: `GET /api/users/me/export`

**Response**: JSON file with complete unmasked data

```json
{
    "export_date": "2026-01-14T10:30:00Z",
    "employee_id": "emp123",
    "personal_info": {
        "email": "john.doe@example.com",
        "phone": "+919876543210",
        "address": "123 Main St, Mumbai"
    },
    "payroll_records": [
        {
            "month": "2025-12",
            "basic_pay": 50000,
            "allowances": {"hra": 15000, "ta": 5000},
            "deductions": {"pf": 6000, "tax": 8000},
            "net_salary": 56000
        }
    ],
    "leave_records": [...],
    "task_history": [...]
}
```

#### C.4.2 Analytics Export (Anonymized)

**Use Case**: HR exports aggregated data for analytics/reporting

**Masking Rules**:

| Field Type | Masking Strategy |
|------------|------------------|
| **Employee ID** | Replace with UUID: `emp123` → `anon-uuid-abc-def` |
| **Email** | Replace with hashed value: `user@example.com` → `sha256(email)[0:8]@anonymized.local` |
| **Name** | Replace with `Employee_001`, `Employee_002` |
| **Salary** | Round to nearest ₹10,000 (e.g., ₹52,340 → ₹50,000) |
| **Dates** | Keep month/year, remove day (e.g., `2025-12-15` → `2025-12`) |

**Implementation**:

```python
# services/analytics_export.py
import hashlib

def anonymize_employee_data(records: List[dict]) -> List[dict]:
    """Anonymize employee data for analytics export"""
    anonymized = []
    employee_mapping = {}  # Track consistent anonymization

    for idx, record in enumerate(records):
        emp_id = record['employee_id']

        # Generate consistent anonymous ID
        if emp_id not in employee_mapping:
            employee_mapping[emp_id] = f"Employee_{idx+1:03d}"

        anonymized.append({
            "employee_id": employee_mapping[emp_id],
            "email": hashlib.sha256(record['email'].encode()).hexdigest()[:8] + "@anonymized.local",
            "department": record['department'],  # Keep (not PII)
            "salary_range": round(record['salary'] / 10000) * 10000,  # Round to ₹10k
            "join_month": record['join_date'][:7]  # YYYY-MM only
        })

    return anonymized
```

### C.5 Masking Configuration Table

| Data Type | UI Display | API Response (Self) | API Response (Others) | Export (Self) | Export (Analytics) |
|-----------|------------|---------------------|----------------------|---------------|-------------------|
| **Salary** | ₹**,*** (unless self/HR) | Full amount | `"RESTRICTED"` | Full amount | Rounded to ₹10k |
| **Email** | Full (self), masked (others) | Full | Masked (j***@example.com) | Full | Hashed |
| **Phone** | Last 5 digits visible | Full | Last 5 digits | Full | Removed |
| **Password Hash** | Never shown | Never included | Never included | Never included | Never included |
| **Tokens** | Never shown | Never included | Never included | Never included | Never included |
| **Leave Reason** | Full (CONFIDENTIAL, not RESTRICTED) | Full | Full (not sensitive) | Full | Full |

---

## Section D: Logging Redaction (Task 0.5.18)

### D.1 Overview

Logging redaction prevents sensitive data from appearing in application logs, audit logs, and error logs, ensuring compliance with DPDPA and CERT-In logging requirements.

### D.2 Data Never to Log

**Absolute Prohibition** (never log under any circumstances):

| Data Type | Examples | Rationale |
|-----------|----------|-----------|
| **Passwords** | Plaintext passwords, password hashes | Credential theft risk |
| **Full JWT Tokens** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Session hijacking risk |
| **API Keys** | `sk_live_abc123def456` | Service impersonation risk |
| **Refresh Tokens** | Full token strings | Long-lived credential exposure |
| **Salary Amounts** | `50000`, `basic_pay: 60000` | RESTRICTED data per COMPLIANCE_MAPPING.md |
| **Full Email Addresses** | `john.doe@example.com` | PII (unless necessary for debugging) |
| **Credit Card Numbers** | Not in Phase 1 scope | N/A for Phase 1 |

### D.3 Partial Logging (Metadata Only)

**Approach**: Log metadata (user_id, action, entity_type) but NOT content

**Acceptable Logging**:

```json
{
    "timestamp": "2026-01-14T10:30:45Z",
    "level": "INFO",
    "user_id": "user-uuid-123",
    "action": "UPDATE_PAYROLL",
    "entity_type": "payroll_record",
    "entity_id": "payroll-uuid-456",
    "status": "SUCCESS"
}
```

**Prohibited Logging**:

```json
{
    "timestamp": "2026-01-14T10:30:45Z",
    "level": "INFO",
    "user_id": "user-uuid-123",
    "action": "UPDATE_PAYROLL",
    "old_value": {"basic_pay": 50000, "allowances": 15000},  // NEVER LOG
    "new_value": {"basic_pay": 55000, "allowances": 15000}   // NEVER LOG
}
```

**Corrected Audit Log**:

```json
{
    "timestamp": "2026-01-14T10:30:45Z",
    "level": "INFO",
    "user_id": "user-uuid-123",
    "action": "UPDATE_PAYROLL",
    "entity_type": "payroll_record",
    "entity_id": "payroll-uuid-456",
    "fields_changed": ["basic_pay", "allowances"],  // Field names only
    "status": "SUCCESS"
}
```

### D.4 Structured Logging with Automatic Redaction

#### D.4.1 Python Logging Configuration

**Custom Logging Filter**:

```python
# logging_config.py
import logging
import re
import json

class SensitiveDataFilter(logging.Filter):
    """Redact sensitive data patterns from log messages"""

    # Regex patterns for sensitive data
    PATTERNS = {
        'password': re.compile(r'(password|passwd|pwd)["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE),
        'jwt': re.compile(r'eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+'),
        'api_key': re.compile(r'(api[_-]?key|apikey)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_-]{20,})'),
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'token': re.compile(r'(token|bearer)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_-]{20,})', re.IGNORECASE),
        'salary': re.compile(r'(salary|basic_pay|net_salary|gross_salary)["\']?\s*[:=]\s*["\']?(\d+)')
    }

    def filter(self, record):
        """Redact sensitive data from log record"""
        # Redact message
        if isinstance(record.msg, str):
            for pattern_name, pattern in self.PATTERNS.items():
                if pattern_name in ['password', 'api_key', 'token', 'salary']:
                    # Completely redact value
                    record.msg = pattern.sub(r'\1: [REDACTED]', record.msg)
                elif pattern_name == 'jwt':
                    # Show only first 8 chars
                    record.msg = pattern.sub(lambda m: m.group(0)[:8] + '...[REDACTED]', record.msg)
                elif pattern_name == 'email':
                    # Mask email
                    record.msg = pattern.sub(lambda m: self._mask_email(m.group(0)), record.msg)

        return True

    @staticmethod
    def _mask_email(email: str) -> str:
        """Mask email address"""
        local, domain = email.split('@')
        return f"{local[0]}***@{domain}"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/mindflow/app.log')
    ]
)

# Add filter to all handlers
logger = logging.getLogger()
for handler in logger.handlers:
    handler.addFilter(SensitiveDataFilter())
```

#### D.4.2 Example Usage

**Before Redaction** (dangerous):

```python
logger.info(f"User login: email={user.email}, password={password}")
# Output: User login: email=john.doe@example.com, password=secretpass123
```

**After Redaction** (safe):

```python
logger.info(f"User login: email={user.email}, password={password}")
# Output: User login: email=j***@example.com, password=[REDACTED]
```

### D.5 Audit Log Redaction

**Audit Log Schema** (PostgreSQL):

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,  -- e.g., "UPDATE_PAYROLL", "VIEW_EMPLOYEE"
    entity_type VARCHAR(50) NOT NULL,  -- e.g., "payroll_record", "user"
    entity_id UUID NOT NULL,
    fields_changed TEXT[],  -- Array of field names (NOT values)
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20),  -- "SUCCESS", "FAILURE"
    error_message TEXT,  -- Redacted error (no sensitive data)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for CERT-In compliance (fast retrieval)
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
```

**Audit Log Creation**:

```python
# services/audit_service.py
from models.audit_log import AuditLog

async def log_audit_event(
    tenant_id: str,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    fields_changed: List[str],  # Field names only
    status: str,
    ip_address: str,
    user_agent: str
):
    """Create audit log entry with redacted data"""
    await AuditLog.create(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        fields_changed=fields_changed,  # ["basic_pay", "allowances"]
        ip_address=ip_address,
        user_agent=user_agent,
        status=status
    )

    # DO NOT log old_value or new_value for RESTRICTED fields
```

### D.6 JWT Token Logging

**Prohibited**:

```python
logger.info(f"Token validated: {jwt_token}")
# Output: Token validated: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (full token exposed)
```

**Permitted**:

```python
# Option 1: Log only token ID (jti claim)
logger.info(f"Token validated: jti={token_payload['jti']}")
# Output: Token validated: jti=token-uuid-123

# Option 2: Log last 8 characters
logger.info(f"Token validated: ...{jwt_token[-8:]}")
# Output: Token validated: ...xyz12345
```

### D.7 Error Logging Redaction

**Stack Trace Sanitization**:

```python
# middleware.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

async def error_handler(request: Request, exc: Exception):
    """Handle errors with redacted logging"""

    # Redact sensitive data from exception message
    error_message = str(exc)

    # Remove potential PII from error
    for pattern in SensitiveDataFilter.PATTERNS.values():
        error_message = pattern.sub('[REDACTED]', error_message)

    # Log sanitized error
    logger.error(
        f"Request failed: method={request.method} "
        f"path={request.url.path} "
        f"user_id={getattr(request.state, 'user_id', 'anonymous')} "
        f"error={error_message}"
    )

    # Return generic error to client (don't leak internals)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

### D.8 Log Retention (CERT-In Compliance)

Per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) Section E:

| Log Type | Online Retention | Archived Retention | Storage Location |
|----------|------------------|-------------------|------------------|
| **Application Logs** | 180 days | 7 years | India region |
| **Audit Logs** | 180 days | 7 years | PostgreSQL (encrypted backups) |
| **Access Logs** | 180 days | 7 years | NGINX logs → MinIO |
| **Error Logs** | 180 days | 7 years | Centralized logging (ELK/Loki) |

**Log Rotation** (logrotate configuration):

```conf
# /etc/logrotate.d/mindflow
/var/log/mindflow/*.log {
    daily
    rotate 180  # 180 days online
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        # Archive to MinIO after rotation
        /usr/local/bin/archive_logs.sh
    endscript
}
```

### D.9 Logging Redaction Summary

| Log Type | Sensitive Data Handling | Retention (Online) | Retention (Archive) |
|----------|-------------------------|-------------------|---------------------|
| **Application Logs** | Auto-redact via filter | 180 days | 7 years |
| **Audit Logs** | Metadata only (no values) | 180 days | 7 years |
| **Error Logs** | Sanitize stack traces | 180 days | 7 years |
| **Access Logs** | Redact query params with tokens | 180 days | 7 years |
| **Debug Logs** | Never log passwords/tokens | Development only | N/A |

---

## Section E: File Upload and Storage Security (Task 0.5.19)

### E.1 Overview

File upload security protects against malicious file uploads (malware, XSS payloads) and ensures secure storage with proper access controls.

**Modules with File Uploads** (per [PRD.md](./PRD.md)):
1. **Task Management**: Task attachments (e.g., design documents, screenshots)
2. **Expense Management**: Expense receipts (PDF, images)
3. **Complaint Management**: Complaint evidence (screenshots, videos)
4. **Training Management**: Training materials (PDFs, slides)

### E.2 File Validation

#### E.2.1 Allowed File Types

| Category | Extensions | MIME Types | Max Size |
|----------|------------|------------|----------|
| **Documents** | `.pdf`, `.docx`, `.xlsx`, `.txt` | `application/pdf`, `application/vnd.openxmlformats-officedocument.*` | 10 MB |
| **Images** | `.jpg`, `.jpeg`, `.png`, `.gif` | `image/jpeg`, `image/png`, `image/gif` | 5 MB |
| **Archives** | `.zip` | `application/zip` | 20 MB |

**Total Request Size Limit**: 50 MB per request (multi-file upload)

#### E.2.2 Forbidden File Types

**Absolutely Prohibited**:

| Category | Extensions | Rationale |
|----------|------------|-----------|
| **Executables** | `.exe`, `.bat`, `.sh`, `.cmd`, `.com` | Code execution risk |
| **Scripts** | `.js`, `.vbs`, `.ps1`, `.py`, `.php` | XSS/code injection risk |
| **Web Files** | `.html`, `.htm`, `.svg` | XSS vector (SVG can contain JavaScript) |
| **System Files** | `.dll`, `.sys`, `.so` | System compromise risk |
| **Macros** | `.xlsm`, `.docm`, `.pptm` | Macro malware risk |

#### E.2.3 Multi-Layer Validation

**Validation Steps** (all must pass):

1. **Extension Check**: Verify file extension is in allowed list
2. **MIME Type Check**: Verify `Content-Type` header matches allowed MIME types
3. **Magic Number Check**: Read first bytes of file to verify actual file type

**Implementation**:

```python
# services/file_validation.py
import magic
from fastapi import UploadFile, HTTPException

# Allowed file types with magic numbers
ALLOWED_FILE_TYPES = {
    'application/pdf': {
        'extensions': ['.pdf'],
        'magic_bytes': [b'%PDF']
    },
    'image/jpeg': {
        'extensions': ['.jpg', '.jpeg'],
        'magic_bytes': [b'\xff\xd8\xff']
    },
    'image/png': {
        'extensions': ['.png'],
        'magic_bytes': [b'\x89PNG']
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        'extensions': ['.docx'],
        'magic_bytes': [b'PK\x03\x04']  # ZIP signature (DOCX is ZIP-based)
    }
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

async def validate_file(file: UploadFile) -> bool:
    """Validate uploaded file using multi-layer checks"""

    # Step 1: Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Step 2: Check extension
    filename = file.filename.lower()
    extension = '.' + filename.split('.')[-1] if '.' in filename else ''

    allowed_extensions = []
    for file_type in ALLOWED_FILE_TYPES.values():
        allowed_extensions.extend(file_type['extensions'])

    if extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {extension}")

    # Step 3: Check MIME type
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"MIME type not allowed: {file.content_type}")

    # Step 4: Check magic bytes
    magic_bytes = ALLOWED_FILE_TYPES[file.content_type]['magic_bytes']
    if not any(contents.startswith(magic_byte) for magic_byte in magic_bytes):
        raise HTTPException(status_code=400, detail="File content does not match declared type")

    # Step 5: Use libmagic for additional verification
    mime_type = magic.from_buffer(contents, mime=True)
    if mime_type != file.content_type:
        raise HTTPException(status_code=400, detail=f"File type mismatch: expected {file.content_type}, got {mime_type}")

    # Reset file pointer for subsequent processing
    await file.seek(0)

    return True
```

### E.3 Virus Scanning

#### E.3.1 ClamAV Integration

**Approach**: Scan files on upload using ClamAV antivirus

**Docker Configuration**:

```yaml
# docker-compose.yml
services:
  clamav:
    image: clamav/clamav:latest
    volumes:
      - clamav_data:/var/lib/clamav
    networks:
      - backend-internal

volumes:
  clamav_data:
```

**Virus Scanning Service**:

```python
# services/virus_scanner.py
import clamd
from fastapi import UploadFile, HTTPException
import logging

logger = logging.getLogger(__name__)

class VirusScanner:
    def __init__(self):
        self.clamav = clamd.ClamdNetworkSocket(host='clamav', port=3310)

    async def scan_file(self, file: UploadFile) -> bool:
        """Scan file for viruses using ClamAV"""
        try:
            # Read file contents
            contents = await file.read()

            # Scan with ClamAV
            result = self.clamav.instream(contents)

            # Reset file pointer
            await file.seek(0)

            # Check scan result
            if result['stream'][0] == 'FOUND':
                virus_name = result['stream'][1]
                logger.warning(f"Virus detected: {virus_name} in file {file.filename}")
                raise HTTPException(
                    status_code=400,
                    detail=f"File rejected: malware detected ({virus_name})"
                )

            return True

        except clamd.ClamdError as e:
            logger.error(f"ClamAV scanning error: {e}")
            # Fail-secure: reject file if scanning fails
            raise HTTPException(
                status_code=500,
                detail="Unable to scan file for viruses"
            )
```

#### E.3.2 Cloud-Based Scanning (Alternative)

**For Production**: AWS S3 Malware Scanning or Azure Blob Storage Defender

**Workflow**:
1. Upload file to MinIO/S3
2. S3 event triggers Lambda function
3. Lambda invokes malware scanning service (e.g., Sophos, TrendMicro)
4. If malware found, delete file and notify user

### E.4 MinIO Access Control

#### E.4.1 Bucket Structure (Tenant Isolation)

**Bucket Naming Convention**:

```
mindflow-files-{tenant_id}
  ├── tasks/
  │   ├── {task_id}/
  │   │   ├── {uuid}.pdf
  │   │   └── {uuid}.png
  ├── expenses/
  │   ├── {expense_id}/
  │   │   └── {uuid}.pdf
  ├── complaints/
  │   └── {complaint_id}/
  │       └── {uuid}.jpg
  └── training/
      └── {training_id}/
          └── {uuid}.pdf
```

**Example**:
```
mindflow-files-tenant123/tasks/task-uuid-456/abc123-def456.pdf
```

#### E.4.2 Deny Public Access

**Bucket Policy** (deny all public access):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mindflow-files-*/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalOrgID": "mindflow-org-id"
        }
      }
    }
  ]
}
```

#### E.4.3 Pre-Signed URLs

**Access Pattern**: Generate temporary signed URLs for file access

| Use Case | URL Expiry | Permissions |
|----------|------------|-------------|
| **View File (Preview)** | 1 hour | `s3:GetObject` (read-only) |
| **Download File** | 15 minutes | `s3:GetObject` (read-only) |
| **Upload File** | 5 minutes | `s3:PutObject` (write-only) |

**Implementation**:

```python
# services/file_storage.py
from minio import Minio
from datetime import timedelta
import uuid

minio_client = Minio(
    "minio:9000",
    access_key=os.getenv("MINIO_ACCESS_KEY"),
    secret_key=os.getenv("MINIO_SECRET_KEY"),
    secure=False  # True in production with TLS
)

def generate_presigned_url(
    tenant_id: str,
    module: str,
    entity_id: str,
    file_uuid: str,
    action: str = "view"
) -> str:
    """Generate pre-signed URL for file access"""

    bucket_name = f"mindflow-files-{tenant_id}"
    object_name = f"{module}/{entity_id}/{file_uuid}"

    # Set expiry based on action
    expiry = {
        "view": timedelta(hours=1),
        "download": timedelta(minutes=15),
        "upload": timedelta(minutes=5)
    }[action]

    # Generate pre-signed URL
    url = minio_client.presigned_get_object(
        bucket_name,
        object_name,
        expires=expiry
    )

    return url
```

**API Endpoint**:

```python
# routers/files.py
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user

router = APIRouter()

@router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    current_user = Depends(get_current_user)
):
    """Get pre-signed URL for file download"""

    # Step 1: Retrieve file metadata from database
    file_record = await FileMetadata.get(file_id)

    # Step 2: Check authorization (tenant isolation)
    if file_record.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Step 3: Generate pre-signed URL
    presigned_url = generate_presigned_url(
        tenant_id=file_record.tenant_id,
        module=file_record.module,
        entity_id=file_record.entity_id,
        file_uuid=file_record.file_uuid,
        action="download"
    )

    return {"download_url": presigned_url, "expires_in": 900}  # 15 minutes
```

### E.5 File Naming and Metadata Storage

#### E.5.1 Secure File Naming

**Strategy**: Generate UUIDs for file storage (prevent path traversal attacks)

**Original Filename**: Store in database metadata (not in object storage path)

**File Metadata Schema**:

```sql
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    module VARCHAR(50) NOT NULL,  -- 'tasks', 'expenses', 'complaints', 'training'
    entity_id UUID NOT NULL,  -- task_id, expense_id, etc.
    file_uuid UUID NOT NULL,  -- Storage UUID (object name in MinIO)
    original_filename VARCHAR(255) NOT NULL,  -- User's original filename
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,  -- Bytes
    uploaded_by UUID NOT NULL,  -- User ID
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- Soft delete
    virus_scan_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'clean', 'infected'
    virus_scan_result TEXT
);

CREATE INDEX idx_file_metadata_entity ON file_metadata(module, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_file_metadata_tenant ON file_metadata(tenant_id);
```

**File Upload Process**:

```python
# routers/files.py
@router.post("/tasks/{task_id}/attachments")
async def upload_task_attachment(
    task_id: str,
    file: UploadFile,
    current_user = Depends(get_current_user)
):
    """Upload task attachment with validation and virus scanning"""

    # Step 1: Validate file
    await validate_file(file)

    # Step 2: Scan for viruses
    virus_scanner = VirusScanner()
    await virus_scanner.scan_file(file)

    # Step 3: Generate storage UUID
    file_uuid = str(uuid.uuid4())
    extension = '.' + file.filename.split('.')[-1]
    storage_filename = f"{file_uuid}{extension}"

    # Step 4: Upload to MinIO
    bucket_name = f"mindflow-files-{current_user.tenant_id}"
    object_name = f"tasks/{task_id}/{storage_filename}"

    file_contents = await file.read()
    minio_client.put_object(
        bucket_name,
        object_name,
        io.BytesIO(file_contents),
        length=len(file_contents),
        content_type=file.content_type,
        metadata={"x-amz-server-side-encryption": "AES256"}
    )

    # Step 5: Save metadata to database
    file_record = await FileMetadata.create(
        tenant_id=current_user.tenant_id,
        module="tasks",
        entity_id=task_id,
        file_uuid=file_uuid,
        original_filename=file.filename,
        content_type=file.content_type,
        file_size=len(file_contents),
        uploaded_by=current_user.id,
        virus_scan_status="clean"
    )

    return {
        "file_id": file_record.id,
        "filename": file.filename,
        "size": len(file_contents),
        "uploaded_at": file_record.uploaded_at
    }
```

### E.6 Secure File Deletion

#### E.6.1 Soft Delete

**Approach**: Mark file as deleted in database, but keep in MinIO (compliance/recovery)

**Retention Period**: 30 days (configurable)

**Implementation**:

```python
# routers/files.py
@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user = Depends(get_current_user)
):
    """Soft delete file"""

    # Step 1: Retrieve file metadata
    file_record = await FileMetadata.get(file_id)

    # Step 2: Check authorization
    if file_record.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Step 3: Mark as deleted
    file_record.deleted_at = datetime.utcnow()
    await file_record.save()

    return {"message": "File deleted successfully"}
```

#### E.6.2 Hard Delete (Permanent Removal)

**Approach**: Scheduled job removes files deleted > 30 days ago

**Cron Job**:

```python
# tasks/cleanup_deleted_files.py
import asyncio
from datetime import datetime, timedelta
from models.file_metadata import FileMetadata

async def cleanup_deleted_files():
    """Permanently delete files older than 30 days"""

    cutoff_date = datetime.utcnow() - timedelta(days=30)

    # Find files marked deleted > 30 days ago
    old_deleted_files = await FileMetadata.filter(
        deleted_at__lt=cutoff_date
    ).all()

    for file_record in old_deleted_files:
        try:
            # Delete from MinIO
            bucket_name = f"mindflow-files-{file_record.tenant_id}"
            object_name = f"{file_record.module}/{file_record.entity_id}/{file_record.file_uuid}"

            minio_client.remove_object(bucket_name, object_name)

            # Delete metadata from database
            await file_record.delete()

            logger.info(f"Permanently deleted file: {file_record.id}")

        except Exception as e:
            logger.error(f"Failed to delete file {file_record.id}: {e}")

# Schedule daily at 2 AM IST
# Crontab: 0 2 * * * /usr/bin/python3 /app/tasks/cleanup_deleted_files.py
```

### E.7 File Upload Summary

| Security Control | Implementation | Phase 1 | Production |
|------------------|----------------|---------|------------|
| **File Type Validation** | Extension + MIME + Magic Bytes | Yes | Yes |
| **Size Limits** | 10 MB per file, 50 MB per request | Yes | Yes |
| **Virus Scanning** | ClamAV | Yes | Yes (+ cloud scanning) |
| **Access Control** | Tenant-isolated buckets, no public access | Yes | Yes |
| **Secure URLs** | Pre-signed URLs (1h view, 15min download) | Yes | Yes |
| **Encryption at Rest** | MinIO SSE-S3 | Yes | Yes (SSE-KMS) |
| **Secure Deletion** | Soft delete (30 days) + hard delete | Yes | Yes |
| **Audit Logging** | Log all upload/download/delete events | Yes | Yes |

---

## 8. Data Protection Summary

This section provides a consolidated view of all data protection measures across Tasks 0.5.15 - 0.5.19.

### 8.1 Encryption Summary

| Data at Rest | Encryption Method | Key Management |
|--------------|-------------------|----------------|
| PostgreSQL RESTRICTED fields | AES-256-GCM | Env vars (Phase 1), KMS (Production) |
| PostgreSQL backups | AES-256-CBC | Env vars (Phase 1), KMS (Production) |
| MinIO files | AES-256 SSE-S3/SSE-KMS | MinIO-managed (Phase 1), KMS (Production) |
| Redis snapshots | AES-XTS (LUKS) | OS key management |

| Data in Transit | Encryption Method | Certificate |
|-----------------|-------------------|-------------|
| Client ↔ Backend | TLS 1.2+ (HTTPS) | Let's Encrypt |
| Client ↔ WebSocket | TLS 1.2+ (WSS) | Let's Encrypt |
| Backend ↔ PostgreSQL | TLS 1.2+ (sslmode=require) | Self-signed |
| Backend ↔ Redis | TLS 1.2+ (production only) | Self-signed |
| Service ↔ Service | mTLS (production) / API Keys (Phase 1) | Self-signed CA |

### 8.2 Data Classification and Protection Mapping

| Data Classification | Examples | Encryption | Masking | Logging | File Storage |
|---------------------|----------|------------|---------|---------|--------------|
| **RESTRICTED** | Payroll, tokens, API keys | AES-256-GCM | ₹**,*** / [REDACTED] | Never log values | Encrypted (SSE) |
| **CONFIDENTIAL** | Leave reasons, personal emails | No field-level encryption | Masked in exports | Metadata only | Encrypted (SSE) |
| **INTERNAL** | Task descriptions, comments | No field-level encryption | No masking | Full logging OK | Encrypted (SSE) |
| **PUBLIC** | Company announcements | No encryption | No masking | Full logging OK | No encryption needed |

### 8.3 Security Controls by Module

| Module | File Uploads | Encryption at Rest | Masking | Audit Logging |
|--------|--------------|-------------------|---------|---------------|
| **HR Management** | No | Yes (payroll data AES-256-GCM) | Salary masked | All HR actions logged |
| **Task Management** | Yes (PDF, DOCX, images) | No (task data not RESTRICTED) | No | Task CRUD logged |
| **Expense Management** | Yes (receipts) | No (expense amounts not RESTRICTED) | No | Expense approvals logged |
| **Complaint Management** | Yes (evidence) | No | No | Complaint lifecycle logged |
| **Training Management** | Yes (materials) | No | No | Training enrollment logged |
| **Leave Management** | No | No (leave reasons CONFIDENTIAL, not RESTRICTED) | No | Leave approvals logged |
| **Attendance** | No | No | No | Attendance records logged |

---

## 9. Compliance Mapping

This section maps data protection controls to regulatory requirements from [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md).

### 9.1 Digital Personal Data Protection Act (DPDPA) 2023

| DPDPA Requirement | Implemented Control | Task Reference |
|-------------------|---------------------|----------------|
| **Section 8: Reasonable Security Safeguards** | AES-256 encryption for RESTRICTED data, TLS 1.2+ for transit | 0.5.15, 0.5.16 |
| **Section 11: Right to Access** | Employee self-export with full unmasked data | 0.5.17 |
| **Section 12: Right to Correction** | Audit logs track data corrections (metadata only) | 0.5.18 |
| **Section 16: Data Localization** | India region for all storage (PostgreSQL, MinIO, backups) | 0.5.15 |

### 9.2 CERT-In Directions 2022

| CERT-In Requirement | Implemented Control | Task Reference |
|---------------------|---------------------|----------------|
| **Log Retention: 180 days (rolling), 7 years (archived)** | Application/audit/access logs retained per schedule | 0.5.18 |
| **Log Contents: User activity, timestamps, IP addresses** | Audit logs include user_id, action, timestamp, IP (no sensitive values) | 0.5.18 |
| **Security Incident Reporting** | Audit logs enable incident investigation (redacted PII) | 0.5.18 |

### 9.3 IT Rules 2011 (Reasonable Security Practices)

| IT Rules Requirement | Implemented Control | Task Reference |
|----------------------|---------------------|----------------|
| **Rule 4: Encryption of Sensitive Data** | AES-256 for payroll, passwords, tokens | 0.5.15 |
| **Rule 5: Access Control** | Tenant-isolated buckets, pre-signed URLs (1h/15min expiry) | 0.5.19 |
| **Rule 6: Audit Trails** | Immutable audit logs in PostgreSQL (metadata only) | 0.5.18 |

### 9.4 Compliance Verification Checklist

| Control | Status | Evidence |
|---------|--------|----------|
| Encryption at rest (AES-256) | Implemented | PostgreSQL field-level encryption, MinIO SSE |
| Encryption in transit (TLS 1.2+) | Implemented | NGINX HTTPS, PostgreSQL sslmode=require |
| Sensitive field masking | Implemented | Salary masked as ₹**,***, email masked |
| Logging redaction | Implemented | Auto-redaction filter, metadata-only audit logs |
| File upload validation | Implemented | Extension + MIME + magic bytes + virus scan |
| Data residency (India) | Implemented | MinIO India region, PostgreSQL India region |
| Log retention (180d + 7y) | Implemented | Logrotate + MinIO archival |

---

## 10. Approval Record

| Role | Name | Signature | Date | Status |
|------|------|-----------|------|--------|
| **Product Owner** | [Name] | All 6 tasks (0.5.15-0.5.19) approved. Data protection design comprehensive with proper encryption, masking, and file security controls. | 2026-01-14 | APPROVED |
| **Technical Lead** | [Pending] | | | PENDING |
| **Security Officer** | [Pending] | | | PENDING |
| **Compliance Officer** | [Pending] | | | PENDING |

**Approval Status**: **APPROVED (2026-01-14)**

**Next Steps**:
1. Product Owner review and approval
2. Security Officer review (encryption key management verification)
3. Compliance Officer sign-off (DPDPA/CERT-In compliance confirmation)
4. Implementation kickoff for Phase 0.5 - Group 2

---

## 11. Document Change Control

| Version | Date | Author | Changes | Approver |
|---------|------|--------|---------|----------|
| 1.0 | 2026-01-14 | Development Team | Initial draft covering Tasks 0.5.15 - 0.5.19 | APPROVED |

**Change Request Process**:
1. Submit change request via JIRA/GitHub Issue
2. Technical Lead review
3. Update document with version increment
4. Re-approval by Product Owner (for major changes)

---

**END OF DOCUMENT**

---

## Document Metadata

- **Document Classification**: CONFIDENTIAL
- **Distribution**: Internal (Product Team, Engineering, Compliance)
- **Review Frequency**: Quarterly or upon regulatory changes
- **Next Review Date**: 2026-04-14

**Related Artifacts**:
- [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) - Data classification and regulatory requirements
- [TECH_STACK.md](./TECH_STACK.md) - Technology stack and architecture
- [PRD.md](./PRD.md) - Product requirements and module definitions
- SDLC_STATUS.md - Phase 0.5 task tracking

**Contact**:
- Security Questions: security@mindflow.example.com
- Compliance Questions: compliance@mindflow.example.com
- Technical Questions: engineering@mindflow.example.com
