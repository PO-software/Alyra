import { encodeFunctionData } from "viem"
import { describe, expect, it } from "vitest"

import { votingAbi } from "@/contracts/votingAbi"
import { ACCOUNTS, eventLog, txHash, unknownLog } from "@/test/logs"

import { decodeProposalDescription, parseVotingLogs } from "./events"

describe("parseVotingLogs", () => {
  it("parses the four Voting events with their fields", () => {
    const events = parseVotingLogs([
      eventLog("VoterRegistered", [ACCOUNTS.voter1.toLowerCase()], { blockNumber: 1n, transactionHash: txHash(1) }),
      eventLog("WorkflowStatusChange", [0, 1], { blockNumber: 2n }),
      eventLog("ProposalRegistered", [1n], { blockNumber: 3n, transactionHash: txHash(3) }),
      eventLog("Voted", [ACCOUNTS.voter2, 2n], { blockNumber: 4n, logIndex: 7 }),
    ])

    expect(events).toEqual([
      { type: "VoterRegistered", voter: ACCOUNTS.voter1, blockNumber: 1n, logIndex: 0, transactionHash: txHash(1) },
      { type: "WorkflowStatusChange", previousStatus: 0, newStatus: 1, blockNumber: 2n, logIndex: 0, transactionHash: txHash(1) },
      { type: "ProposalRegistered", proposalId: 1n, blockNumber: 3n, logIndex: 0, transactionHash: txHash(3) },
      { type: "Voted", voter: ACCOUNTS.voter2, proposalId: 2n, blockNumber: 4n, logIndex: 7, transactionHash: txHash(1) },
    ])
  })

  it("ignores OwnershipTransferred and logs that match no Voting event", () => {
    const events = parseVotingLogs([
      eventLog("OwnershipTransferred", ["0x0000000000000000000000000000000000000000", ACCOUNTS.admin]),
      unknownLog(),
    ])
    expect(events).toEqual([])
  })

  it("sorts by block number, then log index", () => {
    const events = parseVotingLogs([
      eventLog("ProposalRegistered", [1n], { blockNumber: 5n, logIndex: 1 }),
      eventLog("ProposalRegistered", [2n], { blockNumber: 5n, logIndex: 0 }),
      eventLog("ProposalRegistered", [3n], { blockNumber: 2n, logIndex: 3 }),
    ])
    expect(events.map((e) => [e.blockNumber, e.logIndex])).toEqual([
      [2n, 3],
      [5n, 0],
      [5n, 1],
    ])
  })
})

describe("decodeProposalDescription", () => {
  it("decodes a Unicode description from addProposal calldata", () => {
    const input = encodeFunctionData({ abi: votingAbi, functionName: "addProposal", args: ["Parc 🌳 municipal"] })
    expect(decodeProposalDescription(input)).toBe("Parc 🌳 municipal")
  })

  it("returns null for calldata of another function", () => {
    const input = encodeFunctionData({ abi: votingAbi, functionName: "setVote", args: [1n] })
    expect(decodeProposalDescription(input)).toBeNull()
  })

  it("returns null for empty or garbage calldata", () => {
    expect(decodeProposalDescription("0x")).toBeNull()
    expect(decodeProposalDescription("0xdeadbeef")).toBeNull()
  })
})
