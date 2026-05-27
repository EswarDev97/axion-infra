"""
Create the positions table in axionpcs_db (if missing) and insert
Position title='Executive', code='EXECUTIVE', level=3.

The positions table was in the Alembic baseline schema design but was
never applied. department_id FK is omitted since departments table is
not in axionpcs_db (it lives in axionpcs_gateway_db via Prisma).
"""

import io, base64, struct, sys
import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"; PORT = 22; USERNAME = "root"
DB_CONTAINER = "axionpcs-postgres"; DB_USER = "axionpcs"; DB_NAME = "axionpcs_db"
TENANT_ID = "5755b445-9d11-4ce8-994f-2b94d88e5e86"

def _read_mpint(buf):
    (l,) = struct.unpack(">I", buf.read(4))
    return int.from_bytes(buf.read(l), "big", signed=True)
def _read_string(buf):
    (l,) = struct.unpack(">I", buf.read(4))
    return buf.read(l)
def load_ppk(path):
    with open(path) as f: lines = [l.rstrip("\r\n") for l in f]
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
    pem = priv.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.OpenSSH, serialization.NoEncryption())
    return paramiko.RSAKey.from_private_key(io.StringIO(pem.decode()))

def run(client, cmd, label=""):
    if label: print(f"\n>>> {label}")
    print(f"$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out: print(out.rstrip())
    if err: print("[stderr]", err.rstrip())
    print(f"[exit={rc}]"); return out.strip(), rc

def psql_file(client, db, sql_text, label=""):
    """Write SQL to a temp file and execute it — avoids shell-quoting issues."""
    remote_path = "/tmp/_mindflow_sql.sql"
    # Write SQL to remote file via echo
    escaped = sql_text.replace("\\", "\\\\").replace('"', '\\"')
    run(client, f'printf "%s" "{escaped}" > {remote_path}')
    cmd = f"docker exec -i {DB_CONTAINER} psql -U {DB_USER} -d {db} < {remote_path}"
    if label: print(f"\n>>> {label}")
    print(f"$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out: print(out.rstrip())
    if err: print("[stderr]", err.rstrip())
    print(f"[exit={rc}]"); return out.strip(), rc

def psql(client, sql, label="", db=DB_NAME):
    safe = sql.replace("'", "'\\''")
    return run(client, f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {db} -c '{safe}'", label)

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # ── Step 1: Get admin user ID ─────────────────────────────────────────────
    user_out, _ = psql(client,
        f"SELECT id FROM users WHERE tenant_id='{TENANT_ID}' ORDER BY created_at LIMIT 1;",
        "Admin user ID from axionpcs_db")
    # Extract UUID from output
    admin_id = None
    for line in user_out.splitlines():
        line = line.strip()
        if len(line) == 36 and line.count("-") == 4:
            admin_id = line
            break
    print(f"Admin user ID: {admin_id}")

    # ── Step 2: Create positions table if it doesn't exist ────────────────────
    create_sql = """
CREATE TABLE IF NOT EXISTS positions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,
    title           VARCHAR(100) NOT NULL,
    description     TEXT,
    department_id   UUID,
    level           INTEGER     NOT NULL DEFAULT 1,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID        REFERENCES users(id),
    updated_by      UUID        REFERENCES users(id),
    CONSTRAINT uq_positions_tenant_code UNIQUE (tenant_id, code)
);
"""
    psql_file(client, DB_NAME, create_sql.strip(), "Create positions table (IF NOT EXISTS)")

    # ── Step 3: Verify table was created ─────────────────────────────────────
    psql(client,
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='positions' ORDER BY ordinal_position;",
        "positions table columns (verify)")

    # ── Step 4: Check if Executive already exists ─────────────────────────────
    psql(client,
        f"SELECT id, code, title, level FROM positions WHERE tenant_id='{TENANT_ID}' AND code='EXECUTIVE';",
        "Check if EXECUTIVE position already exists")

    # ── Step 5: Insert Executive position ────────────────────────────────────
    created_by_clause = f"'{admin_id}'" if admin_id else "NULL"
    insert_sql = (
        f"INSERT INTO positions (tenant_id, code, title, description, level, is_active, created_by, updated_by) "
        f"VALUES ('{TENANT_ID}', 'EXECUTIVE', 'Executive', 'Executive-level position', 5, TRUE, "
        f"{created_by_clause}, {created_by_clause}) "
        f"ON CONFLICT ON CONSTRAINT uq_positions_tenant_code DO NOTHING "
        f"RETURNING id, code, title, level, is_active, created_at;"
    )
    psql(client, insert_sql, "INSERT Executive position (ON CONFLICT DO NOTHING)")

    # ── Step 6: Final confirmation — all positions ────────────────────────────
    psql(client,
        f"SELECT id, code, title, level, is_active FROM positions WHERE tenant_id='{TENANT_ID}' ORDER BY level DESC, title;",
        "All positions in DB after insert")

    client.close()
    print("\nDisconnected.")

if __name__ == "__main__":
    sys.exit(main())
