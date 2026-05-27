#!/usr/bin/env bash
# update-aicodepath.sh — Update AICodePath framework files in a target project
#
# Usage:
#   bash update-aicodepath.sh [TARGET_PROJECT_ROOT] [--source PATH] [--dry-run]
#
# Adds/updates framework files using rsync (never deletes project-added files).
# Excludes: config.json, codebase-map.md, aicodepath-docs/

set -euo pipefail

# ─── Helpers ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

print_status()  { echo "  ⟳  $*"; }
print_success() { echo "  ✓  $*"; }
print_warning() { echo "  ⚠  $*"; }
print_error()   { echo "  ✗  $*" >&2; }
print_header()  { echo; echo "═══ $* ═══"; echo; }

# ─── Argument parsing ─────────────────────────────────────────────────────────

DRY_RUN=false
TARGET_ROOT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_ROOT="$(cd "$2" && pwd)"
      shift 2
      ;;
    --dry-run|-n)
      DRY_RUN=true
      shift
      ;;
    -*)
      print_error "Unknown option: $1"
      echo "Usage: $0 [TARGET_PROJECT_ROOT] [--source PATH] [--dry-run]"
      exit 1
      ;;
    *)
      TARGET_ROOT="$(cd "$1" && pwd)"
      shift
      ;;
  esac
done

# Default target to cwd if not provided
if [[ -z "$TARGET_ROOT" ]]; then
  TARGET_ROOT="$(pwd)"
fi

# ─── Validation ───────────────────────────────────────────────────────────────

SOURCE_AICODEPATH="$SOURCE_ROOT/.aicodepath"
TARGET_AICODEPATH="$TARGET_ROOT/.aicodepath"

if [[ ! -d "$SOURCE_AICODEPATH" ]]; then
  print_error "Source .aicodepath/ not found at: $SOURCE_AICODEPATH"
  exit 1
fi

if [[ ! -d "$TARGET_AICODEPATH" ]]; then
  print_error "Target .aicodepath/ not found at: $TARGET_AICODEPATH"
  print_error "Is AICodePath installed in the target project? Run install-v2.sh first."
  exit 1
fi

if [[ "$(realpath "$SOURCE_ROOT")" == "$(realpath "$TARGET_ROOT")" ]]; then
  print_error "Source and target are the same directory: $SOURCE_ROOT"
  exit 1
fi

# ─── Version info ─────────────────────────────────────────────────────────────

SOURCE_VERSION="$(cat "$SOURCE_AICODEPATH/version" 2>/dev/null || echo "unknown")"
TARGET_VERSION="$(cat "$TARGET_AICODEPATH/version" 2>/dev/null || echo "unknown")"

print_header "AICodePath Update"
echo "  Source : $SOURCE_ROOT (v${SOURCE_VERSION})"
echo "  Target : $TARGET_ROOT (v${TARGET_VERSION})"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "  Mode   : DRY RUN — no files will be changed"
fi

# ─── Pre-update diff check ────────────────────────────────────────────────────

DIRS_TO_SYNC="hooks lib skills agents guidelines db scripts bin templates rules docs commands generators api state-templates"
MODIFIED_FILES=()

print_header "Checking for locally modified files"

for dir in $DIRS_TO_SYNC; do
  src_dir="$SOURCE_AICODEPATH/$dir"
  tgt_dir="$TARGET_AICODEPATH/$dir"
  [[ ! -d "$src_dir" ]] && continue
  [[ ! -d "$tgt_dir" ]] && continue

  # Find files that exist in both source and target
  while IFS= read -r rel_file; do
    src_file="$src_dir/$rel_file"
    tgt_file="$tgt_dir/$rel_file"
    [[ ! -f "$tgt_file" ]] && continue
    if ! diff -q "$src_file" "$tgt_file" > /dev/null 2>&1; then
      MODIFIED_FILES+=(".aicodepath/$dir/$rel_file")
    fi
  done < <(cd "$src_dir" && find . -type f | sed 's|^\./||' | grep -v 'node_modules/')
done

if [[ ${#MODIFIED_FILES[@]} -gt 0 ]]; then
  echo "  WILL OVERWRITE (modified in target):"
  for f in "${MODIFIED_FILES[@]}"; do
    echo "    - $f"
  done
  echo

  # Interactive confirmation (skip in non-TTY or dry-run)
  if [[ "$DRY_RUN" == "false" ]] && [[ -t 0 ]]; then
    read -r -p "  These files differ from source. Continue and overwrite? (y/N) " confirm
    echo
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      echo "  Update cancelled."
      exit 0
    fi
  elif [[ "$DRY_RUN" == "false" ]]; then
    print_warning "Non-interactive mode — proceeding with overwrite"
  fi
else
  print_success "No locally modified files found"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  # Show new files that would be added (exist in source but not in target)
  NEW_FILES=()
  for dir in $DIRS_TO_SYNC; do
    src_dir="$SOURCE_AICODEPATH/$dir"
    tgt_dir="$TARGET_AICODEPATH/$dir"
    [[ ! -d "$src_dir" ]] && continue
    while IFS= read -r rel_file; do
      tgt_file="$tgt_dir/$rel_file"
      if [[ ! -f "$tgt_file" ]]; then
        NEW_FILES+=(".aicodepath/$dir/$rel_file")
      fi
    done < <(cd "$src_dir" && find . -type f | sed 's|^\./||' | grep -v 'node_modules/')
  done

  if [[ ${#NEW_FILES[@]} -gt 0 ]]; then
    print_header "New files that would be added"
    for f in "${NEW_FILES[@]}"; do
      echo "    + $f"
    done
    echo
    echo "  Total new files: ${#NEW_FILES[@]}"
  else
    print_success "No new files to add"
  fi

  echo
  echo "Dry run complete. No changes made."
  exit 0
fi

# ─── Backup ───────────────────────────────────────────────────────────────────

BACKUP_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="$TARGET_AICODEPATH.backup.$BACKUP_TIMESTAMP"

print_header "Creating backup"
print_status "Backing up $TARGET_AICODEPATH → $BACKUP_PATH"
cp -rp "$TARGET_AICODEPATH" "$BACKUP_PATH"
print_success "Backup created: $BACKUP_PATH"

# Ensure backup folders are gitignored (safety net for projects installed before this was added)
GITIGNORE_FILE="$TARGET_ROOT/.gitignore"
if [ -f "$GITIGNORE_FILE" ] && ! grep -q "\.aicodepath\.backup\." "$GITIGNORE_FILE"; then
  echo "" >> "$GITIGNORE_FILE"
  echo "# AICodePath update backups" >> "$GITIGNORE_FILE"
  echo ".aicodepath.backup.*/" >> "$GITIGNORE_FILE"
  print_success ".aicodepath.backup.*/ added to .gitignore"
fi

# ─── rsync framework directories ──────────────────────────────────────────────

print_header "Syncing framework files"

FILES_UPDATED=0

for dir in $DIRS_TO_SYNC; do
  src_dir="$SOURCE_AICODEPATH/$dir"
  [[ ! -d "$src_dir" ]] && continue

  tgt_dir="$TARGET_AICODEPATH/$dir"
  mkdir -p "$tgt_dir"

  print_status "Syncing .aicodepath/$dir/ ..."
  # Use --itemize-changes to count updates in a single pass
  updated=$(rsync -a --itemize-changes --exclude='node_modules/' \
    "$src_dir/" "$tgt_dir/" 2>/dev/null | grep -c '^[<>f]' || true)
  FILES_UPDATED=$((FILES_UPDATED + updated))
done

print_success "Framework directories synced ($FILES_UPDATED files updated)"

# ─── Top-level file copy ──────────────────────────────────────────────────────

print_header "Updating top-level files"

TOP_LEVEL_FILES="version package.json claude-code-official-spec.md plugin.json"

for f in $TOP_LEVEL_FILES; do
  src_file="$SOURCE_AICODEPATH/$f"
  [[ ! -f "$src_file" ]] && continue
  cp "$src_file" "$TARGET_AICODEPATH/$f"
  print_success "Updated .aicodepath/$f"
done

# Root-level VERSION file
if [[ -f "$SOURCE_ROOT/VERSION" ]]; then
  cp "$SOURCE_ROOT/VERSION" "$TARGET_ROOT/VERSION"
  print_success "Updated VERSION"
fi

# ─── DB migrations ────────────────────────────────────────────────────────────

print_header "Applying DB migrations"

DB_PATH="$TARGET_ROOT/aicodepath-docs/aicodepath.db"
SRC_MIGRATIONS="$SOURCE_AICODEPATH/db/migrations"
TGT_MIGRATIONS="$TARGET_AICODEPATH/db/migrations"

MIGRATIONS_APPLIED=0

if [[ ! -f "$DB_PATH" ]]; then
  print_warning "Database not found at $DB_PATH — skipping migrations"
else
  if [[ -d "$SRC_MIGRATIONS" ]] && [[ -d "$TGT_MIGRATIONS" ]]; then
    # Find migration files present in source but absent from target
    while IFS= read -r migration_file; do
      filename="$(basename "$migration_file")"
      tgt_migration="$TGT_MIGRATIONS/$filename"

      if [[ ! -f "$tgt_migration" ]]; then
        print_status "Applying migration: $filename"
        if sqlite3 "$DB_PATH" < "$migration_file"; then
          # Copy the migration file to target so we don't re-apply
          cp "$migration_file" "$tgt_migration"
          MIGRATIONS_APPLIED=$((MIGRATIONS_APPLIED + 1))
          print_success "Applied: $filename"
        else
          print_error "Migration failed: $filename"
          print_error "Backup available at: $BACKUP_PATH"
          exit 1
        fi
      fi
    done < <(find "$SRC_MIGRATIONS" -name '*.sql' | sort)
  fi

  if [[ $MIGRATIONS_APPLIED -eq 0 ]]; then
    print_success "No new migrations to apply"
  else
    print_success "$MIGRATIONS_APPLIED migration(s) applied"
  fi
fi

# ─── Post-update steps ────────────────────────────────────────────────────────

print_header "Post-update steps"

# Ensure hook scripts are executable
chmod +x "$TARGET_AICODEPATH/hooks/"*.js 2>/dev/null || true
print_success "Hook scripts set executable"

# Regenerate settings.json and symlinks
print_status "Running 'aicodepath init' to regenerate settings.json and symlinks..."
if node "$TARGET_AICODEPATH/bin/aicodepath.js" init; then
  print_success "Init completed"
else
  print_warning "Init had errors — check output above"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

print_header "Update complete"
echo "  v${TARGET_VERSION} → v${SOURCE_VERSION}"
echo "  Files synced  : $FILES_UPDATED"
echo "  Migrations    : $MIGRATIONS_APPLIED"
echo "  Backup at     : $BACKUP_PATH"
echo
