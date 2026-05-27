"""Create all missing HR tables via direct SQL and seed reference data."""

import io, base64, struct, sys
import paramiko
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

PPK_PATH = r"D:\Mindflow Project\Milesweb-Proxy-Server.ppk"
HOST = "103.108.220.42"; PORT = 22; USERNAME = "root"
DB_CONTAINER = "axionpcs-postgres"
DB_USER = "axionpcs"
DB_NAME = "axionpcs_db"
TENANT_ID = "5755b445-9d11-4ce8-994f-2b94d88e5e86"
ADMIN_ID = "0f47dc26-c97b-4fb1-96a5-560786547a0d"

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
    if label: print(f"\n--- {label} ---")
    print(f"$ {cmd[:120]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    combined = (out + err).strip()
    if combined: print(combined.encode("ascii","replace").decode())
    print(f"[exit={rc}]"); return combined, rc

def psql_script(client, sql, label=""):
    """Write SQL to file on server and pipe to psql to avoid shell-quoting issues."""
    sftp = client.open_sftp()
    remote = "/tmp/_hr_tables.sql"
    with sftp.file(remote, 'w') as f:
        f.write(sql)
    sftp.close()
    return run(client,
               f"docker exec -i {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} < {remote}",
               label)

def main():
    pkey = load_ppk(PPK_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USERNAME, pkey=pkey,
                   timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected.\n")

    # ── Create all missing HR tables ──────────────────────────────────────────
    HR_SCHEMA_SQL = """
-- ============================================================
-- HR Module Tables (from HR Alembic migration 002)
-- ============================================================

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id),
    code           VARCHAR(50) NOT NULL,
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    parent_id      UUID        REFERENCES departments(id),
    manager_id     UUID,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by     UUID        REFERENCES users(id),
    updated_by     UUID        REFERENCES users(id),
    CONSTRAINT uq_departments_tenant_code UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS ix_departments_tenant_id  ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS ix_departments_parent_id  ON departments(parent_id);

-- POSITIONS
CREATE TABLE IF NOT EXISTS positions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenants(id),
    code           VARCHAR(50) NOT NULL,
    title          VARCHAR(100) NOT NULL,
    description    TEXT,
    department_id  UUID        REFERENCES departments(id),
    level          INTEGER     NOT NULL DEFAULT 1,
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by     UUID        REFERENCES users(id),
    updated_by     UUID        REFERENCES users(id),
    CONSTRAINT uq_positions_tenant_code UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS ix_positions_tenant_id     ON positions(tenant_id);
CREATE INDEX IF NOT EXISTS ix_positions_department_id ON positions(department_id);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES tenants(id),
    user_id          UUID        REFERENCES users(id),
    employee_code    VARCHAR(50) NOT NULL,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(20),
    position_id      UUID        NOT NULL REFERENCES positions(id),
    department_id    UUID        REFERENCES departments(id),
    manager_id       UUID        REFERENCES employees(id),
    date_of_joining  DATE        NOT NULL,
    date_of_exit     DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    employment_type  VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    salary           NUMERIC(12,2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by       UUID        REFERENCES users(id),
    updated_by       UUID        REFERENCES users(id),
    is_deleted       BOOLEAN     NOT NULL DEFAULT false,
    deleted_at       TIMESTAMPTZ,
    deletion_reason  VARCHAR(255),
    CONSTRAINT uq_employees_tenant_code  UNIQUE (tenant_id, employee_code),
    CONSTRAINT uq_employees_tenant_email UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS ix_employees_tenant_id     ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS ix_employees_user_id       ON employees(user_id);
CREATE INDEX IF NOT EXISTS ix_employees_position_id   ON employees(position_id);
CREATE INDEX IF NOT EXISTS ix_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS ix_employees_manager_id    ON employees(manager_id);

-- Add manager_id FK to departments (deferred due to circular reference with employees)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_departments_manager_id'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT fk_departments_manager_id
      FOREIGN KEY (manager_id) REFERENCES employees(id);
  END IF;
END $$;

-- LEAVE_TYPES
CREATE TABLE IF NOT EXISTS leave_types (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES tenants(id),
    code              VARCHAR(30) NOT NULL,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    default_days      INTEGER     NOT NULL DEFAULT 0,
    is_paid           BOOLEAN     NOT NULL DEFAULT true,
    requires_approval BOOLEAN     NOT NULL DEFAULT true,
    is_active         BOOLEAN     NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        UUID        REFERENCES users(id),
    updated_by        UUID        REFERENCES users(id),
    CONSTRAINT uq_leave_types_tenant_code UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS ix_leave_types_tenant_id ON leave_types(tenant_id);

-- LEAVE_BALANCES
CREATE TABLE IF NOT EXISTS leave_balances (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL REFERENCES tenants(id),
    employee_id       UUID        NOT NULL REFERENCES employees(id),
    leave_type_id     UUID        NOT NULL REFERENCES leave_types(id),
    year              INTEGER     NOT NULL,
    total_days        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    used_days         NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    pending_days      NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    carried_over_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leave_balances_employee_type_year UNIQUE (tenant_id, employee_id, leave_type_id, year)
);
CREATE INDEX IF NOT EXISTS ix_leave_balances_tenant_id     ON leave_balances(tenant_id);
CREATE INDEX IF NOT EXISTS ix_leave_balances_employee_id   ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS ix_leave_balances_leave_type_id ON leave_balances(leave_type_id);

-- LEAVE_REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES tenants(id),
    employee_id      UUID        NOT NULL REFERENCES employees(id),
    leave_type_id    UUID        NOT NULL REFERENCES leave_types(id),
    start_date       DATE        NOT NULL,
    end_date         DATE        NOT NULL,
    days_requested   NUMERIC(5,2) NOT NULL,
    reason           TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by      UUID        REFERENCES employees(id),
    approved_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by       UUID        REFERENCES users(id),
    updated_by       UUID        REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_leave_requests_tenant_id     ON leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS ix_leave_requests_employee_id   ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS ix_leave_requests_leave_type_id ON leave_requests(leave_type_id);

-- ATTENDANCE_RECORDS
CREATE TABLE IF NOT EXISTS attendance_records (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id),
    employee_id UUID        NOT NULL REFERENCES employees(id),
    date        DATE        NOT NULL,
    check_in    TIMESTAMPTZ,
    check_out   TIMESTAMPTZ,
    work_hours  NUMERIC(4,2),
    status      VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    source      VARCHAR(30) NOT NULL DEFAULT 'WEB_PORTAL',
    overtime_hours NUMERIC(4,2),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_employee_date UNIQUE (tenant_id, employee_id, date)
);
CREATE INDEX IF NOT EXISTS ix_attendance_records_tenant_id   ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS ix_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS ix_attendance_records_date        ON attendance_records(date);

-- PAYROLL_REFERENCES
CREATE TABLE IF NOT EXISTS payroll_references (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID         NOT NULL REFERENCES tenants(id),
    employee_id    UUID         NOT NULL REFERENCES employees(id),
    effective_from DATE         NOT NULL,
    effective_to   DATE,
    base_salary    NUMERIC(12,2) NOT NULL,
    currency       VARCHAR(3)   NOT NULL DEFAULT 'INR',
    pay_frequency  VARCHAR(20)  NOT NULL DEFAULT 'MONTHLY',
    bank_name      VARCHAR(100),
    bank_account   VARCHAR(50),
    tax_id         VARCHAR(50),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by     UUID         REFERENCES users(id),
    updated_by     UUID         REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_payroll_references_tenant_id   ON payroll_references(tenant_id);
CREATE INDEX IF NOT EXISTS ix_payroll_references_employee_id ON payroll_references(employee_id);

-- CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id),
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(20),
    position_id      UUID         REFERENCES positions(id),
    resume_file_id   UUID,
    status           VARCHAR(30)  NOT NULL DEFAULT 'APPLIED',
    source           VARCHAR(50),
    notes            TEXT,
    applied_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       UUID         REFERENCES users(id),
    updated_by       UUID         REFERENCES users(id),
    is_deleted       BOOLEAN      NOT NULL DEFAULT false,
    deleted_at       TIMESTAMPTZ,
    deletion_reason  VARCHAR(255),
    CONSTRAINT uq_candidates_tenant_email_position UNIQUE (tenant_id, email, position_id)
);
CREATE INDEX IF NOT EXISTS ix_candidates_tenant_id   ON candidates(tenant_id);
CREATE INDEX IF NOT EXISTS ix_candidates_position_id ON candidates(position_id);

-- WEEKLY_OFF_CONFIG (needed by attendance service)
CREATE TABLE IF NOT EXISTS weekly_off_config (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID    NOT NULL REFERENCES tenants(id),
    day_of_week INTEGER NOT NULL,
    is_off      BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_weekly_off_tenant_day UNIQUE (tenant_id, day_of_week)
);

-- ATTENDANCE_CONFIG (needed by attendance service)
CREATE TABLE IF NOT EXISTS attendance_config (
    id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID    NOT NULL UNIQUE REFERENCES tenants(id),
    work_hours_per_day    NUMERIC(4,2) NOT NULL DEFAULT 8.0,
    overtime_threshold    NUMERIC(4,2) NOT NULL DEFAULT 9.0,
    late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
    grace_period_minutes  INTEGER NOT NULL DEFAULT 5,
    auto_checkout_hour    INTEGER NOT NULL DEFAULT 20,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all HR tables
ALTER TABLE departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates        ENABLE ROW LEVEL SECURITY;

-- RLS policies (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='departments' AND policyname='departments_tenant_isolation') THEN
    CREATE POLICY departments_tenant_isolation ON departments FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.current_tenant_id',true)::uuid, tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='positions' AND policyname='positions_tenant_isolation') THEN
    CREATE POLICY positions_tenant_isolation ON positions FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.current_tenant_id',true)::uuid, tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employees' AND policyname='employees_tenant_isolation') THEN
    CREATE POLICY employees_tenant_isolation ON employees FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.current_tenant_id',true)::uuid, tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_types' AND policyname='leave_types_tenant_isolation') THEN
    CREATE POLICY leave_types_tenant_isolation ON leave_types FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.current_tenant_id',true)::uuid, tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance_records' AND policyname='attendance_records_tenant_isolation') THEN
    CREATE POLICY attendance_records_tenant_isolation ON attendance_records FOR ALL
    USING (tenant_id = COALESCE(current_setting('app.current_tenant_id',true)::uuid, tenant_id));
  END IF;
END $$;
"""

    psql_script(client, HR_SCHEMA_SQL, "Create all missing HR tables (idempotent)")

    # ── Verify tables created ─────────────────────────────────────────────────
    run(client,
        f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c "
        "'SELECT table_name FROM information_schema.tables WHERE table_schema=\\'public\\' "
        "AND table_name IN (\\'departments\\',\\'positions\\',\\'employees\\',\\'leave_types\\',"
        "\\'leave_balances\\',\\'leave_requests\\',\\'attendance_records\\',"
        "\\'payroll_references\\',\\'candidates\\',\\'weekly_off_config\\',\\'attendance_config\\')"
        " ORDER BY table_name;'",
        "Verify HR tables created")

    # ── Seed 21 positions ─────────────────────────────────────────────────────
    POSITIONS_SQL = f"""
INSERT INTO positions (tenant_id, code, title, level, is_active, created_by, updated_by) VALUES
('{TENANT_ID}','CEO','CEO',10,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','NATIONAL_INCHARGE','National Incharge',9,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','STATE_ADMIN','State Admin',8,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','DIRECTOR','Director',7,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','VP','Vice President',7,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','MANAGER','Manager',6,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','HR_MANAGER','HR Manager',6,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','TEAM_LEAD','Team Lead',5,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','EXECUTIVE','Executive',5,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','PROJECT_MANAGER','Project Manager',5,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','SR_DEVELOPER','Senior Developer',4,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','DEVOPS_ENGINEER','DevOps Engineer',4,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','BUSINESS_ANALYST','Business Analyst',4,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','DEVELOPER','Developer',3,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','HR_EXECUTIVE','HR Executive',3,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','ACCOUNTANT','Accountant',3,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','DESIGNER','Designer',3,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','QA_ENGINEER','QA Engineer',3,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','JR_DEVELOPER','Junior Developer',2,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','EMPLOYEE','Employee',2,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','INTERN','Intern',1,true,'{ADMIN_ID}','{ADMIN_ID}')
ON CONFLICT ON CONSTRAINT uq_positions_tenant_code DO NOTHING;
"""
    psql_script(client, POSITIONS_SQL, "Seed 21 standard positions")

    # ── Seed roles ────────────────────────────────────────────────────────────
    ROLES_SQL = f"""
INSERT INTO roles (tenant_id, code, name, description, is_system_role, created_by, updated_by) VALUES
('{TENANT_ID}','SUPER_ADMIN','Super Admin','Full system access with all permissions',true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','ADMIN','Admin','Administrative access',true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','HR_MANAGER','HR Manager','HR management access',false,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','MANAGER','Manager','Team management access',false,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','EMPLOYEE','Employee','Standard employee access',false,'{ADMIN_ID}','{ADMIN_ID}')
ON CONFLICT ON CONSTRAINT roles_tenant_id_code_key DO NOTHING;
"""
    psql_script(client, ROLES_SQL, "Seed roles (5 standard roles)")

    # ── Seed leave types ──────────────────────────────────────────────────────
    LEAVE_SQL = f"""
INSERT INTO leave_types (tenant_id, code, name, description, default_days, is_paid, requires_approval, is_active, created_by, updated_by) VALUES
('{TENANT_ID}','CL','Casual Leave','Casual / privilege leave',12,true,true,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','SL','Sick Leave','Medical / sick leave',10,true,true,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','EL','Earned Leave','Annual earned leave',15,true,true,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','ML','Maternity Leave','Maternity leave',180,true,true,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','PL','Paternity Leave','Paternity leave',15,true,true,true,'{ADMIN_ID}','{ADMIN_ID}'),
('{TENANT_ID}','COMP','Compensatory Leave','Compensatory off',0,true,true,true,'{ADMIN_ID}','{ADMIN_ID}')
ON CONFLICT ON CONSTRAINT uq_leave_types_tenant_code DO NOTHING;
"""
    psql_script(client, LEAVE_SQL, "Seed 6 leave types")

    # ── Seed weekly off config (Sat+Sun off) ──────────────────────────────────
    WEEKLY_OFF_SQL = f"""
INSERT INTO weekly_off_config (tenant_id, day_of_week, is_off) VALUES
('{TENANT_ID}', 0, false),
('{TENANT_ID}', 1, false),
('{TENANT_ID}', 2, false),
('{TENANT_ID}', 3, false),
('{TENANT_ID}', 4, false),
('{TENANT_ID}', 5, true),
('{TENANT_ID}', 6, true)
ON CONFLICT ON CONSTRAINT uq_weekly_off_tenant_day DO NOTHING;
"""
    psql_script(client, WEEKLY_OFF_SQL, "Seed weekly off config (Sat+Sun)")

    # ── Seed attendance config ────────────────────────────────────────────────
    ATTEND_CONFIG_SQL = f"""
INSERT INTO attendance_config (tenant_id, work_hours_per_day, overtime_threshold, late_threshold_minutes)
VALUES ('{TENANT_ID}', 8.0, 9.0, 15)
ON CONFLICT (tenant_id) DO NOTHING;
"""
    psql_script(client, ATTEND_CONFIG_SQL, "Seed attendance config")

    # ── Final verification ────────────────────────────────────────────────────
    run(client,
        f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c "
        "'SELECT COUNT(*) FROM positions; SELECT COUNT(*) FROM roles; SELECT COUNT(*) FROM leave_types;'",
        "Final row counts")

    run(client,
        f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c "
        f"'SELECT code, title, level FROM positions WHERE tenant_id=''{TENANT_ID}'' ORDER BY level DESC, title LIMIT 25;'",
        "All positions")

    run(client,
        f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c "
        f"'SELECT code, name FROM roles WHERE tenant_id=''{TENANT_ID}'';'",
        "All roles")

    client.close()
    print("\n=== HR tables created and seeded ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
