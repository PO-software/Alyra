"use client"

import type { Address, Chain } from "viem"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Deployment } from "@/config/deployments"
import { useVotingAction } from "@/hooks/use-voting-action"
import { type Role, allowedActions } from "@/lib/voting/permissions"
import type { VotingSnapshot } from "@/lib/voting/snapshot"
import { WorkflowStatus } from "@/lib/voting/status"

import { AddProposalForm } from "./add-proposal-form"
import { AddVoterForm } from "./add-voter-form"
import { type PhaseAction, PhaseControl } from "./phase-control"
import { VoteForm, VotedNotice } from "./vote-form"

type Ready = Extract<VotingSnapshot, { kind: "ready" }>

const PHASE_ACTIONS: readonly PhaseAction[] = [
  "startProposalsRegistering",
  "endProposalsRegistering",
  "startVotingSession",
  "endVotingSession",
  "tallyVotes",
]

/** What to tell someone who has nothing to do right now. */
function idleMessage(args: { role: Role; status: WorkflowStatus; isConnected: boolean }): string {
  const { role, status, isConnected } = args
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
      return "En attente de la clôture du vote par l'administrateur."
    case WorkflowStatus.VotingSessionEnded:
      return "La session de vote est close. En attente du dépouillement par l'administrateur."
  }
}

export function ActionsPanel({
  snapshot,
  role,
  account,
  chain,
  deployment,
  isConnected,
  isCorrectChain,
  refresh,
}: {
  snapshot: Ready
  role: Role
  account: Address | undefined
  chain: Chain
  deployment: Deployment
  isConnected: boolean
  isCorrectChain: boolean
  refresh: () => Promise<void>
}) {
  const { status, model, tally } = snapshot
  const { run, pending } = useVotingAction({ chainId: chain.id, deployment, account, refresh })
  const myVote = account !== undefined ? model.votes.get(account) : undefined
  const actions = allowedActions({
    role,
    status,
    hasVoted: myVote !== undefined,
    proposalCount: model.proposals.length,
    isCorrectChain,
  })
  const phaseAction = PHASE_ACTIONS.find((action) => actions.includes(action))
  const showVoted = myVote !== undefined && status >= WorkflowStatus.VotingSessionStarted
  const hasVoterContent = actions.includes("addProposal") || actions.includes("vote") || showVoted
  const hasAdminContent = actions.includes("addVoter") || phaseAction !== undefined

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Vos actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {isConnected && !isCorrectChain ? (
          <p>Connectez-vous au réseau {chain.name} pour agir.</p>
        ) : (
          <>
            {actions.includes("addProposal") && <AddProposalForm proposals={model.proposals} run={run} pending={pending} />}
            {actions.includes("vote") && <VoteForm proposals={model.proposals} run={run} pending={pending} />}
            {showVoted && <VotedNotice id={myVote} proposal={model.proposals.find((p) => p.id === myVote)} />}

            {hasVoterContent && hasAdminContent && <Separator />}

            {hasAdminContent && (
              <div className="space-y-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Administration</p>
                {actions.includes("addVoter") && <AddVoterForm voters={model.voters} run={run} pending={pending} />}
                {phaseAction && (
                  <PhaseControl
                    action={phaseAction}
                    counts={{
                      voters: model.voters.length,
                      proposals: model.proposals.filter((p) => !p.isGenesis).length,
                      votes: tally.totalVotes,
                    }}
                    run={run}
                    pending={pending}
                  />
                )}
              </div>
            )}

            {!hasVoterContent && !hasAdminContent && (
              <p className="text-muted-foreground">{idleMessage({ role, status, isConnected })}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
