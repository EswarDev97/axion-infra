"""Diagnose why Position and Role dropdowns are empty on the HRMS employee creation form."""

import io, base64, struct, sys
import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"; PORT = 22; USERNAME = "root"

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

def run(client, cmd, label="", timeout=60):
    if label: print(f"\n{'='*60}\n  {label}\n{'='*60}")
    print(f"$ {cmd[:200]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    combined = (out + err).encode("ascii", "replace").decode()
    if combined.strip(): print(combined.rstrip())
    print(f"[exit={rc}]"); return combined.strip(), rc

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # 1. List all tables in public schema
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "\"SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;\"",
        "1. All tables in axionpcs_db public schema")

    # 2. Count rows in positions table
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "\"SELECT COUNT(*) FROM positions;\"",
        "2. Row count: positions")

    # 3. Count rows in roles table
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "\"SELECT COUNT(*) FROM roles;\"",
        "3. Row count: roles")

    # 4. Sample roles data
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "\"SELECT id, code, name, slug FROM roles LIMIT 10;\"",
        "4. Sample roles rows (id, code, name, slug)")

    # 5. Sample positions data ordered by level
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "\"SELECT id, code, title, level FROM positions ORDER BY level;\"",
        "5. Sample positions rows (id, code, title, level)")

    # 6. Raw curl: positions endpoint (no auth)
    run(client,
        "docker exec axionpcs-hr-service curl -sf "
        "\"http://localhost:8102/api/v1/hr/positions\" "
        "-H \"X-Tenant-Id: 5755b445-9d11-4ce8-994f-2b94d88e5e86\"",
        "6. Raw positions API (no auth token)")

    # 7. Raw curl: departments endpoint (no auth)
    run(client,
        "docker exec axionpcs-hr-service curl -sf "
        "\"http://localhost:8102/api/v1/hr/departments\" "
        "-H \"X-Tenant-Id: 5755b445-9d11-4ce8-994f-2b94d88e5e86\"",
        "7. Raw departments API (no auth token)")

    # 8. Check if departments table exists
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "\"SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='departments' AND table_schema='public');\"",
        "8. Does departments table exist?")

    # 9. hr-service error logs from last 30 minutes
    run(client,
        "docker logs axionpcs-hr-service --since 30m 2>&1 | "
        "grep -E '500|ERROR|error|Exception|depart|position|role' | "
        "grep -v health | tail -30",
        "9. hr-service error/relevant log lines (last 30m)")

    # 10. Head of the initial HR Alembic migration
    run(client,
        "cat /opt/mindflow/backend/services/hr/migrations/versions/20260116_000002_initial_hr_schema.py 2>/dev/null | head -100",
        "10. HR Alembic initial schema migration (first 100 lines)")

    # 11. List files inside the hr-service container
    run(client,
        "docker exec axionpcs-hr-service ls /app",
        "11. Files inside axionpcs-hr-service /app")

    # 12. Check alembic.ini for hr service
    run(client,
        "cat /opt/mindflow/backend/services/hr/alembic.ini 2>/dev/null | head -20",
        "12. HR service alembic.ini (first 20 lines)")

    client.close()
    print("\nDone.")

if __name__ == "__main__":
    sys.exit(main())
