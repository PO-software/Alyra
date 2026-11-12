import type { Address } from "viem"

/** "0 vote", "1 vote", "2 votes" (French: 0 and 1 are singular). */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export const shortAddress = (address: Address) => `${address.slice(0, 6)}…${address.slice(-4)}`
