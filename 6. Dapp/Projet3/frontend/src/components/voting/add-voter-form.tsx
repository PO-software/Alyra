"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import type { Address } from "viem"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WriteRequest } from "@/hooks/use-voting-action"
import type { Action } from "@/lib/voting/permissions"
import { validateVoterAddress } from "@/lib/voting/validation"

export function AddVoterForm({
  voters,
  run,
  pending,
}: {
  voters: readonly Address[]
  run: (request: WriteRequest) => Promise<boolean>
  pending: Action | null
}) {
  const [value, setValue] = useState("")
  const [touched, setTouched] = useState(false)
  const result = validateVoterAddress(value, voters)
  // Don't flag a half-typed address: wait for blur or a full-length entry.
  const showError = !result.ok && value.trim() !== "" && (touched || value.trim().length >= 42)

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!result.ok) return
        if (await run({ action: "addVoter", args: [result.address] })) {
          setValue("")
          setTouched(false)
        }
      }}
    >
      <Label htmlFor="voter-address">Inscrire un électeur</Label>
      <Input
        id="voter-address"
        placeholder="0x…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? "voter-address-error" : undefined}
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
      />
      {showError && (
        <p id="voter-address-error" className="text-xs text-destructive">
          {result.error}
        </p>
      )}
      <Button type="submit" disabled={!result.ok || pending !== null}>
        {pending === "addVoter" && <Loader2 className="animate-spin" aria-hidden />}
        Inscrire l&apos;électeur
      </Button>
    </form>
  )
}
