import type { Address } from "viem"

/** "0 vote", "1 vote", "2 votes" (French: 0 and 1 are singular). */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export const shortAddress = (address: Address) => `${address.slice(0, 6)}…${address.slice(-4)}`

const FOLD_FROM_CODE_POINTS = 160
const FOLD_FROM_LINES = 4

/** How to show a description, including odd ones sent straight to the contract (blank, very long, many lines). */
export function displayText(
  text: string | null,
): { kind: "missing" } | { kind: "blank" } | { kind: "text"; foldable: boolean } {
  if (text === null) return { kind: "missing" }
  if (/^[\s\p{Cf}]*$/u.test(text)) return { kind: "blank" }
  const foldable = [...text].length > FOLD_FROM_CODE_POINTS || text.split("\n").length >= FOLD_FROM_LINES
  return { kind: "text", foldable }
}
