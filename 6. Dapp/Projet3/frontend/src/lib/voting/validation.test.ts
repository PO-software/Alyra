import { describe, expect, it } from "vitest"

import { ACCOUNTS } from "@/test/logs"

import { validateProposal, validateVoterAddress } from "./validation"

describe("validateVoterAddress", () => {
  it("accepts an all-lowercase address and returns it checksummed", () => {
    expect(validateVoterAddress(" 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 ", [])).toEqual({
      ok: true,
      address: ACCOUNTS.voter1,
    })
  })

  it("rejects malformed input and a wrong mixed-case checksum", () => {
    const invalid = { ok: false, error: "Adresse Ethereum invalide." }
    expect(validateVoterAddress("abc", [])).toEqual(invalid)
    expect(validateVoterAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79c8".replace("C5", "c5"), [])).toEqual(invalid)
  })

  it("rejects the zero address", () => {
    expect(validateVoterAddress("0x0000000000000000000000000000000000000000", [])).toEqual({
      ok: false,
      error: "L'adresse zéro ne peut pas être inscrite.",
    })
  })

  it("rejects an address that is already registered, whatever its case", () => {
    expect(validateVoterAddress(ACCOUNTS.voter1.toLowerCase(), [ACCOUNTS.voter1])).toEqual({
      ok: false,
      error: "Cette adresse est déjà inscrite.",
    })
  })
})

describe("validateProposal", () => {
  const existing = ["GENESIS", "Parc municipal"]

  it("returns the trimmed description", () => {
    expect(validateProposal("  Piste cyclable \n", existing, 2)).toEqual({ ok: true, description: "Piste cyclable" })
  })

  it("rejects an empty or whitespace-only text", () => {
    expect(validateProposal("   ", existing, 2)).toEqual({ ok: false, error: "La proposition ne peut pas être vide." })
  })

  it("counts Unicode code points: 280 emoji pass, 281 fail", () => {
    expect(validateProposal("🌳".repeat(280), existing, 2).ok).toBe(true)
    expect(validateProposal("🌳".repeat(281), existing, 2)).toEqual({ ok: false, error: "280 caractères maximum." })
  })

  it("rejects a duplicate, ignoring case and surrounding spaces, GENESIS included", () => {
    const duplicate = { ok: false, error: "Cette proposition existe déjà." }
    expect(validateProposal("  parc MUNICIPAL ", existing, 2)).toEqual(duplicate)
    expect(validateProposal("genesis", existing, 2)).toEqual(duplicate)
  })

  it("ignores proposals whose description is unknown when checking duplicates", () => {
    expect(validateProposal("Médiathèque", [null, "GENESIS"], 2).ok).toBe(true)
  })

  it("rejects new proposals once 1000 exist, GENESIS included", () => {
    expect(validateProposal("Nouvelle idée", existing, 1000)).toEqual({
      ok: false,
      error: "Le nombre maximum de propositions (1000, GENESIS comprise) est atteint.",
    })
    expect(validateProposal("Nouvelle idée", existing, 999).ok).toBe(true)
  })
})
