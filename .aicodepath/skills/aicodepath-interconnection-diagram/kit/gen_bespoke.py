#!/usr/bin/env python3
"""
gen_bespoke.py — Generate AICodePath bespoke sub-diagrams D1–D6.

Usage:
    python3 kit/gen_bespoke.py [project_root]

Data is gathered DYNAMICALLY at runtime:
  D1  Phase Flow         ← PHASES from main interconnection diagram HTML
  D2  GICL Topology      ← static state machine (GICL logic rarely changes)
  D3  Settings Audit     ← .claude/settings.json
  D4  Skill Chain        ← agents/*.md + agent-taxonomy.md
  D5  DB Schema          ← db/schema.sql + db/migrations/*.sql
  D6  Agent Heatmap      ← agents/*.md (skeleton injection)

Run after regenerating the main interconnection diagram so D1 picks up
any new skill→phase assignments.
"""
import json, os, re, sys, math, pathlib

# ── Root resolution ────────────────────────────────────────────────────────────
def find_root():
    if len(sys.argv) > 1:
        return pathlib.Path(sys.argv[1]).resolve()
    # Walk up from this script's location to find .aicodepath
    p = pathlib.Path(__file__).resolve().parent
    for _ in range(6):
        if (p / '.aicodepath').exists():
            return p
        p = p.parent
    raise RuntimeError("Cannot locate project root (no .aicodepath/ found)")

ROOT    = find_root()
OUT_DIR = ROOT / 'aicodepath-docs/memory/interconnection'
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Version from DEVELOPER-GUIDE or fallback
def _read_version():
    guide = ROOT / '.aicodepath/DEVELOPER-GUIDE.md'
    if guide.exists():
        m = re.search(r'\*\*v(\d+\.\d+\.\d+)\*\*', guide.read_text())
        if m:
            return 'v' + m.group(1)
    return 'v2.x'

import datetime
VERSION  = _read_version()
GEN_DATE = datetime.date.today().strftime('%Y-%m-%d')

# ══════════════════════════════════════════════════════════════════════════════
# DATA GATHERING
# ══════════════════════════════════════════════════════════════════════════════

def gather_settings():
    """Read .claude/settings.json → {event_key: [script_name, ...]}"""
    settings_path = ROOT / '.claude/settings.json'
    if not settings_path.exists():
        return {}
    settings = json.loads(settings_path.read_text())
    events = {}
    for event, hook_list in settings.get('hooks', {}).items():
        for group in hook_list:
            matcher = group.get('matcher', '')
            if matcher:
                # e.g. "Write|Edit" → take first token → "PreToolUse-Write"
                key = f"{event}-{matcher.split('|')[0]}"
            else:
                key = event
            scripts = []
            for h in group.get('hooks', []):
                cmd = h.get('command', '')
                # basename, strip .js extension
                name = os.path.basename(cmd)
                if name.endswith('.js'):
                    name = name[:-3]
                if name and name not in scripts:
                    scripts.append(name)
            if key in events:
                events[key] = list(dict.fromkeys(events[key] + scripts))
            else:
                events[key] = scripts
    return events


def gather_agents():
    """Read .aicodepath/agents/*.md → [{id, label, desc, group}]"""
    agents_dir = ROOT / '.aicodepath/agents'
    agents = []
    if not agents_dir.exists():
        return agents
    for f in sorted(agents_dir.glob('*.md')):
        text = f.read_text(encoding='utf-8', errors='replace')
        # Extract frontmatter name
        m_name = re.search(r'^name:\s*(.+)$', text, re.M)
        m_desc = re.search(r'^description:\s*(.+)$', text, re.M)
        agent_id = f.stem
        label = m_name.group(1).strip() if m_name else agent_id
        desc  = m_desc.group(1).strip()[:80] if m_desc else ''
        # Assign group via explicit lookup (covers all 106 agents)
        _GROUP_MAP = {
            # ARCHITECTURE (7)
            'aicodepath-architect': 'ARCHITECTURE',
            'aicodepath-backend-architect': 'ARCHITECTURE',
            'aicodepath-api-designer': 'ARCHITECTURE',
            'aicodepath-database-architect': 'ARCHITECTURE',
            'aicodepath-frontend-architect': 'ARCHITECTURE',
            'aicodepath-mobile-architect': 'ARCHITECTURE',
            'aicodepath-cloud-architect': 'ARCHITECTURE',
            # QUALITY (8)
            'aicodepath-code-reviewer': 'QUALITY',
            'aicodepath-test-engineer': 'QUALITY',
            'aicodepath-qa': 'QUALITY',
            'aicodepath-plan-critic': 'QUALITY',
            'aicodepath-plan-analyst': 'QUALITY',
            'aicodepath-refactoring-expert': 'QUALITY',
            'aicodepath-code-simplifier': 'QUALITY',
            'aicodepath-accessibility-tester': 'QUALITY',
            # SEC+OPS (9)
            'aicodepath-security-engineer': 'SEC+OPS',
            'aicodepath-compliance-auditor': 'SEC+OPS',
            'aicodepath-devops-architect': 'SEC+OPS',
            'aicodepath-sre-engineer': 'SEC+OPS',
            'aicodepath-performance-engineer': 'SEC+OPS',
            'aicodepath-ci-fixer': 'SEC+OPS',
            'aicodepath-cost-optimizer': 'SEC+OPS',
            'aicodepath-chaos-engineer': 'SEC+OPS',
            'aicodepath-incident-responder': 'SEC+OPS',
            # ML+AI (7)
            'aicodepath-data-scientist': 'ML+AI',
            'aicodepath-ml-engineer': 'ML+AI',
            'aicodepath-data-engineer': 'ML+AI',
            'aicodepath-nlp-engineer': 'ML+AI',
            'aicodepath-rl-engineer': 'ML+AI',
            'aicodepath-ai-engineer': 'ML+AI',
            'aicodepath-llm-architect': 'ML+AI',
            # DESIGN (5)
            'aicodepath-ui-designer': 'DESIGN',
            'aicodepath-ux-designer': 'DESIGN',
            'aicodepath-communication-coach': 'DESIGN',
            'aicodepath-technical-writer': 'DESIGN',
            'aicodepath-writing-auditor': 'DESIGN',
            # LANGUAGES (15)
            'aicodepath-typescript-expert': 'LANGUAGES',
            'aicodepath-python-expert': 'LANGUAGES',
            'aicodepath-golang-expert': 'LANGUAGES',
            'aicodepath-rust-expert': 'LANGUAGES',
            'aicodepath-java-expert': 'LANGUAGES',
            'aicodepath-kotlin-expert': 'LANGUAGES',
            'aicodepath-csharp-expert': 'LANGUAGES',
            'aicodepath-cpp-expert': 'LANGUAGES',
            'aicodepath-php-expert': 'LANGUAGES',
            'aicodepath-swift-expert': 'LANGUAGES',
            'aicodepath-elixir-expert': 'LANGUAGES',
            'aicodepath-dotnet-core-expert': 'LANGUAGES',
            'aicodepath-dotnet-framework-expert': 'LANGUAGES',
            'aicodepath-javascript-expert': 'LANGUAGES',
            'aicodepath-powershell-expert': 'LANGUAGES',
            # FRAMEWORKS (13)
            'aicodepath-react-expert': 'FRAMEWORKS',
            'aicodepath-vue-expert': 'FRAMEWORKS',
            'aicodepath-angular-expert': 'FRAMEWORKS',
            'aicodepath-nextjs-expert': 'FRAMEWORKS',
            'aicodepath-django-expert': 'FRAMEWORKS',
            'aicodepath-fastapi-expert': 'FRAMEWORKS',
            'aicodepath-laravel-expert': 'FRAMEWORKS',
            'aicodepath-rails-expert': 'FRAMEWORKS',
            'aicodepath-spring-boot-expert': 'FRAMEWORKS',
            'aicodepath-symfony-expert': 'FRAMEWORKS',
            'aicodepath-expo-rn-expert': 'FRAMEWORKS',
            'aicodepath-flutter-expert': 'FRAMEWORKS',
            'aicodepath-wordpress-master': 'FRAMEWORKS',
            # CLOUD+INFRA (9)
            'aicodepath-kubernetes-expert': 'CLOUD+INFRA',
            'aicodepath-terraform-expert': 'CLOUD+INFRA',
            'aicodepath-azure-infra-expert': 'CLOUD+INFRA',
            'aicodepath-deployment-engineer': 'CLOUD+INFRA',
            'aicodepath-network-engineer': 'CLOUD+INFRA',
            'aicodepath-platform-engineer': 'CLOUD+INFRA',
            'aicodepath-windows-infra-expert': 'CLOUD+INFRA',
            'aicodepath-m365-admin': 'CLOUD+INFRA',
            'aicodepath-it-ops-orchestrator': 'CLOUD+INFRA',
            # DOMAIN (16)
            'aicodepath-fintech-engineer': 'DOMAIN',
            'aicodepath-iot-engineer': 'DOMAIN',
            'aicodepath-embedded-systems': 'DOMAIN',
            'aicodepath-blockchain-developer': 'DOMAIN',
            'aicodepath-game-developer': 'DOMAIN',
            'aicodepath-quant-analyst': 'DOMAIN',
            'aicodepath-payment-integration': 'DOMAIN',
            'aicodepath-postgres-expert': 'DOMAIN',
            'aicodepath-sql-expert': 'DOMAIN',
            'aicodepath-slack-expert': 'DOMAIN',
            'aicodepath-cli-developer': 'DOMAIN',
            'aicodepath-tooling-engineer': 'DOMAIN',
            'aicodepath-build-engineer': 'DOMAIN',
            'aicodepath-seo-specialist': 'DOMAIN',
            'aicodepath-legacy-modernizer': 'DOMAIN',
            'aicodepath-error-detective': 'DOMAIN',
            # BUSINESS (14)
            'aicodepath-market-researcher': 'BUSINESS',
            'aicodepath-competitive-analyst': 'BUSINESS',
            'aicodepath-trend-analyst': 'BUSINESS',
            'aicodepath-data-researcher': 'BUSINESS',
            'aicodepath-business-analyst': 'BUSINESS',
            'aicodepath-customer-success-manager': 'BUSINESS',
            'aicodepath-legal-advisor': 'BUSINESS',
            'aicodepath-scrum-master': 'BUSINESS',
            'aicodepath-content-marketer': 'BUSINESS',
            'aicodepath-sales-engineer': 'BUSINESS',
            'aicodepath-risk-manager': 'BUSINESS',
            'aicodepath-license-engineer': 'BUSINESS',
            'aicodepath-search-specialist': 'BUSINESS',
            'aicodepath-idea-validator': 'BUSINESS',
            # INTERNAL (3)
            'aicodepath-swarm-lead': 'INTERNAL',
            'aicodepath-error-recovery': 'INTERNAL',
            'aicodepath-codebase-pattern-finder': 'INTERNAL',
        }
        group = _GROUP_MAP.get(agent_id, 'INTERNAL')
        agents.append({'id': agent_id, 'label': label, 'desc': desc, 'group': group})
    return agents


def gather_db_schema():
    """Parse schema.sql + all migrations.

    Returns {table_name: {'cols': [{name,type,pk,fk,fk_table}], 'fks': [(from_col,to_table,to_col)]}}
    FK edges are extracted from explicit REFERENCES clauses first, then inferred from _id suffixes.
    """
    db_dir = ROOT / '.aicodepath/db'
    content = ''
    schema_file = db_dir / 'schema.sql'
    if schema_file.exists():
        content += schema_file.read_text(encoding='utf-8', errors='replace')
    mig_dir = db_dir / 'migrations'
    if mig_dir.exists():
        for f in sorted(mig_dir.glob('*.sql')):
            content += '\n' + f.read_text(encoding='utf-8', errors='replace')

    tables = {}
    tbl_pat = re.compile(
        r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\((.*?)\);',
        re.DOTALL | re.IGNORECASE
    )
    col_pat = re.compile(
        r'^[`"]?(\w+)[`"]?\s+(TEXT|INTEGER|INT|REAL|BLOB|BOOLEAN|DATETIME|JSON|NUMERIC)',
        re.I
    )
    # Inline: col TYPE ... REFERENCES other_table(col)
    inline_ref = re.compile(
        r'\bREFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)', re.I
    )
    # Table-level: FOREIGN KEY (col) REFERENCES other_table(col)
    fk_clause = re.compile(
        r'\bFOREIGN\s+KEY\s*\(\s*[`"]?(\w+)[`"]?\s*\)\s+REFERENCES\s+[`"]?(\w+)[`"]?\s*\(\s*[`"]?(\w+)[`"]?\s*\)',
        re.I
    )

    for m in tbl_pat.finditer(content):
        tname = m.group(1)
        body  = m.group(2)
        cols, fks = [], []

        # Table-level FK constraints (most reliable)
        for fk_m in fk_clause.finditer(body):
            fks.append((fk_m.group(1), fk_m.group(2), fk_m.group(3)))
        fk_col_set = {f[0] for f in fks}

        # Table-level UNIQUE constraints (before column loop)
        tbl_unique_cols = set()
        for _ln in body.split('\n'):
            _ls = _ln.strip().rstrip(',')
            _um = re.match(
                r'UNIQUE\s*(?:KEY\s+\S+\s*)?\(\s*[`"]?(\w+)[`"]?\s*\)', _ls, re.I)
            if _um:
                tbl_unique_cols.add(_um.group(1))

        for line in body.split('\n'):
            line = line.strip().rstrip(',')
            if not line or line.upper().startswith(
                    ('PRIMARY KEY', 'UNIQUE', 'INDEX', 'FOREIGN', '--', '/*', 'CONSTRAINT', 'CHECK')):
                continue
            cm = col_pat.match(line)
            if not cm:
                continue
            col_name = cm.group(1)
            col_type = cm.group(2).upper()
            if col_type == 'INT':
                col_type = 'INTEGER'
            is_pk = bool(re.search(r'\bPRIMARY\s+KEY\b', line, re.I))
            is_unique = bool(re.search(r'\bUNIQUE\b', line, re.I)) or col_name in tbl_unique_cols

            # Inline REFERENCES clause
            fk_table = None
            ref_m = inline_ref.search(line)
            if ref_m:
                fk_table = ref_m.group(1)
                if col_name not in fk_col_set:
                    fks.append((col_name, fk_table, ref_m.group(2)))
                    fk_col_set.add(col_name)

            is_fk = col_name in fk_col_set or (
                col_name.endswith('_id') and col_name != 'id'
            )
            cols.append({'name': col_name, 'type': col_type,
                         'pk': is_pk, 'unique': is_unique,
                         'fk': is_fk, 'fk_table': fk_table})

        if cols:
            # Post-process fks: add cardinality (1:1 if FK col is PK or UNIQUE, else 1:N)
            pk_unique = {c['name'] for c in cols if c['pk'] or c.get('unique')}
            fks = [(fc, ft, tc, '1:1' if fc in pk_unique else '1:N')
                   for fc, ft, tc in fks]
            tables[tname] = {'cols': cols, 'fks': fks}

    # Heuristic FK inference for _id columns without explicit REFERENCES
    all_tbls = set(tables)
    for tname, td in tables.items():
        explicit = {f[0] for f in td['fks']}
        for col in td['cols']:
            cname = col['name']
            if cname == 'id' or not cname.endswith('_id') or cname in explicit:
                continue
            stem = cname[:-3]   # 'session' from 'session_id'
            for candidate in (stem, stem + 's', stem + 'es', stem[:-1] + 'ies'):
                if candidate in all_tbls and candidate != tname:
                    td['fks'].append((cname, candidate, 'id', '1:N'))
                    col['fk_table'] = candidate
                    explicit.add(cname)
                    break

    return tables


def force_layout(tables, domain_fn, width=1400, height=820, iterations=300):
    """Force-directed layout for ER graph nodes.

    Args:
        tables:    {name: {cols, fks}} from gather_db_schema()
        domain_fn: callable(table_name) → domain string
        width/height: SVG canvas dimensions
        iterations: simulation steps (more = more settled)

    Returns:
        {table_name: (x, y)}  — integer pixel coordinates
    """
    import random, math

    # Seed cluster centres so domain groups start near each other
    DOMAIN_CENTERS = {
        'GICL':      (width * 0.17, height * 0.25),
        'ARTIFACTS': (width * 0.50, height * 0.25),
        'KNOWLEDGE': (width * 0.83, height * 0.25),
        'SESSIONS':  (width * 0.17, height * 0.75),
        'AGENTS':    (width * 0.50, height * 0.75),
        'METRICS':   (width * 0.83, height * 0.75),
        'OTHER':     (width * 0.50, height * 0.50),
    }

    node_ids = list(tables.keys())
    if not node_ids:
        return {}

    domains = {nid: domain_fn(nid) for nid in node_ids}
    random.seed(42)   # deterministic layout
    pos = {}
    for nid in node_ids:
        cx, cy = DOMAIN_CENTERS.get(domains[nid], DOMAIN_CENTERS['OTHER'])
        pos[nid] = [cx + random.uniform(-65, 65), cy + random.uniform(-65, 65)]

    # Deduplicated undirected edge set for spring forces
    edge_set = set()
    for tname, td in tables.items():
        for _, to_tbl, *_ in td['fks']:
            if to_tbl in tables and to_tbl != tname:
                edge_set.add((min(tname, to_tbl), max(tname, to_tbl)))
    edges = list(edge_set)

    vel = {nid: [0.0, 0.0] for nid in node_ids}
    REPUL   = 15000   # node–node repulsion constant
    SP_K    = 0.26    # spring stiffness
    SP_REST = 135     # spring natural length (px)
    CLU_K   = 0.042   # domain cluster attraction
    DAMP    = 0.75    # velocity damping
    R_PAD   = 44      # boundary padding

    for _ in range(iterations):
        f = {nid: [0.0, 0.0] for nid in node_ids}

        # Pairwise repulsion (O(n²) — acceptable for ≤70 tables)
        for i in range(len(node_ids)):
            a = node_ids[i]
            for j in range(i + 1, len(node_ids)):
                b = node_ids[j]
                dx = pos[a][0] - pos[b][0]
                dy = pos[a][1] - pos[b][1]
                d  = max(math.hypot(dx, dy), 1.0)
                mag = REPUL / (d * d)
                fx, fy = mag * dx / d, mag * dy / d
                f[a][0] += fx;  f[a][1] += fy
                f[b][0] -= fx;  f[b][1] -= fy

        # Spring attraction along FK edges
        for a, b in edges:
            dx = pos[b][0] - pos[a][0]
            dy = pos[b][1] - pos[a][1]
            d  = max(math.hypot(dx, dy), 1.0)
            mag = SP_K * (d - SP_REST)
            fx, fy = mag * dx / d, mag * dy / d
            f[a][0] += fx;  f[a][1] += fy
            f[b][0] -= fx;  f[b][1] -= fy

        # Weak pull toward domain cluster centre
        for nid in node_ids:
            cx, cy = DOMAIN_CENTERS.get(domains[nid], DOMAIN_CENTERS['OTHER'])
            f[nid][0] += CLU_K * (cx - pos[nid][0])
            f[nid][1] += CLU_K * (cy - pos[nid][1])

        # Integrate with damping + boundary clamp
        for nid in node_ids:
            vel[nid][0] = (vel[nid][0] + f[nid][0]) * DAMP
            vel[nid][1] = (vel[nid][1] + f[nid][1]) * DAMP
            pos[nid][0] = max(R_PAD, min(width  - R_PAD, pos[nid][0] + vel[nid][0]))
            pos[nid][1] = max(R_PAD, min(height - R_PAD, pos[nid][1] + vel[nid][1]))

    return {nid: (round(pos[nid][0]), round(pos[nid][1])) for nid in node_ids}


def gather_phases_from_main():
    """Extract PHASES array from main interconnection diagram HTML.
    Returns [{id, num, color, skills:[...], desc}] or [] if not found."""
    main_html = OUT_DIR / 'aicodepath-interconnection-diagram.html'
    if not main_html.exists():
        return []
    text = main_html.read_text(encoding='utf-8', errors='replace')
    m = re.search(r'const PHASES\s*=\s*(\[.*?\]);', text, re.DOTALL)
    if not m:
        return []
    try:
        phases = json.loads(m.group(1))
        return phases
    except Exception:
        return []


# ══════════════════════════════════════════════════════════════════════════════
# SHARED RENDERING HELPERS
# ══════════════════════════════════════════════════════════════════════════════

PAGES = [
    ("aicodepath-interconnection-diagram.html", "⬡ Framework Map"),
    ("aicodepath-agent-heatmap.html",           "◈ Agent Heatmap"),
    ("aicodepath-phase-flow.html",              "▶ Phase Flow"),
    ("aicodepath-gicl-topology.html",           "↻ GICL Topology"),
    ("aicodepath-skill-chain-feature.html",     "⚡ Skill Chain"),
    ("aicodepath-settings-audit.html",          "⚙ Settings Audit"),
    ("aicodepath-db-schema.html",               "◫ DB Schema"),
]

def nav_html(active):
    links = []
    for href, label in PAGES:
        cls = 'nav-link nav-active' if href == active else 'nav-link'
        links.append(f'<a class="{cls}" href="{href}">{label}</a>')
    return ('<nav class="top-nav"><span class="nav-brand">AICodePath</span>'
            + ''.join(links) + '</nav>')

def footer_html():
    return f'<div class="meta-footer">AICodePath {VERSION} &middot; Generated {GEN_DATE}</div>'

COMMON_CSS = """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0d1117; --bg2: #161b22; --bg3: #21262d; --bg4: #2d333b;
  --border: #30363d; --border2: #444c56; --border3: #30363d;
  --text: #e6edf3; --text2: #8b949e; --text3: #484f58;
  --accent: #58a6ff;
  font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
}
body { background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
.top-nav {
  display: flex; align-items: center; gap: 2px;
  padding: 0 16px; height: 40px; background: var(--bg2);
  border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100;
  flex-wrap: wrap;
}
.nav-brand { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--text2); padding-right: 12px; border-right: 1px solid var(--border3); margin-right: 6px;
  white-space: nowrap; }
.nav-link {
  font-size: 11px; padding: 4px 9px; border-radius: 4px; text-decoration: none;
  color: var(--text2); transition: color .15s, background .15s; white-space: nowrap;
}
.nav-link:hover { color: var(--text); background: var(--bg3); }
.nav-active { color: var(--text) !important; background: var(--bg3) !important;
  box-shadow: inset 0 -2px 0 var(--accent); }
.theme-btn {
  margin-left: auto; font-size: 11px; padding: 3px 10px; border-radius: 4px;
  background: var(--bg3); border: 1px solid var(--border); color: var(--text2);
  cursor: pointer; white-space: nowrap;
}
.theme-btn:hover { color: var(--text); }
.meta-footer {
  position: fixed; bottom: 8px; right: 12px; font-size: 10px; color: var(--text3);
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  pointer-events: none; z-index: 200;
}
body.light { --bg: #f6f8fa; --bg2: #eaeef2; --bg3: #d0d7de; --bg4: #c0c8d0;
  --border: #d0d7de; --border2: #b0b7be; --text: #1f2328; --text2: #57606a; --text3: #8c959f;
  --accent: #0969da; }
h1 { font-size: 18px; font-weight: 600; color: var(--text); }
h2 { font-size: 13px; font-weight: 600; color: var(--text2); text-transform: uppercase;
  letter-spacing: .08em; }
.page-header { padding: 20px 24px 12px; border-bottom: 1px solid var(--border); }
.page-header p { font-size: 12px; color: var(--text2); margin-top: 4px; }
"""

def page(title, subtitle, active_file, body_css, body_html):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — AICodePath</title>
<style>
{COMMON_CSS}
{body_css}
</style>
</head>
<body>
{nav_html(active_file)}
<div class="page-header">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div><h1>{title}</h1><p>{subtitle}</p></div>
    <button class="theme-btn" onclick="document.body.classList.toggle('light');this.textContent=document.body.classList.contains('light')?'Dark':'Light'">Light</button>
  </div>
</div>
{body_html}
{footer_html()}
</body>
</html>"""


# ══════════════════════════════════════════════════════════════════════════════
# D1 — PHASE FLOW  (data from main diagram PHASES array)
# ══════════════════════════════════════════════════════════════════════════════

# Fallback phase config used when main diagram doesn't exist yet
_D1_FALLBACK_PHASES = [
    {"id":"PRE-FLIGHT",   "num":"01","color":{"dark":"#4a9eff","light":"#005fd0"},
     "skills":["aicodepath-preflight","aicodepath-diagnostics","aicodepath-init","aicodepath-help","using-aicodepath"]},
    {"id":"INCEPTION",    "num":"02","color":{"dark":"#22c55e","light":"#166534"},
     "skills":["aicodepath-brainstorm","aicodepath-requirements","aicodepath-write-plan","aicodepath-c4-architecture","aicodepath-classify-component"]},
    {"id":"CONSTRUCTION", "num":"03","color":{"dark":"#f59e0b","light":"#92400e"},
     "skills":["aicodepath-tdd","aicodepath-implement","aicodepath-gicl-start","aicodepath-validate-guidelines","aicodepath-review","aicodepath-debug","aicodepath-confidence-check","aicodepath-solid-principles"]},
    {"id":"EXECUTION",    "num":"04","color":{"dark":"#ef4444","light":"#991b1b"},
     "skills":["aicodepath-orchestrate","aicodepath-work","aicodepath-swarm","aicodepath-subagent-dev","aicodepath-orchestration-mode","aicodepath-composite-worker","aicodepath-efficiency-mode","aicodepath-worktree"]},
    {"id":"VERIFICATION", "num":"05","color":{"dark":"#a78bfa","light":"#5b21b6"},
     "skills":["aicodepath-verify","aicodepath-acceptance","aicodepath-vapt","aicodepath-review"]},
    {"id":"SESSION",      "num":"06","color":{"dark":"#06b6d4","light":"#0e7490"},
     "skills":["aicodepath-checkpoint","aicodepath-learn","aicodepath-resume","aicodepath-status","aicodepath-pause","aicodepath-rewind","aicodepath-knowledge"]},
    {"id":"AUTHORING",    "num":"07","color":{"dark":"#f97316","light":"#9a3412"},
     "skills":["aicodepath-agent-creator","aicodepath-agent-audit","aicodepath-hook-creator","aicodepath-hook-audit","aicodepath-skill-creator","aicodepath-skill-audit","aicodepath-skill-improver","aicodepath-skill-testing","aicodepath-command-creator"]},
    {"id":"LEARNING",     "num":"08","color":{"dark":"#84cc16","light":"#3f6212"},
     "skills":["aicodepath-preferences","aicodepath-codebase-pattern-finder","aicodepath-visual-memory","aicodepath-research-mode","aicodepath-mental-model"]},
    {"id":"DEVTOOLS",     "num":"09","color":{"dark":"#e879f9","light":"#86198f"},
     "skills":["aicodepath-git","aicodepath-release","aicodepath-naming-analyzer","aicodepath-reducing-entropy","aicodepath-dependency-updater","aicodepath-statusline","aicodepath-prompt-engg","aicodepath-interconnection-diagram","aicodepath-readme-crafter","aicodepath-coding-standards","aicodepath-diagrams","aicodepath-analyze"]},
    {"id":"DOMAIN",       "num":"10","color":{"dark":"#fb7185","light":"#9f1239"},
     "skills":["aicodepath-android","aicodepath-pm","aicodepath-web-quality","aicodepath-webapp-testing","aicodepath-frontend-design-review","aicodepath-gcp-monorepo-deploy","aicodepath-mcp-builder","aicodepath-model-training"]},
]

FLOW_EDGES = [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(5,7),(6,8),(7,9)]

def _strip_prefix(s):
    return s.replace('aicodepath-', '').replace('using-', '')

def gen_d1(phases):
    icons = {"PRE-FLIGHT":"🔍","INCEPTION":"💡","CONSTRUCTION":"🔨","EXECUTION":"⚡",
             "VERIFICATION":"✅","SESSION":"💾","AUTHORING":"✍️","LEARNING":"🧠",
             "DEVTOOLS":"🛠","DOMAIN":"🌐"}

    def color_val(p):
        c = p.get('color', {})
        if isinstance(c, dict):
            return c.get('dark', '#58a6ff')
        return c

    def chip_html(skill, color):
        label = _strip_prefix(skill)
        return (f'<span class="chip" style="--cc:{color}">{label}</span>')

    def phase_card(p, idx):
        color = color_val(p)
        skills = p.get('skills', [])
        chips = ''.join(chip_html(s, color) for s in skills[:3])
        if len(skills) > 3:
            chips += f'<span class="chip more">+{len(skills)-3} more</span>'
        icon = icons.get(p['id'], '▸')
        return f'''<div class="phase-card" id="pc-{p["num"]}" data-idx="{idx}"
    style="--pc:{color}" onclick="selectPhase(this,{idx})">
  <div class="pc-head">
    <span class="pc-num">{p["num"]}</span>
    <span class="pc-icon">{icon}</span>
    <div>
      <div class="pc-name">{p["id"]}</div>
      <div class="pc-desc">{p.get("desc","") or (str(len(p.get("skills",[])))+" skills")}</div>
    </div>
  </div>
  <div class="pc-chips">{chips}</div>
</div>'''

    row1 = '\n'.join(phase_card(phases[i], i) for i in range(min(5, len(phases))))
    row2 = '\n'.join(phase_card(phases[i], i) for i in range(5, min(10, len(phases))))

    # Build JS phase data for detail panel
    phases_js = json.dumps([{
        'id': p['id'],
        'num': p['num'],
        'color': color_val(p),
        'skills': [_strip_prefix(s) for s in p.get('skills', [])],
        'desc': p.get('desc', ''),
    } for p in phases])

    d1_css = """
.pipeline-wrap { padding: 24px; overflow: auto; min-height: calc(100vh - 160px); }
.pipeline-row { display: flex; gap: 14px; margin-bottom: 14px; align-items: stretch; }
.phase-card {
  flex: 1; min-width: 155px; border-radius: 8px;
  background: var(--bg2); border: 1px solid var(--border);
  border-top: 3px solid var(--pc); padding: 14px 12px;
  cursor: pointer; transition: border-color .2s, transform .15s, box-shadow .2s;
}
.phase-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,.4); }
.phase-card.active { box-shadow: 0 0 0 2px var(--pc), 0 4px 20px rgba(0,0,0,.5); }
.pc-head { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
.pc-num { font-size: 10px; font-weight: 700; color: var(--pc);
  background: color-mix(in srgb, var(--pc) 15%, transparent);
  padding: 2px 5px; border-radius: 3px; font-family: monospace; white-space: nowrap; }
.pc-icon { font-size: 18px; line-height: 1; margin-top: 2px; }
.pc-name { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: .04em; }
.pc-desc { font-size: 10px; color: var(--text2); margin-top: 2px; }
.pc-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { font-size: 9px; padding: 2px 6px; border-radius: 3px; white-space: nowrap;
  font-family: 'SF Mono','Cascadia Code',monospace;
  background: color-mix(in srgb, var(--cc,#58a6ff) 12%, var(--bg3));
  color: color-mix(in srgb, var(--cc,#58a6ff) 80%, var(--text2));
  border: 1px solid color-mix(in srgb, var(--cc,#58a6ff) 20%, transparent); }
.chip.more { color: var(--text3); background: var(--bg3); border-color: var(--border); }
.flow-arrows { padding: 0 24px 8px; display: flex; gap: 14px; }
.flow-arrow { flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--text3); }
.detail-panel { margin: 0 24px 24px; background: var(--bg2); border: 1px solid var(--border);
  border-radius: 8px; padding: 16px 20px; display: none; }
.detail-panel.visible { display: block; }
.dp-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.dp-phase-num { font-size: 11px; font-weight: 700; font-family: monospace;
  padding: 2px 7px; border-radius: 4px; }
.dp-phase-name { font-size: 15px; font-weight: 600; }
.dp-skills { display: flex; flex-wrap: wrap; gap: 6px; }
.dp-skill { font-size: 11px; padding: 4px 10px; border-radius: 4px;
  font-family: 'SF Mono','Cascadia Code',monospace;
  background: var(--bg3); border: 1px solid var(--border); color: var(--text); }
"""
    body_html = f"""
<div class="pipeline-wrap">
  <div class="pipeline-row">{row1}</div>
  <div class="flow-arrows">{''.join('<div class="flow-arrow">→</div>' for _ in range(5))}</div>
  <div class="pipeline-row">{row2}</div>
  <div class="detail-panel" id="detailPanel">
    <div class="dp-header">
      <span class="dp-phase-num" id="dpNum"></span>
      <span class="dp-phase-name" id="dpName"></span>
    </div>
    <div class="dp-skills" id="dpSkills"></div>
  </div>
</div>
<script>
const PHASES_DATA = {phases_js};
let selIdx = null;
function selectPhase(el, idx) {{
  if (selIdx === idx) {{
    document.querySelectorAll('.phase-card').forEach(c=>c.classList.remove('active'));
    document.getElementById('detailPanel').classList.remove('visible');
    selIdx = null; return;
  }}
  document.querySelectorAll('.phase-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  selIdx = idx;
  const p = PHASES_DATA[idx];
  const panel = document.getElementById('detailPanel');
  panel.classList.add('visible');
  const num = document.getElementById('dpNum');
  num.textContent = p.num;
  num.style.background = p.color + '22';
  num.style.color = p.color;
  document.getElementById('dpName').textContent = p.id + (p.desc ? ' — ' + p.desc : '');
  document.getElementById('dpSkills').innerHTML =
    p.skills.map(s=>`<span class="dp-skill">${{s}}</span>`).join('');
}}
</script>
"""
    return page("Phase Flow",
                f"{len(phases)} phases · {sum(len(p.get('skills',[])) for p in phases)} skills — click a phase to expand",
                "aicodepath-phase-flow.html", d1_css, body_html)


# ══════════════════════════════════════════════════════════════════════════════
# D2 — GICL TOPOLOGY  (static state machine — GICL states are framework logic)
# ══════════════════════════════════════════════════════════════════════════════

def gen_d2():
    STATES = [
        {"id":"init",       "label":"Initialize",    "x":100, "y":200, "color":"#4a9eff",
         "desc":"Create session, detect complexity (simple/moderate/complex)"},
        {"id":"iterate",    "label":"Iterate",       "x":320, "y":200, "color":"#f59e0b",
         "desc":"Run full quality checks: tests, guidelines, arch, duplication, auth"},
        {"id":"score",      "label":"Score",         "x":540, "y":200, "color":"#22c55e",
         "desc":"Weighted scoring: tests 35%, guidelines 20%, arch 15%, dup 20%, auth 10%"},
        {"id":"check",      "label":"Gate Check",    "x":760, "y":200, "color":"#a78bfa",
         "desc":"Continue if score<90 AND max-iters not reached AND no stall (3 iters)"},
        {"id":"complete",   "label":"Complete",      "x":980, "y":200, "color":"#22c55e",
         "desc":"Score ≥90 — write lessons to knowledge.md, mark session done"},
        {"id":"hard_stop",  "label":"Hard Stop",     "x":760, "y":360, "color":"#ef4444",
         "desc":"Max iterations OR regression >10 pts OR stalled 3 consecutive iterations"},
    ]
    DIMS = [
        ("Tests",       "35%", "#22c55e", 35),
        ("Guidelines",  "20%", "#f59e0b", 20),
        ("Architecture","15%", "#4a9eff", 15),
        ("Duplication", "20%", "#a78bfa", 20),
        ("Auth",        "10%", "#ef4444", 10),
    ]
    TRANSITIONS = [
        ("init","iterate","start loop","#444c56",False),
        ("iterate","score","compute","#444c56",False),
        ("score","check","evaluate","#444c56",False),
        ("check","iterate","score < 90","#f59e0b",True),
        ("check","complete","score ≥ 90","#22c55e",False),
        ("check","hard_stop","stop condition","#ef4444",False),
    ]
    W, H = 1140, 460
    r = 38

    def cx(s): return next(st["x"] for st in STATES if st["id"]==s)
    def cy(s): return next(st["y"] for st in STATES if st["id"]==s)

    # Build SVG elements
    svg_parts = [f'<svg id="gsvg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    svg_parts.append('<defs>')
    for color, arrow_id in [("#444c56","arr-grey"),("#f59e0b","arr-amber"),
                              ("#22c55e","arr-green"),("#ef4444","arr-red")]:
        svg_parts.append(f'<marker id="{arrow_id}" markerWidth="9" markerHeight="7" '
                         f'refX="8" refY="3.5" orient="auto">'
                         f'<path d="M0,0 L9,3.5 L0,7 z" fill="{color}"/></marker>')
    svg_parts.append('</defs>')

    # Transitions
    for frm, to, lbl, color, curved in TRANSITIONS:
        x1, y1 = cx(frm), cy(frm)
        x2, y2 = cx(to),  cy(to)
        arrow_id = {"#444c56":"arr-grey","#f59e0b":"arr-amber",
                    "#22c55e":"arr-green","#ef4444":"arr-red"}[color]
        if curved:
            mx, my = (x1+x2)/2, min(y1,y2) - 55
            svg_parts.append(f'<path d="M{x1},{y1-r} Q{mx},{my} {x2},{y2-r}" '
                             f'fill="none" stroke="{color}" stroke-width="2" stroke-dasharray="5,3" '
                             f'marker-end="url(#{arrow_id})"/>')
            svg_parts.append(f'<text x="{mx}" y="{my-8}" text-anchor="middle" '
                             f'font-size="10" fill="{color}">{lbl}</text>')
        else:
            # Offset endpoints
            dx, dy = x2-x1, y2-y1
            length = (dx**2+dy**2)**0.5 or 1
            ox, oy = dx/length*r, dy/length*r
            svg_parts.append(f'<line x1="{x1+ox:.1f}" y1="{y1+oy:.1f}" '
                             f'x2="{x2-ox:.1f}" y2="{y2-oy:.1f}" '
                             f'stroke="{color}" stroke-width="2" marker-end="url(#{arrow_id})"/>')
            mx, my = (x1+x2)/2, (y1+y2)/2
            svg_parts.append(f'<text x="{mx}" y="{my-8}" text-anchor="middle" '
                             f'font-size="10" fill="{color}">{lbl}</text>')

    # State circles
    for st in STATES:
        svg_parts.append(
            f'<circle cx="{st["x"]}" cy="{st["y"]}" r="{r}" '
            f'fill="color-mix(in srgb,{st["color"]} 15%,#161b22)" '
            f'stroke="{st["color"]}" stroke-width="2" '
            f'style="cursor:pointer" onclick="showDesc(\'{st["id"]}\')" />')
        svg_parts.append(
            f'<text x="{st["x"]}" y="{st["y"]}" text-anchor="middle" '
            f'dominant-baseline="middle" font-size="11" font-weight="700" '
            f'fill="{st["color"]}">{st["label"]}</text>')

    svg_parts.append('</svg>')
    svg_content = '\n'.join(svg_parts)

    # Score dimension bars
    bars = ''.join(
        f'<div class="dim-row"><span class="dim-label">{label}</span>'
        f'<div class="dim-bar"><div class="dim-fill" style="width:{pct};background:{color}"></div></div>'
        f'<span class="dim-pct" style="color:{color}">{pct}</span></div>'
        for label, pct, color, _ in DIMS
    )

    # State descriptions JS
    descs_js = json.dumps({st["id"]: {"label": st["label"], "desc": st["desc"], "color": st["color"]}
                           for st in STATES})

    d2_css = """
.gicl-wrap { display: flex; gap: 0; height: calc(100vh - 100px); }
.gicl-svg-area { flex: 1; overflow: hidden; padding: 20px; }
.gicl-sidebar { width: 280px; padding: 20px; border-left: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
.sidebar-section { }
.sidebar-title { font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: var(--text3); margin-bottom: 10px; }
.dim-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.dim-label { font-size: 11px; color: var(--text2); width: 90px; flex-shrink: 0; }
.dim-bar { flex: 1; height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; }
.dim-fill { height: 100%; border-radius: 3px; }
.dim-pct { font-size: 10px; font-weight: 700; width: 30px; text-align: right; }
.state-desc { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px;
  padding: 12px; font-size: 11px; color: var(--text2); min-height: 60px; }
.state-desc strong { color: var(--text); display: block; margin-bottom: 4px; font-size: 12px; }
"""
    body_html = f"""
<div class="gicl-wrap">
  <div class="gicl-svg-area">{svg_content}</div>
  <div class="gicl-sidebar">
    <div class="sidebar-section">
      <div class="sidebar-title">Score Dimensions</div>
      {bars}
    </div>
    <div class="sidebar-section">
      <div class="sidebar-title">State Details</div>
      <div class="state-desc" id="stateDesc">
        <em style="color:var(--text3)">Click a state to see details</em>
      </div>
    </div>
  </div>
</div>
<script>
const STATE_DESCS = {descs_js};
function showDesc(id) {{
  const s = STATE_DESCS[id];
  if (!s) return;
  document.getElementById('stateDesc').innerHTML =
    `<strong style="color:${{s.color}}">${{s.label}}</strong>${{s.desc}}`;
}}
</script>
"""
    return page("GICL Topology",
                "Governed Iterative Construction Loop — quality gate state machine · target score ≥ 90",
                "aicodepath-gicl-topology.html", d2_css, body_html)


# ══════════════════════════════════════════════════════════════════════════════
# D3 — SETTINGS AUDIT  (dynamic: reads settings.json)
# ══════════════════════════════════════════════════════════════════════════════

# Script group definitions — defines visual grouping/color for scripts.
# Add new groups here if new hook categories are introduced.
SCRIPT_GROUPS = [
    ("LIFECYCLE",    "#06b6d4", "Session Lifecycle",
     {"session-start-hook","visual-memory-loader","session-auto-cleanup",
      "session-end-hook","pre-compact-hook","response-stop-hook","notification-hook","worktree-lifecycle"}),
    ("PREFLIGHT",    "#22c55e", "Pre-flight & Permissions",
     {"pre-flight-check","permission-request-hook"}),
    ("WRITE_GUARDS", "#f59e0b", "Write Guards",
     {"schema-context-hook","guideline-validator","duplication-checker","safety-guardrails"}),
    ("BASH_GUARDS",  "#ef4444", "Bash Guards",
     {"pre-commit-validator","ci-status-checker","pre-commit-validator"}),
    ("POST_WRITE",   "#a78bfa", "Post-Write Quality",
     {"auto-artifact-creator","gicl-iteration-hook","post-tool-security-scan",
      "test-tampering-detector","plans-watcher","tdd-order-check","auto-test-runner",
      "construction-skill-suggester","document-skill-suggester"}),
    ("POST_BASH",    "#4a9eff", "Post-Bash Actions",
     {"post-commit-hook","post-tool-failure-hook"}),
]

EVENT_COLORS = {
    "SessionStart":       "#4a9eff", "UserPromptSubmit": "#22c55e",
    "PermissionRequest":  "#06b6d4", "PreToolUse-Write":  "#f59e0b",
    "PreToolUse-Bash":    "#ef4444", "PostToolUse-Write": "#a78bfa",
    "PostToolUse-Bash":   "#4a9eff", "PostToolUseFailure":"#fb7185",
    "Stop":               "#8b949e", "PreCompact":        "#06b6d4",
    "SessionEnd":         "#22c55e", "Notification":      "#84cc16",
    "WorktreeRemove":     "#f97316",
}

def _script_group(script_name):
    for gid, color, label, members in SCRIPT_GROUPS:
        if script_name in members:
            return gid, color, label
    return "OTHER", "#8b949e", "Other"

def gen_d3(event_map):
    # Collect all unique scripts in order
    all_scripts = []
    for scripts in event_map.values():
        for s in scripts:
            if s not in all_scripts:
                all_scripts.append(s)

    # Build event → script connections as JSON for JS
    connections_js = json.dumps(event_map)
    events_js = json.dumps(list(event_map.keys()))
    scripts_js = json.dumps(all_scripts)
    event_colors_js = json.dumps(EVENT_COLORS)
    group_colors_js = json.dumps({gid: color for gid, color, _, _ in SCRIPT_GROUPS})

    # Group membership map
    script_to_group = {}
    for gid, color, label, members in SCRIPT_GROUPS:
        for s in members:
            script_to_group[s] = {"id": gid, "color": color, "label": label}
    script_to_group_js = json.dumps(script_to_group)

    n_events  = len(event_map)
    n_scripts = len(all_scripts)
    n_edges   = sum(len(v) for v in event_map.values())

    # Per-event and per-script detail data embedded directly in the generated HTML
    event_details = {
        "SessionStart":       {"phase": "SESSION",      "outputs": "additionalContext, continue, suppressOutput", "desc": "Fires once at session start. Injects skill context and resumes prior session state."},
        "UserPromptSubmit":   {"phase": "PRE-FLIGHT",   "outputs": "additionalContext, decision/reason",          "desc": "Fires for every user message. Used for pre-flight environment checks and context injection."},
        "PermissionRequest":  {"phase": "PRE-FLIGHT",   "outputs": "decision/reason",                             "desc": "Fires when Claude requests permission to use a tool. Hooks can allow or block the request."},
        "PreToolUse-Write":   {"phase": "CONSTRUCTION", "outputs": "additionalContext, decision/reason",          "desc": "Fires before Write or Edit tool calls. Runs validation guards, schema injection, and duplication checks."},
        "PreToolUse-Bash":    {"phase": "CONSTRUCTION", "outputs": "decision/reason",                             "desc": "Fires before Bash tool calls. Runs safety guardrails and commit validators."},
        "PostToolUse-Write":  {"phase": "CONSTRUCTION", "outputs": "additionalContext, systemMessage",            "desc": "Fires after successful Write/Edit. Runs GICL scoring, security scan, and skill suggestions."},
        "PostToolUse-Bash":   {"phase": "CONSTRUCTION", "outputs": "additionalContext, systemMessage",            "desc": "Fires after successful Bash. Triggers post-commit learning and CI status feedback."},
        "PostToolUseFailure": {"phase": "CONSTRUCTION", "outputs": "systemMessage",                               "desc": "Fires when any tool call fails. Provides reflexion-based recovery suggestions."},
        "Stop":               {"phase": "SESSION",      "outputs": "stopReason, systemMessage",                   "desc": "Fires when Claude finishes a response. Runs final checks and status updates."},
        "PreCompact":         {"phase": "SESSION",      "outputs": "additionalContext",                            "desc": "Fires before context window compaction. Saves state so it survives compression."},
        "SessionEnd":         {"phase": "SESSION",      "outputs": "systemMessage",                                "desc": "Fires when the session ends. Persists session phase and GICL state to the DB."},
        "Notification":       {"phase": "SESSION",      "outputs": "systemMessage",                                "desc": "Fires on system notifications (task completion, alerts). Forwards to the dashboard."},
        "WorktreeRemove":     {"phase": "SESSION",      "outputs": "systemMessage",                                "desc": "Fires when a git worktree is removed. Cleans up lifecycle state and DB records."},
    }
    script_details = {
        "session-start-hook":           {"group": "Session Lifecycle",  "output": "additionalContext", "desc": "Reads using-aicodepath/SKILL.md and injects it as context on every session start."},
        "visual-memory-loader":         {"group": "Session Lifecycle",  "output": "additionalContext", "desc": "Loads relevant visual memory diagrams (ER, class, phase flow) into session context."},
        "session-auto-cleanup":         {"group": "Session Lifecycle",  "output": "systemMessage",     "desc": "Closes stale GICL sessions and removes expired worktree records at session start."},
        "session-end-hook":             {"group": "Session Lifecycle",  "output": "systemMessage",     "desc": "Persists session phase and GICL state to DB when a session ends."},
        "pre-compact-hook":             {"group": "Session Lifecycle",  "output": "additionalContext", "desc": "Saves current context summary before compaction so state survives compression."},
        "pre-flight-check":             {"group": "Pre-flight",         "output": "systemMessage",     "desc": "Verifies hooks, MCP servers, DB, and environment are correctly configured."},
        "permission-request-hook":      {"group": "Pre-flight",         "output": "decision/reason",   "desc": "Validates tool permission requests against allow/block policy lists."},
        "schema-context-hook":          {"group": "Write Guards",       "output": "additionalContext", "desc": "Injects DB schema context before Write/Edit on migration or schema files."},
        "guideline-validator":          {"group": "Write Guards",       "output": "decision/reason",   "desc": "Validates code against 15+ JSON guideline rule files. Blocks on rule violations."},
        "duplication-checker":          {"group": "Write Guards",       "output": "decision/reason",   "desc": "Detects significant code duplication before a file is written. Warns or blocks."},
        "safety-guardrails":            {"group": "Write Guards",       "output": "decision/reason",   "desc": "Blocks dangerous patterns: credential access, destructive shell ops, force-push to main."},
        "pre-commit-validator":         {"group": "Bash Guards",        "output": "decision/reason",   "desc": "Validates git commit operations — checks staged files, message format, and hook bypass attempts."},
        "ci-status-checker":            {"group": "Bash Guards",        "output": "systemMessage",     "desc": "Checks CI pipeline status before Bash runs. Warns if the pipeline is currently failing."},
        "auto-artifact-creator":        {"group": "Post-Write Quality", "output": "systemMessage",     "desc": "Auto-generates diagram and doc artifacts after significant code changes."},
        "gicl-iteration-hook":          {"group": "Post-Write Quality", "output": "additionalContext", "desc": "Runs GICL quality scoring (tests 35%, guidelines 20%, arch 15%, dup 20%, auth 10%) after Write/Edit."},
        "post-tool-security-scan":      {"group": "Post-Write Quality", "output": "systemMessage",     "desc": "Scans written code for OWASP Top 10 and AICodePath security rule violations."},
        "test-tampering-detector":      {"group": "Post-Write Quality", "output": "decision/reason",   "desc": "Detects if tests were weakened, skipped, or deleted — enforces TDD integrity."},
        "plans-watcher":                {"group": "Post-Write Quality", "output": "systemMessage",     "desc": "Monitors adr-log.md and tasks.md for changes; alerts when plan is modified."},
        "tdd-order-check":              {"group": "Post-Write Quality", "output": "systemMessage",     "desc": "Enforces test-before-implementation order — warns if implementation precedes failing tests."},
        "auto-test-runner":             {"group": "Post-Write Quality", "output": "systemMessage",     "desc": "Automatically runs the test suite after code files are written. Reports pass/fail."},
        "construction-skill-suggester": {"group": "Post-Write Quality", "output": "additionalContext", "desc": "Suggests relevant construction-phase skills based on the pattern of code being written."},
        "document-skill-suggester":     {"group": "Post-Write Quality", "output": "additionalContext", "desc": "Suggests documentation skills (readme-crafter, c4-architecture) after significant writes."},
        "post-commit-hook":             {"group": "Post-Bash Actions",  "output": "systemMessage",     "desc": "Fires aicodepath-learn after a git commit to extract and persist session lessons."},
        "post-tool-failure-hook":       {"group": "Failure Handlers",   "output": "systemMessage",     "desc": "Handles tool failures with reflexion-based recovery suggestions from past sessions."},
        "response-stop-hook":           {"group": "Failure Handlers",   "output": "systemMessage",     "desc": "Runs final checks when Claude finishes a response (verify gate, checkpoint reminder)."},
        "notification-hook":            {"group": "Failure Handlers",   "output": "systemMessage",     "desc": "Forwards system notifications to the dashboard WebSocket and logs them to DB."},
        "worktree-lifecycle":           {"group": "Failure Handlers",   "output": "systemMessage",     "desc": "Cleans up worktree DB records and branch state when a git worktree is removed."},
    }
    event_details_js  = json.dumps(event_details)
    script_details_js = json.dumps(script_details)

    d3_css = """
.audit-wrap { display: flex; height: calc(100vh - 100px); }
.audit-col { width: 210px; padding: 14px 10px; overflow-y: auto; flex-shrink: 0;
  border-right: 1px solid var(--border); }
.audit-center { flex: 1; position: relative; overflow: hidden; background: var(--bg); }
.audit-col-right { width: 250px; padding: 14px 10px; overflow-y: auto; flex-shrink: 0;
  border-left: 1px solid var(--border); }
.col-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
  color: var(--text3); margin-bottom: 10px; }
.evt-chip {
  display: flex; align-items: center; gap: 8px; padding: 7px 9px; margin-bottom: 3px;
  border-radius: 5px; cursor: pointer; border: 1px solid transparent;
  transition: background .15s, border-color .15s; user-select: none;
}
.evt-chip:hover { background: var(--bg3); }
.evt-chip.active { background: var(--bg3); border-color: var(--border2); }
.evt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.evt-name { font-size: 11px; font-weight: 600; color: var(--text); font-family: monospace; }
.evt-count { font-size: 9px; color: var(--text3); margin-left: auto; }
.scr-chip {
  display: flex; align-items: center; gap: 7px; padding: 6px 9px; margin-bottom: 3px;
  border-radius: 5px; cursor: pointer; border: 1px solid transparent;
  transition: background .15s; user-select: none;
}
.scr-chip:hover { background: var(--bg3); }
.scr-chip.active { background: var(--bg3); border-color: var(--border2); }
.scr-dot { width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0; }
.scr-name { font-size: 10px; color: var(--text2); font-family: monospace; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.grp-header { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
  color: var(--text3); margin: 10px 0 4px; }
.detail-card {
  display: none; position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
  width: min(400px, 78%); background: var(--bg2); border: 1px solid var(--border2);
  border-radius: 8px; padding: 16px 18px; z-index: 1;
  box-shadow: 0 4px 28px rgba(0,0,0,0.45); pointer-events: none;
}
.detail-card.visible { display: block; }
.dc-type { font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .12em; color: var(--text3); margin-bottom: 5px; }
.dc-name { font-size: 14px; font-weight: 700; color: var(--text);
  font-family: monospace; margin-bottom: 7px; word-break: break-all; }
.dc-badge { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; padding: 2px 8px; border-radius: 3px; margin-bottom: 12px; color: #fff; }
.dc-row { display: flex; gap: 8px; align-items: baseline;
  margin-bottom: 6px; font-size: 11px; line-height: 1.4; }
.dc-lbl { color: var(--text3); width: 84px; flex-shrink: 0; font-size: 10px; }
.dc-val { color: var(--text2); flex: 1; }
.dc-count { font-weight: 700; color: var(--text); font-family: monospace; }
"""

    body_html = f"""
<div class="audit-wrap">
  <div class="audit-col">
    <div class="col-title">Hook Events ({n_events})</div>
    <div id="evtList"></div>
  </div>
  <div class="audit-center">
    <div class="detail-card" id="detail-card">
      <div class="dc-type" id="dc-type"></div>
      <div class="dc-name" id="dc-name"></div>
      <div class="dc-badge" id="dc-badge"></div>
      <div class="dc-row"><span class="dc-lbl" id="dc-lbl1"></span><span class="dc-val" id="dc-val1"></span></div>
      <div class="dc-row"><span class="dc-lbl" id="dc-lbl2"></span><span class="dc-val" id="dc-val2"></span></div>
      <div class="dc-row"><span class="dc-lbl" id="dc-lbl3"></span><span class="dc-val" id="dc-val3"></span></div>
    </div>
    <canvas id="audit-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none"></canvas>
  </div>
  <div class="audit-col-right">
    <div class="col-title">Hook Scripts ({n_scripts})</div>
    <div id="scrList"></div>
  </div>
</div>
<script>
const CONNECTIONS = {connections_js};
const EVENTS = {events_js};
const SCRIPTS = {scripts_js};
const EVENT_COLORS = {event_colors_js};
const GROUP_COLORS = {group_colors_js};
const SCRIPT_GROUPS_MAP = {script_to_group_js};
const EVENT_DETAILS = {event_details_js};
const SCRIPT_DETAILS = {script_details_js};

function showDetail(type, id, color) {{
  const card = document.getElementById('detail-card');
  const isEvent = type === 'event';
  const data = isEvent ? EVENT_DETAILS[id] : SCRIPT_DETAILS[id];
  if (!data) {{ card.classList.remove('visible'); return; }}
  document.getElementById('dc-type').textContent = isEvent ? 'Hook Event' : 'Hook Script';
  document.getElementById('dc-name').textContent = id;
  const badge = document.getElementById('dc-badge');
  badge.textContent = isEvent ? data.phase : data.group;
  badge.style.background = color;
  if (isEvent) {{
    document.getElementById('dc-lbl1').textContent = 'Description';
    document.getElementById('dc-val1').textContent = data.desc;
    document.getElementById('dc-lbl2').textContent = 'Valid outputs';
    document.getElementById('dc-val2').textContent = data.outputs;
    document.getElementById('dc-lbl3').textContent = 'Scripts wired';
    const count = (CONNECTIONS[id] || []).length;
    document.getElementById('dc-val3').innerHTML = '<span class="dc-count">' + count + '</span>';
  }} else {{
    document.getElementById('dc-lbl1').textContent = 'Purpose';
    document.getElementById('dc-val1').textContent = data.desc;
    document.getElementById('dc-lbl2').textContent = 'Output type';
    document.getElementById('dc-val2').textContent = data.output;
    const evts = EVENTS.filter(e => (CONNECTIONS[e]||[]).includes(id));
    document.getElementById('dc-lbl3').textContent = 'Triggered by';
    document.getElementById('dc-val3').textContent = evts.join(', ') || '—';
  }}
  card.classList.add('visible');
}}

let selEvent = null, selScript = null;
const evtEls = {{}}, scrEls = {{}};

// Build event list
const evtList = document.getElementById('evtList');
EVENTS.forEach(ev => {{
  const cnt = (CONNECTIONS[ev]||[]).length;
  const color = EVENT_COLORS[ev] || '#8b949e';
  const div = document.createElement('div');
  div.className = 'evt-chip'; div.dataset.ev = ev;
  div.innerHTML = `<span class="evt-dot" style="background:${{color}}"></span>
    <span class="evt-name">${{ev}}</span><span class="evt-count">${{cnt}}</span>`;
  div.onclick = () => selectEvent(ev);
  evtList.appendChild(div);
  evtEls[ev] = div;
}});

// Build script list grouped
const scrList = document.getElementById('scrList');
const drawnGroups = new Set();
SCRIPTS.forEach(sc => {{
  const gi = SCRIPT_GROUPS_MAP[sc] || {{id:'OTHER',color:'#8b949e',label:'Other'}};
  if (!drawnGroups.has(gi.id)) {{
    drawnGroups.add(gi.id);
    const hdr = document.createElement('div');
    hdr.className = 'grp-header';
    hdr.style.color = gi.color;
    hdr.textContent = gi.label;
    scrList.appendChild(hdr);
  }}
  const div = document.createElement('div');
  div.className = 'scr-chip'; div.dataset.sc = sc;
  div.innerHTML = `<span class="scr-dot" style="background:${{gi.color}}"></span>
    <span class="scr-name">${{sc}}</span>`;
  div.onclick = () => selectScript(sc);
  scrList.appendChild(div);
  scrEls[sc] = div;
}});

function selectEvent(ev) {{
  if (selEvent === ev && !selScript) {{ selEvent = null; clearSel(); return; }}
  selEvent = ev; selScript = null;
  document.querySelectorAll('.evt-chip').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.scr-chip').forEach(e=>e.classList.remove('active'));
  evtEls[ev] && evtEls[ev].classList.add('active');
  const scripts = CONNECTIONS[ev] || [];
  scripts.forEach(s => scrEls[s] && scrEls[s].classList.add('active'));
  const color = EVENT_COLORS[ev] || '#58a6ff';
  showDetail('event', ev, color);
  drawLines(ev, null);
}}
function selectScript(sc) {{
  if (selScript === sc) {{ selScript = null; clearSel(); return; }}
  selScript = sc; selEvent = null;
  document.querySelectorAll('.evt-chip').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.scr-chip').forEach(e=>e.classList.remove('active'));
  scrEls[sc] && scrEls[sc].classList.add('active');
  const evts = EVENTS.filter(e => (CONNECTIONS[e]||[]).includes(sc));
  evts.forEach(e => evtEls[e] && evtEls[e].classList.add('active'));
  const color = evts.length ? (EVENT_COLORS[evts[0]] || '#58a6ff') : '#58a6ff';
  showDetail('script', sc, color);
  drawLines(null, sc);
}}
function clearSel() {{
  document.querySelectorAll('.evt-chip,.scr-chip').forEach(e=>e.classList.remove('active'));
  document.getElementById('detail-card').classList.remove('visible');
  drawLines(null, null);
}}

const canvas = document.getElementById('audit-canvas');
function drawLines(activeEv, activeSc) {{
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const center = canvas.getBoundingClientRect();

  EVENTS.forEach(ev => {{
    (CONNECTIONS[ev]||[]).forEach(sc => {{
      const evEl = evtEls[ev]; const scEl = scrEls[sc];
      if (!evEl || !scEl) return;
      const evR = evEl.getBoundingClientRect();
      const scR = scEl.getBoundingClientRect();
      const x1 = evR.right - center.left;
      const y1 = evR.top + evR.height/2 - center.top;
      const x2 = scR.left - center.left;
      const y2 = scR.top + scR.height/2 - center.top;
      const active = (activeEv === ev) || (activeSc === sc) ||
                     (!activeEv && !activeSc);
      ctx.globalAlpha = active ? 0.8 : 0.08;
      const color = active ? (EVENT_COLORS[ev] || '#58a6ff') : '#8b949e';
      ctx.strokeStyle = color; ctx.lineWidth = active ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const mx = (x1 + x2) / 2;
      ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
      ctx.stroke();
    }});
  }});
}}
window.addEventListener('resize', () => drawLines(selEvent, selScript));
setTimeout(() => drawLines(null, null), 50);
</script>
"""
    return page("Settings Audit",
                f"{n_events} hook events · {n_scripts} scripts · {n_edges} connections — click to explore",
                "aicodepath-settings-audit.html", d3_css, body_html)


# ══════════════════════════════════════════════════════════════════════════════
# D4 — SKILL CHAIN PER FEATURE  (dynamic: agent list from agents/*.md)
# ══════════════════════════════════════════════════════════════════════════════

def gen_d4(agents):
    """Feature Playbook: Feature selector → AIDLC chain → Agent group cards."""

    FEAT = [
        {'id':'api',      'label':'API Endpoint',       'color':'#4a9eff', 'icon':'⬡'},
        {'id':'db',       'label':'Database Feature',   'color':'#f59e0b', 'icon':'◫'},
        {'id':'frontend', 'label':'Frontend Component', 'color':'#22c55e', 'icon':'◈'},
        {'id':'security', 'label':'Security Feature',   'color':'#ef4444', 'icon':'⚡'},
        {'id':'ml',       'label':'ML Model',           'color':'#a78bfa', 'icon':'◉'},
    ]
    STEPS = [
        {'id':'brainstorm',       'short':'Design',    'skill':'/aicodepath-brainstorm'},
        {'id':'write-plan',       'short':'Plan',      'skill':'/aicodepath-write-plan'},
        {'id':'confidence-check', 'short':'≥70%',      'skill':'/aicodepath-confidence-check'},
        {'id':'tdd',              'short':'TDD',       'skill':'/aicodepath-tdd'},
        {'id':'gicl-start',       'short':'GICL≥90',   'skill':'/aicodepath-gicl-start'},
        {'id':'validate',         'short':'16 Rules',  'skill':'/aicodepath-validate-guidelines'},
        {'id':'verify',           'short':'Evidence',  'skill':'/aicodepath-verify'},
        {'id':'checkpoint',       'short':'Save',      'skill':'/aicodepath-checkpoint'},
    ]
    GROUP_ORDER = ['ARCHITECTURE','QUALITY','SEC+OPS','ML+AI','DESIGN',
                   'LANGUAGES','FRAMEWORKS','CLOUD+INFRA','DOMAIN','BUSINESS','INTERNAL']
    GROUP_COLORS = {
        'ARCHITECTURE': '#4a9eff', 'QUALITY':    '#22c55e', 'SEC+OPS':    '#ef4444',
        'ML+AI':        '#e879f9', 'DESIGN':     '#a78bfa', 'LANGUAGES':  '#06b6d4',
        'FRAMEWORKS':   '#f59e0b', 'CLOUD+INFRA':'#3b82f6', 'DOMAIN':     '#10b981',
        'BUSINESS':     '#ec4899', 'INTERNAL':   '#64748b',
    }
    FEAT_AGENT_GROUPS = {
        'api':      ['ARCHITECTURE','QUALITY','SEC+OPS','LANGUAGES','FRAMEWORKS'],
        'db':       ['ARCHITECTURE','QUALITY','DOMAIN'],
        'frontend': ['ARCHITECTURE','DESIGN','QUALITY','LANGUAGES','FRAMEWORKS'],
        'security': ['SEC+OPS','QUALITY','CLOUD+INFRA'],
        'ml':       ['ML+AI','QUALITY','DOMAIN'],
    }

    # Build agent name list per group
    group_agents = {g: [] for g in GROUP_ORDER}
    for a in agents:
        g = a['group'] if a['group'] in GROUP_ORDER else 'INTERNAL'
        group_agents[g].append(a['id'].replace('aicodepath-', ''))

    # Feature selector
    feat_cards = []
    for i, f in enumerate(FEAT):
        active = ' feat-active' if i == 0 else ''
        feat_cards.append(
            f'<button class="feat-card{active}" data-feat="{f["id"]}" '
            f'style="--fc:{f["color"]}" onclick="selectFeat(\'{f["id"]}\')">'
            f'<span class="feat-icon">{f["icon"]}</span>'
            f'<span class="feat-label">{f["label"]}</span>'
            f'</button>'
        )
    feat_html = '\n    '.join(feat_cards)

    # AIDLC chain
    step_parts = []
    for i, s in enumerate(STEPS):
        if i > 0:
            step_parts.append('<span class="chain-arr">›</span>')
        step_parts.append(
            f'<div class="chain-step">'
            f'<div class="step-pill">{s["short"]}</div>'
            f'<div class="step-skill">{s["skill"]}</div>'
            f'</div>'
        )
    chain_html = '\n    '.join(step_parts)

    # Agent group cards
    group_cards = []
    for g in GROUP_ORDER:
        color = GROUP_COLORS[g]
        names = group_agents[g]
        tooltip = ', '.join(names)
        group_cards.append(
            f'<div class="group-card" data-group="{g}" style="--gc:{color}">'
            f'<div class="group-name">{g}</div>'
            f'<div class="group-count">{len(names)} agents</div>'
            f'<div class="group-tooltip">{tooltip}</div>'
            f'</div>'
        )
    groups_html = '\n    '.join(group_cards)

    feats_js   = json.dumps(FEAT)
    feat_ag_js = json.dumps(FEAT_AGENT_GROUPS)

    d4_css = """
.playbook { padding: 24px 28px; max-width: 1440px; }
.zone-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text3); margin-bottom: 10px; }

/* Feature selector */
.feat-selector { display: flex; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
.feat-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 22px; border-radius: 10px; cursor: pointer; min-width: 148px;
  background: var(--bg2); border: 2px solid var(--border); color: var(--text2);
  transition: border-color .15s, background .15s, color .15s; font-family: inherit;
}
.feat-card:hover { border-color: var(--fc); color: var(--text); }
.feat-card.feat-active {
  border-color: var(--fc); color: var(--text); background: var(--bg3);
  box-shadow: 0 0 0 1px var(--fc);
}
.feat-icon { font-size: 20px; color: var(--fc); }
.feat-label { font-size: 12px; font-weight: 600; text-align: center; line-height: 1.3; }

/* AIDLC Chain */
.chain-wrap {
  display: flex; align-items: flex-start; gap: 0; flex-wrap: nowrap;
  padding: 18px 20px; background: var(--bg2); border-radius: 10px;
  border: 1px solid var(--border); margin-bottom: 28px; overflow-x: auto;
}
.chain-step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
.step-pill {
  background: var(--bg3); border: 1px solid var(--border2); border-radius: 20px;
  padding: 5px 16px; font-size: 11px; font-weight: 600; color: var(--text); white-space: nowrap;
}
.step-skill {
  font-size: 9px; color: var(--text3); font-family: 'SF Mono','Cascadia Code','Consolas',monospace;
  white-space: nowrap;
}
.chain-arr { font-size: 18px; color: var(--text3); padding: 0 6px; margin-top: 4px; flex-shrink: 0; }

/* Agent group cards */
.groups-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.group-card {
  position: relative; padding: 14px 18px; border-radius: 8px; min-width: 140px;
  background: var(--bg2); border: 1.5px solid var(--border);
  transition: opacity .2s, border-color .2s;
}
.group-card.active-group { border-color: var(--gc); }
.group-card.dimmed { opacity: 0.12; }
.group-card:hover { border-color: var(--gc); }
.group-name { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: var(--gc); }
.group-count { font-size: 10px; color: var(--text3); margin-top: 3px; }
.group-tooltip {
  display: none; position: absolute; bottom: calc(100% + 8px); left: 0;
  background: var(--bg3); border: 1px solid var(--border2); border-radius: 6px;
  padding: 8px 12px; font-size: 10px; color: var(--text2); line-height: 1.6;
  z-index: 50; max-width: 280px; white-space: normal;
  box-shadow: 0 4px 16px rgba(0,0,0,.5); pointer-events: none;
}
.group-card:hover .group-tooltip { display: block; }
"""

    body_html = f"""
<div class="playbook">
  <div class="zone-label">Feature Type — click to highlight relevant agent groups</div>
  <div class="feat-selector">
    {feat_html}
  </div>

  <div class="zone-label">AIDLC Skill Chain — universal across all feature types</div>
  <div class="chain-wrap">
    {chain_html}
  </div>

  <div class="zone-label">Specialist Agent Groups — <span id="feat-label-active" style="color:#4a9eff">API Endpoint</span> · hover a card to see agents</div>
  <div class="groups-grid" id="groups-grid">
    {groups_html}
  </div>
</div>
<script>
const D4_FEATS = {feats_js};
const FEAT_AG  = {feat_ag_js};
let selFeat = 'api';

function selectFeat(fid) {{
  if (selFeat === fid) return;
  selFeat = fid;
  const feat = D4_FEATS.find(f=>f.id===fid);
  document.querySelectorAll('.feat-card').forEach(c => {{
    c.classList.toggle('feat-active', c.dataset.feat === fid);
  }});
  const lbl = document.getElementById('feat-label-active');
  if (lbl) {{ lbl.textContent = feat ? feat.label : fid; lbl.style.color = feat ? feat.color : ''; }}
  const active = FEAT_AG[fid] || [];
  document.querySelectorAll('.group-card').forEach(c => {{
    const on = active.includes(c.dataset.group);
    c.classList.toggle('dimmed', !on);
    c.classList.toggle('active-group', on);
  }});
}}
selectFeat('api');
</script>
"""

    return page(
        "Skill Chain per Feature",
        f"{len(FEAT)} feature types · {len(STEPS)} AIDLC steps · {len(agents)} specialist agents",
        "aicodepath-skill-chain-feature.html", d4_css, body_html
    )


# ══════════════════════════════════════════════════════════════════════════════
# D5 — DB SCHEMA  (dynamic: parses schema.sql + migrations)
# ══════════════════════════════════════════════════════════════════════════════

# Domain color assignments — add new domains here as DB grows
TABLE_DOMAINS = {
    'GICL':      {'color':'#f59e0b', 'tables':{'gicl_sessions','gicl_iterations','quality_scores'}},
    'ARTIFACTS': {'color':'#4a9eff', 'tables':{'artifacts','artifact_metadata','artifact_files','code_artifacts'}},
    'SESSIONS':  {'color':'#22c55e', 'tables':{'sessions','session_events','session_summaries','checkpoints',
                                                'session_state','handoffs'}},
    'AGENTS':    {'color':'#a78bfa', 'tables':{'agent_suggestions','agent_invocations','agent_activity',
                                                'agent_usage_stats','agent_capabilities'}},
    'KNOWLEDGE': {'color':'#06b6d4', 'tables':{'knowledge_base','knowledge_entries','lessons_learned',
                                                'reflexion_patterns','planning_entries','adr_entries',
                                                'task_items','learning_events','fts_knowledge',
                                                'knowledge_base_content','knowledge_base_config',
                                                'knowledge_base_data','code_patterns','best_practices',
                                                'dependencies'}},
    'METRICS':   {'color':'#ef4444', 'tables':{'metrics','performance_metrics','token_usage',
                                                'cost_tracking','ci_status','guideline_violations',
                                                'test_results','build_results','sprint_tracking',
                                                'sprint_metrics'}},
}

def _table_domain(tname):
    for domain, info in TABLE_DOMAINS.items():
        if tname in info['tables']:
            return domain, info['color']
    return 'OTHER', '#8b949e'

def gen_d5(tables):
    """Generate an interactive force-directed ER graph explorer (Phase 1 + Phase 2).

    Phase 1: Python force-directed layout → static SVG positions + click-to-explore panel.
    Phase 2: JS runtime re-layout for focus mode (1-hop neighbourhood, animated with rAF).
    """
    import math

    if not tables:
        body = ('<div style="padding:40px;color:var(--text3)">No schema found — run '
                '<code>bash .aicodepath/scripts/init-knowledge-base.sh</code></div>')
        return page("DB Schema Graph", "No schema found", "aicodepath-db-schema.html", "", body)

    # ── Stats ─────────────────────────────────────────────────────────────────
    total_cols = sum(len(td['cols']) for td in tables.values())

    # ── Deduplicated FK edge list ─────────────────────────────────────────────
    fk_edges = []   # [(src_table, tgt_table, via_col, cardinality)]
    seen_pairs = set()
    for tname, td in tables.items():
        for from_col, to_tbl, _, card in td['fks']:
            if to_tbl in tables and to_tbl != tname:
                key = (tname, to_tbl)
                if key not in seen_pairs:
                    seen_pairs.add(key)
                    fk_edges.append((tname, to_tbl, from_col, card))

    # ── Phase 1: Python force-directed positions ───────────────────────────────
    positions = force_layout(tables, lambda t: _table_domain(t)[0])

    W, H = 1400, 820

    def node_r(t):
        return min(28 + max(0, len(tables[t]['cols']) - 5) // 3, 42)

    # ── SVG arrowhead markers (one per domain colour) ─────────────────────────
    unique_colors = list({_table_domain(t)[1] for t in tables})
    defs_parts = ['<defs>']
    for color in unique_colors:
        cid = color.lstrip('#')
        defs_parts.append(
            f'<marker id="arr-{cid}" markerWidth="7" markerHeight="7" '
            f'refX="6" refY="3" orient="auto" markerUnits="strokeWidth">'
            f'<path d="M0,0.5 L0,5.5 L6.5,3 z" fill="{color}" opacity="0.65"/></marker>'
        )
    defs_parts.append('</defs>')
    defs_svg = '\n'.join(defs_parts)

    # ── SVG edge paths + cardinality labels ──────────────────────────────────
    edge_parts = []
    card_parts = []
    for i, (src, tgt, via, card) in enumerate(fk_edges):
        if src not in positions or tgt not in positions:
            continue
        sx, sy = positions[src]
        tx, ty = positions[tgt]
        rs, rt = node_r(src), node_r(tgt)
        _, col_src = _table_domain(src)
        cid = col_src.lstrip('#')

        dx, dy = tx - sx, ty - sy
        d = math.hypot(dx, dy)
        if d < 1:
            continue
        nx, ny = dx / d, dy / d

        # Adjust start/end to circle perimeters
        sx2, sy2 = sx + nx * rs,         sy + ny * rs
        tx2, ty2 = tx - nx * (rt + 7),   ty - ny * (rt + 7)

        # Slight perpendicular curve for readability
        mx = (sx2 + tx2) / 2 - ny * 30
        my = (sy2 + ty2) / 2 + nx * 30

        edge_parts.append(
            f'<path class="er-edge" data-src="{src}" data-tgt="{tgt}" data-via="{via}" '
            f'data-cidx="{i}" '
            f'd="M{sx2:.1f},{sy2:.1f} Q{mx:.1f},{my:.1f} {tx2:.1f},{ty2:.1f}" '
            f'stroke="{col_src}" stroke-width="1.2" fill="none" opacity="0.22" '
            f'marker-end="url(#arr-{cid})"/>'
        )

        # Cardinality labels: source side (N or 1) and target side (always 1)
        src_lbl = 'N' if card == '1:N' else '1'
        # Offset: along edge direction ± slight perpendicular nudge
        lx_s = sx + nx * (rs + 14) - ny * 7
        ly_s = sy + ny * (rs + 14) + nx * 7
        lx_t = tx - nx * (rt + 18) - ny * 7
        ly_t = ty - ny * (rt + 18) + nx * 7
        card_parts.append(
            f'<text class="er-card-lbl" data-src="{src}" data-tgt="{tgt}" '
            f'data-which="src" x="{lx_s:.1f}" y="{ly_s:.1f}" '
            f'fill="{col_src}" font-size="8.5" text-anchor="middle" '
            f'font-family="monospace" font-weight="700" opacity="0.5" '
            f'pointer-events="none">{src_lbl}</text>\n'
            f'<text class="er-card-lbl" data-src="{src}" data-tgt="{tgt}" '
            f'data-which="tgt" x="{lx_t:.1f}" y="{ly_t:.1f}" '
            f'fill="{col_src}" font-size="8.5" text-anchor="middle" '
            f'font-family="monospace" font-weight="700" opacity="0.5" '
            f'pointer-events="none">1</text>'
        )
    edges_svg = '\n'.join(edge_parts)
    cards_svg = '\n'.join(card_parts)

    # ── SVG node elements ─────────────────────────────────────────────────────
    node_parts = []
    for tname in tables:
        if tname not in positions:
            continue
        x, y = positions[tname]
        r = node_r(tname)
        dom, color = _table_domain(tname)
        label = tname if len(tname) <= 15 else tname[:14] + '…'
        node_parts.append(
            f'<g class="er-node" data-id="{tname}" data-domain="{dom}" '
            f'transform="translate({x},{y})" cursor="pointer">'
            f'<circle r="{r}" fill="{color}" fill-opacity="0.12" '
            f'stroke="{color}" stroke-width="1.8" stroke-opacity="0.72"/>'
            f'<text text-anchor="middle" dominant-baseline="middle" '
            f'font-size="7.5" fill="{color}" font-family="monospace" '
            f'font-weight="700" pointer-events="none">{label}</text>'
            f'</g>'
        )
    nodes_svg = '\n'.join(node_parts)

    # ── JS data payload ───────────────────────────────────────────────────────
    js_nodes = {}
    for tname, td in tables.items():
        dom, color = _table_domain(tname)
        x, y = positions.get(tname, (0, 0))
        js_nodes[tname] = {
            'domain': dom, 'color': color,
            'x': x, 'y': y, 'r': node_r(tname),
            'cols': [{'name': c['name'], 'type': c['type'],
                      'pk': c['pk'], 'fk': c['fk'], 'fk_table': c.get('fk_table')}
                     for c in td['cols']],
            'fks': [(fc, tt, tc, card)
                    for fc, tt, tc, card in td['fks']
                    if tt in tables and tt != tname],
        }

    ref_by = {t: [] for t in tables}
    for tname, td in tables.items():
        for from_col, to_tbl, _, _card in td['fks']:
            if to_tbl in ref_by:
                ref_by[to_tbl].append([tname, from_col])

    js_data = (
        f"const NODES={json.dumps(js_nodes)};\n"
        f"const REF_BY={json.dumps(ref_by)};\n"
        f"const FK_EDGES={json.dumps([(s,t,v,c) for s,t,v,c in fk_edges])};\n"
        f"const CW={W}, CH={H};\n"
    )

    # ── JS logic (not an f-string — braces are literal JS) ───────────────────
    js_code = r"""
const erSvg   = document.getElementById('erSvg');
const panel   = document.getElementById('erPanel');
const btnFocus= document.getElementById('btnFocus');
const btnExit = document.getElementById('btnExitFocus');
const overlay = document.getElementById('focusOverlay');

// Index DOM elements
const nodeEls = {}, edgeEls = {};
document.querySelectorAll('.er-node').forEach(g => { nodeEls[g.dataset.id] = g; });
document.querySelectorAll('.er-edge').forEach(p => {
  const key = p.dataset.src + '|' + p.dataset.tgt;
  (edgeEls[key] = edgeEls[key] || []).push(p);
});

// Build neighbour index from FK_EDGES
const NEIGHBORS = {};
Object.keys(NODES).forEach(id => { NEIGHBORS[id] = new Set(); });
FK_EDGES.forEach(([s, t]) => {
  NEIGHBORS[s] && NEIGHBORS[s].add(t);
  NEIGHBORS[t] && NEIGHBORS[t].add(s);
});

// ── Pan / Zoom ─────────────────────────────────────────────────────────────
let vb = {x:0, y:0, w:CW, h:CH};
function setVB() { erSvg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
let dragging = false, dragStart = null, vbStart = null;

erSvg.addEventListener('wheel', e => {
  e.preventDefault();
  const s = e.deltaY > 0 ? 1.13 : 0.885;
  const r = erSvg.getBoundingClientRect();
  const px = vb.x + (e.clientX - r.left) / r.width  * vb.w;
  const py = vb.y + (e.clientY - r.top)  / r.height * vb.h;
  vb.w *= s; vb.h *= s;
  vb.x = px - (e.clientX - r.left) / r.width  * vb.w;
  vb.y = py - (e.clientY - r.top)  / r.height * vb.h;
  setVB();
}, {passive: false});

erSvg.addEventListener('mousedown', e => {
  if (e.target.closest('.er-node')) return;
  dragging = true;
  dragStart = {x: e.clientX, y: e.clientY};
  vbStart    = {...vb};
  erSvg.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  const r  = erSvg.getBoundingClientRect();
  const sx = vb.w / r.width;
  const sy = vb.h / r.height;
  vb.x = vbStart.x - (e.clientX - dragStart.x) * sx;
  vb.y = vbStart.y - (e.clientY - dragStart.y) * sy;
  setVB();
});
window.addEventListener('mouseup', () => { dragging = false; erSvg.style.cursor = ''; });
erSvg.addEventListener('dblclick', e => {
  if (!e.target.closest('.er-node')) resetView();
});

function resetView() {
  vb = {x:0, y:0, w:CW, h:CH};
  setVB();
}

// ── Selection state ────────────────────────────────────────────────────────
let selectedId = null;
let focusMode  = false;
const origPos  = {};   // original Python-computed positions
Object.entries(NODES).forEach(([id, n]) => { origPos[id] = {x: n.x, y: n.y}; });

// ── Parse translate ────────────────────────────────────────────────────────
function getXY(g) {
  const t = g.getAttribute('transform') || '';
  const m = t.match(/translate\(([^,]+),([^)]+)\)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
}

// ── Recompute edge paths + cardinality labels from current node positions ──
function updateEdges() {
  document.querySelectorAll('.er-edge').forEach(path => {
    const src = path.dataset.src, tgt = path.dataset.tgt;
    const sg = nodeEls[src], tg = nodeEls[tgt];
    if (!sg || !tg) return;
    const [sx, sy] = getXY(sg), [tx, ty] = getXY(tg);
    const rs = NODES[src].r, rt = NODES[tgt].r;
    const dx = tx - sx, dy = ty - sy;
    const d  = Math.hypot(dx, dy);
    if (d < 1) return;
    const nx = dx / d, ny = dy / d;
    const sx2 = sx + nx * rs,      sy2 = sy + ny * rs;
    const tx2 = tx - nx * (rt + 7), ty2 = ty - ny * (rt + 7);
    const mx  = (sx2 + tx2) / 2 - ny * 30;
    const my  = (sy2 + ty2) / 2 + nx * 30;
    path.setAttribute('d',
      `M${sx2.toFixed(1)},${sy2.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx2.toFixed(1)},${ty2.toFixed(1)}`);
  });
  document.querySelectorAll('.er-card-lbl').forEach(lbl => {
    const src = lbl.dataset.src, tgt = lbl.dataset.tgt, which = lbl.dataset.which;
    const sg = nodeEls[src], tg = nodeEls[tgt];
    if (!sg || !tg) return;
    const [sx, sy] = getXY(sg), [tx, ty] = getXY(tg);
    const rs = NODES[src].r, rt = NODES[tgt].r;
    const dx = tx - sx, dy = ty - sy;
    const d  = Math.hypot(dx, dy);
    if (d < 1) return;
    const nx = dx / d, ny = dy / d;
    if (which === 'src') {
      lbl.setAttribute('x', (sx + nx * (rs + 14) - ny * 7).toFixed(1));
      lbl.setAttribute('y', (sy + ny * (rs + 14) + nx * 7).toFixed(1));
    } else {
      lbl.setAttribute('x', (tx - nx * (rt + 18) - ny * 7).toFixed(1));
      lbl.setAttribute('y', (ty - ny * (rt + 18) + nx * 7).toFixed(1));
    }
  });
}

// ── Animate node positions (eased transition) ──────────────────────────────
function animateTo(targets, duration, onDone) {
  const t0  = performance.now();
  const from = {};
  Object.keys(targets).forEach(id => {
    from[id] = getXY(nodeEls[id]);
  });
  function frame(now) {
    const t  = Math.min((now - t0) / duration, 1);
    const e  = 1 - Math.pow(1 - t, 3);   // ease-out cubic
    Object.entries(targets).forEach(([id, {x, y}]) => {
      const nx = from[id][0] + (x - from[id][0]) * e;
      const ny = from[id][1] + (y - from[id][1]) * e;
      nodeEls[id].setAttribute('transform', `translate(${nx.toFixed(1)},${ny.toFixed(1)})`);
    });
    updateEdges();
    if (t < 1) requestAnimationFrame(frame);
    else if (onDone) onDone();
  }
  requestAnimationFrame(frame);
}

// ── Selection helpers ──────────────────────────────────────────────────────
function clearSelection() {
  document.querySelectorAll('.er-node').forEach(g => {
    g.classList.remove('selected', 'dimmed', 'neighbor');
  });
  document.querySelectorAll('.er-edge').forEach(p => {
    p.classList.remove('active', 'dimmed');
    p.setAttribute('opacity', '0.22');
  });
  document.querySelectorAll('.er-card-lbl').forEach(t => {
    t.setAttribute('opacity', '0.5');
  });
  selectedId = null;
  btnFocus.style.display = 'none';
  panel.innerHTML = '<div class="ep-empty">Click any table to explore its schema and relationships</div>';
}

function selectNode(id) {
  if (focusMode) return;   // in focus mode, clicks exit it
  if (selectedId === id) { clearSelection(); return; }
  clearSelection();
  selectedId = id;

  const n = NODES[id];
  const nbrs = NEIGHBORS[id];

  // Dim everything, then highlight selection + neighbours
  document.querySelectorAll('.er-node').forEach(g => {
    const gid = g.dataset.id;
    if (gid === id)          g.classList.add('selected');
    else if (nbrs.has(gid)) g.classList.add('neighbor');
    else                     g.classList.add('dimmed');
  });

  document.querySelectorAll('.er-edge').forEach(p => {
    const active = p.dataset.src === id || p.dataset.tgt === id;
    if (active) {
      p.classList.add('active');
      p.setAttribute('opacity', '0.85');
    } else {
      p.classList.add('dimmed');
      p.setAttribute('opacity', '0.03');
    }
  });
  document.querySelectorAll('.er-card-lbl').forEach(t => {
    const active = t.dataset.src === id || t.dataset.tgt === id;
    t.setAttribute('opacity', active ? '1' : '0.03');
  });

  // Set CSS custom property for glow colour
  nodeEls[id].style.setProperty('--nc', n.color);
  btnFocus.style.display = '';
  renderPanel(id);
}

// ── Panel rendering ────────────────────────────────────────────────────────
function renderPanel(id) {
  const n = NODES[id];
  const refBy = REF_BY[id] || [];

  const colsHtml = n.cols.slice(0, 35).map(c => {
    const pk = c.pk ? '<span class="ep-badge-sm ep-badge-pk">PK</span>' : '';
    const fk = c.fk ? '<span class="ep-badge-sm ep-badge-fk">FK</span>' : '';
    return `<div class="ep-col-row">
      <span class="ep-col-name">${c.name}</span>
      <span class="ep-col-type">${c.type}</span>${pk}${fk}
    </div>`;
  }).join('') + (n.cols.length > 35
    ? `<div style="padding:4px 0;font-size:9px;color:var(--text3);text-align:center">+${n.cols.length - 35} more</div>`
    : '');

  const fkOut = n.fks.map(([fc, tt, _tc, card]) =>
    `<span class="ep-link" onclick="selectNode('${tt}')" title="via ${fc}">${tt}<span class="ep-card-tag">${card}</span></span>`
  ).join('');
  const fkIn = refBy.map(([ft, fc]) =>
    `<span class="ep-link" onclick="selectNode('${ft}')" title="via ${fc}">${ft}</span>`
  ).join('');

  panel.innerHTML = `
    <div class="ep-header">
      <div class="ep-name">${id}</div>
      <div class="ep-badge" style="background:${n.color}">${n.domain}</div>
      <div class="ep-stats">${n.cols.length} cols &middot; ${n.fks.length} refs out &middot; ${refBy.length} refs in</div>
    </div>
    <div class="ep-section">
      <div class="ep-section-title">Columns</div>
      ${colsHtml}
    </div>
    ${n.fks.length ? `<div class="ep-section">
      <div class="ep-section-title">References &#x2192;</div>${fkOut}
    </div>` : ''}
    ${refBy.length ? `<div class="ep-section">
      <div class="ep-section-title">Referenced by &#x2190;</div>${fkIn}
    </div>` : ''}
  `;
}

// ── Node click delegation ──────────────────────────────────────────────────
document.getElementById('nodeLayer').addEventListener('click', e => {
  const g = e.target.closest('.er-node');
  if (!g) return;
  if (focusMode) { exitFocusMode(); return; }
  selectNode(g.dataset.id);
});

// ── Phase 2: Focus mode ────────────────────────────────────────────────────
// JS force simulation for 1-hop neighbourhood re-layout
function runFocusSim(visIds, simEdges, cx, cy, onTick, onDone) {
  const STEPS = 180;
  const pos   = {}, vel = {};

  // Start in a ring around the canvas centre
  visIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / visIds.length;
    const r = Math.min(120, 28 + visIds.length * 18);
    pos[id] = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    vel[id] = [0, 0];
  });

  let step = 0;
  function tick() {
    if (step >= STEPS) { onDone(pos); return; }
    step++;

    const f = {};
    visIds.forEach(id => { f[id] = [0, 0]; });

    // Repulsion
    for (let i = 0; i < visIds.length; i++) {
      for (let j = i + 1; j < visIds.length; j++) {
        const a = visIds[i], b = visIds[j];
        const dx = pos[a][0] - pos[b][0], dy = pos[a][1] - pos[b][1];
        const d  = Math.max(Math.hypot(dx, dy), 1);
        const mag = 7000 / (d * d);
        f[a][0] += mag * dx / d; f[a][1] += mag * dy / d;
        f[b][0] -= mag * dx / d; f[b][1] -= mag * dy / d;
      }
    }

    // Springs along FK edges within the neighbourhood
    simEdges.forEach(([a, b]) => {
      if (!pos[a] || !pos[b]) return;
      const dx = pos[b][0] - pos[a][0], dy = pos[b][1] - pos[a][1];
      const d  = Math.max(Math.hypot(dx, dy), 1);
      const mag = 0.22 * (d - 110);
      f[a][0] += mag * dx / d; f[a][1] += mag * dy / d;
      f[b][0] -= mag * dx / d; f[b][1] -= mag * dy / d;
    });

    // Weak pull to canvas centre
    visIds.forEach(id => {
      f[id][0] += 0.045 * (cx - pos[id][0]);
      f[id][1] += 0.045 * (cy - pos[id][1]);
    });

    // Integrate
    visIds.forEach(id => {
      vel[id][0] = (vel[id][0] + f[id][0]) * 0.78;
      vel[id][1] = (vel[id][1] + f[id][1]) * 0.78;
      pos[id][0] += vel[id][0];
      pos[id][1] += vel[id][1];
    });

    // Live update every 8 steps for smooth animation
    if (step % 8 === 0) onTick(pos);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function enterFocusMode() {
  if (!selectedId || focusMode) return;
  focusMode = true;

  const centre = selectedId;
  const nbrs   = [...NEIGHBORS[centre]];
  const visIds  = [centre, ...nbrs];

  // Hide non-neighbourhood nodes and edges
  document.querySelectorAll('.er-node').forEach(g => {
    g.style.display = visIds.includes(g.dataset.id) ? '' : 'none';
  });
  document.querySelectorAll('.er-edge').forEach(p => {
    const vis = visIds.includes(p.dataset.src) && visIds.includes(p.dataset.tgt);
    p.style.display = vis ? '' : 'none';
    if (vis) { p.setAttribute('opacity', '0.8'); }
  });
  document.querySelectorAll('.er-card-lbl').forEach(t => {
    const vis = visIds.includes(t.dataset.src) && visIds.includes(t.dataset.tgt);
    t.style.display = vis ? '' : 'none';
    if (vis) { t.setAttribute('opacity', '1'); }
  });

  // Pan view to fit neighbourhood — use canvas centre
  const cx = CW / 2, cy = CH / 2;

  // Build edge list within neighbourhood
  const simEdges = FK_EDGES
    .filter(([s, t]) => visIds.includes(s) && visIds.includes(t))
    .map(([s, t]) => [s, t]);

  overlay.classList.add('visible');
  btnFocus.style.display = 'none';
  btnExit.style.display  = '';

  // Run Phase 2 JS force simulation with live animation
  runFocusSim(visIds, simEdges, cx, cy,
    // onTick: move nodes, update edges
    pos => {
      Object.entries(pos).forEach(([id, [x, y]]) => {
        nodeEls[id].setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      });
      updateEdges();
    },
    // onDone: final smooth snap to settled positions
    pos => {
      const targets = {};
      Object.entries(pos).forEach(([id, [x, y]]) => { targets[id] = {x, y}; });
      animateTo(targets, 300);
    }
  );
}

function exitFocusMode() {
  if (!focusMode) return;
  focusMode = false;

  // Show all nodes and edges
  document.querySelectorAll('.er-node').forEach(g => { g.style.display = ''; });
  document.querySelectorAll('.er-edge').forEach(p => { p.style.display = ''; });
  document.querySelectorAll('.er-card-lbl').forEach(t => { t.style.display = ''; });

  overlay.classList.remove('visible');
  btnExit.style.display = 'none';

  // Animate all nodes back to their original Python-computed positions
  animateTo(origPos, 450, () => { updateEdges(); });

  // Restore selection state
  if (selectedId) {
    selectNode(selectedId);   // re-highlight without re-entering focus
  }
}

// ── Search ─────────────────────────────────────────────────────────────────
function searchNodes(q) {
  const lq = q.toLowerCase().trim();
  if (!lq) { clearSelection(); return; }
  const match = Object.keys(NODES).find(id => id.toLowerCase().includes(lq));
  if (match) {
    selectNode(match);
    // Pan to the matched node
    const n = NODES[match];
    const pad = 200;
    vb = {x: n.x - pad, y: n.y - pad, w: pad * 2, h: pad * 2};
    setVB();
  }
}
"""

    # ── CSS ───────────────────────────────────────────────────────────────────
    d5_css = """
.er-toolbar { display:flex; align-items:center; gap:8px; padding:10px 20px;
  border-bottom:1px solid var(--border); flex-wrap:wrap; }
.er-wrap { display:flex; height:calc(100vh - 107px); }
.er-canvas { flex:1; position:relative; overflow:hidden; }
#erSvg { width:100%; height:100%; display:block; cursor:default; }
.er-node circle { transition:stroke-width .15s, fill-opacity .15s; }
.er-node:hover circle { stroke-width:3 !important; fill-opacity:0.26 !important; }
.er-node.selected circle { stroke-width:3.5; fill-opacity:0.3;
  filter:drop-shadow(0 0 7px var(--nc,#58a6ff)); }
.er-node.dimmed { opacity:0.1; transition:opacity .2s; }
.er-node.neighbor circle { stroke-width:2.8; fill-opacity:0.22; }
.er-edge { transition:opacity .2s; }
.er-panel { width:288px; flex-shrink:0; border-left:1px solid var(--border);
  overflow-y:auto; display:flex; flex-direction:column; background:var(--bg); }
.ep-empty { padding:32px 16px; color:var(--text3); font-size:11px;
  text-align:center; margin:auto; line-height:1.6; }
.ep-header { padding:14px 14px 10px; border-bottom:1px solid var(--border); }
.ep-name { font-size:14px; font-weight:700; font-family:monospace;
  color:var(--text); margin-bottom:6px; word-break:break-all; }
.ep-badge { display:inline-block; font-size:9px; font-weight:700; text-transform:uppercase;
  letter-spacing:.1em; padding:2px 8px; border-radius:3px; color:#fff; margin-bottom:7px; }
.ep-stats { font-size:10px; color:var(--text3); }
.ep-section { padding:9px 14px; border-bottom:1px solid var(--border); }
.ep-section-title { font-size:9px; font-weight:700; text-transform:uppercase;
  letter-spacing:.1em; color:var(--text3); margin-bottom:6px; }
.ep-col-row { display:flex; align-items:center; gap:5px; padding:3px 0;
  font-size:10px; border-bottom:1px solid var(--border); }
.ep-col-row:last-child { border-bottom:none; }
.ep-col-name { font-family:monospace; color:var(--text2); flex:1;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ep-col-type { font-size:9px; color:var(--text3); white-space:nowrap; }
.ep-badge-sm { font-size:8px; font-weight:700; padding:1px 4px; border-radius:2px; flex-shrink:0; }
.ep-badge-pk { background:#f59e0b22; color:#f59e0b; }
.ep-badge-fk { background:#4a9eff22; color:#4a9eff; }
.ep-link { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-family:monospace;
  color:var(--accent); cursor:pointer; padding:2px 7px; margin:2px 3px 2px 0;
  background:var(--bg3); border-radius:3px; border:1px solid var(--border); }
.ep-link:hover { background:var(--bg4); color:var(--text); }
.ep-card-tag { font-size:8px; font-weight:700; font-family:sans-serif;
  color:var(--text3); background:var(--bg); border-radius:2px;
  padding:0 3px; border:1px solid var(--border); line-height:1.5; }
.er-card-lbl { transition:opacity .2s; }
.er-btn { font-size:10px; padding:3px 10px; border-radius:4px;
  background:var(--bg3); border:1px solid var(--border); color:var(--text2);
  cursor:pointer; white-space:nowrap; }
.er-btn:hover { color:var(--text); }
.er-btn.focus-active { background:var(--accent); color:#fff; border-color:var(--accent); }
.er-search { font-size:11px; padding:4px 8px; background:var(--bg3);
  border:1px solid var(--border); color:var(--text); border-radius:4px; width:165px; }
.er-stats-lbl { font-size:10px; color:var(--text3); margin-left:auto; }
.focus-overlay { display:none; position:absolute; top:10px; left:50%;
  transform:translateX(-50%); background:var(--bg2); border:1px solid var(--border2);
  border-radius:6px; padding:5px 14px; font-size:10px; color:var(--text2);
  z-index:10; pointer-events:none; white-space:nowrap; }
.focus-overlay.visible { display:block; }
"""

    n_domains = len({_table_domain(t)[0] for t in tables})
    stats_str = f"{len(tables)} tables · {total_cols} columns · {len(fk_edges)} FK edges across {n_domains} domains"

    body_html = f"""
<div class="er-toolbar">
  <input class="er-search" id="erSearch" placeholder="Search tables…"
    oninput="searchNodes(this.value)">
  <button class="er-btn" onclick="resetView()" title="Reset pan/zoom">⊡ Reset</button>
  <button class="er-btn" id="btnFocus" onclick="enterFocusMode()"
    style="display:none" title="Focus on selected node and its 1-hop neighbourhood">⊙ Focus</button>
  <button class="er-btn" id="btnExitFocus" onclick="exitFocusMode()"
    style="display:none" title="Exit focus mode and restore full graph">✕ Exit Focus</button>
  <span class="er-stats-lbl">{stats_str}</span>
</div>
<div class="er-wrap">
  <div class="er-canvas">
    <div class="focus-overlay" id="focusOverlay">Focus mode — 1-hop neighbourhood &middot; click any node or Exit Focus to restore</div>
    <svg id="erSvg" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
      {defs_svg}
      <g id="erRoot">
        <g id="edgeLayer">{edges_svg}</g>
        <g id="cardLayer">{cards_svg}</g>
        <g id="nodeLayer">{nodes_svg}</g>
      </g>
    </svg>
  </div>
  <div class="er-panel" id="erPanel">
    <div class="ep-empty">Click any table node to explore its columns and FK relationships</div>
  </div>
</div>
<script>
{js_data}
{js_code}
</script>
"""

    return page("DB Schema Graph",
                stats_str + " — click to explore · scroll/drag to navigate · ⊙ Focus for neighbourhood",
                "aicodepath-db-schema.html", d5_css, body_html)


# ══════════════════════════════════════════════════════════════════════════════
# D6 — AGENT HEATMAP  (dynamic: reads agents/*.md, injects into skeleton)
# ══════════════════════════════════════════════════════════════════════════════

def gen_d6_skeleton_data(agents):
    """Generate the INTERCONNECTION_DATA block for the agent heatmap using the skeleton."""
    skeleton_path = ROOT / '.aicodepath/skills/aicodepath-interconnection-diagram/kit/interconnection-skeleton.html'
    if not skeleton_path.exists():
        return None, "Skeleton not found"

    skeleton = skeleton_path.read_text(encoding='utf-8')

    GROUP_META = {
        'ARCHITECTURE': {'color': {'dark':'#c084fc','light':'#7e22ce'}, 'order': 0},
        'QUALITY':      {'color': {'dark':'#34d399','light':'#065f46'}, 'order': 1},
        'SEC+OPS':      {'color': {'dark':'#f87171','light':'#991b1b'}, 'order': 2},
        'ML+AI':        {'color': {'dark':'#e879f9','light':'#701a75'}, 'order': 3},
        'DESIGN':       {'color': {'dark':'#fbbf24','light':'#78350f'}, 'order': 4},
        'LANGUAGES':    {'color': {'dark':'#67e8f9','light':'#0e7490'}, 'order': 5},
        'FRAMEWORKS':   {'color': {'dark':'#fcd34d','light':'#92400e'}, 'order': 6},
        'CLOUD+INFRA':  {'color': {'dark':'#60a5fa','light':'#1e3a5f'}, 'order': 7},
        'DOMAIN':       {'color': {'dark':'#6ee7b7','light':'#065f46'}, 'order': 8},
        'BUSINESS':     {'color': {'dark':'#f9a8d4','light':'#9d174d'}, 'order': 9},
        'INTERNAL':     {'color': {'dark':'#94a3b8','light':'#475569'}, 'order':10},
    }

    by_group = {}
    for a in agents:
        g = a['group'] if a['group'] in GROUP_META else 'INTERNAL'
        by_group.setdefault(g, []).append(a['id'])

    agent_groups = [
        {'id': g, 'color': GROUP_META[g]['color'], 'agents': by_group.get(g, [])}
        for g in sorted(GROUP_META, key=lambda x: GROUP_META[x]['order'])
        if g in by_group
    ]

    node_descs = {}
    for a in agents:
        node_descs[a['id']] = {'summary': a['desc'], 'context': f'Group: {a["group"]}',
                                'whenToUse': '', 'phase': 'AGENTS'}

    data = f"""const NODE_DESCS = {json.dumps(node_descs, indent=2)};
const EDGES = [];
const PHASES = [];
const AGENT_GROUPS = {json.dumps(agent_groups, indent=2)};
const HOOK_IDS = [];
const CHAIN = new Set([]);
const GUIDELINES = [];
const RULE_GROUPS = [];"""

    output = skeleton.replace('/* INTERCONNECTION_DATA */', data, 1)
    # Update title
    output = output.replace('<title>AICodePath Interconnection</title>',
                            '<title>AICodePath — Agent Heatmap</title>', 1)
    return output, None


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print(f"gen_bespoke.py — {VERSION} · {GEN_DATE}")
    print(f"Root: {ROOT}")
    print(f"Output: {OUT_DIR}")
    print()

    # Gather live data
    print("Gathering data...")
    event_map  = gather_settings()
    agents     = gather_agents()
    db_tables  = gather_db_schema()
    phases     = gather_phases_from_main() or _D1_FALLBACK_PHASES
    phase_src  = "main diagram" if gather_phases_from_main() else "fallback (run main diagram first)"

    print(f"  Settings: {len(event_map)} hook events, {sum(len(v) for v in event_map.values())} connections")
    print(f"  Agents:   {len(agents)} agents")
    print(f"  DB:       {len(db_tables)} tables")
    print(f"  Phases:   {len(phases)} phases, {sum(len(p.get('skills',[])) for p in phases)} skills ({phase_src})")
    print()

    results = []

    def write(filename, content):
        path = OUT_DIR / filename
        path.write_text(content, encoding='utf-8')
        size = path.stat().st_size
        print(f"  ✓ {filename} ({size:,} bytes)")
        results.append((filename, size))

    # D1
    write("aicodepath-phase-flow.html", gen_d1(phases))

    # D2 (static)
    write("aicodepath-gicl-topology.html", gen_d2())

    # D3 (dynamic)
    if event_map:
        write("aicodepath-settings-audit.html", gen_d3(event_map))
    else:
        print("  ⚠ D3 skipped — settings.json not found")

    # D4 (dynamic agents)
    if agents:
        write("aicodepath-skill-chain-feature.html", gen_d4(agents))
    else:
        print("  ⚠ D4 skipped — no agents found")

    # D5 (dynamic DB)
    write("aicodepath-db-schema.html", gen_d5(db_tables))

    # D6 (skeleton injection)
    d6_content, err = gen_d6_skeleton_data(agents)
    if d6_content:
        write("aicodepath-agent-heatmap.html", d6_content)
    else:
        print(f"  ⚠ D6 skipped — {err}")

    print(f"\nDone. {len(results)} files written to {OUT_DIR}")


if __name__ == '__main__':
    main()
