/**
 * Dependency Resolver for Multi-Agent Orchestration
 *
 * Handles dependency graph construction, cycle detection, topological sorting,
 * and ready unit identification.
 *
 * @module lib/dependency-resolver
 */

const logger = require('./logger');

/**
 * DependencyResolver - Manages unit dependencies and execution ordering
 */
class DependencyResolver {
    /**
     * @param {Object} db - better-sqlite3 database instance
     */
    constructor(db) {
        this.db = db;
    }

    /**
     * Build dependency graph for a session
     * @param {string} sessionId - Session ID to build graph for
     * @returns {Map<number, Object>} Graph with unit nodes and edges
     */
    buildGraph(sessionId) {
        const units = this.db.prepare(`
      SELECT id, name, status, priority, assigned_agent FROM units WHERE session_id = ?
    `).all(sessionId);

        const dependencies = this.db.prepare(`
      SELECT ud.unit_id, ud.depends_on_unit_id, ud.dependency_type
      FROM unit_dependencies ud
      JOIN units u ON ud.unit_id = u.id
      WHERE u.session_id = ?
    `).all(sessionId);

        // Build adjacency list
        const graph = new Map();
        const reverseGraph = new Map(); // For finding dependents

        for (const unit of units) {
            graph.set(unit.id, {
                ...unit,
                dependencies: [],
                dependents: [],
            });
            reverseGraph.set(unit.id, []);
        }

        for (const dep of dependencies) {
            const unit = graph.get(dep.unit_id);
            if (unit) {
                unit.dependencies.push({
                    unitId: dep.depends_on_unit_id,
                    type: dep.dependency_type,
                });
            }
            const reverse = reverseGraph.get(dep.depends_on_unit_id);
            if (reverse) {
                reverse.push(dep.unit_id);
            }
        }

        // Add dependents to graph
        for (const [unitId, dependents] of reverseGraph) {
            const unit = graph.get(unitId);
            if (unit) {
                unit.dependents = dependents;
            }
        }

        return graph;
    }

    /**
     * Detect cycles in dependency graph using DFS
     * @param {string} sessionId - Session ID to check
     * @returns {Array<Array<string>>} Array of cycles (each cycle is array of unit names)
     */
    detectCycles(sessionId) {
        const graph = this.buildGraph(sessionId);
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];

        const dfs = (unitId) => {
            visited.add(unitId);
            recursionStack.add(unitId);
            path.push(unitId);

            const unit = graph.get(unitId);
            if (unit) {
                for (const dep of unit.dependencies) {
                    if (!visited.has(dep.unitId)) {
                        const cycle = dfs(dep.unitId);
                        if (cycle) return cycle;
                    } else if (recursionStack.has(dep.unitId)) {
                        // Found cycle
                        const cycleStart = path.indexOf(dep.unitId);
                        const cycle = path.slice(cycleStart);
                        cycles.push(cycle.map(id => graph.get(id)?.name || String(id)));
                        return cycle;
                    }
                }
            }

            path.pop();
            recursionStack.delete(unitId);
            return null;
        };

        for (const [unitId] of graph) {
            if (!visited.has(unitId)) {
                dfs(unitId);
            }
        }

        return cycles;
    }

    /**
     * Get units ready to execute (all dependencies completed)
     * @param {string} sessionId - Session ID
     * @returns {Array<Object>} Array of ready units sorted by priority
     */
    getReadyUnits(sessionId) {
        const graph = this.buildGraph(sessionId);
        const ready = [];

        for (const [unitId, unit] of graph) {
            if (unit.status !== 'pending' && unit.status !== 'ready') {
                continue;
            }

            // Check if all dependencies are completed
            const allDepsCompleted = unit.dependencies.every(dep => {
                const depUnit = graph.get(dep.unitId);
                return depUnit && depUnit.status === 'completed';
            });

            // Check if any hard dependency failed (blocks this unit)
            const anyDepFailed = unit.dependencies.some(dep => {
                const depUnit = graph.get(dep.unitId);
                return depUnit && depUnit.status === 'failed' && dep.type === 'blocks';
            });

            if (anyDepFailed) {
                // Mark as blocked
                this.db.prepare(`
          UPDATE units SET status = 'blocked' WHERE id = ?
        `).run(unitId);
                unit.status = 'blocked';
                logger.debug(`Unit ${unit.name} blocked due to failed dependency`);
            } else if (allDepsCompleted) {
                ready.push(unit);
            }
        }

        // Sort by priority (higher first), then by ID (FIFO)
        ready.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.id - b.id;
        });

        return ready;
    }

    /**
     * Get topological order of all units using Kahn's algorithm
     * @param {string} sessionId - Session ID
     * @returns {Array<Object>} Topologically sorted units
     * @throws {Error} If circular dependency detected
     */
    getExecutionOrder(sessionId) {
        const graph = this.buildGraph(sessionId);
        const inDegree = new Map();
        const order = [];
        const queue = [];

        // Calculate in-degrees
        for (const [unitId, unit] of graph) {
            inDegree.set(unitId, unit.dependencies.length);
            if (unit.dependencies.length === 0) {
                queue.push(unitId);
            }
        }

        // Process queue (Kahn's algorithm)
        while (queue.length > 0) {
            // Sort queue by priority (greedy heuristic)
            queue.sort((a, b) => {
                const unitA = graph.get(a);
                const unitB = graph.get(b);
                return (unitB?.priority || 0) - (unitA?.priority || 0);
            });

            const unitId = queue.shift();
            order.push(graph.get(unitId));

            const unit = graph.get(unitId);
            for (const dependentId of unit.dependents) {
                const newDegree = inDegree.get(dependentId) - 1;
                inDegree.set(dependentId, newDegree);
                if (newDegree === 0) {
                    queue.push(dependentId);
                }
            }
        }

        // Check for remaining nodes (indicates cycle)
        if (order.length !== graph.size) {
            const remaining = [];
            for (const [unitId] of graph) {
                if (!order.find(u => u.id === unitId)) {
                    remaining.push(graph.get(unitId)?.name || unitId);
                }
            }
            throw new Error(`Circular dependency detected involving: ${remaining.join(', ')}`);
        }

        return order;
    }

    /**
     * Update dependents when a unit completes
     * @param {number} unitId - Completed unit ID
     * @returns {Array<number>} IDs of units now ready to execute
     */
    notifyCompletion(unitId) {
        const unit = this.db.prepare(`SELECT * FROM units WHERE id = ?`).get(unitId);
        if (!unit) return [];

        // Get dependents
        const dependents = this.db.prepare(`
      SELECT u.* FROM units u
      JOIN unit_dependencies ud ON u.id = ud.unit_id
      WHERE ud.depends_on_unit_id = ?
    `).all(unitId);

        const nowReady = [];

        for (const dependent of dependents) {
            // Check if all dependencies are now complete
            const pendingDeps = this.db.prepare(`
        SELECT COUNT(*) as count FROM unit_dependencies ud
        JOIN units u ON ud.depends_on_unit_id = u.id
        WHERE ud.unit_id = ? AND u.status != 'completed'
      `).get(dependent.id);

            if (pendingDeps.count === 0) {
                this.db.prepare(`
          UPDATE units SET status = 'ready' WHERE id = ? AND status = 'pending'
        `).run(dependent.id);
                nowReady.push(dependent.id);
                logger.debug(`Unit ${dependent.name} now ready after ${unit.name} completed`);
            }
        }

        return nowReady;
    }

    /**
     * Mark downstream units as blocked when a unit fails
     * @param {number} unitId - Failed unit ID
     * @returns {Array<number>} IDs of units now blocked
     */
    notifyFailure(unitId) {
        const unit = this.db.prepare(`SELECT * FROM units WHERE id = ?`).get(unitId);
        if (!unit) return [];

        // Get dependents with 'blocks' type
        const dependents = this.db.prepare(`
      SELECT u.* FROM units u
      JOIN unit_dependencies ud ON u.id = ud.unit_id
      WHERE ud.depends_on_unit_id = ? AND ud.dependency_type = 'blocks'
    `).all(unitId);

        const nowBlocked = [];

        for (const dependent of dependents) {
            if (dependent.status !== 'completed' && dependent.status !== 'blocked') {
                this.db.prepare(`
          UPDATE units SET status = 'blocked' WHERE id = ?
        `).run(dependent.id);
                nowBlocked.push(dependent.id);
                logger.debug(`Unit ${dependent.name} blocked due to ${unit.name} failure`);

                // Recursively block downstream
                const downstream = this.notifyFailure(dependent.id);
                nowBlocked.push(...downstream);
            }
        }

        return nowBlocked;
    }
}

module.exports = { DependencyResolver };
