import { connectorsForWallets } from "@rainbow-me/rainbowkit"
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets"
import { type Transport, http } from "viem"
import { hardhat, sepolia } from "viem/chains"
import { createConfig } from "wagmi"

import { appChains } from "./chains"
import { devConnectors } from "./dev-wallets"

/** Sepolia reads go through our server route so the Infura key never reaches the browser. */
function rpcProxyUrl() {
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin
  return `${origin}/api/rpc`
}

const transports: Record<number, Transport> = {
  [hardhat.id]: http("http://127.0.0.1:8545"),
  [sepolia.id]: http(rpcProxyUrl()),
}

// Only browser-extension wallets: MetaMask shows up through EIP-6963 in RainbowKit's "Installed" group,
// `injectedWallet` covers any other injected provider. No wallet in this list uses WalletConnect, so the
// project id below is never sent anywhere; RainbowKit's types simply require one.
const walletConnectors = connectorsForWallets([{ groupName: "Navigateur", wallets: [injectedWallet] }], {
  appName: "Voting",
  projectId: "unused-no-walletconnect",
})

export function createWagmiConfig() {
  return createConfig({
    chains: appChains,
    connectors: [...walletConnectors, ...devConnectors()],
    transports: Object.fromEntries(appChains.map((chain) => [chain.id, transports[chain.id]])),
    // wagmi batches reads through Multicall3 by default; /api/rpc only lets calls to the Voting contract through.
    batch: { multicall: false },
    ssr: true,
  })
}
