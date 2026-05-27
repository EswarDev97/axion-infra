# Secrets Management Design

**Purpose**: Design secure storage, access, and rotation of secrets, credentials, and sensitive configuration

**When to Use**: Any application with API keys, database credentials, encryption keys, or sensitive configuration

---

## Overview

Secrets management design defines how the application stores, accesses, and rotates sensitive credentials and configuration. This stage creates security architectures that prevent credential exposure while enabling operational flexibility.

---

## Technology Selection

### Secrets Management Solutions

| Solution | Type | Best For | Cost |
|----------|------|----------|------|
| HashiCorp Vault | Self-hosted/Cloud | Full-featured, enterprise | $$-$$$ |
| AWS Secrets Manager | Managed | AWS native, auto-rotation | $$ |
| AWS SSM Parameter Store | Managed | Simple config, cost-effective | $ |
| Azure Key Vault | Managed | Azure ecosystem | $$ |
| GCP Secret Manager | Managed | GCP ecosystem | $$ |
| Doppler | SaaS | Developer-friendly | $$ |
| 1Password Secrets | SaaS | Small teams | $$ |

### Selection Criteria

```markdown
## Secrets Management Selection

**Cloud**: [AWS / Azure / GCP / Multi-cloud]
**Requirements**:
- Dynamic secrets: [Yes / No]
- Auto-rotation: [Required / Nice-to-have / Not needed]
- Audit logging: [Required / Nice-to-have]
- HSM backing: [Required / Not needed]

**Budget**: [$ / $$ / $$$]

**Recommendation**: [Solution] because [rationale]
```

---

## Secret Types

### Classification

| Type | Examples | Storage | Rotation |
|------|----------|---------|----------|
| API Keys | Third-party APIs | Secrets Manager | On compromise |
| Database Credentials | PostgreSQL, MongoDB | Secrets Manager/Vault | 30-90 days |
| Encryption Keys | AES keys, RSA keys | KMS / HSM | Yearly |
| Service Tokens | JWT secrets, API tokens | Secrets Manager | On deploy |
| Certificates | TLS certs, mTLS | Certificate Manager | Before expiry |
| OAuth Secrets | Client secrets | Secrets Manager | On compromise |

### Naming Convention

```
[environment]/[service]/[type]/[name]

Examples:
production/api-service/database/postgres
staging/auth-service/api-keys/stripe
development/shared/encryption/aes-key
```

---

## AWS Secrets Manager

### Secret Storage

```typescript
import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

// Store a secret
async function storeSecret(name: string, value: Record<string, any>): Promise<void> {
  await client.send(new CreateSecretCommand({
    Name: name,
    SecretString: JSON.stringify(value),
    Tags: [
      { Key: 'Environment', Value: process.env.ENVIRONMENT },
      { Key: 'Service', Value: process.env.SERVICE_NAME }
    ]
  }));
}

// Retrieve a secret
async function getSecret(name: string): Promise<Record<string, any>> {
  const response = await client.send(new GetSecretValueCommand({
    SecretId: name
  }));

  return JSON.parse(response.SecretString);
}

// Cached secret retrieval
const secretCache = new Map<string, { value: any; expiry: number }>();

async function getSecretCached(name: string, ttlSeconds = 300): Promise<any> {
  const cached = secretCache.get(name);

  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  const value = await getSecret(name);
  secretCache.set(name, {
    value,
    expiry: Date.now() + ttlSeconds * 1000
  });

  return value;
}
```

### Auto-Rotation

```typescript
// Lambda rotation function
export async function handler(event: RotationEvent): Promise<void> {
  const { SecretId, ClientRequestToken, Step } = event;

  switch (Step) {
    case 'createSecret':
      await createNewSecret(SecretId, ClientRequestToken);
      break;
    case 'setSecret':
      await setSecretInService(SecretId, ClientRequestToken);
      break;
    case 'testSecret':
      await testNewSecret(SecretId, ClientRequestToken);
      break;
    case 'finishSecret':
      await finishRotation(SecretId, ClientRequestToken);
      break;
  }
}

async function createNewSecret(secretId: string, token: string): Promise<void> {
  // Generate new credentials
  const newPassword = generateSecurePassword();

  // Store as pending
  await client.send(new PutSecretValueCommand({
    SecretId: secretId,
    ClientRequestToken: token,
    SecretString: JSON.stringify({ password: newPassword }),
    VersionStages: ['AWSPENDING']
  }));
}
```

---

## HashiCorp Vault

### Vault Configuration

```hcl
# Enable secrets engines
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Database secrets engine
path "database/creds/readonly" {
  capabilities = ["read"]
}

# AWS secrets engine
path "aws/creds/deploy" {
  capabilities = ["read"]
}
```

### Vault Client

```typescript
import Vault from 'node-vault';

const vault = Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

// Read static secret
async function getStaticSecret(path: string): Promise<any> {
  const result = await vault.read(`secret/data/${path}`);
  return result.data.data;
}

// Get dynamic database credentials
async function getDatabaseCredentials(role: string): Promise<DatabaseCreds> {
  const result = await vault.read(`database/creds/${role}`);
  return {
    username: result.data.username,
    password: result.data.password,
    lease_id: result.lease_id,
    lease_duration: result.lease_duration
  };
}

// Renew lease
async function renewLease(leaseId: string): Promise<void> {
  await vault.write('sys/leases/renew', { lease_id: leaseId });
}
```

### Dynamic Secrets

```hcl
# Configure database secrets engine
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = "database"
  name          = "postgres"
  allowed_roles = ["readonly", "readwrite"]

  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@db.example.com:5432/mydb"
  }
}

resource "vault_database_secret_backend_role" "readonly" {
  backend             = "database"
  name                = "readonly"
  db_name             = "postgres"
  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]
  default_ttl = 3600
  max_ttl     = 86400
}
```

---

## Environment Variables

### Safe Environment Variable Handling

```typescript
// Never log environment variables
const sensitiveEnvVars = [
  'DATABASE_URL',
  'API_KEY',
  'SECRET_KEY',
  'PRIVATE_KEY',
  'PASSWORD',
  'TOKEN'
];

function sanitizeEnv(env: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (sensitiveEnvVars.some(s => key.toUpperCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Configuration loader with secrets
interface AppConfig {
  database: {
    host: string;
    port: number;
    name: string;
    credentials: {
      username: string;
      password: string;
    };
  };
  redis: {
    url: string;
  };
  api: {
    stripeKey: string;
    sendgridKey: string;
  };
}

async function loadConfig(): Promise<AppConfig> {
  // Load secrets from secrets manager
  const dbCreds = await getSecret('production/api/database/postgres');
  const apiKeys = await getSecret('production/api/api-keys/external');

  return {
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      name: process.env.DB_NAME,
      credentials: dbCreds
    },
    redis: {
      url: process.env.REDIS_URL
    },
    api: {
      stripeKey: apiKeys.stripe,
      sendgridKey: apiKeys.sendgrid
    }
  };
}
```

### Environment-Specific Configuration

```typescript
// Config structure by environment
const configSchema = {
  development: {
    secrets: {
      source: 'env',  // Use .env file
      prefix: 'DEV_'
    }
  },
  staging: {
    secrets: {
      source: 'ssm',
      prefix: '/staging/'
    }
  },
  production: {
    secrets: {
      source: 'secretsManager',
      prefix: 'production/'
    }
  }
};
```

---

## Kubernetes Secrets

### External Secrets Operator

```yaml
# ExternalSecret - syncs from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: api-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        key: production/api/database
        property: url
    - secretKey: api-key
      remoteRef:
        key: production/api/api-keys
        property: stripe
```

### Sealed Secrets

```yaml
# Encrypted secret for GitOps
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: api-secrets
spec:
  encryptedData:
    database-url: AgBy8hCj...encrypted...
    api-key: AgAn7kLm...encrypted...
```

### Pod Secret Mounting

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-pod
spec:
  containers:
    - name: api
      image: api:latest
      env:
        # As environment variable
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
      volumeMounts:
        # As file
        - name: secrets-volume
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secrets-volume
      secret:
        secretName: api-secrets
```

---

## Secret Rotation

### Rotation Strategy

```markdown
## Rotation Policy

| Secret Type | Rotation Frequency | Method |
|-------------|-------------------|--------|
| Database passwords | 30 days | Automated via Secrets Manager |
| API keys (internal) | 90 days | Automated |
| API keys (external) | On compromise | Manual |
| Encryption keys | 1 year | Key versioning |
| TLS certificates | 90 days | Auto-renewal (Let's Encrypt/ACM) |
| JWT signing keys | 30 days | Key rotation with overlap |
```

### Zero-Downtime Rotation

```typescript
// JWT signing key rotation
interface SigningKeySet {
  current: { kid: string; key: string; createdAt: Date };
  previous?: { kid: string; key: string; createdAt: Date };
}

class JWTKeyRotation {
  private keySet: SigningKeySet;

  async rotateKeys(): Promise<void> {
    const newKey = await generateSigningKey();
    const newKid = crypto.randomUUID();

    // Move current to previous
    this.keySet = {
      current: { kid: newKid, key: newKey, createdAt: new Date() },
      previous: this.keySet.current
    };

    // Store new key set
    await this.storeKeys(this.keySet);
  }

  signToken(payload: any): string {
    return jwt.sign(payload, this.keySet.current.key, {
      keyid: this.keySet.current.kid,
      algorithm: 'RS256'
    });
  }

  verifyToken(token: string): any {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded.header.kid;

    // Try current key
    if (kid === this.keySet.current.kid) {
      return jwt.verify(token, this.keySet.current.key);
    }

    // Try previous key (for tokens issued before rotation)
    if (this.keySet.previous && kid === this.keySet.previous.kid) {
      return jwt.verify(token, this.keySet.previous.key);
    }

    throw new Error('Unknown signing key');
  }
}
```

---

## Audit Logging

### Access Logging

```typescript
// Log all secret access
async function getSecretWithAudit(
  secretId: string,
  context: { userId?: string; service: string; reason: string }
): Promise<any> {
  const startTime = Date.now();

  try {
    const secret = await secretsManager.getSecretValue({ SecretId: secretId });

    // Log successful access
    await auditLog.write({
      event: 'secret_access',
      secretId,
      action: 'read',
      success: true,
      userId: context.userId,
      service: context.service,
      reason: context.reason,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });

    return secret;
  } catch (error) {
    // Log failed access
    await auditLog.write({
      event: 'secret_access',
      secretId,
      action: 'read',
      success: false,
      error: error.message,
      userId: context.userId,
      service: context.service,
      reason: context.reason,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}
```

### Compliance Requirements

```markdown
## Audit Requirements

### SOC 2
- Log all secret access attempts
- Log all secret modifications
- Log all access policy changes
- Retain logs for 1 year

### HIPAA
- Encrypt audit logs at rest
- Log access to PHI-related secrets
- Implement access reviews quarterly

### PCI-DSS
- Rotate encryption keys annually
- Log all access to payment-related secrets
- Implement multi-person control for critical secrets
```

---

## Best Practices Checklist

```markdown
## Secrets Management Checklist

### Storage
- [ ] Never store secrets in code or version control
- [ ] Use dedicated secrets management solution
- [ ] Encrypt secrets at rest and in transit
- [ ] Implement access controls (least privilege)

### Access
- [ ] Use short-lived credentials where possible
- [ ] Implement secret caching with appropriate TTL
- [ ] Log all secret access for audit
- [ ] Use service-specific credentials (no shared secrets)

### Rotation
- [ ] Define rotation policy for all secret types
- [ ] Automate rotation where possible
- [ ] Implement zero-downtime rotation
- [ ] Test rotation procedures regularly

### Monitoring
- [ ] Alert on unusual access patterns
- [ ] Monitor for exposed secrets (GitHub scanning)
- [ ] Implement secret sprawl detection
- [ ] Regular access reviews
```

---

## Design Document Template

```markdown
# Secrets Management Design - [Application]

## 1. Overview
- Services covered: [list]
- Secret types: [database, API keys, encryption keys]
- Compliance requirements: [SOC2, HIPAA, PCI-DSS]

## 2. Technology
- Primary solution: [Vault / AWS Secrets Manager / etc.]
- Backup/DR: [strategy]

## 3. Secret Inventory
| Secret | Type | Location | Rotation |
|--------|------|----------|----------|
| [name] | [type] | [path] | [frequency] |

## 4. Access Control
| Service/Role | Secrets Access |
|--------------|----------------|
| [service] | [secret paths] |

## 5. Rotation Policy
| Secret Type | Frequency | Method |
|-------------|-----------|--------|
| [type] | [frequency] | [auto/manual] |

## 6. Audit Requirements
- Log retention: [duration]
- Access reviews: [frequency]
- Compliance mapping: [requirements]

## 7. Emergency Procedures
- Compromised secret response
- Emergency rotation procedure
- Break-glass access
```

---

## References

- Auth Design: `rules/construction/auth-design.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
- Security Rules: `guidelines/security-rules.json`
- Observability Design: `rules/construction/observability-design.md`
