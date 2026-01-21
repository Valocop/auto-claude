/**
 * Human Input Types
 *
 * Types for the human input request system that allows AI agents
 * to pause execution and request input from users.
 */

/**
 * Question types supported by the human input system
 */
export type HumanInputType = 'choice' | 'multi_choice' | 'text' | 'confirm';

/**
 * Status of a human input request
 */
export type HumanInputStatus = 'pending' | 'answered' | 'timeout' | 'skipped';

/**
 * Option for choice questions
 */
export interface HumanInputOption {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
}

/**
 * Question content
 */
export interface HumanInputQuestion {
  title: string;
  description: string;
  context?: string;
}

/**
 * Full human input request from the agent
 */
export interface HumanInputRequest {
  id: string;
  created_at: string;
  status: HumanInputStatus;
  type: HumanInputType;
  phase?: string;
  subtask_id?: string;

  question: HumanInputQuestion;

  // For choice/multi_choice types
  options?: HumanInputOption[];

  // For text type
  placeholder?: string;
  max_length?: number;

  // Answer fields
  answer?: string | string[] | boolean | null;
  answered_at?: string | null;
  timeout_seconds?: number | null;
}

/**
 * Answer payload sent back to the agent
 */
export interface HumanInputAnswer {
  answer: string | string[] | boolean;
}

/**
 * Provider Switch Types
 *
 * Types for the provider switch confirmation system that asks users
 * before switching from one AI provider to another (e.g., iFlow to Claude).
 */

/**
 * Reason codes for provider switch
 */
export type ProviderSwitchReasonCode =
  | 'investigation_task'
  | 'low_confidence'
  | 'human_input_needed';

/**
 * Status of a provider switch request
 */
export type ProviderSwitchStatus = 'pending' | 'approved' | 'rejected' | 'timeout';

/**
 * User choice for provider switch
 */
export type ProviderSwitchChoice = 'switch' | 'skip';

/**
 * Provider switch request from the orchestrator
 */
export interface ProviderSwitchRequest {
  id: string;
  created_at: string;
  status: ProviderSwitchStatus;
  current_provider: string;
  target_provider: string;
  reason: string;
  reason_code: ProviderSwitchReasonCode;
  task_description?: string | null;
  user_choice?: ProviderSwitchChoice | null;
  answered_at?: string | null;
  timeout_seconds?: number | null;
}
