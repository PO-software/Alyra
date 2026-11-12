import type { Hash } from "viem"

import type { ReadClient } from "@/lib/chain/logs"

import { type VotingEvent, decodeProposalDescription } from "./events"

/**
 * Proposal id → description, read from the calldata of the transaction that emitted each
 * `ProposalRegistered`. Null when it can't be decoded; never throws.
 */
export async function fetchDescriptions(
  client: ReadClient,
  events: readonly VotingEvent[],
  cache: Map<Hash, string | null>,
  concurrency = 4,
): Promise<Map<bigint, string | null>> {
  const idsByTx = new Map<Hash, bigint[]>()
  for (const event of events) {
    if (event.type !== "ProposalRegistered") continue
    idsByTx.set(event.transactionHash, [...(idsByTx.get(event.transactionHash) ?? []), event.proposalId])
  }

  const missing = [...idsByTx.keys()].filter((hash) => !cache.has(hash))
  let next = 0
  const worker = async () => {
    while (next < missing.length) {
      const hash = missing[next++]
      try {
        const { input } = await client.getTransaction({ hash })
        cache.set(hash, decodeProposalDescription(input))
      } catch {
        // Not cached: a failed fetch (rate limit, network) is retried on the next poll.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, missing.length) }, worker))

  const descriptions = new Map<bigint, string | null>()
  for (const [hash, ids] of idsByTx) {
    // One addProposal call can only explain one proposal.
    for (const id of ids) descriptions.set(id, ids.length === 1 ? (cache.get(hash) ?? null) : null)
  }
  return descriptions
}
