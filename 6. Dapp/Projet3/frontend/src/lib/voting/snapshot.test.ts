import { type Hash, type Hex, encodeFunctionData } from "viem"
import { describe, expect, it, vi } from "vitest"

import type { Deployment } from "@/config/deployments"
import { votingAbi } from "@/contracts/votingAbi"
import { LogSync, type ReadClient } from "@/lib/chain/logs"
import { ACCOUNTS, CONTRACT, eventLog, txHash } from "@/test/logs"

import { fetchVotingSnapshot } from "./snapshot"

const deployment: Deployment = { chainId: 31337, address: CONTRACT, deploymentBlock: 0n }

const logs = [
  eventLog("VoterRegistered", [ACCOUNTS.voter1], { blockNumber: 1n }),
  eventLog("VoterRegistered", [ACCOUNTS.voter2], { blockNumber: 2n }),
  eventLog("WorkflowStatusChange", [0, 1], { blockNumber: 3n }),
  eventLog("ProposalRegistered", [1n], { blockNumber: 4n, transactionHash: txHash(4) }),
  eventLog("WorkflowStatusChange", [1, 2], { blockNumber: 5n }),
  eventLog("WorkflowStatusChange", [2, 3], { blockNumber: 6n }),
  eventLog("Voted", [ACCOUNTS.voter1, 1n], { blockNumber: 7n }),
]

function fakeClient(options: { code?: Hex; proposalInput?: Hex; chain?: { latest: bigint; logs: typeof logs } }) {
  const chain = options.chain ?? { latest: 7n, logs }
  const readContract = vi.fn(async ({ functionName }: { functionName: string; args?: unknown[] }) => {
    switch (functionName) {
      case "owner":
        return ACCOUNTS.admin
      case "workflowStatus":
        return 3
      case "winningProposalID":
        return 0n
      case "getOneProposal":
        return { description: "Parc (lu par getter)", voteCount: 1n }
    }
    throw new Error(`unexpected ${functionName}`)
  })
  const getLogs = vi.fn(async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) =>
    chain.logs.filter((log) => log.blockNumber! >= fromBlock && log.blockNumber! <= toBlock),
  )
  const getCode = vi.fn(async () => options.code)
  const client = {
    getCode,
    getBlockNumber: vi.fn(async () => chain.latest),
    getLogs,
    getTransaction: vi.fn(async ({ hash }: { hash: Hash }) => ({
      input: hash === txHash(4) ? (options.proposalInput ?? "0x") : "0x",
    })),
    readContract,
  } as unknown as ReadClient
  return { client, readContract, getLogs, getCode }
}

const run = (client: ReadClient, account?: `0x${string}`) =>
  fetchVotingSnapshot({
    client,
    deployment,
    logSync: new LogSync(client, CONTRACT, 0n),
    descriptionCache: new Map(),
    account,
  })

describe("fetchVotingSnapshot", () => {
  it("reports a missing contract without reading its history", async () => {
    for (const code of ["0x", undefined] as const) {
      const { client, getLogs } = fakeClient({ code })
      expect(await run(client)).toEqual({ kind: "not-deployed" })
      expect(getLogs).not.toHaveBeenCalled()
    }
  })

  it("assembles status, owner, winner, model and tally", async () => {
    const { client } = fakeClient({
      code: "0x6080",
      proposalInput: encodeFunctionData({ abi: votingAbi, functionName: "addProposal", args: ["Parc municipal"] }),
    })
    const snapshot = await run(client)
    if (snapshot.kind !== "ready") throw new Error("expected a ready snapshot")

    expect(snapshot.status).toBe(3)
    expect(snapshot.owner).toBe(ACCOUNTS.admin)
    expect(snapshot.winningProposalId).toBe(0n)
    expect(snapshot.model.voters).toEqual([ACCOUNTS.voter1, ACCOUNTS.voter2])
    expect(snapshot.model.proposals.map((p) => p.description)).toEqual(["GENESIS", "Parc municipal"])
    expect(snapshot.tally.totalVotes).toBe(1)
  })

  it("lets a registered voter fill a missing description through getOneProposal", async () => {
    const { client, readContract } = fakeClient({ code: "0x6080" })
    const snapshot = await run(client, ACCOUNTS.voter1)
    if (snapshot.kind !== "ready") throw new Error("expected a ready snapshot")

    expect(snapshot.model.proposals[1].description).toBe("Parc (lu par getter)")
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getOneProposal", args: [1n], account: ACCOUNTS.voter1 }),
    )
  })

  it("skips the contract reads while no new logs arrive, and reads again when they do", async () => {
    const chain = { latest: 7n, logs: [...logs] }
    const { client, readContract, getCode } = fakeClient({ code: "0x6080", chain })
    const logSync = new LogSync(client, CONTRACT, 0n)
    const readCache = {}
    const poll = () => fetchVotingSnapshot({ client, deployment, logSync, descriptionCache: new Map(), readCache })

    await poll()
    const readsAfterFirstPoll = readContract.mock.calls.length
    await poll() // nothing new on chain
    expect(getCode).toHaveBeenCalledTimes(1)
    expect(readContract.mock.calls.length).toBe(readsAfterFirstPoll)

    chain.latest = 8n
    chain.logs.push(eventLog("WorkflowStatusChange", [3, 4], { blockNumber: 8n }))
    await poll() // a state change always emits an event
    expect(getCode).toHaveBeenCalledTimes(2)
    expect(readContract.mock.calls.length).toBe(readsAfterFirstPoll * 2)
  })

  it("does not call the voter-only getter for a visitor", async () => {
    const { client, readContract } = fakeClient({ code: "0x6080" })
    const snapshot = await run(client, ACCOUNTS.visitor)
    if (snapshot.kind !== "ready") throw new Error("expected a ready snapshot")

    expect(snapshot.model.proposals[1].description).toBeNull()
    expect(readContract.mock.calls.map(([call]) => call.functionName)).not.toContain("getOneProposal")
  })
})
