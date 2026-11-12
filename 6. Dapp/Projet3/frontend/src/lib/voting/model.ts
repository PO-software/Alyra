import type { Address } from "viem"

import type { VotingEvent } from "./events"
import { WorkflowStatus } from "./status"

/** `startProposalsRegistering` pushes this proposal at id 0, without any event. */
export const GENESIS_DESCRIPTION = "GENESIS"

export type Proposal = { id: bigint; description: string | null; isGenesis: boolean }

export type VotingModel = {
  /** Checksummed, in registration order, unique. */
  voters: Address[]
  /** GENESIS (id 0) first once proposal registration has started, then by id. */
  proposals: Proposal[]
  /** Checksummed voter → the proposal id they voted for. */
  votes: ReadonlyMap<Address, bigint>
}

export function buildVotingModel(args: {
  events: readonly VotingEvent[]
  descriptions: ReadonlyMap<bigint, string | null>
  status: WorkflowStatus
}): VotingModel {
  const { events, descriptions, status } = args
  const voters: Address[] = []
  const proposalIds: bigint[] = []
  const votes = new Map<Address, bigint>()

  for (const event of events) {
    if (event.type === "VoterRegistered" && !voters.includes(event.voter)) voters.push(event.voter)
    if (event.type === "ProposalRegistered") proposalIds.push(event.proposalId)
    if (event.type === "Voted") votes.set(event.voter, event.proposalId)
  }

  const proposals: Proposal[] = []
  if (status >= WorkflowStatus.ProposalsRegistrationStarted) {
    proposals.push({ id: 0n, description: GENESIS_DESCRIPTION, isGenesis: true })
  }
  for (const id of [...new Set(proposalIds)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    proposals.push({ id, description: descriptions.get(id) ?? null, isGenesis: false })
  }

  return { voters, proposals, votes }
}
