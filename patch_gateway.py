"""Upload patched app.ts and rebuild api-gateway only."""

import io, base64, struct, sys
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

def run(client, cmd, label="", timeout=600):
    if label: print(f"\n--- {label} ---")
    print(f"$ {cmd[:120]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    while True:
        line = stdout.readline()
        if not line: break
        print(line.rstrip().encode("ascii", "replace").decode())
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if err: print("[stderr]", err[:300].encode("ascii","replace").decode())
    print(f"[exit={rc}]"); return rc

def main():
    import os
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.")

    # Upload patched app.ts
    sftp = client.open_sftp()
    local_app = os.path.join(LOCAL_ROOT, "api-gateway", "src", "app.ts")
    remote_app = "/opt/mindflow/api-gateway/src/app.ts"
    sftp.put(local_app, remote_app)
    print(f"Uploaded: {remote_app}")
    sftp.close()

    # Confirm the fix is in the file
    run(client, "grep -n 'crm' /opt/mindflow/api-gateway/src/app.ts", "Confirm /api/v1/crm in skipBodyParserPaths")

    # Rebuild api-gateway (--no-cache to force TypeScript recompile)
    rc = run(client,
             "cd /opt/mindflow && docker compose build --no-cache api-gateway 2>&1",
             "Rebuild api-gateway (no-cache)", timeout=600)
    if rc != 0: print("Build FAILED"); client.close(); return 1

    # Restart
    rc = run(client,
             "cd /opt/mindflow && docker compose up -d api-gateway 2>&1",
             "Restart api-gateway", timeout=60)
    if rc != 0: print("Restart FAILED"); client.close(); return 1

    import time; time.sleep(10)

    run(client,
        "docker ps --filter 'name=axionpcs-api-gateway' --format 'table {{.Names}}\\t{{.Status}}'",
        "Container status")

    # Quick smoke test: POST to CRM endpoint from within the network
    # (expect 401/403 without auth token — that's fine, means it reached hr-service)
    run(client,
        "docker exec axionpcs-api-gateway curl -s -o /dev/null -w '%{http_code}' "
        "-X POST http://localhost:3001/api/v1/crm/leads "
        "-H 'Content-Type: application/json' -d '{}'",
        "POST /api/v1/crm/leads smoke test (expect 401/422 not -)")

    client.close()
    print("\n=== api-gateway patched and restarted ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
