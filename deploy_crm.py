"""
deploy_crm.py — CRM Module Deployment
1. Upload all new/changed CRM files to /opt/mindflow via SFTP
2. Run DB migration via psql in postgres container
3. Rebuild and restart hr-service, api-gateway, frontend containers
"""

import io
import base64
import struct
import sys
import os

import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# ── Config ────────────────────────────────────────────────────────────────────
PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"
PORT = 22
USERNAME = "root"
LOCAL_ROOT = r"D:\Mindflow Project\axion-infra"
REMOTE_ROOT = "/opt/mindflow"
DB_CONTAINER = "axionpcs-postgres"
DB_USER = "axionpcs"
DB_NAME = "axionpcs_db"

# Files to upload: (local_relative, remote_relative)
FILES = [
    # Backend — new files
    ("backend/alembic/versions/20260519_000000_crm_leads_module.py",
     "backend/alembic/versions/20260519_000000_crm_leads_module.py"),
    ("backend/services/hr/models/crm_lead.py",
     "backend/services/hr/models/crm_lead.py"),
    ("backend/services/hr/schemas/crm_lead.py",
     "backend/services/hr/schemas/crm_lead.py"),
    ("backend/services/hr/services/crm_lead_service.py",
     "backend/services/hr/services/crm_lead_service.py"),
    ("backend/services/hr/api/crm_leads.py",
     "backend/services/hr/api/crm_leads.py"),
    # Backend — updated __init__ files
    ("backend/services/hr/models/__init__.py",
     "backend/services/hr/models/__init__.py"),
    ("backend/services/hr/schemas/__init__.py",
     "backend/services/hr/schemas/__init__.py"),
    ("backend/services/hr/services/__init__.py",
     "backend/services/hr/services/__init__.py"),
    ("backend/services/hr/api/__init__.py",
     "backend/services/hr/api/__init__.py"),
    # API Gateway
    ("api-gateway/src/routes/crm.routes.ts",
     "api-gateway/src/routes/crm.routes.ts"),
    ("api-gateway/src/routes/index.ts",
     "api-gateway/src/routes/index.ts"),
    # Frontend — service layer
    ("frontend/src/services/crm/types.ts",
     "frontend/src/services/crm/types.ts"),
    ("frontend/src/services/crm/crmService.ts",
     "frontend/src/services/crm/crmService.ts"),
    ("frontend/src/services/crm/index.ts",
     "frontend/src/services/crm/index.ts"),
    # Frontend — components
    ("frontend/src/components/crm/ContactPersonModal.tsx",
     "frontend/src/components/crm/ContactPersonModal.tsx"),
    ("frontend/src/components/crm/CrmLeadForm.tsx",
     "frontend/src/components/crm/CrmLeadForm.tsx"),
    ("frontend/src/components/crm/CrmLeadFilters.tsx",
     "frontend/src/components/crm/CrmLeadFilters.tsx"),
    ("frontend/src/components/crm/CrmLeadList.tsx",
     "frontend/src/components/crm/CrmLeadList.tsx"),
    ("frontend/src/components/crm/index.ts",
     "frontend/src/components/crm/index.ts"),
    # Frontend — pages
    ("frontend/src/app/(app)/dashboard/crm/page.tsx",
     "frontend/src/app/(app)/dashboard/crm/page.tsx"),
    ("frontend/src/app/(app)/dashboard/crm/new/page.tsx",
     "frontend/src/app/(app)/dashboard/crm/new/page.tsx"),
    ("frontend/src/app/(app)/dashboard/crm/[id]/page.tsx",
     "frontend/src/app/(app)/dashboard/crm/[id]/page.tsx"),
    ("frontend/src/app/(app)/dashboard/crm/[id]/edit/page.tsx",
     "frontend/src/app/(app)/dashboard/crm/[id]/edit/page.tsx"),
    # Frontend — updated sidebar
    ("frontend/src/components/layout/AppSidebar.tsx",
     "frontend/src/components/layout/AppSidebar.tsx"),
]


# ── PPK loader ────────────────────────────────────────────────────────────────
def _read_mpint(buf):
    (l,) = struct.unpack(">I", buf.read(4))
    return int.from_bytes(buf.read(l), "big", signed=True)

def _read_string(buf):
    (l,) = struct.unpack(">I", buf.read(4))
    return buf.read(l)

def load_ppk(path):
    with open(path) as f:
        lines = [l.rstrip("\r\n") for l in f]
    header, pub64, priv64 = {}, [], []
    i = 0
    while i < len(lines):
        line = lines[i]
        if ":" in line and not line.startswith(" "):
            k, _, v = line.partition(":"); k, v = k.strip(), v.strip()
            if k == "Public-Lines":  n=int(v); pub64=lines[i+1:i+1+n];  i+=1+n; continue
            if k == "Private-Lines": n=int(v); priv64=lines[i+1:i+1+n]; i+=1+n; continue
            header[k] = v
        i += 1
    pb = io.BytesIO(base64.b64decode("".join(pub64))); _read_string(pb)
    e = _read_mpint(pb); n = _read_mpint(pb)
    sb = io.BytesIO(base64.b64decode("".join(priv64)))
    d=_read_mpint(sb); p=_read_mpint(sb); q=_read_mpint(sb); iqmp=_read_mpint(sb)
    priv = rsa.RSAPrivateNumbers(p,q,d,rsa.rsa_crt_dmp1(d,p),rsa.rsa_crt_dmq1(d,q),iqmp,
                                  rsa.RSAPublicNumbers(e,n)).private_key(default_backend())
    pem = priv.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.OpenSSH,
                              serialization.NoEncryption())
    return paramiko.RSAKey.from_private_key(io.StringIO(pem.decode()))


# ── Helpers ───────────────────────────────────────────────────────────────────
def run(client, cmd, label="", timeout=300):
    if label:
        print(f"\n{'='*60}")
        print(f"  {label}")
        print('='*60)
    print(f"$ {cmd[:120]}{'...' if len(cmd)>120 else ''}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out:
        safe_out = out.rstrip().encode("ascii", errors="replace").decode("ascii")
        print(safe_out)
    if err:
        safe_err = err.rstrip().encode("ascii", errors="replace").decode("ascii")
        print("[stderr]", safe_err)
    print(f"[exit={rc}]")
    return out.strip(), rc

def psql(client, sql, label=""):
    safe = sql.replace("'", "'\\''")
    return run(client,
               f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c '{safe}'",
               label)

def upload_file(sftp, client, local_path, remote_path):
    remote_dir = os.path.dirname(remote_path)
    # Use server-side mkdir -p — handles (app) dirs and nested paths reliably
    run(client, f"mkdir -p '{remote_dir}'")
    sftp.put(local_path, remote_path)
    print(f"  OK  {remote_path}")


# ── Migration SQL ─────────────────────────────────────────────────────────────
MIGRATION_SQL = """
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscussionSummary') THEN
    CREATE TYPE "DiscussionSummary" AS ENUM (
      'INTRODUCE_AXION','ESTABLISH_CREDIBILITY','RO_APPROVAL_CIRCULATED',
      'EXPLAIN_EASY_PROCESS','UNDERSTAND_PAIN_POINTS','OFFER_TRAINING_DEMO','OBTAIN_FIRST_CASE'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterestLevel') THEN
    CREATE TYPE "InterestLevel" AS ENUM ('HIGH','MEDIUM','LOW');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS crm_leads (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  operating_office_name VARCHAR(150) NOT NULL,
  location              VARCHAR(200) NOT NULL,
  date_contacted        DATE        NOT NULL,
  discussion_summary    "DiscussionSummary" NOT NULL,
  interest_level        "InterestLevel"     NOT NULL,
  demo_required         BOOLEAN     NOT NULL DEFAULT false,
  training_completed    BOOLEAN     NOT NULL DEFAULT false,
  next_followup_date    DATE,
  remarks               TEXT,
  created_by            UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_by            UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_lead_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  mobile      VARCHAR(15)  NOT NULL,
  email       VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_crm_leads_tenant_id          ON crm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS ix_crm_leads_next_followup_date ON crm_leads(next_followup_date);
CREATE INDEX IF NOT EXISTS ix_crm_leads_interest_level     ON crm_leads(interest_level);
CREATE INDEX IF NOT EXISTS ix_crm_lead_contacts_lead_id    ON crm_lead_contacts(lead_id);
"""


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("Loading PPK key...")
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USERNAME}@{HOST}:{PORT}...")
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # ── Step 1: Upload files ──────────────────────────────────────────────────
    print("="*60)
    print("  STEP 1 — Uploading CRM files via SFTP")
    print("="*60)
    sftp = client.open_sftp()
    failed = []
    for local_rel, remote_rel in FILES:
        local_abs = os.path.join(LOCAL_ROOT, local_rel.replace("/", os.sep))
        remote_abs = f"{REMOTE_ROOT}/{remote_rel}"
        if not os.path.exists(local_abs):
            print(f"  MISS  {local_abs}")
            failed.append(local_abs)
            continue
        try:
            upload_file(sftp, client, local_abs, remote_abs)
        except Exception as ex:
            print(f"  FAIL  {remote_abs}: {ex}")
            failed.append(remote_abs)
    sftp.close()

    if failed:
        print(f"\nWARN: {len(failed)} file(s) failed to upload. Aborting.")
        client.close()
        return 1

    print(f"\nAll {len(FILES)} files uploaded successfully.")

    # ── Step 2: DB migration (idempotent SQL) ─────────────────────────────────
    print("\n" + "="*60)
    print("  STEP 2 — Running DB migration (crm_leads + crm_lead_contacts)")
    print("="*60)

    # Write SQL to a temp file and pipe it in
    sql_escaped = MIGRATION_SQL.replace("'", "'\\''")
    run(client, f"printf '%s' '{sql_escaped}' > /tmp/crm_migration.sql")
    out, rc = run(client,
                  f"docker exec -i {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} < /tmp/crm_migration.sql",
                  "Run migration SQL")
    if rc != 0:
        print("✗ Migration failed — aborting deployment.")
        client.close()
        return 1

    # Verify tables were created
    psql(client,
         "SELECT table_name FROM information_schema.tables "
         "WHERE table_schema='public' AND table_name IN ('crm_leads','crm_lead_contacts') "
         "ORDER BY table_name;",
         "Verify tables exist")

    # ── Step 3: Rebuild containers ────────────────────────────────────────────
    print("\n" + "="*60)
    print("  STEP 3 — Rebuilding hr-service, api-gateway, frontend")
    print("="*60)

    # Build images
    out, rc = run(client,
                  "cd /opt/mindflow && docker compose build hr-service api-gateway frontend 2>&1",
                  "docker compose build (3 services)",
                  timeout=600)
    if rc != 0:
        print("✗ Build failed.")
        client.close()
        return 1

    # Restart services
    out, rc = run(client,
                  "cd /opt/mindflow && docker compose up -d hr-service api-gateway frontend 2>&1",
                  "docker compose up -d (3 services)",
                  timeout=120)
    if rc != 0:
        print("✗ Container restart failed.")
        client.close()
        return 1

    # ── Step 4: Health check ──────────────────────────────────────────────────
    print("\n" + "="*60)
    print("  STEP 4 — Health check")
    print("="*60)
    import time; time.sleep(10)

    run(client,
        "docker ps --filter 'name=axionpcs-hr-service' --filter 'name=axionpcs-api-gateway' "
        "--filter 'name=axionpcs-frontend' "
        "--format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
        "Container status")

    run(client,
        "docker exec axionpcs-hr-service curl -s http://localhost:8102/health 2>/dev/null | head -c 200",
        "HR service health check")

    run(client,
        "docker exec axionpcs-api-gateway curl -s http://localhost:3001/health 2>/dev/null | head -c 200",
        "API gateway health check")

    client.close()
    print("\n" + "="*60)
    print("  DEPLOYMENT COMPLETE")
    print("  CRM module live at: https://mindflow.axionpcs.in/dashboard/crm")
    print("="*60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
