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

export async function fetchVotingSnapshot(args: {
  client: ReadClient
  deployment: Deployment
  logSync: LogSync
  descriptionCache: Map<Hash, string | null>
  account?: Address
}): Promise<VotingSnapshot> {
  const { client, deployment, logSync, descriptionCache, account } = args
  const address = deployment.address

  const code = await client.getCode({ address })
  if (!code || code === "0x") return { kind: "not-deployed" }

  // No multicall: the local Hardhat node has no Multicall3 contract.
  const [owner, rawStatus, winningProposalId] = await Promise.all([
    client.readContract({ address, abi: votingAbi, functionName: "owner" }),
    client.readContract({ address, abi: votingAbi, functionName: "workflowStatus" }),
    client.readContract({ address, abi: votingAbi, functionName: "winningProposalID" }),
  ])
  const status = toWorkflowStatus(rawStatus)

  const events = parseVotingLogs(await logSync.sync())
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

  const model = buildVotingModel({ events, descriptions, status })
  return { kind: "ready", owner, status, winningProposalId, model, tally: computeTally(model.proposals, model.votes) }
}
