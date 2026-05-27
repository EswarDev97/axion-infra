#!/usr/bin/env node
/**
 * Simple wrapper for utility skills (Type 3)
 * Just loads SKILL.md content without dependencies
 *
 * Usage: node skill-prompt-wrapper.js <skill-name> [project-root]
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and output SKILL.md content for utility skills
 * @param {string} skillName - Name of the skill (e.g., 'aicodepath-help')
 * @param {string} projectRoot - Project root directory
 */
function loadSkillPrompt(skillName, projectRoot) {
    const skillPath = path.join(projectRoot, '.aicodepath', 'skills', skillName, 'SKILL.md');

    if (!fs.existsSync(skillPath)) {
        console.error(`Error: Skill not found at ${skillPath}`);
        console.error(`Skill name: ${skillName}`);
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(skillPath, 'utf-8');
        console.log(content);
        process.exit(0);
    } catch (error) {
        console.error(`Error reading skill file: ${error.message}`);
        process.exit(1);
    }
}

// Main execution
if (require.main === module) {
    const skillName = process.argv[2];
    const projectRoot = process.argv[3] || process.cwd();

    if (!skillName) {
        console.error('Usage: node skill-prompt-wrapper.js <skill-name> [project-root]');
        process.exit(1);
    }

    loadSkillPrompt(skillName, projectRoot);
}

module.exports = { loadSkillPrompt };
