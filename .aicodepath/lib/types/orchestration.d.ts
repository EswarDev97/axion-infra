/**
 * TypeScript Type Definitions for Multi-Agent Orchestration
 *
 * @module lib/types/orchestration
 */

/**
 * Unit status lifecycle
 */
export type UnitStatus =
    | 'pending'      // Not yet ready (dependencies not met)
    | 'ready'        // Dependencies met, can start
    | 'in_progress'  // Currently being worked on
    | 'completed'    // Successfully finished
    | 'failed'       // Failed, may retry
    | 'blocked';     // Blocked by failed dependency

/**
 * Orchestrator state machine states
 */
export type OrchestratorState =
    | 'idle'
    | 'initializing'
    | 'running'
    | 'paused'
    | 'completed'
    | 'failed';

/**
 * Dependency type
 */
export type DependencyType = 'blocks' | 'soft';

/**
 * Unit definition - smallest schedulable work item
 */
export interface Unit {
    id: number;
    sessionId: string;
    name: string;
    description?: string;
    status: UnitStatus;
    priority: number;
    estimatedEffort?: number;
    actualEffort?: number;
    assignedAgent?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    dependencies: number[];  // IDs of units this depends on
    dependents: number[];    // IDs of units that depend on this
}

/**
 * Unit dependency edge
 */
export interface UnitDependency {
    unitId: number;
    dependsOnUnitId: number;
    type: DependencyType;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
    maxConcurrency: number;
    retryFailedUnits: boolean;
    maxRetries: number;
    unitTimeout: number;  // milliseconds
    pauseOnFailure: boolean;
}

/**
 * Orchestrator statistics
 */
export interface OrchestratorStats {
    state: OrchestratorState;
    runId: number | null;
    totalUnits: number;
    completedUnits: number;
    failedUnits: number;
    inProgressUnits: number;
    blockedUnits: number;
    readyUnits: number;
    activeSessionCount: number;
    maxConcurrency: number;
    estimatedTimeRemaining?: number;
}

/**
 * Orchestration run record
 */
export interface OrchestrationRun {
    id: number;
    sessionId: string;
    status: OrchestratorState;
    maxConcurrency: number;
    startedAt: string;
    completedAt?: string;
    totalUnits: number;
    completedUnits: number;
    failedUnits: number;
}

/**
 * Unit execution record
 */
export interface UnitExecution {
    id: number;
    unitId: number;
    orchestrationRunId: number;
    agentIndex: number;
    agentName: string;
    status: 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt?: string;
    exitCode?: number;
    errorMessage?: string;
}

/**
 * Graph node with dependency information
 */
export interface GraphNode extends Unit {
    dependencies: UnitDependency[];
    dependents: number[];
}
