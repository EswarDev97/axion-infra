"""Upload crm_leads.py fix and restart hr-service."""

import io, base64, struct, sys, os
import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"; PORT = 22; USERNAME = "root"
LOCAL_ROOT = r"D:\Mindflow Project\axion-infra"

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

def run(client, cmd, label="", timeout=120):
    if label: print(f"\n--- {label} ---")
    print(f"$ {cmd[:120]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    while True:
        line = stdout.readline()
        if not line: break
        print(line.rstrip().encode("ascii", "replace").decode())
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if err: print("[stderr]", err[:200].encode("ascii","replace").decode())
    print(f"[exit={rc}]"); return rc

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.")

    # Verify fix locally
    local_file = os.path.join(LOCAL_ROOT, "backend", "services", "hr", "api", "crm_leads.py")
    with open(local_file) as f:
        content = f.read()
    assert "user.user_id" in content and "user.id)" not in content, "Fix not applied!"
    print("Local fix confirmed: user.user_id")

    # Upload fixed file
    sftp = client.open_sftp()
    remote = "/opt/mindflow/backend/services/hr/api/crm_leads.py"
    sftp.put(local_file, remote)
    sftp.close()
    print(f"Uploaded: {remote}")

    # Confirm fix on server
    run(client, f"grep -n 'user_id' {remote}", "user_id references in crm_leads.py")

    # Rebuild hr-service (--no-cache ensures new Python file is picked up)
    rc = run(client,
             "cd /opt/mindflow && docker compose build --no-cache hr-service 2>&1",
             "Rebuild hr-service (no-cache)", timeout=600)
    if rc != 0: print("Build FAILED"); client.close(); return 1

    rc = run(client,
             "cd /opt/mindflow && docker compose up -d hr-service 2>&1",
             "Restart hr-service", timeout=60)
    if rc != 0: print("Restart FAILED"); client.close(); return 1

    import time; time.sleep(10)

    run(client,
        "docker ps --filter 'name=axionpcs-hr-service' --format 'table {{.Names}}\\t{{.Status}}'",
        "Container status")

    run(client, "docker exec axionpcs-hr-service curl -sf http://localhost:8102/health",
        "HR service health")

    # Quick verify: import the module inside container
    run(client,
        "docker exec axionpcs-hr-service python -c \""
        "from services.hr.api.crm_leads import router; "
        "print('crm_leads imported OK, prefix:', router.prefix)\"",
        "Import check")

    client.close()
    print("\n=== Hot-patch deployed ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
