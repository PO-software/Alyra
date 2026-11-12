import type { Address } from "viem"
import { type CreateConnectorFn, createConnector, mock } from "wagmi"

/**
 * Development only: the five public Hardhat test accounts as mock connectors, so every role can be
 * driven in a browser without MetaMask.
 *
 * The `process.env` checks are written out literally, in this module, on purpose: Next.js inlines them
 * at build time, so production builds reduce them to `false` and drop this code entirely.
 */
export const HARDHAT_ACCOUNTS: readonly Address[] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
]

export const devWalletId = (index: number) => `hardhat-${index}`

/** Mock connectors send transactions to the Hardhat node, whose test accounts are unlocked. */
export function devConnectors(): CreateConnectorFn[] {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_DEV_WALLETS !== "true") return []
  return HARDHAT_ACCOUNTS.map((account, index) =>
    createConnector((config) => ({
      ...mock({ accounts: [account], features: { reconnect: true } })(config),
      id: devWalletId(index),
      name: `Hardhat #${index}`,
    })),
  )
}
