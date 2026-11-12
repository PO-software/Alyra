"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Vote } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useAppChain } from "@/hooks/use-app-chain"
import type { Role } from "@/lib/voting/permissions"

export function roleLabel(role: Role): string {
  if (role.isAdmin && role.isVoter) return "Admin · Électeur"
  if (role.isAdmin) return "Admin"
  if (role.isVoter) return "Électeur"
  return "Visiteur"
}

export function Header({ role }: { role: Role | undefined }) {
  const { chain, isConnected } = useAppChain()

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Vote className="size-4" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">Voting</span>
          <Badge variant="outline" className="ml-1">
            {chain.name}
          </Badge>
          {isConnected && role && <Badge variant="secondary">{roleLabel(role)}</Badge>}
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  )
}
