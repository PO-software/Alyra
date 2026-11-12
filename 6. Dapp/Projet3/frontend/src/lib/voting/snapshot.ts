import type { Address, Hash } from "viem"

import type { Deployment } from "@/config/deployments"
import { votingAbi } from "@/contracts/votingAbi"
import type { LogSync, ReadClient } from "@/lib/chain/logs"

import { fetchDescriptions } from "./descriptions"
import { parseVotingLogs } from "./events"
import { type VotingModel, buildVotingModel } from "./model"
import { type WorkflowStatus, toWorkflowStatus } from "./status"
import { type Tally, computeTally } from "./tally"

export type VotingSnapshot =
  | { kind: "not-deployed" }
  | {
      kind: "ready"
      owner: Address
      status: WorkflowStatus
      winningProposalId: bigint
      model: VotingModel
      tally: Tally
    }

type ContractReads = { owner: Address; status: WorkflowStatus; winningProposalId: bigint }

/** The last contract reads, reused while no new event shows that the state changed. */
export type ReadCache = { reads?: ContractReads }

async function readContractState(client: ReadClient, address: Address): Promise<ContractReads | undefined> {
  const code = await client.getCode({ address })
  if (!code || code === "0x") return undefined
  // Three plain eth_calls: no multicall (the local node has no Multicall3, and /api/rpc only allows the Voting contract).
  const [owner, rawStatus, winningProposalId] = await Promise.all([
    client.readContract({ address, abi: votingAbi, functionName: "owner" }),
    client.readContract({ address, abi: votingAbi, functionName: "workflowStatus" }),
    client.readContract({ address, abi: votingAbi, functionName: "winningProposalID" }),
  ])
  return { owner, status: toWorkflowStatus(rawStatus), winningProposalId }
}

export async function fetchVotingSnapshot(args: {
  client: ReadClient
  deployment: Deployment
  logSync: LogSync
  descriptionCache: Map<Hash, string | null>
  readCache?: ReadCache
  account?: Address
}): Promise<VotingSnapshot> {
  const { client, deployment, logSync, descriptionCache, account } = args
  const readCache = args.readCache ?? {}
  const address = deployment.address

  // First poll: check the contract exists before scanning its history.
  let reads = readCache.reads ?? (await readContractState(client, address))
  if (!reads) return { kind: "not-deployed" }

  const logs = await logSync.sync()
  // Every state change of this contract emits an event: with no new logs, the cached reads still hold.
  const { added, reset } = logSync.lastChange
  if (readCache.reads && (added > 0 || reset)) {
    const fresh = await readContractState(client, address)
    if (!fresh) {
      readCache.reads = undefined
      return { kind: "not-deployed" }
    }
    reads = fresh
  }
  readCache.reads = reads

  const events = parseVotingLogs(logs)
  const descriptions = await fetchDescriptions(client, events, descriptionCache)

  const isVoter =
    account !== undefined &&
    events.some((e) => e.type === "VoterRegistered" && e.voter.toLowerCase() === account.toLowerCase())
  if (isVoter) {
    for (const [id, description] of descriptions) {
      if (description !== null) continue
      try {
        const proposal = await client.readContract({
          address,
          abi: votingAbi,
          functionName: "getOneProposal",
          args: [id],
          account,
        })
        descriptions.set(id, proposal.description)
      } catch {
        // Keep null: the UI shows "Description indisponible".
      }
    }
  }

  const model = buildVotingModel({ events, descriptions, status: reads.status })
  return { kind: "ready", ...reads, model, tally: computeTally(model.proposals, model.votes) }
}
