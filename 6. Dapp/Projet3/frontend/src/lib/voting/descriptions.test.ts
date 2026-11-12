import { type Hash, encodeFunctionData } from "viem"
import { describe, expect, it, vi } from "vitest"

import { votingAbi } from "@/contracts/votingAbi"
import type { ReadClient } from "@/lib/chain/logs"
import { txHash } from "@/test/logs"

import { fetchDescriptions } from "./descriptions"
import type { VotingEvent } from "./events"

const proposal = (id: bigint, hash: Hash, logIndex = 0): VotingEvent => ({
  type: "ProposalRegistered",
  proposalId: id,
  blockNumber: 1n,
  logIndex,
  transactionHash: hash,
})

const addProposalInput = (text: string) => encodeFunctionData({ abi: votingAbi, functionName: "addProposal", args: [text] })

function fakeClient(inputs: Record<Hash, `0x${string}` | Error>) {
  const getTransaction = vi.fn(async ({ hash }: { hash: Hash }) => {
    const input = inputs[hash]
    if (input instanceof Error) throw input
    return { input }
  })
  return { client: { getTransaction } as unknown as ReadClient, getTransaction }
}

describe("fetchDescriptions", () => {
  it("decodes each description from its transaction's calldata", async () => {
    const { client } = fakeClient({ [txHash(1)]: addProposalInput("Parc municipal"), [txHash(2)]: addProposalInput("Piste 🚲") })
    const result = await fetchDescriptions(client, [proposal(1n, txHash(1)), proposal(2n, txHash(2))], new Map())
    expect(result).toEqual(
      new Map([
        [1n, "Parc municipal"],
        [2n, "Piste 🚲"],
      ]),
    )
  })

  it("uses the cache instead of fetching a transaction twice", async () => {
    const { client, getTransaction } = fakeClient({ [txHash(1)]: addProposalInput("Parc") })
    const cache = new Map<Hash, string | null>()
    await fetchDescriptions(client, [proposal(1n, txHash(1))], cache)
    await fetchDescriptions(client, [proposal(1n, txHash(1))], cache)
    expect(getTransaction).toHaveBeenCalledTimes(1)
  })

  it("gives null when the calldata is not addProposal (e.g. a smart wallet)", async () => {
    const setVote = encodeFunctionData({ abi: votingAbi, functionName: "setVote", args: [1n] })
    const { client } = fakeClient({ [txHash(1)]: setVote })
    expect(await fetchDescriptions(client, [proposal(1n, txHash(1))], new Map())).toEqual(new Map([[1n, null]]))
  })

  it("gives null for every proposal of a transaction that emitted several", async () => {
    const { client } = fakeClient({ [txHash(1)]: addProposalInput("Parc") })
    const events = [proposal(1n, txHash(1), 0), proposal(2n, txHash(1), 1)]
    expect(await fetchDescriptions(client, events, new Map())).toEqual(
      new Map([
        [1n, null],
        [2n, null],
      ]),
    )
  })

  it("tries again later when fetching a transaction failed (no caching of failures)", async () => {
    const inputs: Record<Hash, `0x${string}` | Error> = { [txHash(1)]: new Error("429 Too Many Requests") }
    const { client, getTransaction } = fakeClient(inputs)
    const cache = new Map<Hash, string | null>()

    expect(await fetchDescriptions(client, [proposal(1n, txHash(1))], cache)).toEqual(new Map([[1n, null]]))
    inputs[txHash(1)] = addProposalInput("Parc")
    expect(await fetchDescriptions(client, [proposal(1n, txHash(1))], cache)).toEqual(new Map([[1n, "Parc"]]))
    expect(getTransaction).toHaveBeenCalledTimes(2)
  })

  it("gives null instead of throwing when a transaction cannot be fetched", async () => {
    const { client } = fakeClient({ [txHash(1)]: new Error("not found") })
    expect(await fetchDescriptions(client, [proposal(1n, txHash(1))], new Map())).toEqual(new Map([[1n, null]]))
  })
})
