#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { templates, rules } = require('../lib/path-resolver');

const ARGS = process.argv.slice(2);
if (ARGS.length < 1) {
    console.log("Usage: node generate-iac.js <path-to-design.md> [output-path]");
    process.exit(1);
}

const designPath = path.resolve(ARGS[0]);
const outputPath = ARGS[1] ? path.resolve(ARGS[1]) : path.join(path.dirname(designPath), 'iac_prompt.txt');

if (!fs.existsSync(designPath)) {
    console.error(`Error: Design file not found at ${designPath}`);
    process.exit(1);
}

// Paths to Context using path-resolver
const RULES_DIR = path.join(rules(), 'infrastructure');

const templatePath = path.join(templates(), 'iac', 'iac-generator.md');
const rulesPath = path.join(RULES_DIR, 'terraform.md');

// Read Content
const designContent = fs.readFileSync(designPath, 'utf8');
const templateContent = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : "Error: Skill template not found.";
const rulesContent = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf8') : "Error: Rules not found.";

// Construct Prompt
const fullPrompt = `
${templateContent}

## Rules and Best Practices
The following rules MUST be followed:
${rulesContent}

## Task
Generate Terraform code for the following Design:

\`\`\`markdown
${designContent}
\`\`\`

Generate the resources now.
`;

// Write Output
fs.writeFileSync(outputPath, fullPrompt);
console.log(`✅ IaC Generation Prompt created at: ${outputPath}`);
console.log(`👉 Feed this file to Claude to generate your infrastructure code.`);
console.log(`   Example: claude < ${outputPath}`);
