import { Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { VotingSnapshot } from "@/lib/voting/snapshot"

import { ProposalText } from "./proposal-text"
import { plural } from "./text"

type Ready = Extract<VotingSnapshot, { kind: "ready" }>

export function ResultCard({ snapshot }: { snapshot: Ready }) {
  const { model, tally, winningProposalId } = snapshot
  const proposalById = new Map(model.proposals.map((p) => [p.id, p]))
  const winner = proposalById.get(winningProposalId)
  const winnerVotes = tally.rows.find((row) => row.proposalId === winningProposalId)?.votes ?? 0

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <Trophy className="size-3.5 text-primary" aria-hidden />
          Proposition gagnante
        </CardDescription>
        <CardTitle className="flex items-baseline gap-2 text-xl">
          <span className="font-mono text-muted-foreground">#{winningProposalId.toString()}</span>
          {winner?.isGenesis ? <Badge variant="outline">GENESIS</Badge> : <ProposalText text={winner?.description ?? null} />}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{plural(winnerVotes, "vote")}</p>
        {tally.totalVotes === 0 && (
          <p className="text-sm">Aucun vote n&apos;a été exprimé : GENESIS l&apos;emporte par défaut.</p>
        )}
        {tally.isTie && (
          <p className="text-sm">Égalité : la proposition au plus petit numéro l&apos;emporte, règle du contrat.</p>
        )}
      </CardHeader>
      <CardContent>
        <Separator className="mb-3" />
        <p className="mb-2 text-sm font-medium">Classement complet</p>
        <ol className="space-y-1.5">
          {tally.rows.map((row, index) => {
            const proposal = proposalById.get(row.proposalId)
            return (
              <li key={row.proposalId.toString()} className="flex items-start gap-3 text-sm">
                <span className="w-6 shrink-0 text-muted-foreground tabular-nums">{index + 1}.</span>
                <span className="w-10 shrink-0 font-mono text-muted-foreground">#{row.proposalId.toString()}</span>
                <span className="min-w-0 flex-1">
                  {proposal?.isGenesis ? "GENESIS" : <ProposalText text={proposal?.description ?? null} />}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{plural(row.votes, "vote")}</span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
