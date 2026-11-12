"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import type { Address } from "viem"
import { usePublicClient, useWriteContract } from "wagmi"

import type { Deployment } from "@/config/deployments"
import { votingAbi } from "@/contracts/votingAbi"
import { isUserRejection, toFrenchError } from "@/lib/voting/errors"
import type { Action } from "@/lib/voting/permissions"

export type WriteRequest =
  | { action: "addVoter"; args: [Address] }
  | { action: "addProposal"; args: [string] }
  | { action: "vote"; args: [bigint] }
  | { action: Exclude<Action, "addVoter" | "addProposal" | "vote"> }

const SUCCESS: Record<Action, string> = {
  addVoter: "Électeur inscrit.",
  addProposal: "Proposition déposée.",
  vote: "Vote enregistré.",
  startProposalsRegistering: "Dépôt des propositions ouvert.",
  endProposalsRegistering: "Dépôt des propositions clos.",
  startVotingSession: "Session de vote ouverte.",
  endVotingSession: "Session de vote close.",
  tallyVotes: "Votes comptabilisés.",
}

const shortHash = (hash: string) => `${hash.slice(0, 10)}…${hash.slice(-6)}`

export function useVotingAction(args: {
  chainId: number
  deployment: Deployment | undefined
  account: Address | undefined
  refresh: () => Promise<void>
}): { run: (request: WriteRequest) => Promise<boolean>; pending: Action | null } {
  const { chainId, deployment, account, refresh } = args
  const publicClient = usePublicClient({ chainId })
  const { writeContractAsync } = useWriteContract()
  const [pending, setPending] = useState<Action | null>(null)

  const run = useCallback(
    async (request: WriteRequest) => {
      if (!publicClient || !deployment || !account) return false
      setPending(request.action)
      const toastId = toast.loading("Préparation de la transaction…")
      // One typed call shape for every action; the union of function names is checked by WriteRequest.
      const call = {
        address: deployment.address,
        abi: votingAbi,
        functionName: request.action === "vote" ? "setVote" : request.action,
        args: "args" in request ? request.args : undefined,
      } as never
      try {
        // Simulate first: a call the contract would reject fails here, before the wallet opens.
        await publicClient.simulateContract({ ...(call as object), account } as never)
        toast.loading("Confirmez dans votre wallet…", { id: toastId })
        const hash = await writeContractAsync({ ...(call as object), chainId } as never)
        toast.loading("Transaction envoyée", { id: toastId, description: shortHash(hash) })
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== "success") {
          toast.error("La transaction a échoué. Réessayez.", { id: toastId, description: shortHash(hash) })
          return false
        }
        toast.success(SUCCESS[request.action], { id: toastId, description: shortHash(hash) })
        return true
      } catch (error) {
        if (isUserRejection(error)) toast.info("Transaction annulée dans le wallet.", { id: toastId, description: null })
        else toast.error(toFrenchError(error), { id: toastId, description: null })
        return false
      } finally {
        setPending(null)
        // Success or not, the chain may have moved on (another tab, another account): reload.
        await refresh()
      }
    },
    [publicClient, deployment, account, chainId, writeContractAsync, refresh],
  )

  return { run, pending }
}
