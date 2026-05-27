# =============================================================================
# AICodePath Statusline Script (PowerShell)
#
# Displays real-time session status in Claude Code terminal statusline.
# For Windows PowerShell 5.1+ and PowerShell Core 7+
#
# Output format:
#   [ Claude: Model ] [ ████░░ 60% ] [ PHASE ] [ branch ] [ project ]
# =============================================================================

# Enable ANSI escape sequences (PS 5.1 may need this)
if ($PSVersionTable.PSVersion.Major -lt 6) {
    $Host.UI.RawUI.ForegroundColor = "White"
}

# ANSI Color Codes
$RESET = "`e[0m"
$BOLD = "`e[1m"
$CYAN = "`e[36m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$PURPLE = "`e[35m"
$ORANGE = "`e[38;5;208m"
$BLUE = "`e[34m"
$WHITE = "`e[37m"
$DIM = "`e[2m"

# Read JSON from stdin
$inputData = $input | Out-String

if (-not $inputData) {
    Write-Output "[statusline: no input]"
    exit 0
}

try {
    $data = $inputData | ConvertFrom-Json
} catch {
    Write-Output "[statusline: invalid JSON]"
    exit 0
}

# Parse Claude Code data
$model = if ($data.model.display_name) { $data.model.display_name } else { "Unknown" }
$projectDir = if ($data.workspace.project_dir) { $data.workspace.project_dir } elseif ($data.cwd) { $data.cwd } else { $PWD.Path }

# Use pre-calculated used_percentage from Claude Code CLI (input tokens only)
# Falls back to manual calculation from current_usage if not available
$usedPct = $data.context_window.used_percentage
$percent = 0

if ($null -ne $usedPct) {
    $percent = [math]::Floor($usedPct)
} else {
    # Fallback: calculate from current_usage tokens
    $contextSize = if ($data.context_window.context_window_size) { $data.context_window.context_window_size } else { 200000 }
    $currentUsage = $data.context_window.current_usage

    if ($currentUsage) {
        $inputTokens = if ($currentUsage.input_tokens) { $currentUsage.input_tokens } else { 0 }
        $cacheCreate = if ($currentUsage.cache_creation_input_tokens) { $currentUsage.cache_creation_input_tokens } else { 0 }
        $cacheRead = if ($currentUsage.cache_read_input_tokens) { $currentUsage.cache_read_input_tokens } else { 0 }

        $totalTokens = $inputTokens + $cacheCreate + $cacheRead

        if ($contextSize -gt 0) {
            $percent = [math]::Floor($totalTokens * 100 / $contextSize)
        }
    }
}

# Clamp percentage
$percent = [math]::Max(0, [math]::Min(100, $percent))

# Determine bar color
$barColor = switch ($true) {
    ($percent -lt 60) { $GREEN }
    ($percent -lt 80) { $YELLOW }
    default { $RED }
}

# Generate progress bar
$filled = [math]::Floor($percent / 10)
$empty = 10 - $filled
$bar = ("█" * $filled) + ("░" * $empty)

# Get git branch
$gitBranch = ""
try {
    Push-Location $projectDir
    $gitBranch = git branch --show-current 2>$null
    if (-not $gitBranch) {
        $gitBranch = git rev-parse --short HEAD 2>$null
    }
    Pop-Location
} catch {
    # Git not available or not in a repo
}

# Get project name
$projectName = Split-Path $projectDir -Leaf

# Get AICodePath phase
$aicodepathPhase = ""
$aicodepathUnit = ""

# Check for KB database
$dbPaths = @(
    Join-Path $projectDir "aicodepath-docs\aicodepath.db"
    Join-Path $projectDir ".aicodepath\aicodepath.db"
)

$dbPath = $null
foreach ($path in $dbPaths) {
    if (Test-Path $path) {
        $dbPath = $path
        break
    }
}

# Query KB if exists (using Node.js helper if available)
$kbQueryScript = Join-Path $projectDir "scripts\statusline-kb-query.js"
if (-not (Test-Path $kbQueryScript)) {
    $kbQueryScript = Join-Path $env:USERPROFILE ".aicodepath\statusline-kb-query.js"
}

if ((Test-Path $kbQueryScript) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    try {
        $kbData = node $kbQueryScript $projectDir 2>$null | ConvertFrom-Json
        if ($kbData) {
            $aicodepathPhase = $kbData.phase
            $aicodepathUnit = $kbData.unit
        }
    } catch {
        # KB query failed
    }
}

# Phase color
$phaseColor = switch ($aicodepathPhase) {
    "PRE-FLIGHT" { $WHITE }
    "INCEPTION" { $CYAN }
    "CONSTRUCTION" { $BLUE }
    "OPERATIONS" { $GREEN }
    default { $DIM }
}

# Build statusline
$parts = @()

# Model
$parts += "${CYAN}[ Claude: $model ]${RESET}"

# Context bar
$parts += "${barColor}[ $bar $percent% ]${RESET}"

# AICodePath phase (if available)
if ($aicodepathPhase) {
    $phaseDisplay = $aicodepathPhase
    if ($aicodepathUnit) {
        $phaseDisplay += ":$aicodepathUnit"
    }
    $parts += "${phaseColor}[ $phaseDisplay ]${RESET}"
}

# Git branch
if ($gitBranch) {
    $parts += "${PURPLE}[ $gitBranch ]${RESET}"
}

# Project name
$parts += "${ORANGE}[ $projectName ]${RESET}"

# Output statusline
Write-Output ($parts -join " ")
