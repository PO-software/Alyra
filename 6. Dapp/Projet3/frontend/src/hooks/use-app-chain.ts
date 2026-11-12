"use client"

import type { Address, Chain } from "viem"
import { useAccount } from "wagmi"

import { appChains } from "@/config/chains"
import { type Deployment, getDeployment } from "@/config/deployments"

/** The chain the app reads from: the wallet's when it is supported, else the first configured one. */
export function useAppChain(): {
  chain: Chain
  deployment: Deployment | undefined
  isConnected: boolean
  isCorrectChain: boolean
  account: Address | undefined
} {
  const { address, chainId: walletChainId, isConnected } = useAccount()
  const chain = appChains.find((c) => c.id === walletChainId) ?? appChains[0]
  return {
    chain,
    deployment: getDeployment(chain.id),
    isConnected,
    isCorrectChain: isConnected && walletChainId === chain.id,
    account: address,
  }
}
