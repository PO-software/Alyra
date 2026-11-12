import { describe, expect, it } from "vitest"

import { STATUS_STEPS, WorkflowStatus, toWorkflowStatus } from "./status"

describe("workflow status", () => {
  it("labels the six steps in French, in contract order", () => {
    expect(STATUS_STEPS.map((step) => step.label)).toEqual([
      "Inscription des électeurs",
      "Dépôt des propositions",
      "Propositions closes",
      "Vote en cours",
      "Vote clos",
      "Résultats",
    ])
    expect(STATUS_STEPS.map((step) => step.status)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it("converts contract values, numbers or bigints", () => {
    expect(toWorkflowStatus(3n)).toBe(WorkflowStatus.VotingSessionStarted)
    expect(toWorkflowStatus(5)).toBe(WorkflowStatus.VotesTallied)
  })

  it("rejects values outside the enum", () => {
    expect(() => toWorkflowStatus(6)).toThrow(RangeError)
    expect(() => toWorkflowStatus(-1)).toThrow(RangeError)
  })
})
