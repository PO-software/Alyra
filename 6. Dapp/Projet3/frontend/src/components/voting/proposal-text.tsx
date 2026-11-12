"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

const CLAMP_FROM = 160

/** A proposal description: plain text, wraps anywhere, long ones folded to three lines. */
export function ProposalText({ text, className }: { text: string | null; className?: string }) {
  const [expanded, setExpanded] = useState(false)

  if (text === null) return <span className={cn("text-muted-foreground italic", className)}>Description indisponible</span>

  const long = [...text].length > CLAMP_FROM
  return (
    <span className={cn("min-w-0 break-words whitespace-pre-line [overflow-wrap:anywhere]", className)}>
      <span className={cn(long && !expanded && "line-clamp-3")}>{text}</span>
      {long && (
        <button
          type="button"
          className="mt-1 block text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Réduire" : "Afficher tout"}
        </button>
      )}
    </span>
  )
}
