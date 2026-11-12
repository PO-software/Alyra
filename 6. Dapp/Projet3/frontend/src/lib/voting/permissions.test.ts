import { describe, expect, it } from "vitest"

import { ACCOUNTS } from "@/test/logs"

import { type Action, type Role, allowedActions, getRole } from "./permissions"
import { type WorkflowStatus } from "./status"

const ADMIN: Role = { isAdmin: true, isVoter: false }
const VOTER: Role = { isAdmin: false, isVoter: true }
const BOTH: Role = { isAdmin: true, isVoter: true }
const VISITOR: Role = { isAdmin: false, isVoter: false }

const actions = (role: Role, status: number, extra: Partial<Parameters<typeof allowedActions>[0]> = {}) =>
  new Set(
    allowedActions({ role, status: status as WorkflowStatus, hasVoted: false, proposalCount: 4, isCorrectChain: true, ...extra }),
  )

const expected: Record<number, { admin: Action[]; voter: Action[] }> = {
  0: { admin: ["addVoter", "startProposalsRegistering"], voter: [] },
  1: { admin: ["endProposalsRegistering"], voter: ["addProposal"] },
  2: { admin: ["startVotingSession"], voter: [] },
  3: { admin: ["endVotingSession"], voter: ["vote"] },
  4: { admin: ["tallyVotes"], voter: [] },
  5: { admin: [], voter: [] },
}

describe("allowedActions", () => {
  for (const [status, { admin, voter }] of Object.entries(expected)) {
    it(`status ${status}: admin, voter, both and visitor`, () => {
      expect(actions(ADMIN, Number(status))).toEqual(new Set(admin))
      expect(actions(VOTER, Number(status))).toEqual(new Set(voter))
      expect(actions(BOTH, Number(status))).toEqual(new Set([...admin, ...voter]))
      expect(actions(VISITOR, Number(status))).toEqual(new Set())
    })
  }

  it("offers nothing on the wrong chain, whatever the role and status", () => {
    for (let status = 0; status <= 5; status++) {
      expect(actions(BOTH, status, { isCorrectChain: false })).toEqual(new Set())
    }
  })

  it("stops proposals at 1000, GENESIS included", () => {
    expect(actions(VOTER, 1, { proposalCount: 999 }).has("addProposal")).toBe(true)
    expect(actions(VOTER, 1, { proposalCount: 1000 }).has("addProposal")).toBe(false)
  })

  it("stops a voter from voting twice", () => {
    expect(actions(VOTER, 3, { hasVoted: true }).has("vote")).toBe(false)
  })
})

describe("getRole", () => {
  it("compares the owner case-insensitively", () => {
    expect(getRole(ACCOUNTS.admin.toLowerCase() as `0x${string}`, ACCOUNTS.admin, [])).toEqual({ isAdmin: true, isVoter: false })
  })

  it("has no role without an account", () => {
    expect(getRole(undefined, ACCOUNTS.admin, [ACCOUNTS.voter1])).toEqual({ isAdmin: false, isVoter: false })
  })

  it("follows an account switch from admin to voter", () => {
    const voters = [ACCOUNTS.voter1]
    expect(getRole(ACCOUNTS.admin, ACCOUNTS.admin, voters)).toEqual({ isAdmin: true, isVoter: false })
    expect(getRole(ACCOUNTS.voter1, ACCOUNTS.admin, voters)).toEqual({ isAdmin: false, isVoter: true })
  })
})
