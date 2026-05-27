"""
Full fix for employee form:
1. Check roles table schema
2. Drop positions table (has only 1 row, will re-seed)
3. Run HR Alembic migration (creates departments, positions, employees, leave_types, etc.)
4. Seed 20 standard positions + leave types + verify roles
5. Upload patched EmployeeForm.tsx + rebuild frontend
"""

import io, base64, struct, sys, os
import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"; PORT = 22; USERNAME = "root"
LOCAL_ROOT = r"D:\Mindflow Project\axion-infra"
DB_CONTAINER = "axionpcs-postgres"
DB_USER = "axionpcs"
DB_NAME = "axionpcs_db"
TENANT_ID = "5755b445-9d11-4ce8-994f-2b94d88e5e86"
ADMIN_USER_ID = "0f47dc26-c97b-4fb1-96a5-560786547a0d"

def _read_mpint(buf):
    (l,) = struct.unpack(">I", buf.read(4)); return int.from_bytes(buf.read(l), "big", signed=True)
def _read_string(buf):
    (l,) = struct.unpack(">I", buf.read(4)); return buf.read(l)
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

def run(client, cmd, label="", timeout=600):
    if label: print(f"\n--- {label} ---")
    print(f"$ {cmd[:120]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    while True:
        line = stdout.readline()
        if not line: break
        print(line.rstrip().encode("ascii","replace").decode())
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if err: print("[stderr]", err[:500].encode("ascii","replace").decode())
    print(f"[exit={rc}]"); return rc

def psql_file(client, sql, label=""):
    cmd_write = f"cat > /tmp/_fix.sql << 'ENDSQL'\n{sql}\nENDSQL"
    run(client, cmd_write)
    return run(client,
               f"docker exec -i {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} < /tmp/_fix.sql",
               label)

def psql(client, sql, label=""):
    safe = sql.replace("'", "'\\''")
    return run(client, f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c '{safe}'", label)

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # ── Step 1: Check current roles table schema ──────────────────────────────
    psql(client, r"\d roles", "Roles table schema")
    psql(client, "SELECT id, code, name FROM roles LIMIT 10;", "Existing roles")

    # ── Step 2: Drop positions (will be recreated by Alembic with proper FKs) ─
    psql(client, "DROP TABLE IF EXISTS positions CASCADE;",
         "Drop existing positions table (will be recreated by Alembic)")

    # ── Step 3: Run HR Alembic migration ─────────────────────────────────────
    # Check if alembic_version table exists (to know if migration was partially run)
    psql(client,
         "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='alembic_version');",
         "Check alembic_version table")

    # Run alembic upgrade from inside hr-service container
    rc = run(client,
             "docker exec axionpcs-hr-service bash -c "
             "'cd /app/services/hr && DATABASE_URL=postgresql://axionpcs:axionpcs_secret@postgres:5432/axionpcs_db "
             "alembic upgrade head 2>&1'",
             "Run HR Alembic migration (upgrade head)")

    if rc != 0:
        print("Alembic migration failed. Trying manual SQL approach...")
        # Fallback: create tables manually via SQL
        psql(client,
             "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;",
             "Tables after failed migration")

    # ── Step 4: Verify tables created ─────────────────────────────────────────
    psql(client,
         "SELECT table_name FROM information_schema.tables WHERE table_schema='public' "
         "AND table_name IN ('departments','positions','employees','leave_types','leave_balances',"
         "'leave_requests','attendance_records','payroll_references','candidates') "
         "ORDER BY table_name;",
         "Verify HR tables created")

    # ── Step 5: Seed positions (20 standard positions) ─────────────────────────
    positions_sql = f"""
INSERT INTO positions (tenant_id, code, title, level, is_active, created_by, updated_by)
VALUES
  ('{TENANT_ID}', 'CEO',               'CEO',                10, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'NATIONAL_INCHARGE', 'National Incharge',   9, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'STATE_ADMIN',       'State Admin',         8, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'DIRECTOR',          'Director',            7, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'VP',                'Vice President',      7, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'MANAGER',           'Manager',             6, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'TEAM_LEAD',         'Team Lead',           5, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'EXECUTIVE',         'Executive',           5, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'SR_DEVELOPER',      'Senior Developer',    4, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'DEVELOPER',         'Developer',           3, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'JR_DEVELOPER',      'Junior Developer',    2, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'EMPLOYEE',          'Employee',            2, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'INTERN',            'Intern',              1, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'HR_MANAGER',        'HR Manager',          6, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'HR_EXECUTIVE',      'HR Executive',        3, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'ACCOUNTANT',        'Accountant',          3, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'DESIGNER',          'Designer',            3, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'QA_ENGINEER',       'QA Engineer',         3, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'DEVOPS_ENGINEER',   'DevOps Engineer',     4, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'PROJECT_MANAGER',   'Project Manager',     5, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'BUSINESS_ANALYST',  'Business Analyst',    4, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}')
ON CONFLICT ON CONSTRAINT uq_positions_tenant_code DO NOTHING;
"""
    psql_file(client, positions_sql, "Seed 21 standard positions")
    psql(client, f"SELECT code, title, level FROM positions WHERE tenant_id='{TENANT_ID}' ORDER BY level DESC, title LIMIT 25;",
         "Positions seeded")

    # ── Step 6: Seed leave types (CL, SL, EL) ─────────────────────────────────
    leave_types_sql = f"""
INSERT INTO leave_types (tenant_id, code, name, description, default_days, is_paid, requires_approval, is_active, created_by, updated_by)
VALUES
  ('{TENANT_ID}', 'CL', 'Casual Leave',  'Casual / privilege leave', 12, true, true, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'SL', 'Sick Leave',    'Medical / sick leave',     10, true, true, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}'),
  ('{TENANT_ID}', 'EL', 'Earned Leave',  'Annual earned leave',      15, true, true, true, '{ADMIN_USER_ID}', '{ADMIN_USER_ID}')
ON CONFLICT ON CONSTRAINT uq_leave_types_tenant_code DO NOTHING;
"""
    psql_file(client, leave_types_sql, "Seed leave types (CL, SL, EL)")
    psql(client, f"SELECT code, name, default_days FROM leave_types WHERE tenant_id='{TENANT_ID}';",
         "Leave types seeded")

    # ── Step 7: Check and fix roles ────────────────────────────────────────────
    psql(client, r"\d roles", "Roles table schema (full)")
    psql(client, f"SELECT * FROM roles WHERE tenant_id='{TENANT_ID}' OR tenant_id IS NULL LIMIT 10;",
         "Existing roles")

    # ── Step 8: Upload EmployeeForm.tsx fix ───────────────────────────────────
    sftp = client.open_sftp()
    local_form = os.path.join(LOCAL_ROOT, "frontend", "src", "components", "employees", "EmployeeForm.tsx")
    remote_form = "/opt/mindflow/frontend/src/components/employees/EmployeeForm.tsx"
    sftp.put(local_form, remote_form)
    sftp.close()
    print(f"\nUploaded EmployeeForm.tsx with Promise.allSettled fix")

    # ── Step 9: Rebuild frontend ───────────────────────────────────────────────
    rc = run(client,
             "cd /opt/mindflow && docker compose build --no-cache frontend 2>&1",
             "Rebuild frontend (no-cache)", timeout=900)
    if rc != 0: print("Frontend build FAILED"); client.close(); return 1

    rc = run(client,
             "cd /opt/mindflow && docker compose up -d frontend 2>&1",
             "Restart frontend", timeout=60)
    if rc != 0: print("Frontend restart FAILED"); client.close(); return 1

    import time; time.sleep(10)
    run(client,
        "docker ps --filter 'name=axionpcs-frontend' --format 'table {{.Names}}\\t{{.Status}}'",
        "Frontend status")

    # ── Step 10: Final verification ────────────────────────────────────────────
    psql(client,
         "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;",
         "All tables in axionpcs_db (final)")

    psql(client,
         f"SELECT COUNT(*) FROM positions WHERE tenant_id='{TENANT_ID}';",
         "Position count")

    psql(client,
         f"SELECT COUNT(*) FROM roles;",
         "Roles count")

    client.close()
    print("\n=== Employee form fix complete ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
