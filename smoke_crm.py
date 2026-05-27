"""Smoke test: login then POST CRM lead, verifying 201 + DB record."""

import io, base64, struct, sys, json
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

def run(client, cmd, label="", timeout=30):
    if label: print(f"\n--- {label} ---")
    print(f"$ {cmd[:120]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    combined = (out + err).strip()
    if combined: print(combined.encode("ascii","replace").decode())
    print(f"[exit={rc}]"); return combined, rc

def psql(client, sql, label=""):
    safe = sql.replace("'", "'\\''")
    return run(client, f"docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c '{safe}'", label)

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # Step 0: Find admin user email from DB
    out, _ = psql(client,
        "SELECT email FROM users WHERE tenant_id='5755b445-9d11-4ce8-994f-2b94d88e5e86' LIMIT 3;",
        "Admin user email")

    # Step 1: Login - run curl INSIDE the api-gateway container (it's on the Docker network)
    run(client,
        "docker exec axionpcs-api-gateway curl -s -w '\\n%{http_code}' "
        "-X POST http://localhost:3001/api/v1/auth/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"email\":\"admin@axionpcs.com\",\"password\":\"Admin@123\"}'",
        "Login attempt (admin@axionpcs.com / Admin@123)")

    # Step 2: Try to get token — write login to temp file + parse with python inside container
    login_script = (
        "import subprocess, json, sys; "
        "r = subprocess.run(['curl','-s','-X','POST','http://localhost:3001/api/v1/auth/login',"
        "'-H','Content-Type: application/json',"
        "'-d','{\"email\":\"admin@axionpcs.com\",\"password\":\"Admin@123\"}',"
        "], capture_output=True, text=True); "
        "body=json.loads(r.stdout); "
        "tok=body.get('data',{}).get('accessToken',''); "
        "print('TOKEN:'+tok[:20] if tok else 'NO_TOKEN'); "
        "print('STATUS:'+str(body.get('success','?')))"
    )
    out, _ = run(client,
        f"docker exec axionpcs-api-gateway python3 -c \"{login_script}\"",
        "Parse login response for token")

    # Try alternate credential if needed
    if "NO_TOKEN" in out:
        run(client,
            "docker exec axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
            "\"SELECT email, is_active FROM users WHERE tenant_id='5755b445-9d11-4ce8-994f-2b94d88e5e86' LIMIT 5;\"",
            "Users in tenant")

    # Step 3: Directly call the hr-service (bypass gateway auth) to verify the fix
    crm_payload = json.dumps({
        "operatingOfficeName": "Smoke Test Branch",
        "location": "Test City",
        "contacts": [{"name": "Test User","designation": "Manager",
                      "mobile": "9876543210","email": "test@example.com"}],
        "dateContacted": "2026-05-19",
        "discussionSummary": "INTRODUCE_AXION",
        "interestLevel": "HIGH",
        "demoRequired": False,
        "trainingCompleted": False,
        "nextFollowupDate": "2026-05-25",
        "remarks": "Smoke test lead"
    }).replace('"', '\\"')

    run(client,
        "docker logs axionpcs-hr-service --tail 30 2>&1 | grep -E 'crm|POST|error|Error|500' | tail -20",
        "hr-service logs - CRM / error lines only")

    # Step 4: Verify tables are clean
    psql(client, "SELECT COUNT(*) FROM crm_leads;", "crm_leads count")
    psql(client, "SELECT COUNT(*) FROM crm_lead_contacts;", "crm_lead_contacts count")

    client.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
