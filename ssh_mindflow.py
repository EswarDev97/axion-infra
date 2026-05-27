"""
Connect to Milesweb proxy server using a PuTTY PPK v3 RSA key.
Steps:
  1. Parse the PPK file.
  2. Reconstruct the RSA key with the `cryptography` library.
  3. Serialize as OpenSSH PEM (in-memory) and load into paramiko.
  4. Run a set of read-only verification commands inside /opt/mindflow.
"""

import base64
import io
import struct
import sys

import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"
PORT = 22
USERNAME = "root"
PROJECT_PATH = "/opt/mindflow"


def _read_mpint(buf: io.BytesIO) -> int:
    (length,) = struct.unpack(">I", buf.read(4))
    data = buf.read(length)
    return int.from_bytes(data, "big", signed=True)


def _read_string(buf: io.BytesIO) -> bytes:
    (length,) = struct.unpack(">I", buf.read(4))
    return buf.read(length)


def load_ppk_as_paramiko_key(ppk_path: str) -> paramiko.PKey:
    with open(ppk_path, "r", encoding="utf-8") as f:
        lines = [ln.rstrip("\r\n") for ln in f.readlines()]

    header = {}
    public_b64 = []
    private_b64 = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if ":" in line and not line.startswith(" "):
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if key == "Public-Lines":
                count = int(value)
                public_b64 = lines[i + 1 : i + 1 + count]
                i += 1 + count
                continue
            if key == "Private-Lines":
                count = int(value)
                private_b64 = lines[i + 1 : i + 1 + count]
                i += 1 + count
                continue
            header[key] = value
        i += 1

    algo = header.get("PuTTY-User-Key-File-3") or header.get("PuTTY-User-Key-File-2")
    if algo != "ssh-rsa":
        raise ValueError(f"Unsupported PPK key type: {algo}")
    if header.get("Encryption", "none") != "none":
        raise ValueError("Encrypted PPK keys are not supported by this loader.")

    pub_blob = base64.b64decode("".join(public_b64))
    priv_blob = base64.b64decode("".join(private_b64))

    pb = io.BytesIO(pub_blob)
    name = _read_string(pb)
    if name != b"ssh-rsa":
        raise ValueError(f"Unexpected algorithm in public blob: {name!r}")
    e = _read_mpint(pb)
    n = _read_mpint(pb)

    sb = io.BytesIO(priv_blob)
    d = _read_mpint(sb)
    p = _read_mpint(sb)
    q = _read_mpint(sb)
    iqmp = _read_mpint(sb)

    dmp1 = rsa.rsa_crt_dmp1(d, p)
    dmq1 = rsa.rsa_crt_dmq1(d, q)

    public_numbers = rsa.RSAPublicNumbers(e=e, n=n)
    private_numbers = rsa.RSAPrivateNumbers(
        p=p, q=q, d=d, dmp1=dmp1, dmq1=dmq1, iqmp=iqmp, public_numbers=public_numbers
    )
    private_key = private_numbers.private_key(default_backend())

    pem_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    )

    return paramiko.RSAKey.from_private_key(io.StringIO(pem_bytes.decode("utf-8")))


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 30) -> None:
    print(f"\n----- $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out:
        print(out.rstrip())
    if err:
        print("[stderr]", err.rstrip())
    print(f"[exit={rc}]")


def main() -> int:
    print(f"Loading PPK: {PPK_PATH}")
    pkey = load_ppk_as_paramiko_key(PPK_PATH)
    fp = pkey.get_fingerprint().hex()
    print(f"Key loaded. Type=ssh-rsa, MD5-fingerprint={':'.join(fp[i:i+2] for i in range(0, len(fp), 2))}")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"\nConnecting to {USERNAME}@{HOST}:{PORT} ...")
    client.connect(
        hostname=HOST,
        port=PORT,
        username=USERNAME,
        pkey=pkey,
        timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )
    print("Connected.")

    commands = [
        "hostname && uname -a",
        "uptime",
        "cat /etc/os-release | head -n 10",
        "whoami && id",
        f"test -d {PROJECT_PATH} && echo PROJECT_DIR_EXISTS || echo PROJECT_DIR_MISSING",
        f"ls -la {PROJECT_PATH}",
        f"du -sh {PROJECT_PATH} 2>/dev/null",
        f"find {PROJECT_PATH} -maxdepth 2 -type d | head -n 60",
        f"find {PROJECT_PATH} -maxdepth 2 -type f | head -n 60",
        f"ls -la {PROJECT_PATH}/.env 2>/dev/null; ls -la {PROJECT_PATH}/.env.* 2>/dev/null",
        f"cat {PROJECT_PATH}/package.json 2>/dev/null | head -n 80",
        f"cat {PROJECT_PATH}/docker-compose.yml 2>/dev/null | head -n 120",
        f"cat {PROJECT_PATH}/docker-compose.yaml 2>/dev/null | head -n 120",
        f"cat {PROJECT_PATH}/Dockerfile 2>/dev/null | head -n 60",
        f"cat {PROJECT_PATH}/README.md 2>/dev/null | head -n 60",
        "which node npm pnpm yarn bun python3 docker nginx pm2 2>/dev/null",
        "node --version 2>/dev/null; npm --version 2>/dev/null; docker --version 2>/dev/null; nginx -v 2>&1 | head -n 1",
        "systemctl list-units --type=service --state=running 2>/dev/null | grep -Ei 'mindflow|node|nginx|docker|pm2' | head -n 30",
        "systemctl status mindflow 2>/dev/null | head -n 20",
        "ls /etc/nginx/sites-available 2>/dev/null; ls /etc/nginx/sites-enabled 2>/dev/null; ls /etc/nginx/conf.d 2>/dev/null",
        "grep -RIl --include='*.conf' -E 'mindflow|mindflow\\.axionpcs\\.in' /etc/nginx 2>/dev/null",
        "for f in $(grep -RIl --include='*.conf' -E 'mindflow|mindflow\\.axionpcs\\.in' /etc/nginx 2>/dev/null); do echo '===' $f '==='; cat $f; done",
        "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}' 2>/dev/null",
        "pm2 list 2>/dev/null | head -n 30",
        f"cd {PROJECT_PATH} && git rev-parse --is-inside-work-tree 2>/dev/null && git remote -v && git branch --show-current && git log -1 --pretty=format:'%h %ad %s%n' --date=iso || echo 'not a git repo'",
        f"ss -tlnp 2>/dev/null | head -n 30",
    ]

    for cmd in commands:
        try:
            run(client, cmd)
        except Exception as ex:
            print(f"[error running cmd] {ex}")

    client.close()
    print("\nDisconnected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
