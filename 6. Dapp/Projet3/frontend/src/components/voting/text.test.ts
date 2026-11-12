import { describe, expect, it } from "vitest"

import { displayText, plural, shortAddress } from "./text"

describe("plural", () => {
  it("uses the singular for 0 and 1, as in French", () => {
    expect(plural(0, "vote")).toBe("0 vote")
    expect(plural(1, "électeur")).toBe("1 électeur")
    expect(plural(2, "vote")).toBe("2 votes")
  })

  it("accepts an irregular plural", () => {
    expect(plural(3, "proposition déposée", "propositions déposées")).toBe("3 propositions déposées")
  })
})

describe("shortAddress", () => {
  it("keeps the prefix and the last four characters", () => {
    expect(shortAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")).toBe("0x7099…79C8")
  })
})

describe("displayText", () => {
  it("flags a missing description", () => {
    expect(displayText(null)).toEqual({ kind: "missing" })
  })

  it("flags a description with nothing visible in it (sent straight to the contract)", () => {
    expect(displayText(" ")).toEqual({ kind: "blank" })
    expect(displayText("\u200B\n\t")).toEqual({ kind: "blank" })
  })

  it("folds long texts and texts spread over many lines", () => {
    expect(displayText("Parc municipal")).toEqual({ kind: "text", foldable: false })
    expect(displayText("x".repeat(161))).toEqual({ kind: "text", foldable: true })
    expect(displayText("a\nb\nc\nd")).toEqual({ kind: "text", foldable: true })
  })
})
