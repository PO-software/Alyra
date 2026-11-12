import { describe, expect, it } from "vitest"

import { plural, shortAddress } from "./text"

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
