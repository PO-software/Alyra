import type { Address } from "viem"

import type { Proposal } from "./model"

export type TallyRow = { proposalId: bigint; votes: number }

export type Tally = {
  /** Every proposal, by votes descending then id ascending. */
  rows: TallyRow[]
  totalVotes: number
  /** Ids holding the most votes, ascending: `leaders[0]` is the contract's winner (strict `>` keeps the lowest id). */
  leaders: bigint[]
  /** Several proposals share a non-zero top score. */
  isTie: boolean
}

export function computeTally(proposals: readonly Proposal[], votes: ReadonlyMap<Address, bigint>): Tally {
  const counts = new Map<bigint, number>(proposals.map((p) => [p.id, 0]))
  for (const proposalId of votes.values()) counts.set(proposalId, (counts.get(proposalId) ?? 0) + 1)

  const byId = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0)
  const rows = [...counts]
    .map(([proposalId, count]) => ({ proposalId, votes: count }))
    .sort((a, b) => b.votes - a.votes || byId(a.proposalId, b.proposalId))

  const max = rows[0]?.votes ?? 0
  const leaders = rows.filter((row) => row.votes === max).map((row) => row.proposalId).sort(byId)

  return { rows, totalVotes: votes.size, leaders, isTie: leaders.length > 1 && max > 0 }
}
