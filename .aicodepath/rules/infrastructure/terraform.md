# Terraform Best Practices

These rules are enforced by the IaC Generator and should be followed for all infrastructure code.

## 1. Structure and Naming

* **Case**: Use `snake_case` for all resource names, variables, and outputs.
* **Prefixing**: Do NOT prefix resource names with the resource type (e.g., avoid `resource "aws_s3_bucket" "s3_bucket_logs"`).
* **Variables**: Always include `description` and `type` for every variable.

## 2. State Management

* **Remote State**: Never Use local state for shared environments. Use S3 Backend (AWS) or GCS Backend (GCP).
* **Locking**: Ensure state locking is enabled (DynamoDB for AWS).

## 3. Security

* **Encryption**: All data stores (databases, buckets, queues) must have encryption enabled (`kms_key_id` or `sse_algorithm`).
* **Networking**:
  * No resources in public subnets unless absolutely necessary (Load Balancers, NAT Gateways).
  * Security Groups should be scoped to specific CIDRs or other SGs, never `0.0.0.0/0` for ingress (except HTTP/S on LB).

## 4. Tagging

* All resources must include the standard tags:

    ```hcl
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "AICodePath"
    }
    ```

## 5. Modules

* Prefer using official modules for complex setups (e.g., VPC, EKS) but verify version pinning.
