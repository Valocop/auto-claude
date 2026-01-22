import { ChildProcess } from 'child_process';
import type { IdeationConfig, TaskMetadata } from '../../shared/types';
import type { CompletablePhase } from '../../shared/constants/phase-protocol';

/**
 * Agent-specific types for process and state management
 */

export type QueueProcessType = 'ideation' | 'roadmap';

export interface AgentProcess {
  taskId: string;
  process: ChildProcess;
  startedAt: Date;
  projectPath?: string; // For ideation processes to load session on completion
  spawnId: number; // Unique ID to identify this specific spawn
  queueProcessType?: QueueProcessType; // Type of queue process (ideation or roadmap)
}

export interface ExecutionProgressData {
  phase: 'idle' | 'planning' | 'coding' | 'qa_review' | 'qa_fixing' | 'complete' | 'failed';
  phaseProgress: number;
  overallProgress: number;
  currentSubtask?: string;
  message?: string;
  // FIX (ACS-203): Track completed phases to prevent phase overlaps
  completedPhases?: CompletablePhase[];
}

export type ProcessType = 'spec-creation' | 'task-execution' | 'qa-process';

export interface AgentManagerEvents {
  log: (taskId: string, log: string) => void;
  error: (taskId: string, error: string) => void;
  exit: (taskId: string, code: number | null, processType: ProcessType) => void;
  'execution-progress': (taskId: string, progress: ExecutionProgressData) => void;
}

// IdeationConfig now imported from shared types to maintain consistency

export interface RoadmapConfig {
  model?: string;          // Model shorthand (opus, sonnet, haiku)
  thinkingLevel?: string;  // Thinking level (none, low, medium, high, ultrathink)
}

export interface TaskExecutionOptions {
  parallel?: boolean;
  workers?: number;
  baseBranch?: string;
  useWorktree?: boolean; // If false, use --direct mode (no worktree isolation)
}

// SpecCreationMetadata uses the same phaseModels/phaseThinking types as TaskMetadata
// This ensures compatibility when passing TaskMetadata to functions expecting SpecCreationMetadata
export interface SpecCreationMetadata extends Pick<TaskMetadata,
  | 'isAutoProfile'
  | 'phaseModels'
  | 'phaseThinking'
  | 'model'
  | 'thinkingLevel'
  | 'useWorktree'
> {
  requireReviewBeforeCoding?: boolean;
}

export interface IdeationProgressData {
  phase: string;
  progress: number;
  message: string;
  completedTypes?: string[];
}

export interface RoadmapProgressData {
  phase: string;
  progress: number;
  message: string;
}
