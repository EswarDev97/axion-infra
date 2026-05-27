#!/usr/bin/env node
/**
 * AICodePath Skill Registration Script
 *
 * Scans .aicodepath/skills/ directory and generates complete .claude/skills.json
 * with intelligent type detection (automation/workflow/utility).
 *
 * Usage: node register-skills.js [target-project-root]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml-front-matter');

class SkillRegistrar {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.aicodepathDir = path.join(projectRoot, '.aicodepath');
        this.skillsDir = path.join(this.aicodepathDir, 'skills');
        this.claudeDir = path.join(projectRoot, '.claude');
    }

    /**
     * Detect skill type from SKILL.md frontmatter and conventions
     * @param {string} skillName - Name of the skill
     * @param {string} skillDir - Path to skill directory
     * @returns {string} Detected type: 'automation', 'workflow', or 'utility'
     */
    detectSkillType(skillName, skillDir) {
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        if (!fs.existsSync(skillMdPath)) {
            return 'utility'; // Fallback for skills without SKILL.md
        }

        try {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            const parsed = yaml.loadFront(content);

            // Check explicit type declaration
            if (parsed.type) {
                return parsed.type;
            }

            // Check for dependencies (workflow skills have dependencies)
            if (parsed.dependencies && (parsed.dependencies.rules || parsed.dependencies.guidelines)) {
                return 'workflow';
            }

            // Check for execute.js or execute.sh in skill directory
            if (fs.existsSync(path.join(skillDir, 'execute.js')) ||
                fs.existsSync(path.join(skillDir, 'execute.sh'))) {
                return 'automation';
            }

            // Default to utility
            return 'utility';

        } catch (error) {
            console.warn(`Warning: Could not parse ${skillMdPath}: ${error.message}`);
            return 'utility';
        }
    }

    /**
     * Map skill to execution script based on type
     * @param {string} skillName - Name of the skill
     * @param {string} skillType - Detected skill type
     * @returns {Object} Execution configuration
     */
    mapSkillToScript(skillName, skillType) {
        const config = {
            command: 'node',
            script: null,
            args: []
        };

        // Known automation skills (direct execution)
        const automationMappings = {
            'aicodepath-visual-memory': {
                command: 'node',
                script: './.aicodepath/hooks/visual-memory-generator.js'
            },
            'aicodepath-diagrams': {
                command: 'node',
                script: './.aicodepath/hooks/visual-memory-generator.js'
            },
            'aicodepath-preflight': {
                command: 'bash',
                script: './.aicodepath/scripts/validate-environment.sh'
            },
            'aicodepath-validate-guidelines': {
                command: 'node',
                script: './.aicodepath/hooks/guideline-validator.js'
            },
            'aicodepath-statusline': {
                command: 'node',
                script: './.aicodepath/scripts/statusline-setup.js'
            },
            'aicodepath-dependency-updater': {
                command: 'node',
                script: './.aicodepath/hooks/dependency-updater.js'
            },
            'aicodepath-init': {
                command: 'bash',
                script: './.aicodepath/scripts/init.sh'
            }
        };

        if (skillType === 'automation') {
            // Check for known mappings
            if (automationMappings[skillName]) {
                return automationMappings[skillName];
            }

            // Check for execute.js in skill directory
            const executeJsPath = path.join(this.skillsDir, skillName, 'execute.js');
            if (fs.existsSync(executeJsPath)) {
                return {
                    command: 'node',
                    script: `./.aicodepath/skills/${skillName}/execute.js`,
                    args: []
                };
            }

            // Check for execute.sh in skill directory
            const executeShPath = path.join(this.skillsDir, skillName, 'execute.sh');
            if (fs.existsSync(executeShPath)) {
                return {
                    command: 'bash',
                    script: `./.aicodepath/skills/${skillName}/execute.sh`,
                    args: []
                };
            }

            // Fallback to wrapper
            skillType = 'utility';
        }

        if (skillType === 'workflow') {
            // Use orchestrator for workflow skills
            return {
                command: 'node',
                script: './.aicodepath/scripts/skill-orchestrator.js',
                args: [skillName]
            };
        }

        // utility type - use simple wrapper
        return {
            command: 'node',
            script: './.aicodepath/scripts/skill-prompt-wrapper.js',
            args: [skillName]
        };
    }

    /**
     * Extract skill metadata from SKILL.md
     * @param {string} skillDir - Path to skill directory
     * @returns {Object} Skill metadata
     */
    extractSkillMetadata(skillDir) {
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        if (!fs.existsSync(skillMdPath)) {
            return {
                name: path.basename(skillDir),
                description: 'AICodePath skill'
            };
        }

        try {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            const parsed = yaml.loadFront(content);

            return {
                name: parsed.name || path.basename(skillDir),
                description: parsed.description || 'AICodePath skill',
                argumentHint: parsed['argument-hint'] || parsed.argumentHint || undefined
            };
        } catch (error) {
            console.warn(`Warning: Could not extract metadata from ${skillMdPath}`);
            return {
                name: path.basename(skillDir),
                description: 'AICodePath skill'
            };
        }
    }

    /**
     * Scan skills directory and generate skill registrations
     * @returns {Object} Skills configuration
     */
    scanSkills() {
        if (!fs.existsSync(this.skillsDir)) {
            throw new Error(`Skills directory not found: ${this.skillsDir}`);
        }

        const skills = {};
        const stats = {
            automation: 0,
            workflow: 0,
            utility: 0,
            total: 0
        };

        const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }

            const skillName = entry.name;

            // Skip non-skill directories
            if (!skillName.startsWith('aicodepath-') &&
                !['using-aicodepath', 'construction'].includes(skillName)) {
                continue;
            }

            const skillDir = path.join(this.skillsDir, skillName);
            const skillMdPath = path.join(skillDir, 'SKILL.md');

            // Skip if no SKILL.md exists
            if (!fs.existsSync(skillMdPath)) {
                console.warn(`Warning: Skipping ${skillName} - no SKILL.md found`);
                continue;
            }

            try {
                // Detect type
                const skillType = this.detectSkillType(skillName, skillDir);

                // Map to execution script
                const execConfig = this.mapSkillToScript(skillName, skillType);

                // Extract metadata
                const metadata = this.extractSkillMetadata(skillDir);

                // Build skill registration
                const skillConfig = {
                    name: metadata.name,
                    description: metadata.description,
                    type: skillType,
                    command: execConfig.command,
                    script: execConfig.script,
                    showInMenu: true
                };

                if (execConfig.args && execConfig.args.length > 0) {
                    skillConfig.args = execConfig.args;
                }

                if (metadata.argumentHint) {
                    skillConfig.argumentHint = metadata.argumentHint;
                }

                skills[skillName] = skillConfig;

                // Update stats
                stats[skillType]++;
                stats.total++;

            } catch (error) {
                console.error(`Error processing skill ${skillName}: ${error.message}`);
            }
        }

        return { skills, stats };
    }

    /**
     * Generate .claude/skills.json
     * @param {Object} skills - Skills configuration
     * @returns {boolean} Success status
     */
    generateSkillsJson(skills) {
        // Ensure .claude directory exists
        if (!fs.existsSync(this.claudeDir)) {
            fs.mkdirSync(this.claudeDir, { recursive: true });
        }

        const skillsJsonPath = path.join(this.claudeDir, 'skills.json');

        // Check if skills.json exists and has manual customizations
        let existingSkills = {};
        if (fs.existsSync(skillsJsonPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf-8'));
                existingSkills = existing.skills || {};
                console.log('Existing skills.json found - preserving manual customizations');
            } catch (error) {
                console.warn('Warning: Could not parse existing skills.json - will overwrite');
            }
        }

        // Merge: new skills take precedence, but preserve manual additions
        const mergedSkills = { ...existingSkills };
        for (const [skillName, config] of Object.entries(skills)) {
            mergedSkills[skillName] = config;
        }

        const skillsConfig = {
            skillsDirectory: './.aicodepath/skills',
            skills: mergedSkills
        };

        try {
            fs.writeFileSync(skillsJsonPath, JSON.stringify(skillsConfig, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error(`Error writing skills.json: ${error.message}`);
            return false;
        }
    }

    /**
     * Register all skills
     */
    register() {
        console.log('AICodePath Skill Registration');
        console.log('==============================');
        console.log(`Project: ${this.projectRoot}`);
        console.log(`Skills directory: ${this.skillsDir}`);
        console.log('');

        // Scan skills
        console.log('Scanning skills directory...');
        const { skills, stats } = this.scanSkills();

        console.log('');
        console.log('Skill Type Distribution:');
        console.log(`- Automation: ${stats.automation}`);
        console.log(`- Workflow:   ${stats.workflow}`);
        console.log(`- Utility:    ${stats.utility}`);
        console.log(`- Total:      ${stats.total}`);
        console.log('');

        // Generate skills.json
        console.log('Generating .claude/skills.json...');
        const success = this.generateSkillsJson(skills);

        if (success) {
            console.log('');
            console.log('✅ Skill registration complete!');
            console.log(`📝 Registered ${stats.total} skills`);
            console.log(`📂 Configuration: ${path.join(this.claudeDir, 'skills.json')}`);
            console.log('');
            console.log('Next steps:');
            console.log('1. Restart Claude Code to reload skill configuration');
            console.log('2. Test skills with `/skill-name` commands');
        } else {
            console.error('');
            console.error('❌ Skill registration failed');
            process.exit(1);
        }
    }
}

// Main execution
if (require.main === module) {
    const projectRoot = process.argv[2] || process.cwd();

    try {
        const registrar = new SkillRegistrar(projectRoot);
        registrar.register();
    } catch (error) {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = SkillRegistrar;
