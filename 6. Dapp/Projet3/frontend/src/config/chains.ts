import type { Chain } from "viem"
import { hardhat, sepolia } from "viem/chains"

import { getDeployment } from "./deployments"

/** Production (Vercel) builds expose Sepolia only; development adds the local Hardhat node first. */
export function selectChains(args: {
  nodeEnv: string | undefined
  hasHardhat: boolean
  hasSepolia: boolean
}): readonly [Chain, ...Chain[]] {
  if (args.nodeEnv !== "development") return [sepolia]
  const chains: Chain[] = []
  if (args.hasHardhat) chains.push(hardhat)
  if (args.hasSepolia) chains.push(sepolia)
  const [first, ...rest] = chains
  return first ? [first, ...rest] : [hardhat]
}

export const appChains = selectChains({
  nodeEnv: process.env.NODE_ENV,
  hasHardhat: getDeployment(hardhat.id) !== undefined,
  hasSepolia: getDeployment(sepolia.id) !== undefined,
})

/** Polling interval for contract data: the local node mines instantly, Sepolia makes a block every ~12 s. */
export const pollingInterval = (chainId: number) => (chainId === hardhat.id ? 2_000 : 12_000)
