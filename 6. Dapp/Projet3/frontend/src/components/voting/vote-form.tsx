"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { WriteRequest } from "@/hooks/use-voting-action"
import type { Proposal } from "@/lib/voting/model"
import type { Action } from "@/lib/voting/permissions"

const label = (proposal: Proposal) =>
  proposal.isGenesis
    ? `#0 GENESIS (proposition par défaut du contrat)`
    : `#${proposal.id} ${proposal.description ?? "Description indisponible"}`

export function VotedNotice({ proposal, id }: { proposal: Proposal | undefined; id: bigint }) {
  return (
    <p className="break-words [overflow-wrap:anywhere]">
      Vous avez voté pour #{id.toString()} :{" "}
      <span className="font-medium">{proposal?.isGenesis ? "GENESIS" : (proposal?.description ?? "Description indisponible")}</span>
    </p>
  )
}

export function VoteForm({
  proposals,
  run,
  pending,
}: {
  proposals: readonly Proposal[]
  run: (request: WriteRequest) => Promise<boolean>
  pending: Action | null
}) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault()
        if (selected === null) return
        await run({ action: "vote", args: [BigInt(selected)] })
      }}
    >
      <p className="font-medium">Choisissez une proposition</p>
      <RadioGroup value={selected} onValueChange={(value) => setSelected(value as string)} aria-label="Propositions">
        {proposals.map((proposal) => {
          const id = `vote-${proposal.id}`
          return (
            <div key={id} className="flex items-start gap-2.5">
              <RadioGroupItem id={id} value={proposal.id.toString()} className="mt-0.5" />
              <Label htmlFor={id} className="min-w-0 font-normal break-words [overflow-wrap:anywhere]">
                {label(proposal)}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
      <Button type="submit" disabled={selected === null || pending !== null}>
        {pending === "vote" && <Loader2 className="animate-spin" aria-hidden />}
        Voter
      </Button>
    </form>
  )
}
