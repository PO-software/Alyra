import { type Address, getAddress, isAddress } from "viem"
import { hardhat, sepolia } from "viem/chains"

export type Deployment = {
  chainId: number
  address: Address
  deploymentBlock: bigint
}

/** Builds a deployment from raw env values; returns undefined when they are missing or malformed. The block is
 *  optional only on the local node. */
export function parseDeployment(
  chainId: number,
  address: string | undefined,
  block: string | undefined,
): Deployment | undefined {
  if (!address || !isAddress(address, { strict: false })) return undefined
  const hasBlock = block !== undefined && block !== ""
  // Logs are read from the deployment block; only the local node may start from 0.
  if (!hasBlock && chainId !== hardhat.id) return undefined
  if (hasBlock && !/^\d+$/.test(block)) return undefined
  return {
    chainId,
    address: getAddress(address),
    deploymentBlock: block ? BigInt(block) : 0n,
  }
}

// Literal process.env accesses so Next.js inlines the NEXT_PUBLIC_ values at build time.
const deployments: Partial<Record<number, Deployment>> = {
  [hardhat.id]: parseDeployment(
    hardhat.id,
    process.env.NEXT_PUBLIC_VOTING_ADDRESS_HARDHAT,
    process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK_HARDHAT,
  ),
  [sepolia.id]: parseDeployment(
    sepolia.id,
    process.env.NEXT_PUBLIC_VOTING_ADDRESS_SEPOLIA,
    process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK_SEPOLIA,
  ),
}

export function getDeployment(chainId: number): Deployment | undefined {
  return deployments[chainId]
}
