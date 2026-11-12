import { type Address, type Hash, type Hex, type Log, decodeFunctionData, getAddress, parseEventLogs } from "viem"

import { votingAbi } from "@/contracts/votingAbi"

import { type WorkflowStatus, toWorkflowStatus } from "./status"

type Meta = { blockNumber: bigint; logIndex: number; transactionHash: Hash }

export type VotingEvent =
  | ({ type: "VoterRegistered"; voter: Address } & Meta)
  | ({ type: "ProposalRegistered"; proposalId: bigint } & Meta)
  | ({ type: "Voted"; voter: Address; proposalId: bigint } & Meta)
  | ({ type: "WorkflowStatusChange"; previousStatus: WorkflowStatus; newStatus: WorkflowStatus } & Meta)

/** Decodes the Voting contract's own events, in chain order; anything else is dropped. */
export function parseVotingLogs(logs: readonly Log[]): VotingEvent[] {
  const events: VotingEvent[] = []
  for (const log of parseEventLogs({ abi: votingAbi, logs: [...logs], strict: true })) {
    if (log.blockNumber === null || log.logIndex === null || log.transactionHash === null) continue
    const meta: Meta = { blockNumber: log.blockNumber, logIndex: log.logIndex, transactionHash: log.transactionHash }
    switch (log.eventName) {
      case "VoterRegistered":
        events.push({ type: "VoterRegistered", voter: getAddress(log.args.voterAddress), ...meta })
        break
      case "ProposalRegistered":
        events.push({ type: "ProposalRegistered", proposalId: log.args.proposalId, ...meta })
        break
      case "Voted":
        events.push({ type: "Voted", voter: getAddress(log.args.voter), proposalId: log.args.proposalId, ...meta })
        break
      case "WorkflowStatusChange":
        events.push({
          type: "WorkflowStatusChange",
          previousStatus: toWorkflowStatus(log.args.previousStatus),
          newStatus: toWorkflowStatus(log.args.newStatus),
          ...meta,
        })
        break
    }
  }
  return events.sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1,
  )
}

/** The description passed to `addProposal`, read back from a transaction's calldata; null for any other input. */
export function decodeProposalDescription(input: Hex): string | null {
  try {
    const { functionName, args } = decodeFunctionData({ abi: votingAbi, data: input })
    return functionName === "addProposal" ? args[0] : null
  } catch {
    return null
  }
}
