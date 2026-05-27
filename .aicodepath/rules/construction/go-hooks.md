# Go Hook Automation

Per-file post-edit quality checks for Go files.

## Commands

| Tool | Command | Purpose |
|------|---------|---------|
| Format | `gofmt -w .` or `goimports -w .` | Standard formatting |
| Vet | `go vet ./...` | Detects common mistakes |
| Static analysis | `staticcheck ./...` | Advanced lint and bug detection |

## CI Mode

```bash
gofmt -l .         # lists files that need formatting (non-zero exit if any)
go vet ./...       # fails CI on suspicious constructs
staticcheck ./...  # fails CI on staticcheck violations
go test ./...      # run all tests
```

## golangci-lint (recommended)

Runs multiple linters in one pass:

```bash
golangci-lint run ./...
```

`.golangci.yml` minimal config:

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - staticcheck
    - unused
    - vet
```

## goimports vs gofmt

Prefer `goimports` — it formats AND organizes import groups automatically.
Install: `go install golang.org/x/tools/cmd/goimports@latest`
