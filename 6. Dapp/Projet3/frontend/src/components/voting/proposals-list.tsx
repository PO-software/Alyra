import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { VotingSnapshot } from "@/lib/voting/snapshot"
import { WorkflowStatus } from "@/lib/voting/status"

import { ProposalText } from "./proposal-text"
import { plural } from "./text"

type Ready = Extract<VotingSnapshot, { kind: "ready" }>

export function ProposalsList({ snapshot }: { snapshot: Ready }) {
  const { status, model, tally } = snapshot
  const showCounts = status === WorkflowStatus.VotesTallied
  const votesOf = new Map(tally.rows.map((row) => [row.proposalId, row.votes]))
  const submitted = model.proposals.filter((p) => !p.isGenesis).length

  let description: string
  if (status === WorkflowStatus.RegisteringVoters) description = "Le dépôt des propositions n'a pas encore commencé."
  else if (status === WorkflowStatus.VotingSessionStarted || status === WorkflowStatus.VotingSessionEnded)
    description = `${plural(tally.totalVotes, "vote")} sur ${plural(model.voters.length, "électeur")}`
  else description = `${plural(submitted, "proposition déposée", "propositions déposées")}, hors GENESIS`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propositions</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {model.proposals.length > 0 && (
        <CardContent>
          <ol className="divide-y">
            {model.proposals.map((proposal) => (
              <li key={proposal.id.toString()} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground">#{proposal.id.toString()}</span>
                <div className="min-w-0 flex-1 text-sm">
                  {proposal.isGenesis ? (
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">GENESIS</Badge>
                      <span className="text-muted-foreground">Proposition par défaut du contrat</span>
                    </span>
                  ) : (
                    <ProposalText text={proposal.description} />
                  )}
                </div>
                {showCounts && (
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {plural(votesOf.get(proposal.id) ?? 0, "vote")}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {submitted === 0 && status === WorkflowStatus.ProposalsRegistrationStarted && (
            <p className="mt-3 text-sm text-muted-foreground">Aucune proposition déposée pour l&apos;instant.</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
