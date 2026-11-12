"use client"

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import type { Hash } from "viem"
import { usePublicClient } from "wagmi"

import { pollingInterval } from "@/config/chains"
import type { Deployment } from "@/config/deployments"
import { LogSync, type ReadClient } from "@/lib/chain/logs"
import { type ReadCache, type VotingSnapshot, fetchVotingSnapshot } from "@/lib/voting/snapshot"

type ContractState = { logSync: LogSync; descriptionCache: Map<Hash, string | null>; readCache: ReadCache }

/** One log history, description cache and read cache per contract, shared by every query on it. */
const contractStates = new Map<string, ContractState>()

function contractState(client: ReadClient, deployment: Deployment): ContractState {
  const key = `${deployment.chainId}:${deployment.address}`
  let state = contractStates.get(key)
  if (!state) {
    state = {
      logSync: new LogSync(client, deployment.address, deployment.deploymentBlock),
      descriptionCache: new Map(),
      readCache: {},
    }
    contractStates.set(key, state)
  }
  return state
}

export const VOTING_QUERY_KEY = "voting"

export function useVotingData(args: {
  chainId: number
  deployment: Deployment | undefined
  account: `0x${string}` | undefined
}): { snapshot: VotingSnapshot | undefined; isLoading: boolean; error: Error | null; refresh: () => Promise<void> } {
  const { chainId, deployment, account } = args
  const client = usePublicClient({ chainId })
  const queryClient = useQueryClient()
  const enabled = client !== undefined && deployment !== undefined

  const query = useQuery({
    queryKey: [VOTING_QUERY_KEY, chainId, deployment?.address, account],
    queryFn: () =>
      fetchVotingSnapshot({
        client: client as ReadClient,
        deployment: deployment as Deployment,
        ...contractState(client as ReadClient, deployment as Deployment),
        account,
      }),
    enabled,
    refetchInterval: pollingInterval(chainId),
    placeholderData: keepPreviousData,
  })

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: [VOTING_QUERY_KEY] }), [queryClient])

  return { snapshot: query.data, isLoading: enabled && query.isPending, error: query.error, refresh }
}
