# Authentication & Authorization Design

**Purpose**: Design secure authentication and authorization systems for applications

**When to Use**: Any application requiring user identity, access control, or API security

---

## Overview

Auth design defines how the application verifies user identity (authentication) and controls access to resources (authorization). This stage creates security architectures that balance usability, security, and compliance requirements.

---

## Authentication Patterns

### Authentication Methods

| Method | Best For | Security | UX |
|--------|----------|----------|-----|
| Password | Traditional apps | Medium | Good |
| OAuth2/OIDC | Social login, SSO | High | Excellent |
| Magic Link | Passwordless | High | Good |
| OTP/2FA | Additional security | Very High | Medium |
| Passkeys/WebAuthn | Modern passwordless | Very High | Excellent |
| API Keys | Machine-to-machine | Medium | N/A |
| mTLS | Service mesh | Very High | N/A |

### Provider Selection

| Provider | Best For | Cost | Features |
|----------|----------|------|----------|
| Auth0 | Full-featured, quick start | $$$ | Extensive |
| AWS Cognito | AWS ecosystem | $$ | Good |
| Firebase Auth | Mobile/web apps | $ | Basic |
| Keycloak | Self-hosted, enterprise | Free | Full-featured |
| Clerk | Modern DX, React focus | $$ | Good |
| WorkOS | Enterprise SSO | $$$ | Enterprise |
| Custom | Full control | Development cost | Custom |

---

## Password Authentication

### Password Requirements

```typescript
interface PasswordPolicy {
  minLength: number;          // Minimum 12 characters
  maxLength: number;          // Maximum 128 characters
  requireUppercase: boolean;  // At least 1 uppercase
  requireLowercase: boolean;  // At least 1 lowercase
  requireNumbers: boolean;    // At least 1 number
  requireSpecial: boolean;    // At least 1 special char
  preventCommon: boolean;     // Block common passwords
  preventReuse: number;       // Prevent last N passwords
}

const passwordPolicy: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  preventCommon: true,
  preventReuse: 5
};
```

### Password Hashing

```typescript
import bcrypt from 'bcrypt';
import argon2 from 'argon2';

// Bcrypt (widely used)
const BCRYPT_ROUNDS = 12;

async function hashPasswordBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPasswordBcrypt(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Argon2 (recommended, memory-hard)
async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,    // 64 MB
    timeCost: 3,          // iterations
    parallelism: 4        // threads
  });
}

async function verifyPasswordArgon2(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Account Security

```typescript
// Rate limiting for login
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: 'Too many login attempts, please try again later',
  keyGenerator: (req) => req.body.email || req.ip
});

// Account lockout
interface AccountLockout {
  maxAttempts: number;
  lockoutDuration: number;  // minutes
  resetOnSuccess: boolean;
}

async function handleFailedLogin(userId: string): Promise<void> {
  const attempts = await incrementFailedAttempts(userId);

  if (attempts >= config.maxAttempts) {
    await lockAccount(userId, config.lockoutDuration);
    await sendLockoutNotification(userId);
  }
}
```

---

## JWT Authentication

### Token Structure

```typescript
interface JWTPayload {
  // Standard claims
  sub: string;          // Subject (user ID)
  iss: string;          // Issuer
  aud: string;          // Audience
  exp: number;          // Expiration
  iat: number;          // Issued at
  jti: string;          // JWT ID

  // Custom claims
  email: string;
  role: string;
  permissions: string[];
  tenantId?: string;
}

// Token configuration
const tokenConfig = {
  accessToken: {
    expiresIn: '15m',
    algorithm: 'RS256'
  },
  refreshToken: {
    expiresIn: '7d',
    algorithm: 'RS256'
  }
};
```

### Token Management

```typescript
class TokenService {
  async generateTokens(user: User): Promise<TokenPair> {
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '15m',
        issuer: 'api.example.com',
        audience: 'example.com'
      }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, jti: uuid() },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '7d'
      }
    );

    // Store refresh token for revocation
    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const decoded = jwt.verify(refreshToken, this.publicKey);

    // Check if token is revoked
    const isValid = await this.isRefreshTokenValid(decoded.sub, decoded.jti);
    if (!isValid) {
      throw new Error('Refresh token revoked');
    }

    // Revoke old refresh token (rotation)
    await this.revokeRefreshToken(decoded.sub, decoded.jti);

    // Generate new tokens
    const user = await this.userService.findById(decoded.sub);
    return this.generateTokens(user);
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.redis.del(`refresh_tokens:${userId}`);
  }
}
```

---

## OAuth2 / OpenID Connect

### OAuth2 Flows

| Flow | Use Case | Security |
|------|----------|----------|
| Authorization Code + PKCE | Web/mobile apps | High |
| Client Credentials | Machine-to-machine | High |
| Device Code | TV/IoT devices | Medium |
| Implicit (deprecated) | Legacy SPAs | Low |

### PKCE Implementation

```typescript
// Generate code verifier and challenge
function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

// Authorization request
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', generateState());
authUrl.searchParams.set('code_challenge', pkce.challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// Token exchange
const tokenResponse = await fetch('https://auth.example.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: pkce.verifier
  })
});
```

### Social Login Configuration

```typescript
const oauthProviders = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scopes: ['openid', 'profile', 'email']
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email']
  }
};
```

---

## Authorization Patterns

### RBAC (Role-Based Access Control)

```typescript
// Role definitions
const roles = {
  admin: {
    permissions: ['*']  // All permissions
  },
  manager: {
    permissions: [
      'users:read',
      'users:create',
      'orders:*',
      'reports:read'
    ]
  },
  user: {
    permissions: [
      'profile:*',
      'orders:read',
      'orders:create'
    ]
  }
};

// Permission check
function hasPermission(userRole: string, requiredPermission: string): boolean {
  const rolePermissions = roles[userRole]?.permissions || [];

  return rolePermissions.some(permission => {
    if (permission === '*') return true;
    if (permission === requiredPermission) return true;

    // Wildcard matching (e.g., 'orders:*' matches 'orders:read')
    const [resource, action] = requiredPermission.split(':');
    return permission === `${resource}:*`;
  });
}

// Middleware
const requirePermission = (permission: string) => {
  return (req, res, next) => {
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

### ABAC (Attribute-Based Access Control)

```typescript
interface PolicyRule {
  effect: 'allow' | 'deny';
  resources: string[];
  actions: string[];
  conditions?: Condition[];
}

interface Condition {
  attribute: string;
  operator: 'eq' | 'ne' | 'in' | 'contains';
  value: any;
}

// Example policy
const policy: PolicyRule[] = [
  {
    effect: 'allow',
    resources: ['orders/*'],
    actions: ['read'],
    conditions: [
      { attribute: 'resource.ownerId', operator: 'eq', value: '${user.id}' }
    ]
  },
  {
    effect: 'allow',
    resources: ['orders/*'],
    actions: ['read', 'update', 'delete'],
    conditions: [
      { attribute: 'user.role', operator: 'in', value: ['admin', 'manager'] }
    ]
  }
];

// Evaluate policy
function evaluatePolicy(
  user: User,
  resource: Resource,
  action: string
): boolean {
  for (const rule of policy) {
    if (matchesRule(rule, user, resource, action)) {
      return rule.effect === 'allow';
    }
  }
  return false;  // Default deny
}
```

### Resource-Level Permissions

```typescript
// Check ownership
async function canAccessOrder(userId: string, orderId: string): Promise<boolean> {
  const order = await orderService.findById(orderId);

  if (!order) return false;

  // Owner can access
  if (order.userId === userId) return true;

  // Admin/manager can access
  const user = await userService.findById(userId);
  if (['admin', 'manager'].includes(user.role)) return true;

  // Check explicit share
  const share = await shareService.findShare(orderId, userId);
  return share !== null;
}

// Middleware with resource check
const authorizeOrder = async (req, res, next) => {
  const canAccess = await canAccessOrder(req.user.id, req.params.orderId);

  if (!canAccess) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};
```

---

## Multi-Factor Authentication

### MFA Implementation

```typescript
// TOTP (Time-based One-Time Password)
import speakeasy from 'speakeasy';

class TOTPService {
  generateSecret(userId: string): { secret: string; qrCode: string } {
    const secret = speakeasy.generateSecret({
      name: `MyApp (${userId})`,
      issuer: 'MyApp'
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1  // Allow 1 step tolerance
    });
  }
}

// MFA enrollment flow
async function enrollMFA(userId: string): Promise<EnrollmentResult> {
  const { secret, qrCode } = totpService.generateSecret(userId);

  // Store encrypted secret
  await userService.storeMFASecret(userId, encrypt(secret));

  return {
    qrCode,
    backupCodes: await generateBackupCodes(userId)
  };
}
```

### Backup Codes

```typescript
async function generateBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Store hashed codes
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 10))
  );

  await userService.storeBackupCodes(userId, hashedCodes);

  return codes;  // Return plaintext to user (once only)
}

async function useBackupCode(userId: string, code: string): Promise<boolean> {
  const storedCodes = await userService.getBackupCodes(userId);

  for (let i = 0; i < storedCodes.length; i++) {
    if (await bcrypt.compare(code, storedCodes[i])) {
      // Remove used code
      storedCodes.splice(i, 1);
      await userService.updateBackupCodes(userId, storedCodes);
      return true;
    }
  }

  return false;
}
```

---

## Session Management

### Session Configuration

```typescript
interface SessionConfig {
  secret: string;
  name: string;
  cookie: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    domain?: string;
  };
  rolling: boolean;
  resave: boolean;
  saveUninitialized: boolean;
}

const sessionConfig: SessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  },
  rolling: true,
  resave: false,
  saveUninitialized: false
};
```

### Session Security

```typescript
// Session fixation prevention
app.post('/login', async (req, res) => {
  // Authenticate user
  const user = await authenticate(req.body);

  // Regenerate session ID after login
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });

    req.session.userId = user.id;
    req.session.createdAt = Date.now();

    res.json({ success: true });
  });
});

// Session timeout
const checkSessionTimeout = (req, res, next) => {
  const maxInactivity = 30 * 60 * 1000;  // 30 minutes

  if (req.session.lastActivity) {
    const inactive = Date.now() - req.session.lastActivity;
    if (inactive > maxInactivity) {
      return req.session.destroy(() => {
        res.status(401).json({ error: 'Session expired' });
      });
    }
  }

  req.session.lastActivity = Date.now();
  next();
};
```

---

## Design Document Template

```markdown
# Authentication & Authorization Design - [Application]

## 1. Overview
- Authentication methods: [Password / OAuth / Passkey / etc.]
- User types: [Consumers / Enterprise / Both]
- Compliance requirements: [SOC2 / HIPAA / etc.]

## 2. Authentication
### Primary Method
- Method: [Password + MFA / OAuth / Passkey]
- Provider: [Auth0 / Cognito / Custom]

### Password Policy
| Requirement | Value |
|-------------|-------|
| Min length | [length] |
| Complexity | [requirements] |
| Hashing | [algorithm] |

### MFA
- Methods supported: [TOTP / SMS / WebAuthn]
- When required: [Always / Sensitive ops / User choice]

## 3. Authorization
### Model
- Type: [RBAC / ABAC / Hybrid]
- Roles: [Admin / User / etc.]

### Permissions
| Role | Permissions |
|------|-------------|
| [role] | [permissions] |

## 4. Token Management
- Access token TTL: [duration]
- Refresh token TTL: [duration]
- Token storage: [HttpOnly cookie / Memory]

## 5. Session Security
- Session duration: [duration]
- Idle timeout: [duration]
- Concurrent sessions: [allowed / limited]

## 6. Security Headers
```typescript
// Security header configuration
```

## 7. Audit Logging
- Login attempts
- Permission changes
- Sensitive data access
```

---

## References

- API Gateway Design: `rules/construction/api-gateway-design.md`
- Secrets Management: `rules/construction/secrets-management.md`
- Security Rules: `guidelines/security-rules.json`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
