"""
Read Position SQLAlchemy model and baseline Alembic migration,
then create positions table if missing and insert 'Executive'.
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

    # Read Position SQLAlchemy model
    run(client, "cat /opt/mindflow/backend/services/hr/models/position.py",
        "Position SQLAlchemy model")

    # Read baseline Alembic migration - positions section
    run(client,
        "grep -n -A 30 'positions' /opt/mindflow/backend/alembic/versions/20260125_000000_baseline_schema.py | head -60",
        "positions in baseline migration")

    # Current tables in axionpcs_db
    psql(client,
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;",
        "All tables in axionpcs_db")

    client.close()
    print("\nDisconnected.")

if __name__ == "__main__":
    sys.exit(main())
