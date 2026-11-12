/** Mirrors the contract's `WorkflowStatus` enum. */
export const WorkflowStatus = {
  RegisteringVoters: 0,
  ProposalsRegistrationStarted: 1,
  ProposalsRegistrationEnded: 2,
  VotingSessionStarted: 3,
  VotingSessionEnded: 4,
  VotesTallied: 5,
} as const

export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus]

export function toWorkflowStatus(value: number | bigint): WorkflowStatus {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 5) throw new RangeError(`Unknown workflow status: ${value}`)
  return n as WorkflowStatus
}

export const STATUS_STEPS: readonly { status: WorkflowStatus; label: string }[] = [
  { status: WorkflowStatus.RegisteringVoters, label: "Inscription des électeurs" },
  { status: WorkflowStatus.ProposalsRegistrationStarted, label: "Dépôt des propositions" },
  { status: WorkflowStatus.ProposalsRegistrationEnded, label: "Propositions closes" },
  { status: WorkflowStatus.VotingSessionStarted, label: "Vote en cours" },
  { status: WorkflowStatus.VotingSessionEnded, label: "Vote clos" },
  { status: WorkflowStatus.VotesTallied, label: "Résultats" },
]
