"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { WriteRequest } from "@/hooks/use-voting-action"
import type { Proposal } from "@/lib/voting/model"
import type { Action } from "@/lib/voting/permissions"
import { MAX_DESCRIPTION_LENGTH, MAX_PROPOSALS, validateProposal } from "@/lib/voting/validation"
import { cn } from "@/lib/utils"

import { plural } from "./text"

export function AddProposalForm({
  proposals,
  run,
  pending,
}: {
  proposals: readonly Proposal[]
  run: (request: WriteRequest) => Promise<boolean>
  pending: Action | null
}) {
  const [value, setValue] = useState("")
  const result = validateProposal(
    value,
    proposals.map((p) => p.description),
    proposals.length,
  )
  const showError = !result.ok && value !== ""
  const length = [...value.trim()].length
  const remaining = MAX_PROPOSALS - proposals.length

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!result.ok) return
        if (await run({ action: "addProposal", args: [result.description] })) setValue("")
      }}
    >
      <Label htmlFor="proposal">Déposer une proposition</Label>
      <Textarea
        id="proposal"
        placeholder="Votre proposition…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={showError}
        aria-describedby="proposal-help"
        rows={3}
      />
      <div id="proposal-help" className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
        <span className={cn(showError && "text-destructive")}>
          {showError ? result.error : `Encore ${plural(remaining, "proposition possible", "propositions possibles")}`}
        </span>
        <span className={cn("tabular-nums", length > MAX_DESCRIPTION_LENGTH && "text-destructive")}>
          {length}/{MAX_DESCRIPTION_LENGTH}
        </span>
      </div>
      <Button type="submit" disabled={!result.ok || pending !== null}>
        {pending === "addProposal" && <Loader2 className="animate-spin" aria-hidden />}
        Déposer la proposition
      </Button>
    </form>
  )
}
