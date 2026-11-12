import type { Address } from "viem"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { VotingSnapshot } from "@/lib/voting/snapshot"
import { WorkflowStatus } from "@/lib/voting/status"

import { plural, shortAddress } from "./text"

type Ready = Extract<VotingSnapshot, { kind: "ready" }>

export function VotersList({ snapshot, account }: { snapshot: Ready; account: Address | undefined }) {
  const { status, model } = snapshot
  const showVoted = status >= WorkflowStatus.VotingSessionStarted
  const count = model.voters.length

  let description: string
  if (count === 0 && status === WorkflowStatus.RegisteringVoters)
    description = "Inscription des électeurs en cours : 0 électeur inscrit pour l'instant."
  else if (count === 0) description = "Aucun électeur inscrit."
  else description = plural(count, "électeur inscrit", "électeurs inscrits")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Électeurs</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {count > 0 && (
        <CardContent>
          <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {model.voters.map((voter) => (
              <li key={voter} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate font-mono" title={voter}>
                  {shortAddress(voter)}
                </span>
                {account?.toLowerCase() === voter.toLowerCase() && <Badge variant="secondary">vous</Badge>}
                {showVoted && model.votes.has(voter) && <Badge variant="outline">a voté</Badge>}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
