"""Verify CRM files are inside containers and rebuild --no-cache if needed."""

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

def run(client, cmd, label="", timeout=600):
    if label: print(f"\n--- {label} ---")
    print(f"$ {cmd[:120]}{'...' if len(cmd)>120 else ''}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    while True:
        line = stdout.readline()
        if not line: break
        print(line.rstrip().encode("ascii", "replace").decode())
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if err: print("[stderr]", err.rstrip().encode("ascii","replace").decode()[:300])
    print(f"[exit={rc}]"); return rc

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # 1. Check if CRM files exist inside containers
    print("=== Checking CRM files inside containers ===")
    rc_hr = run(client,
        "docker exec axionpcs-hr-service ls /app/services/hr/api/crm_leads.py "
        "/app/services/hr/models/crm_lead.py /app/services/hr/services/crm_lead_service.py 2>&1",
        "CRM files in hr-service")

    rc_gw = run(client,
        "docker exec axionpcs-api-gateway ls /app/dist/routes/crm.routes.js 2>/dev/null "
        "|| docker exec axionpcs-api-gateway ls /app/src/routes/crm.routes.ts 2>&1",
        "CRM route in api-gateway")

    rc_fe = run(client,
        "docker exec axionpcs-frontend ls /app/src/services/crm/crmService.ts 2>/dev/null "
        "|| docker exec axionpcs-frontend find /app -name 'crmService*' 2>&1 | head -5",
        "CRM service in frontend")

    if rc_hr != 0 or rc_gw != 0:
        print("\nNEW FILES NOT IN CONTAINERS — forcing --no-cache rebuild...")

        rc = run(client,
                 "cd /opt/mindflow && docker compose build --no-cache hr-service 2>&1",
                 "Force rebuild hr-service (no cache)", timeout=600)
        if rc != 0: print("hr-service rebuild FAILED"); client.close(); return 1

        rc = run(client,
                 "cd /opt/mindflow && docker compose build --no-cache api-gateway 2>&1",
                 "Force rebuild api-gateway (no cache)", timeout=600)
        if rc != 0: print("api-gateway rebuild FAILED"); client.close(); return 1

        rc = run(client,
                 "cd /opt/mindflow && docker compose build --no-cache frontend 2>&1",
                 "Force rebuild frontend (no cache)", timeout=900)
        if rc != 0: print("frontend rebuild FAILED"); client.close(); return 1

        rc = run(client,
                 "cd /opt/mindflow && docker compose up -d hr-service api-gateway frontend 2>&1",
                 "Restart containers", timeout=120)
        if rc != 0: print("Restart FAILED"); client.close(); return 1

        import time; time.sleep(15)

    # 2. Re-verify files are now in containers
    print("\n=== Final verification ===")
    run(client,
        "docker exec axionpcs-hr-service ls -la /app/services/hr/api/crm_leads.py "
        "/app/services/hr/models/crm_lead.py /app/services/hr/services/crm_lead_service.py",
        "HR service CRM files")

    run(client,
        "docker ps --filter 'name=axionpcs-hr-service' --filter 'name=axionpcs-api-gateway' "
        "--filter 'name=axionpcs-frontend' "
        "--format 'table {{.Names}}\\t{{.Status}}'",
        "Container status")

    run(client, "docker exec axionpcs-hr-service curl -sf http://localhost:8102/health",
        "HR service health")

    # 3. Check CRM routes are registered in the hr-service
    run(client,
        "docker exec axionpcs-hr-service python -c "
        "\"from services.hr.api.crm_leads import router; print('CRM router OK:', router.prefix)\"",
        "CRM router import check")

    # 4. Check frontend has the CRM page
    run(client,
        "docker exec axionpcs-frontend find /app -path '*dashboard/crm*' -name '*.js' 2>/dev/null | head -10",
        "Frontend CRM pages (compiled)")

    client.close()
    print("\n=== Verification complete ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
