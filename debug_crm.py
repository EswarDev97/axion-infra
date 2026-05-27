"""Fetch recent error logs from hr-service, api-gateway, and frontend."""

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
    print(f"$ {cmd[:120]}")
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

    # Last 100 lines of hr-service logs (most likely source of error)
    run(client, "docker logs axionpcs-hr-service --tail 100 2>&1",
        "hr-service recent logs")

    # Last 80 lines of api-gateway logs
    run(client, "docker logs axionpcs-api-gateway --tail 80 2>&1",
        "api-gateway recent logs")

    # Last 50 lines of frontend logs
    run(client, "docker logs axionpcs-frontend --tail 50 2>&1",
        "frontend recent logs")

    # Test CRM endpoint directly inside hr-service
    run(client,
        "docker exec axionpcs-hr-service python -c \""
        "from services.hr.api import router; "
        "routes = [str(r.path) for r in router.routes]; "
        "crm = [r for r in routes if 'crm' in r]; "
        "print('CRM routes:', crm)\"",
        "CRM routes registered in hr-service")

    # Check if crm_leads table is accessible from hr-service DB connection
    run(client,
        "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
        "'SELECT COUNT(*) FROM crm_leads;'",
        "crm_leads table accessible")

    client.close()

if __name__ == "__main__":
    sys.exit(main())
