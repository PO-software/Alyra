import { hardhat, sepolia } from "viem/chains"
import { describe, expect, it } from "vitest"

import { selectChains } from "./chains"

const ids = (args: Parameters<typeof selectChains>[0]) => selectChains(args).map((chain) => chain.id)

describe("selectChains", () => {
  it("exposes only Sepolia in production, even when a local deployment is configured", () => {
    expect(ids({ nodeEnv: "production", hasHardhat: true, hasSepolia: true })).toEqual([sepolia.id])
    expect(ids({ nodeEnv: "production", hasHardhat: true, hasSepolia: false })).toEqual([sepolia.id])
  })

  it("puts the local node first in development, then Sepolia when configured", () => {
    expect(ids({ nodeEnv: "development", hasHardhat: true, hasSepolia: true })).toEqual([hardhat.id, sepolia.id])
    expect(ids({ nodeEnv: "development", hasHardhat: false, hasSepolia: true })).toEqual([sepolia.id])
  })

  it("falls back to the local node in development when nothing is configured", () => {
    expect(ids({ nodeEnv: "development", hasHardhat: false, hasSepolia: false })).toEqual([hardhat.id])
  })
})
