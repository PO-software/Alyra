// Integration: the real wagmi config, reading Sepolia through the real /api/rpc handler and its guard,
// against a fake Sepolia node. Pins what viem/wagmi actually send (multicall batching, receipt polling).
import { type Hex, decodeFunctionData, encodeFunctionData, encodeFunctionResult, pad } from "viem"
import { sepolia } from "viem/chains"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { votingAbi } from "@/contracts/votingAbi"
import { ACCOUNTS, CONTRACT } from "@/test/logs"

const UPSTREAM = "https://sepolia.example/v3/KEY"
const HASH = pad("0xabc", { size: 32 })

type RpcRequest = { id: number; method: string; params: unknown[] }

function fakeSepolia() {
  let block = 0x10
  let receiptPolls = 0
  const seen: string[] = []
  const tx = {
    hash: HASH, nonce: "0x1", blockHash: null, blockNumber: null, transactionIndex: null,
    from: ACCOUNTS.voter1, to: CONTRACT, value: "0x0", gas: "0x5208", gasPrice: "0x1",
    input: "0x", type: "0x0", v: "0x1b", r: "0x1", s: "0x1", chainId: "0xaa36a7",
  }
  const receipt = {
    transactionHash: HASH, transactionIndex: "0x0", blockHash: pad("0x22", { size: 32 }), blockNumber: "0x11",
    from: ACCOUNTS.voter1, to: CONTRACT, cumulativeGasUsed: "0x5208", gasUsed: "0x5208", effectiveGasPrice: "0x1",
    contractAddress: null, logs: [], logsBloom: pad("0x", { size: 256 }), status: "0x1", type: "0x0",
  }
  const results: Record<string, unknown> = { owner: ACCOUNTS.admin, workflowStatus: 1, winningProposalID: 0n }

  const answer = (request: RpcRequest): unknown => {
    seen.push(request.method)
    switch (request.method) {
      case "eth_chainId":
        return "0xaa36a7"
      case "eth_blockNumber":
        return `0x${(block++).toString(16)}`
      case "eth_call": {
        const { functionName } = decodeFunctionData({ abi: votingAbi, data: (request.params[0] as { data: Hex }).data })
        if (functionName === "setVote") return "0x"
        return encodeFunctionResult({ abi: votingAbi, functionName, result: results[functionName] } as never)
      }
      case "eth_getTransactionByHash":
        return tx
      case "eth_getTransactionReceipt":
        return ++receiptPolls < 3 ? null : receipt // pending for a while, then mined
      case "eth_getBlockByNumber":
        return { number: request.params[0], hash: pad("0x33", { size: 32 }), timestamp: "0x1", transactions: [] }
    }
    throw new Error(`fake Sepolia: unexpected ${request.method}`)
  }
  return { answer, seen }
}

let node: ReturnType<typeof fakeSepolia>

async function loadApp() {
  vi.resetModules()
  vi.stubEnv("SEPOLIA_RPC_URL", UPSTREAM)
  vi.stubEnv("NEXT_PUBLIC_VOTING_ADDRESS_SEPOLIA", CONTRACT)
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_BLOCK_SEPOLIA", "1")
  const { POST } = await import("@/app/api/rpc/route")
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (url === "http://localhost/api/rpc") return POST(new Request(url, { method: "POST", body: init?.body }))
    if (url === UPSTREAM) {
      const body = JSON.parse(String(init?.body))
      const reply = (r: RpcRequest) => ({ jsonrpc: "2.0", id: r.id, result: node.answer(r) })
      return Response.json(Array.isArray(body) ? body.map(reply) : reply(body))
    }
    throw new Error(`unexpected fetch ${url}`)
  })
  const { createWagmiConfig } = await import("./wagmi")
  const actions = await import("wagmi/actions")
  return { config: createWagmiConfig(), ...actions }
}

beforeEach(() => {
  node = fakeSepolia()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("Sepolia through /api/rpc with the app's wagmi config", () => {
  it("reads the contract state, as the dashboard does (three reads at once)", async () => {
    const { config, readContract } = await loadApp()
    const read = (functionName: "owner" | "workflowStatus" | "winningProposalID") =>
      readContract(config, { address: CONTRACT, abi: votingAbi, functionName, chainId: sepolia.id })

    const [owner, status, winner] = await Promise.all([read("owner"), read("workflowStatus"), read("winningProposalID")])

    expect({ owner, status, winner }).toEqual({ owner: ACCOUNTS.admin, status: 1, winner: 0n })
  })

  it("waits for a pending transaction until it is mined", async () => {
    const { config, getPublicClient } = await loadApp()
    const client = getPublicClient(config, { chainId: sepolia.id })!

    const receipt = await client.waitForTransactionReceipt({ hash: HASH, pollingInterval: 10, retryDelay: 1 })

    expect(receipt.status).toBe("success")
    expect(node.seen).toContain("eth_getBlockByNumber") // viem's replacement check ran and was allowed
  })

  it("simulates a write from the voter's account", async () => {
    const { config, simulateContract } = await loadApp()
    const data = encodeFunctionData({ abi: votingAbi, functionName: "setVote", args: [1n] })

    const { request } = await simulateContract(config, {
      address: CONTRACT, abi: votingAbi, functionName: "setVote", args: [1n], account: ACCOUNTS.voter1, chainId: sepolia.id,
    })

    expect(request.functionName).toBe("setVote")
    expect(data.startsWith("0x")).toBe(true)
  })
})
