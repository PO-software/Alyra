import { describe, expect, it } from "vitest"

import { parseDeployment } from "./deployments"

const VALID = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

describe("parseDeployment", () => {
  it("parses a valid deployment and checksums the address", () => {
    expect(parseDeployment(11155111, "0x5fbdb2315678afecb367f032d93f642f64180aa3", "7000000")).toEqual({
      chainId: 11155111,
      address: VALID,
      deploymentBlock: 7000000n,
    })
  })

  it("defaults the deployment block to 0n", () => {
    expect(parseDeployment(31337, VALID, undefined)?.deploymentBlock).toBe(0n)
  })

  it("rejects a missing address", () => {
    expect(parseDeployment(31337, undefined, "0")).toBeUndefined()
  })

  it("rejects an invalid address", () => {
    expect(parseDeployment(31337, "0x123", "0")).toBeUndefined()
  })

  it("rejects a non-numeric block", () => {
    expect(parseDeployment(31337, VALID, "abc")).toBeUndefined()
  })
})
