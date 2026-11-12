"use client"

import type { Address, Chain } from "viem"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Role, allowedActions } from "@/lib/voting/permissions"
import type { VotingSnapshot } from "@/lib/voting/snapshot"
import { WorkflowStatus } from "@/lib/voting/status"

type Ready = Extract<VotingSnapshot, { kind: "ready" }>

/** What to tell someone who has nothing to do right now. */
function idleMessage(args: { role: Role; status: WorkflowStatus; isConnected: boolean; hasVoted: boolean }): string {
  const { role, status, isConnected, hasVoted } = args
  if (status === WorkflowStatus.VotesTallied) return "Le vote est terminé : consultez le résultat."
  if (!isConnected) return "Connectez un wallet inscrit pour participer. La consultation reste ouverte à tous."
  if (!role.isAdmin && !role.isVoter)
    return "Votre adresse n'est pas inscrite comme électeur : vous pouvez suivre le scrutin sans y participer."
  switch (status) {
    case WorkflowStatus.RegisteringVoters:
      return "Vous êtes inscrit. En attente de l'ouverture du dépôt des propositions par l'administrateur."
    case WorkflowStatus.ProposalsRegistrationStarted:
      return "Le nombre maximum de propositions est atteint."
    case WorkflowStatus.ProposalsRegistrationEnded:
      return "Le dépôt des propositions est clos. En attente de l'ouverture du vote par l'administrateur."
    case WorkflowStatus.VotingSessionStarted:
      return hasVoted ? "Votre vote est enregistré." : "En attente de la clôture du vote."
    case WorkflowStatus.VotingSessionEnded:
      return "La session de vote est close. En attente du dépouillement par l'administrateur."
  }
}

export function ActionsPanel({
  snapshot,
  role,
  account,
  chain,
  isConnected,
  isCorrectChain,
}: {
  snapshot: Ready
  role: Role
  account: Address | undefined
  chain: Chain
  isConnected: boolean
  isCorrectChain: boolean
}) {
  const { status, model } = snapshot
  const hasVoted = account !== undefined && model.votes.has(account)
  const actions = allowedActions({ role, status, hasVoted, proposalCount: model.proposals.length, isCorrectChain })

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Vos actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isConnected && !isCorrectChain ? (
          <p>Connectez-vous au réseau {chain.name} pour agir.</p>
        ) : actions.length === 0 ? (
          <p className="text-muted-foreground">{idleMessage({ role, status, isConnected, hasVoted })}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
