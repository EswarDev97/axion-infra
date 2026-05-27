#!/usr/bin/env node

/**
 * AICodePath CLAUDE.md Generator
 *
 * Issue 5 Fix: Generates CLAUDE.md file from template with project-specific
 * information. Should be run at project initialization.
 *
 * Usage:
 *   node scripts/generate-claude-md.js [--project-name="My Project"] [--cr=CR-001] [--output=./CLAUDE.md]
 */

const fs = require('fs');
const path = require('path');
const { templates, findProjectRoot } = require('../lib/path-resolver');

/**
 * Parse command line arguments
 */
function parseArgs(argv) {
  const args = {};
  argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || true;
    }
  });
  return args;
}

/**
 * Detect project name from package.json or directory name
 */
function detectProjectName(projectPath) {
  try {
    const packageJson = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      if (pkg.name) {
        return pkg.name;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return path.basename(projectPath);
}

/**
 * Detect CR number from existing files
 */
function detectCRNumber(projectPath) {
  // Check context-state.json
  try {
    const contextPath = path.join(projectPath, 'aicodepath-docs', 'context-state.json');
    if (fs.existsSync(contextPath)) {
      const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
      if (context.project?.crNumber) {
        return context.project.crNumber;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  // Check implementation-status.json
  try {
    const statusPath = path.join(projectPath, 'aicodepath-docs', 'implementation-status.json');
    if (fs.existsSync(statusPath)) {
      const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
      if (status.crNumber) {
        return status.crNumber;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return 'CR-001';
}

/**
 * Generate CLAUDE.md from template
 */
function generateClaudeMd({
  projectPath = process.cwd(),
  projectName = null,
  crNumber = null,
  outputPath = null,
}) {
  // Resolve template path using path-resolver
  const templatePath = path.join(templates(), 'CLAUDE.md.template');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  // Read template
  let template = fs.readFileSync(templatePath, 'utf8');

  // Resolve values
  const resolvedProjectName = projectName || detectProjectName(projectPath);
  const resolvedCRNumber = crNumber || detectCRNumber(projectPath);
  const createdDate = new Date().toISOString().split('T')[0];
  const generatedDate = new Date().toISOString();

  // Replace placeholders
  const replacements = {
    '{{PROJECT_NAME}}': resolvedProjectName,
    '{{CR_NUMBER}}': resolvedCRNumber,
    '{{CREATED_DATE}}': createdDate,
    '{{GENERATED_DATE}}': generatedDate,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  // Determine output path
  const output = outputPath || path.join(projectPath, 'CLAUDE.md');

  // Write file
  fs.writeFileSync(output, template);

  return {
    outputPath: output,
    projectName: resolvedProjectName,
    crNumber: resolvedCRNumber,
    createdDate,
  };
}

/**
 * Check if CLAUDE.md already exists
 */
function claudeMdExists(projectPath = process.cwd()) {
  const claudePath = path.join(projectPath, 'CLAUDE.md');
  return fs.existsSync(claudePath);
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs(process.argv);
  const projectPath = args['project-path'] || process.cwd();

  console.log('AICodePath CLAUDE.md Generator\n');

  // Check if already exists
  if (claudeMdExists(projectPath) && !args.force) {
    console.log('CLAUDE.md already exists. Use --force to overwrite.\n');
    process.exit(0);
  }

  try {
    const result = generateClaudeMd({
      projectPath,
      projectName: args['project-name'],
      crNumber: args.cr,
      outputPath: args.output,
    });

    console.log('Generated CLAUDE.md successfully!\n');
    console.log(`  Output: ${result.outputPath}`);
    console.log(`  Project: ${result.projectName}`);
    console.log(`  CR Number: ${result.crNumber}`);
    console.log(`  Created: ${result.createdDate}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error generating CLAUDE.md:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateClaudeMd,
  claudeMdExists,
  detectProjectName,
  detectCRNumber,
};
