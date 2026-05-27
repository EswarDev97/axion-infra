# GCP GPU VM Setup Guide

This is a prerequisite step — complete before Phase 1 Step 4 (hardware detection). The skill pauses at Phase 1 Step 3 until the user confirms they are SSH'd into the VM.

GCP pricing changes frequently. The tiers below are described by VRAM class — verify current pricing at https://cloud.google.com/compute/gpus-pricing before committing to a long run.

---

## GPU Tier Selection

After the Phase 1 interview (task type + dataset size), recommend a tier:

| Use Case | GPU | VRAM | Instance Type | When to Use |
|----------|-----|------|---------------|-------------|
| Tabular / small MLP | None or T4 | 16 GB | n1-standard-4 + T4 | Tiny datasets, no CNN |
| Image classification (small dataset) | T4 | 16 GB | n1-standard-8 + T4 | ResNet-18, ViT-Small |
| Image classification / NLP fine-tune | L4 | 24 GB | g2-standard-8 | ViT-Base, BERT, GPT-small |
| LLM pretraining (small) | A100 40GB | 40 GB | a2-highgpu-1g | GPT up to ~125M params |
| LLM pretraining (medium) | A100 80GB | 80 GB | a2-ultragpu-1g | GPT up to ~1B params |
| LLM pretraining (large) | H100 80GB | 80 GB | a3-highgpu-1g | GPT >1B params |

**Default recommendation for most tasks**: L4 (24 GB VRAM, good price/performance for fine-tuning and medium training).

---

## VM Creation

### One-time Setup (if not done)

```bash
# Install gcloud CLI if not present
# https://cloud.google.com/sdk/docs/install

gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/zone us-central1-a  # adjust to nearest region
```

### Create GPU VM

Replace `<TIER>` with the instance type from the table above. Replace `<TAG>` with a short experiment name (e.g., `gpt-pretraining`).

```bash
# L4 (recommended default)
gcloud compute instances create ml-training-<TAG> \
  --machine-type=g2-standard-8 \
  --accelerator=type=nvidia-l4,count=1 \
  --image-family=pytorch-latest-gpu \
  --image-project=deeplearning-platform-release \
  --boot-disk-size=200GB \
  --maintenance-policy=TERMINATE \
  --metadata=install-nvidia-driver=True

# A100 40GB
gcloud compute instances create ml-training-<TAG> \
  --machine-type=a2-highgpu-1g \
  --accelerator=type=nvidia-tesla-a100,count=1 \
  --image-family=pytorch-latest-gpu \
  --image-project=deeplearning-platform-release \
  --boot-disk-size=200GB \
  --maintenance-policy=TERMINATE \
  --metadata=install-nvidia-driver=True

# T4 (budget option)
gcloud compute instances create ml-training-<TAG> \
  --machine-type=n1-standard-8 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --image-family=pytorch-latest-gpu \
  --image-project=deeplearning-platform-release \
  --boot-disk-size=100GB \
  --maintenance-policy=TERMINATE \
  --metadata=install-nvidia-driver=True
```

### SSH Into VM

```bash
gcloud compute ssh ml-training-<TAG>
```

Confirm to the skill: "I'm SSH'd in."

---

## Transfer Code to VM

From your local machine:

```bash
# Upload project files
gcloud compute scp --recurse ./your-project ml-training-<TAG>:~/project

# Or clone from git
gcloud compute ssh ml-training-<TAG> -- "git clone <repo-url> ~/project"
```

---

## Verify GPU on VM

```bash
nvidia-smi
python3 -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

Expected: `True NVIDIA L4` (or similar). If False: driver installation may still be in progress — wait 2 minutes and retry.

---

## Cost Safety

**Always stop the VM when not training.** A running A100 costs ~$3-4/hour. Forgetting to stop costs money with no benefit.

```bash
# Stop VM (billing pauses — restartable)
gcloud compute instances stop ml-training-<TAG>

# Restart stopped VM
gcloud compute instances start ml-training-<TAG>

# Delete VM entirely (billing stops, data lost)
gcloud compute instances delete ml-training-<TAG>
```

**Estimated costs** (approximate, verify current pricing):

| GPU | $/hour (on-demand) | $/hour (spot) |
|-----|-------------------|----------------|
| T4  | ~$0.35 | ~$0.11 |
| L4  | ~$0.70 | ~$0.22 |
| A100 40GB | ~$2.93 | ~$0.90 |
| A100 80GB | ~$5.50 | ~$1.70 |
| H100 | ~$10.00 | ~$3.00 |

**Spot VMs** are 65–70% cheaper but can be preempted. For experiment runs < 6 hours, spot is usually fine. For overnight runs, use on-demand to avoid interruption.

To use spot:

```bash
# Add to gcloud create command:
--provisioning-model=SPOT \
--instance-termination-action=STOP
```

---

## Download Results When Done

```bash
# Download the .autoresearch/ directory
gcloud compute scp --recurse ml-training-<TAG>:~/project/.autoresearch ./local-results

# Or just the report
gcloud compute scp ml-training-<TAG>:~/project/.autoresearch/report.md ./report.md
```

---

## Region Selection

Choose the region closest to you with available GPUs. L4 and A100 availability varies:

```bash
# Check GPU availability in a region
gcloud compute accelerator-types list --filter="name:nvidia-l4" --format="table(name,zone)"
```

Recommended zones for availability: `us-central1-a`, `us-east4-c`, `europe-west4-a`
