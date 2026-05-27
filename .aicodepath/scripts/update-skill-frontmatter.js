#!/usr/bin/env node
/**
 * AICodePath Skill Frontmatter Update Script
 *
 * Updates all SKILL.md files to include missing frontmatter fields:
 * - argument-hint
 * - disable-model-invocation
 *
 * Run with: node .aicodepath/scripts/update-skill-frontmatter.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Frontmatter updates for each skill
 */
const skillUpdates = {
  'aicodepath-init': {
    'argument-hint': '[project-name]',
    'disable-model-invocation': false,
  },
  'aicodepath-status': {
    'disable-model-invocation': false,
  },
  'aicodepath-resume': {
    'disable-model-invocation': false,
  },
  'aicodepath-preflight': {
    'argument-hint': '',
    'disable-model-invocation': false,
  },
  'aicodepath-pause': {
    'argument-hint': '[task-slug]',
    'disable-model-invocation': false,
  },
  'aicodepath-diagnostics': {
    'argument-hint': '',
    'disable-model-invocation': false,
  },
  'aicodepath-skill-audit': {
    'argument-hint': '[skill-name]',
    'disable-model-invocation': false,
  },
  'aicodepath-statusline': {
    'argument-hint': '',
    'disable-model-invocation': false,
  },
  'aicodepath-reducing-entropy': {
    'argument-hint': '[path]',
    'disable-model-invocation': false,
  },
  'aicodepath-dependency-updater': {
    'argument-hint': '',
    'disable-model-invocation': false,
  },
  'aicodepath-readme-crafter': {
    'argument-hint': '[readme-path]',
    'disable-model-invocation': false,
  },
  'aicodepath-coding-standards': {
    'argument-hint': '',
    'disable-model-invocation': false,
  },
  'aicodepath-frontend-design-review': {
    'argument-hint': '[component-path]',
    'disable-model-invocation': false,
  },
  // Skills that already have argument-hint, just need disable-model-invocation
  'aicodepath-help': {
    'disable-model-invocation': false,
  },
  'aicodepath-visual-memory': {
    'disable-model-invocation': false,
  },
  'aicodepath-learn': {
    'disable-model-invocation': false,
  },
  'aicodepath-c4-architecture': {
    'disable-model-invocation': false,
  },
  'aicodepath-requirements': {
    'disable-model-invocation': false,
  },
  'aicodepath-preferences': {
    'disable-model-invocation': false,
  },
  'aicodepath-diagrams': {
    'disable-model-invocation': false,
  },
  'aicodepath-naming-analyzer': {
    'disable-model-invocation': false,
  },
  'aicodepath-validate-guidelines': {
    'disable-model-invocation': false,
  },
  'aicodepath-mental-model': {
    'disable-model-invocation': false,
  },
  'aicodepath-command-creator': {
    'disable-model-invocation': false,
  },
};

/**
 * Parse frontmatter from content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content, hasFrontmatter: false };
  }

  const frontmatterText = match[1];
  const frontmatter = {};

  // Parse YAML-like frontmatter
  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim());
      }
      // Parse booleans
      else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      frontmatter[key] = value;
    }
  }

  return {
    frontmatter,
    body: content.slice(match[0].length),
    hasFrontmatter: true
  };
}

/**
 * Stringify frontmatter to YAML format
 */
function stringifyFrontmatter(frontmatter) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Update a skill file
 */
function updateSkillFile(skillPath, updates) {
  const content = fs.readFileSync(skillPath, 'utf8');
  const { frontmatter, body, hasFrontmatter } = parseFrontmatter(content);

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    // Only add if not already present
    if (!(key in frontmatter)) {
      frontmatter[key] = value;
    }
  }

  // Rebuild content
  const newFrontmatter = stringifyFrontmatter(frontmatter);
  const newContent = hasFrontmatter
    ? newFrontmatter + '\n' + body
    : newFrontmatter + '\n' + content;

  fs.writeFileSync(skillPath, newContent, 'utf8');
}

/**
 * Main execution
 */
function main() {
  const skillsDir = path.join(process.cwd(), '.aicodepath', 'skills');
  let updatedCount = 0;
  let skippedCount = 0;

  console.log('AICodePath Skill Frontmatter Update Script');
  console.log('========================================\n');

  for (const [skillName, updates] of Object.entries(skillUpdates)) {
    const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

    if (!fs.existsSync(skillPath)) {
      console.warn(`⚠️  Skill not found: ${skillName}`);
      skippedCount++;
      continue;
    }

    try {
      const content = fs.readFileSync(skillPath, 'utf8');
      const { frontmatter } = parseFrontmatter(content);

      // Check if updates are needed
      const needsUpdate = Object.entries(updates).some(
        ([key, value]) => !(key in frontmatter)
      );

      if (needsUpdate) {
        updateSkillFile(skillPath, updates);
        const addedKeys = Object.entries(updates)
          .filter(([key]) => !(key in frontmatter))
          .map(([key]) => key);

        console.log(`✓ Updated: ${skillName} (added: ${addedKeys.join(', ')})`);
        updatedCount++;
      } else {
        console.log(`⊘ Skipped: ${skillName} (already has all fields)`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`✗ Error updating ${skillName}: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log(`Summary: ${updatedCount} updated, ${skippedCount} skipped`);
  console.log('========================================\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { updateSkillFile, skillUpdates };
