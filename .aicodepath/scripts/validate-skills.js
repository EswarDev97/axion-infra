#!/usr/bin/env node
/**
 * AICodePath Skill Frontmatter Validation Script
 *
 * Validates that all SKILL.md files have required frontmatter fields.
 *
 * Run with: node .aicodepath/scripts/validate-skills.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Required frontmatter fields
 */
const REQUIRED_FIELDS = ['name', 'description', 'user-invocable', 'allowed-tools'];

/**
 * Optional frontmatter fields
 */
const OPTIONAL_FIELDS = ['argument-hint', 'disable-model-invocation', 'version'];

/**
 * Parse frontmatter from content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, hasFrontmatter: false };
  }

  const frontmatterText = match[1];
  const frontmatter = {};

  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim());
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, hasFrontmatter: true };
}

/**
 * Validate a skill file
 */
function validateSkillFile(skillPath, skillName) {
  const content = fs.readFileSync(skillPath, 'utf8');
  const { frontmatter, hasFrontmatter } = parseFrontmatter(content);

  const errors = [];
  const warnings = [];

  // Check if frontmatter exists
  if (!hasFrontmatter) {
    errors.push('Missing frontmatter section');
    return { valid: false, errors, warnings };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in frontmatter)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check for recommended optional fields
  if (!('disable-model-invocation' in frontmatter)) {
    warnings.push('Missing recommended field: disable-model-invocation');
  }

  // Validate field types
  if ('user-invocable' in frontmatter && typeof frontmatter['user-invocable'] !== 'boolean') {
    errors.push('user-invocable must be a boolean');
  }

  if ('allowed-tools' in frontmatter && !Array.isArray(frontmatter['allowed-tools'])) {
    errors.push('allowed-tools must be an array');
  }

  if ('disable-model-invocation' in frontmatter && typeof frontmatter['disable-model-invocation'] !== 'boolean') {
    errors.push('disable-model-invocation must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    frontmatter
  };
}

/**
 * Main execution
 */
function main() {
  const skillsDir = path.join(process.cwd(), '.aicodepath', 'skills');
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let validCount = 0;
  let invalidCount = 0;
  const allErrors = [];
  const allWarnings = [];

  console.log('AICodePath Skill Frontmatter Validation');
  console.log('======================================\n');

  for (const skillName of skillDirs) {
    const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

    if (!fs.existsSync(skillPath)) {
      console.warn(`⚠️  ${skillName}: No SKILL.md found`);
      allErrors.push(`${skillName}: No SKILL.md found`);
      invalidCount++;
      continue;
    }

    const result = validateSkillFile(skillPath, skillName);

    if (result.valid) {
      const status = result.warnings.length > 0 ? '⚠️' : '✓';
      console.log(`${status} ${skillName}: Valid`);
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.log(`    Warning: ${w}`));
      }
      validCount++;
    } else {
      console.log(`✗ ${skillName}: Invalid`);
      result.errors.forEach(e => {
        console.log(`    Error: ${e}`);
        allErrors.push(`${skillName}: ${e}`);
      });
      invalidCount++;
    }

    allWarnings.push(...result.warnings.map(w => `${skillName}: ${w}`));
  }

  console.log('\n======================================');
  console.log(`Summary: ${validCount} valid, ${invalidCount} invalid`);

  if (allWarnings.length > 0) {
    console.log(`Warnings: ${allWarnings.length}`);
  }

  if (allErrors.length > 0) {
    console.log(`Errors: ${allErrors.length}`);
    console.log('\nAll Errors:');
    allErrors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('======================================\n');

  // Exit with error code if validation failed
  process.exit(invalidCount > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { validateSkillFile, REQUIRED_FIELDS, OPTIONAL_FIELDS };
