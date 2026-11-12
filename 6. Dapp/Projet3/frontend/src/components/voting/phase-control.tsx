"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { WriteRequest } from "@/hooks/use-voting-action"
import type { Action } from "@/lib/voting/permissions"

import { plural } from "./text"

export type PhaseAction = Extract<
  Action,
  "startProposalsRegistering" | "endProposalsRegistering" | "startVotingSession" | "endVotingSession" | "tallyVotes"
>

type Counts = { voters: number; proposals: number; votes: number }

const COPY: Record<PhaseAction, { button: string; body: (c: Counts) => string }> = {
  startProposalsRegistering: {
    button: "Ouvrir le dépôt des propositions",
    body: (c) => `Plus aucun électeur ne pourra être inscrit. ${plural(c.voters, "électeur inscrit", "électeurs inscrits")}.`,
  },
  endProposalsRegistering: {
    button: "Clore le dépôt des propositions",
    body: (c) =>
      `Les électeurs ne pourront plus proposer. ${plural(c.proposals, "proposition déposée", "propositions déposées")}, hors GENESIS.`,
  },
  startVotingSession: {
    button: "Ouvrir la session de vote",
    body: (c) => `Les électeurs pourront voter parmi ${plural(c.proposals + 1, "proposition")}, GENESIS comprise.`,
  },
  endVotingSession: {
    button: "Clore la session de vote",
    body: (c) =>
      `${plural(c.votes, "vote")} sur ${plural(c.voters, "électeur")}. Ceux qui n'ont pas voté ne pourront plus le faire.`,
  },
  tallyVotes: {
    button: "Comptabiliser les votes",
    body: () => "Le résultat sera définitif et visible par tous.",
  },
}

export function PhaseControl({
  action,
  counts,
  run,
  pending,
}: {
  action: PhaseAction
  counts: Counts
  run: (request: WriteRequest) => Promise<boolean>
  pending: Action | null
}) {
  const [open, setOpen] = useState(false)
  const copy = COPY[action]

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="default" className="w-full sm:w-auto" disabled={pending !== null} />}>
        {pending === action && <Loader2 className="animate-spin" aria-hidden />}
        {copy.button}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cette étape est définitive</AlertDialogTitle>
          <AlertDialogDescription>{copy.body(counts)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false)
              void run({ action })
            }}
          >
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
