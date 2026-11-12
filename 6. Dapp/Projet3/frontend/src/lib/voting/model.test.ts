import { describe, expect, it } from "vitest"

import { ACCOUNTS, txHash } from "@/test/logs"

import type { VotingEvent } from "./events"
import { buildVotingModel } from "./model"
import { WorkflowStatus } from "./status"

const meta = (n: number) => ({ blockNumber: BigInt(n), logIndex: 0, transactionHash: txHash(n) })

const registered: VotingEvent[] = [
  { type: "VoterRegistered", voter: ACCOUNTS.voter2, ...meta(1) },
  { type: "VoterRegistered", voter: ACCOUNTS.voter1, ...meta(2) },
]

describe("buildVotingModel", () => {
  it("has no proposals while voters are being registered", () => {
    const model = buildVotingModel({ events: registered, descriptions: new Map(), status: WorkflowStatus.RegisteringVoters })
    expect(model.proposals).toEqual([])
    expect(model.voters).toEqual([ACCOUNTS.voter2, ACCOUNTS.voter1])
  })

  it("puts GENESIS first once proposal registration has started, then proposals by id", () => {
    const events: VotingEvent[] = [
      ...registered,
      { type: "ProposalRegistered", proposalId: 2n, ...meta(4) },
      { type: "ProposalRegistered", proposalId: 1n, ...meta(3) },
    ]
    const descriptions = new Map<bigint, string | null>([
      [1n, "Parc"],
      [2n, null],
    ])
    const model = buildVotingModel({ events, descriptions, status: WorkflowStatus.ProposalsRegistrationStarted })
    expect(model.proposals).toEqual([
      { id: 0n, description: "GENESIS", isGenesis: true },
      { id: 1n, description: "Parc", isGenesis: false },
      { id: 2n, description: null, isGenesis: false },
    ])
  })

  it("keeps each voter once, in registration order", () => {
    const model = buildVotingModel({
      events: [...registered, { type: "VoterRegistered", voter: ACCOUNTS.voter2, ...meta(3) }],
      descriptions: new Map(),
      status: WorkflowStatus.RegisteringVoters,
    })
    expect(model.voters).toEqual([ACCOUNTS.voter2, ACCOUNTS.voter1])
  })

  it("records who voted for what", () => {
    const model = buildVotingModel({
      events: [...registered, { type: "Voted", voter: ACCOUNTS.voter1, proposalId: 2n, ...meta(5) }],
      descriptions: new Map(),
      status: WorkflowStatus.VotingSessionStarted,
    })
    expect(model.votes).toEqual(new Map([[ACCOUNTS.voter1, 2n]]))
  })
})
