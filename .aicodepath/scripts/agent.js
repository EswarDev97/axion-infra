#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { skills } = require('../lib/path-resolver');

program
    .version('1.0.0')
    .requiredOption('-r, --role <role>', 'Agent role: architect, qa, security')
    .option('-i, --input <path>', 'Input file or task description')
    .option('-o, --output <path>', 'Output path for the generated prompt')
    .parse(process.argv);

const options = program.opts();

const ROLES_DIR = path.join(skills(), 'roles');

// Validate Role
const roleFile = `${options.role}.md`;
const rolePath = path.join(ROLES_DIR, roleFile); // Fixed path resolution

if (!fs.existsSync(rolePath)) {
    console.error(`❌ Error: Role '${options.role}' not found.`);
    console.error(`   Available roles: architect, qa, security`);
    process.exit(1);
}

// Read Role Definition
const roleDefinition = fs.readFileSync(rolePath, 'utf8');

// Read Input logic
let inputContent = "No specific input file provided. Please proceed based on the task.";
if (options.input) {
    const inputPath = path.resolve(options.input);
    if (fs.existsSync(inputPath)) {
        inputContent = fs.readFileSync(inputPath, 'utf8');
    } else {
        inputContent = options.input; // Treat as string input
    }
}

// Construct Prompt
const fullPrompt = `
${roleDefinition}

---

## Current Task
${inputContent}

## Execution
Act as the **${options.role.toUpperCase()}** and execute the instructions above.
`;

// Output
if (options.output) {
    fs.writeFileSync(options.output, fullPrompt);
    console.log(`✅ Agent Prompt generated at: ${options.output}`);
} else {
    console.log(fullPrompt);
}
