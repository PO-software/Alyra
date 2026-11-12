import { type Address, getAddress, isAddress, zeroAddress } from "viem"

/** Contract cap on `proposalsArray.length`, GENESIS included: voters get 999. */
export const MAX_PROPOSALS = 1000
/** Front-end cap (the contract has none), in Unicode code points. */
export const MAX_DESCRIPTION_LENGTH = 280

export function validateVoterAddress(
  input: string,
  registered: readonly Address[],
): { ok: true; address: Address } | { ok: false; error: string } {
  const value = input.trim()
  if (!isAddress(value)) return { ok: false, error: "Adresse Ethereum invalide." }
  const address = getAddress(value)
  if (address === zeroAddress) return { ok: false, error: "L'adresse zéro ne peut pas être inscrite." }
  if (registered.some((voter) => voter.toLowerCase() === address.toLowerCase())) {
    return { ok: false, error: "Cette adresse est déjà inscrite." }
  }
  return { ok: true, address }
}

const normalize = (text: string) => text.trim().toLocaleLowerCase("fr")

export function validateProposal(
  input: string,
  existing: readonly (string | null)[],
  /** GENESIS included. */
  proposalCount: number,
): { ok: true; description: string } | { ok: false; error: string } {
  const description = input.trim()
  if (description === "") return { ok: false, error: "La proposition ne peut pas être vide." }
  if ([...description].length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: `${MAX_DESCRIPTION_LENGTH} caractères maximum.` }
  }
  const key = normalize(description)
  if (existing.some((other) => other !== null && normalize(other) === key)) {
    return { ok: false, error: "Cette proposition existe déjà." }
  }
  if (proposalCount >= MAX_PROPOSALS) {
    return { ok: false, error: "Le nombre maximum de propositions (1000, GENESIS comprise) est atteint." }
  }
  return { ok: true, description }
}
