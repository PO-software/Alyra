"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"

import { Button } from "@/components/ui/button"
import { HARDHAT_ACCOUNTS, devWalletId } from "@/config/dev-wallets"

const LABELS = ["#0 Admin", "#1", "#2", "#3", "#4 Visiteur"]

function DevWalletsPanel() {
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { connector: current } = useAccount()

  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-lg border bg-card p-3 text-card-foreground shadow-lg">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Comptes de test Hardhat</p>
      <div className="flex flex-wrap gap-1.5">
        {HARDHAT_ACCOUNTS.map((_, index) => {
          const connector = connectors.find((c) => c.id === devWalletId(index))
          if (!connector) return null
          return (
            <Button
              key={index}
              size="sm"
              variant={current?.id === connector.id ? "default" : "outline"}
              onClick={() => connect({ connector })}
            >
              {LABELS[index]}
            </Button>
          )
        })}
        <Button size="sm" variant="ghost" onClick={() => disconnect()}>
          Déconnecter
        </Button>
      </div>
    </div>
  )
}

function NoDevWallets() {
  return null
}

// Literal process.env checks in this module so production builds drop the panel (see config/dev-wallets.ts).
export const DevWallets =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_WALLETS === "true" ? DevWalletsPanel : NoDevWallets
