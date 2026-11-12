"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

import { displayText } from "./text"

/** A proposal description: plain text, wraps anywhere, long or many-line ones folded to three lines. */
export function ProposalText({ text, className }: { text: string | null; className?: string }) {
  const [expanded, setExpanded] = useState(false)
  const display = displayText(text)

  if (display.kind === "missing")
    return <span className={cn("text-muted-foreground italic", className)}>Description indisponible</span>
  if (display.kind === "blank") return <span className={cn("text-muted-foreground italic", className)}>Description vide</span>

  return (
    <span className={cn("min-w-0 break-words whitespace-pre-line [overflow-wrap:anywhere]", className)}>
      <span className={cn(display.foldable && !expanded && "line-clamp-3")}>{text}</span>
      {display.foldable && (
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
