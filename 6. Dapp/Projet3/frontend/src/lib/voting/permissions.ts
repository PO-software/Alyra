import type { Address } from "viem"

import { WorkflowStatus } from "./status"
import { MAX_PROPOSALS } from "./validation"

export type Role = { isAdmin: boolean; isVoter: boolean }

export type Action =
  | "addVoter"
  | "addProposal"
  | "vote"
  | "startProposalsRegistering"
  | "endProposalsRegistering"
  | "startVotingSession"
  | "endVotingSession"
  | "tallyVotes"

const sameAddress = (a: Address, b: Address) => a.toLowerCase() === b.toLowerCase()

export function getRole(account: Address | undefined, owner: Address | undefined, voters: readonly Address[]): Role {
  if (!account) return { isAdmin: false, isVoter: false }
  return {
    isAdmin: owner !== undefined && sameAddress(account, owner),
    isVoter: voters.some((voter) => sameAddress(voter, account)),
  }
}

/** The admin's single phase action for each status (none once votes are tallied). */
const ADMIN_ACTIONS: Record<WorkflowStatus, Action[]> = {
  [WorkflowStatus.RegisteringVoters]: ["addVoter", "startProposalsRegistering"],
  [WorkflowStatus.ProposalsRegistrationStarted]: ["endProposalsRegistering"],
  [WorkflowStatus.ProposalsRegistrationEnded]: ["startVotingSession"],
  [WorkflowStatus.VotingSessionStarted]: ["endVotingSession"],
  [WorkflowStatus.VotingSessionEnded]: ["tallyVotes"],
  [WorkflowStatus.VotesTallied]: [],
}

/** Exactly the actions the contract would accept from this account right now. */
export function allowedActions(args: {
  role: Role
  status: WorkflowStatus
  hasVoted: boolean
  /** GENESIS included. */
  proposalCount: number
  isCorrectChain: boolean
}): Action[] {
  const { role, status, hasVoted, proposalCount, isCorrectChain } = args
  if (!isCorrectChain) return []

  const actions: Action[] = []
  if (role.isVoter) {
    if (status === WorkflowStatus.ProposalsRegistrationStarted && proposalCount < MAX_PROPOSALS) actions.push("addProposal")
    if (status === WorkflowStatus.VotingSessionStarted && !hasVoted) actions.push("vote")
  }
  if (role.isAdmin) actions.push(...ADMIN_ACTIONS[status])
  return actions
}
