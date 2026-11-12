import type { Address } from "viem"
import { describe, expect, it } from "vitest"

import { ACCOUNTS } from "@/test/logs"

import type { Proposal } from "./model"
import { computeTally } from "./tally"

const proposals: Proposal[] = [
  { id: 0n, description: "GENESIS", isGenesis: true },
  { id: 1n, description: "Parc municipal", isGenesis: false },
  { id: 2n, description: "Piste cyclable", isGenesis: false },
  { id: 3n, description: "Médiathèque", isGenesis: false },
]

const votes = (entries: [Address, bigint][]) => new Map<Address, bigint>(entries)

describe("computeTally", () => {
  it("counts every proposal and ranks by votes, then by id (contract test fixture)", () => {
    const tally = computeTally(
      proposals,
      votes([
        [ACCOUNTS.voter1, 1n],
        [ACCOUNTS.voter2, 2n],
        [ACCOUNTS.voter3, 1n],
      ]),
    )
    expect(tally).toEqual({
      rows: [
        { proposalId: 1n, votes: 2 },
        { proposalId: 2n, votes: 1 },
        { proposalId: 0n, votes: 0 },
        { proposalId: 3n, votes: 0 },
      ],
      totalVotes: 3,
      leaders: [1n],
      isTie: false,
    })
  })

  it("reports a tie and lists the leaders by ascending id, the lowest being the contract's winner", () => {
    const tally = computeTally(
      proposals,
      votes([
        [ACCOUNTS.voter1, 3n],
        [ACCOUNTS.voter2, 2n],
      ]),
    )
    expect(tally.leaders).toEqual([2n, 3n])
    expect(tally.isTie).toBe(true)
    expect(tally.rows.slice(0, 2)).toEqual([
      { proposalId: 2n, votes: 1 },
      { proposalId: 3n, votes: 1 },
    ])
  })

  it("is not a tie when nobody voted, and GENESIS leads", () => {
    const tally = computeTally(proposals, votes([]))
    expect(tally.totalVotes).toBe(0)
    expect(tally.isTie).toBe(false)
    expect(tally.leaders[0]).toBe(0n)
  })
})
