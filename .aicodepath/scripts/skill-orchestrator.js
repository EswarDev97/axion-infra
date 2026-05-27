#!/usr/bin/env node
/**
 * AICodePath Skill Orchestrator (Type 2 - Workflow Skills)
 *
 * Loads workflow skills WITH their Rule and Guideline dependencies
 * to ensure Claude has complete context for workflow execution.
 *
 * This is the strategic component that guarantees:
 * - Rules are ALWAYS loaded (not optional)
 * - Guidelines are ALWAYS available for validation
 * - Hooks WILL fire (skill ensures Write/Edit usage)
 * - Workflow integrity maintained
 *
 * Usage: node skill-orchestrator.js <skill-name> [project-root]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml-front-matter');
const { findProjectRoot } = require('../lib/path-resolver');

class SkillOrchestrator {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.aicodepathDir = path.join(projectRoot, '.aicodepath');
    }

    /**
     * Parse SKILL.md frontmatter to extract metadata
     * @param {string} skillName - Name of the skill
     * @returns {Object} Parsed metadata with dependencies
     */
    parseSkillMetadata(skillName) {
        const skillPath = path.join(this.aicodepathDir, 'skills', skillName, 'SKILL.md');

        if (!fs.existsSync(skillPath)) {
            throw new Error(`Skill not found: ${skillPath}`);
        }

        try {
            const content = fs.readFileSync(skillPath, 'utf-8');
            const parsed = yaml.loadFront(content);

            return {
                name: parsed.name || skillName,
                description: parsed.description || '',
                type: parsed.type || 'workflow',
                dependencies: parsed.dependencies || {},
                ensures_hooks: parsed.ensures_hooks || [],
                workflow: parsed.workflow || {},
                content: parsed.__content || content
            };
        } catch (error) {
            console.error(`Error parsing skill metadata: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load rule files from .aicodepath/rules/
     * @param {Array<string>} rulePaths - Relative paths to rule files
     * @returns {Array<Object>} Loaded rules with content
     */
    loadRules(rulePaths) {
        if (!rulePaths || rulePaths.length === 0) {
            return [];
        }

        const rules = [];
        for (const rulePath of rulePaths) {
            // Project override takes precedence over framework rule
            const overridePath = path.join(this.projectRoot, '.aicodepath-overrides', 'rules', rulePath);
            const frameworkPath = path.join(this.aicodepathDir, 'rules', rulePath);
            const fullPath = fs.existsSync(overridePath) ? overridePath : frameworkPath;

            if (!fs.existsSync(fullPath)) {
                console.warn(`Warning: Rule not found: ${fullPath}`);
                continue;
            }

            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                rules.push({
                    path: rulePath,
                    fullPath,
                    content
                });
            } catch (error) {
                console.error(`Error loading rule ${rulePath}: ${error.message}`);
            }
        }

        return rules;
    }

    /**
     * Load guideline files from .aicodepath/guidelines/
     * @param {Array<string>} guidelinePaths - Relative paths to guideline files
     * @returns {Array<Object>} Loaded guidelines with content
     */
    loadGuidelines(guidelinePaths) {
        if (!guidelinePaths || guidelinePaths.length === 0) {
            return [];
        }

        const guidelines = [];
        for (const guidelinePath of guidelinePaths) {
            const fullPath = path.join(this.aicodepathDir, 'guidelines', guidelinePath);

            if (!fs.existsSync(fullPath)) {
                console.warn(`Warning: Guideline not found: ${fullPath}`);
                continue;
            }

            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const parsed = JSON.parse(content);
                guidelines.push({
                    path: guidelinePath,
                    fullPath,
                    content: parsed
                });
            } catch (error) {
                console.error(`Error loading guideline ${guidelinePath}: ${error.message}`);
            }
        }

        return guidelines;
    }

    /**
     * Load project context artifacts (optional)
     * @param {Array<string>} contextPaths - Paths to context artifacts
     * @returns {Array<Object>} Loaded context files
     */
    loadContext(contextPaths) {
        if (!contextPaths || contextPaths.length === 0) {
            return [];
        }

        const contexts = [];
        for (const contextPath of contextPaths) {
            const fullPath = path.join(this.projectRoot, contextPath);

            if (!fs.existsSync(fullPath)) {
                console.warn(`Warning: Context not found: ${fullPath}`);
                continue;
            }

            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                contexts.push({
                    path: contextPath,
                    fullPath,
                    content
                });
            } catch (error) {
                console.error(`Error loading context ${contextPath}: ${error.message}`);
            }
        }

        return contexts;
    }

    /**
     * Verify that expected hooks are configured
     * @param {Array<Object>} expectedHooks - Hook configuration from skill metadata
     * @returns {Object} Verification results
     */
    verifyHookCoverage(expectedHooks) {
        if (!expectedHooks || expectedHooks.length === 0) {
            return { verified: true, missing: [] };
        }

        const hooksConfigPath = path.join(this.projectRoot, '.claude', 'hooks.json');
        if (!fs.existsSync(hooksConfigPath)) {
            console.warn('Warning: .claude/hooks.json not found - hook verification skipped');
            return { verified: false, missing: expectedHooks };
        }

        try {
            const hooksConfig = JSON.parse(fs.readFileSync(hooksConfigPath, 'utf-8'));
            const missing = [];

            for (const hookSpec of expectedHooks) {
                const hookEvent = hookSpec.pre ? 'PreToolUse' : hookSpec.post ? 'PostToolUse' : null;
                const hookName = hookSpec.pre || hookSpec.post;

                if (!hookEvent) {
                    continue;
                }

                const eventHooks = hooksConfig[hookEvent] || [];
                const hookExists = eventHooks.some(h => h.includes(hookName));

                if (!hookExists) {
                    missing.push({ event: hookEvent, hook: hookName });
                }
            }

            return {
                verified: missing.length === 0,
                missing
            };
        } catch (error) {
            console.error(`Error verifying hooks: ${error.message}`);
            return { verified: false, missing: expectedHooks };
        }
    }

    /**
     * Construct integrated prompt with all dependencies
     * @param {Object} options - Orchestration options
     * @returns {string} Complete prompt with all context
     */
    constructPrompt({ metadata, rules, guidelines, context, userArgs }) {
        const sections = [];

        // Header
        sections.push(`# ${metadata.name}`);
        sections.push('');
        sections.push(`**Workflow Type**: ${metadata.type}`);
        if (metadata.workflow.phase) {
            sections.push(`**Phase**: ${metadata.workflow.phase}`);
        }
        if (metadata.workflow.stage) {
            sections.push(`**Stage**: ${metadata.workflow.stage}`);
        }
        sections.push('');

        // User arguments
        if (userArgs && userArgs.length > 0) {
            sections.push(`**User Input**: ${userArgs.join(' ')}`);
            sections.push('');
        }

        // Rules (Authority for workflow)
        if (rules.length > 0) {
            sections.push('## Workflow Rules (AUTHORITY for process)');
            sections.push('');
            sections.push('The following rules define HOW to create artifacts for this workflow:');
            sections.push('');

            for (const rule of rules) {
                sections.push(`### Rule: ${rule.path}`);
                sections.push('```markdown');
                sections.push(rule.content);
                sections.push('```');
                sections.push('');
            }
        }

        // Guidelines (Authority for validation)
        if (guidelines.length > 0) {
            sections.push('## Validation Guidelines (AUTHORITY for quality)');
            sections.push('');
            sections.push('The following guidelines define WHAT to validate:');
            sections.push('');

            for (const guideline of guidelines) {
                sections.push(`### Guideline: ${guideline.path}`);
                sections.push('```json');
                sections.push(JSON.stringify(guideline.content, null, 2));
                sections.push('```');
                sections.push('');
            }
        }

        // Context (Project-specific information)
        if (context.length > 0) {
            sections.push('## Project Context');
            sections.push('');

            for (const ctx of context) {
                sections.push(`### Context: ${ctx.path}`);
                sections.push('```');
                sections.push(ctx.content);
                sections.push('```');
                sections.push('');
            }
        }

        // Skill-specific guidance
        sections.push('## Skill Guidance');
        sections.push('');
        sections.push(metadata.content);
        sections.push('');

        // Hook verification results
        if (metadata.ensures_hooks && metadata.ensures_hooks.length > 0) {
            const hookVerification = this.verifyHookCoverage(metadata.ensures_hooks);

            sections.push('## Hook Verification');
            sections.push('');

            if (hookVerification.verified) {
                sections.push('✅ All expected hooks are configured');
            } else {
                sections.push('⚠️  Some expected hooks are missing:');
                for (const missing of hookVerification.missing) {
                    sections.push(`- ${missing.event}: ${missing.hook}`);
                }
            }
            sections.push('');
        }

        // Footer
        sections.push('---');
        sections.push('');
        sections.push('**Instructions for Claude**:');
        sections.push('1. Follow the workflow rules step-by-step');
        sections.push('2. Use Write/Edit tools to create artifacts (triggers validation hooks)');
        sections.push('3. Validate against guidelines during GICL loop');
        sections.push('4. Reference context as needed');
        sections.push('');

        return sections.join('\n');
    }

    /**
     * Orchestrate a workflow skill execution
     * @param {string} skillName - Name of the skill
     * @param {Array<string>} userArgs - Additional user arguments
     */
    async orchestrate(skillName, userArgs = []) {
        try {
            // 1. Parse skill metadata
            const metadata = this.parseSkillMetadata(skillName);

            // 2. Load dependencies
            const rules = this.loadRules(metadata.dependencies.rules || []);
            const guidelines = this.loadGuidelines(metadata.dependencies.guidelines || []);
            const context = this.loadContext(metadata.dependencies.context || []);

            // 3. Construct integrated prompt
            const prompt = this.constructPrompt({
                metadata,
                rules,
                guidelines,
                context,
                userArgs
            });

            // 4. Output prompt
            console.log(prompt);

            // 5. Log summary to stderr (not shown to Claude)
            console.error(''); // Blank line
            console.error('Orchestration Summary:');
            console.error(`- Skill: ${metadata.name}`);
            console.error(`- Rules loaded: ${rules.length}`);
            console.error(`- Guidelines loaded: ${guidelines.length}`);
            console.error(`- Context files: ${context.length}`);
            if (metadata.ensures_hooks && metadata.ensures_hooks.length > 0) {
                const hookVerification = this.verifyHookCoverage(metadata.ensures_hooks);
                console.error(`- Hooks verified: ${hookVerification.verified ? 'Yes' : 'No'}`);
            }

        } catch (error) {
            console.error(`Orchestration failed: ${error.message}`);
            process.exit(1);
        }
    }
}

// Main execution
if (require.main === module) {
    const skillName = process.argv[2];
    const projectRoot = process.argv[3] || findProjectRoot();
    const userArgs = process.argv.slice(4);

    if (!skillName) {
        console.error('Usage: node skill-orchestrator.js <skill-name> [project-root] [user-args...]');
        process.exit(1);
    }

    const orchestrator = new SkillOrchestrator(projectRoot);
    orchestrator.orchestrate(skillName, userArgs).catch(error => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = SkillOrchestrator;
