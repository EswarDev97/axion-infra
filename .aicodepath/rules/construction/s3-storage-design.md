# S3/Object Storage Design

**Purpose**: Design object storage solutions for file management, media, backups, and data lakes

**When to Use**: Any feature requiring file uploads, static assets, backups, or unstructured data storage

---

## Overview

Object storage design defines how the application stores, organizes, retrieves, and manages unstructured data. This stage creates comprehensive storage architecture that balances cost, performance, security, and operational requirements.

---

## Provider Selection

### Cloud Provider Options

| Provider | Service | Best For |
|----------|---------|----------|
| AWS | S3 | Feature-rich, mature, extensive integrations |
| Azure | Blob Storage | Microsoft ecosystem, hybrid cloud |
| GCP | Cloud Storage | Strong analytics integration, ML workloads |
| Multi-cloud | MinIO | Cloud-agnostic, self-hosted, S3-compatible |

### Selection Criteria

```markdown
## Storage Provider Decision

Based on project preferences:
- Cloud Provider: [AWS/Azure/GCP/Agnostic]
- Self-hosted requirement: [Yes/No]
- Compliance requirements: [HIPAA/PCI-DSS/SOC2/GDPR/None]

**Recommendation**: [Provider] because [rationale]
```

---

## Bucket/Container Design

### Naming Conventions

```
[org]-[env]-[purpose]-[region]

Examples:
- acme-prod-uploads-us-east-1
- acme-dev-backups-eu-west-1
- acme-staging-logs-ap-southeast-1
```

### Bucket Organization Strategies

| Strategy | When to Use | Example |
|----------|-------------|---------|
| Per-environment | Isolation between dev/staging/prod | `app-dev-*`, `app-prod-*` |
| Per-tenant | Multi-tenant SaaS | `tenant-123-uploads` |
| Per-purpose | Different access patterns | `uploads`, `backups`, `logs` |
| Per-region | Data residency requirements | `data-eu`, `data-us` |

### Object Key Design

```
[partition]/[sub-partition]/[identifier]/[filename]

Examples:
# User uploads
users/{user_id}/uploads/{year}/{month}/{uuid}.{ext}

# Tenant data
tenants/{tenant_id}/documents/{category}/{timestamp}_{filename}

# Time-series logs
logs/{year}/{month}/{day}/{hour}/{uuid}.json.gz

# Versioned assets
assets/{version}/images/{resolution}/{filename}
```

---

## Storage Classes and Lifecycle

### AWS S3 Storage Classes

| Class | Use Case | Retrieval | Cost |
|-------|----------|-----------|------|
| Standard | Frequently accessed | Immediate | $$$ |
| Intelligent-Tiering | Unknown access patterns | Immediate | $$ |
| Standard-IA | Infrequent access (>30 days) | Immediate | $$ |
| One Zone-IA | Non-critical, infrequent | Immediate | $ |
| Glacier Instant | Archive, rare access | Milliseconds | $ |
| Glacier Flexible | Archive, planned retrieval | 1-12 hours | ¢ |
| Glacier Deep Archive | Long-term archive | 12-48 hours | ¢ |

### Lifecycle Policy Template

```json
{
  "Rules": [
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Filter": { "Prefix": "uploads/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    },
    {
      "ID": "ExpireOldVersions",
      "Status": "Enabled",
      "Filter": {},
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    },
    {
      "ID": "CleanupIncomplete",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

---

## Access Patterns

### Presigned URLs

For temporary, secure access:

```typescript
// Upload presigned URL
const uploadUrl = await s3.getSignedUrl('putObject', {
  Bucket: 'uploads-bucket',
  Key: `users/${userId}/uploads/${uuid}.${ext}`,
  Expires: 3600, // 1 hour
  ContentType: contentType,
  Conditions: [
    ['content-length-range', 0, 10485760], // Max 10MB
  ]
});

// Download presigned URL
const downloadUrl = await s3.getSignedUrl('getObject', {
  Bucket: 'uploads-bucket',
  Key: objectKey,
  Expires: 300, // 5 minutes
  ResponseContentDisposition: `attachment; filename="${filename}"`
});
```

### CDN Integration

For public/static content:

```markdown
## CDN Configuration

**CloudFront Distribution**:
- Origin: s3://app-prod-static
- Cache TTL: 86400 (24 hours)
- Price Class: PriceClass_100 (North America, Europe)
- Custom domain: static.example.com
- SSL: ACM certificate

**Cache Invalidation Strategy**:
- On deploy: Invalidate /assets/*
- On content update: Invalidate specific paths
```

### Transfer Acceleration

For global uploads:

```typescript
// Enable Transfer Acceleration
const s3 = new S3Client({
  useAccelerateEndpoint: true,
  // bucket-name.s3-accelerate.amazonaws.com
});
```

---

## Security Design

### Encryption Options

| Type | Key Management | Use Case |
|------|---------------|----------|
| SSE-S3 | AWS managed | Default, simple |
| SSE-KMS | Customer managed KMS | Audit, key rotation |
| SSE-C | Customer provided | Full control |
| Client-side | Application managed | Zero-trust |

### Bucket Policy Template

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::bucket-name",
        "arn:aws:s3:::bucket-name/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    },
    {
      "Sid": "AllowApplicationRole",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789:role/app-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::bucket-name/*"
    }
  ]
}
```

### Access Control Checklist

- [ ] Block public access enabled (unless CDN bucket)
- [ ] Bucket policy denies insecure transport
- [ ] IAM policies follow least privilege
- [ ] VPC endpoint for private access
- [ ] Access logging enabled
- [ ] CloudTrail data events enabled

---

## Large File Handling

### Multipart Upload

For files > 100MB:

```typescript
// Initiate multipart upload
const { UploadId } = await s3.createMultipartUpload({
  Bucket: bucket,
  Key: key,
  ContentType: contentType
});

// Upload parts (5MB - 5GB each)
const partSize = 10 * 1024 * 1024; // 10MB
const parts = [];

for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
  const { ETag } = await s3.uploadPart({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: chunk
  });
  parts.push({ ETag, PartNumber: partNumber });
}

// Complete upload
await s3.completeMultipartUpload({
  Bucket: bucket,
  Key: key,
  UploadId: uploadId,
  MultipartUpload: { Parts: parts }
});
```

### Resumable Uploads

```typescript
interface UploadProgress {
  uploadId: string;
  key: string;
  completedParts: Part[];
  totalParts: number;
}

// Store progress for resume capability
await cache.set(`upload:${uploadId}`, progress, 86400);
```

---

## Event-Driven Processing

### S3 Event Notifications

```json
{
  "LambdaFunctionConfigurations": [
    {
      "Id": "ProcessUpload",
      "LambdaFunctionArn": "arn:aws:lambda:...:process-upload",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "prefix", "Value": "uploads/" },
            { "Name": "suffix", "Value": ".jpg" }
          ]
        }
      }
    }
  ]
}
```

### Common Processing Patterns

| Event | Processing | Output |
|-------|-----------|--------|
| Image upload | Resize, compress | Multiple resolutions |
| Document upload | Extract text, index | Searchable content |
| Video upload | Transcode | Multiple formats/qualities |
| Data file upload | Validate, transform | Processed data |

---

## Cost Optimization

### Cost Analysis Template

```markdown
## Storage Cost Estimate

**Monthly Volume**:
- New uploads: 100GB
- Total storage: 5TB
- Downloads: 500GB
- API requests: 1M

**Cost Breakdown**:
| Component | Usage | Rate | Monthly Cost |
|-----------|-------|------|--------------|
| Storage (Standard) | 1TB | $0.023/GB | $23.00 |
| Storage (IA) | 4TB | $0.0125/GB | $50.00 |
| PUT requests | 500K | $0.005/1K | $2.50 |
| GET requests | 500K | $0.0004/1K | $0.20 |
| Data transfer | 500GB | $0.09/GB | $45.00 |
| **Total** | | | **$120.70** |

**Optimization Opportunities**:
- Lifecycle policies: Save ~40% on storage
- Intelligent Tiering: Automatic savings for variable access
- Reserved capacity: N/A for S3
```

### Cost Reduction Strategies

1. **Lifecycle policies** - Auto-transition to cheaper storage
2. **Intelligent Tiering** - For unpredictable access
3. **Compression** - Gzip for text, WebP for images
4. **Deduplication** - Content-addressable storage
5. **Regional placement** - Store near consumers
6. **S3 Select** - Query only needed data

---

## Versioning and Backup

### Versioning Strategy

```markdown
## Versioning Configuration

**Bucket Versioning**: Enabled

**Version Retention**:
- Keep current + 3 previous versions
- Delete markers expire after 30 days
- Non-current versions transition to Glacier after 90 days

**Restore Procedure**:
1. List object versions
2. Identify target version by timestamp
3. Copy version to current
4. Verify restoration
```

### Cross-Region Replication

```json
{
  "Role": "arn:aws:iam::123456789:role/replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": { "Prefix": "critical/" },
      "Destination": {
        "Bucket": "arn:aws:s3:::backup-bucket-us-west-2",
        "StorageClass": "STANDARD_IA"
      }
    }
  ]
}
```

---

## Design Document Template

```markdown
# S3 Storage Design - [Feature/Module]

## 1. Overview
- Purpose: [What files/data will be stored]
- Volume estimate: [Size and count]
- Access patterns: [Read/write frequency]

## 2. Bucket Architecture
| Bucket | Purpose | Region | Storage Class |
|--------|---------|--------|---------------|
| [name] | [purpose] | [region] | [class] |

## 3. Object Key Structure
```
[key pattern with explanation]
```

## 4. Lifecycle Policies
- Transition rules: [when to move to cheaper storage]
- Expiration rules: [when to delete]

## 5. Security
- Encryption: [SSE-S3/SSE-KMS/SSE-C]
- Access control: [IAM/Bucket policy summary]
- Public access: [Blocked/CDN only]

## 6. Integration
- Upload method: [Direct/Presigned/API proxy]
- Download method: [Direct/Presigned/CDN]
- Event processing: [Lambda triggers if any]

## 7. Cost Estimate
[Monthly cost breakdown]

## 8. Monitoring
- Metrics: [Storage size, request count, errors]
- Alerts: [Error rate, unusual activity]
```

---

## References

- Database Design: `rules/construction/database-design.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
- Security Rules: `guidelines/security-rules.json`
- Code Generation: `rules/construction/code-generation.md`
