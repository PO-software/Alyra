import { describe, expect, it } from "vitest"

import { ACCOUNTS, CONTRACT } from "@/test/logs"

import { MAX_BATCH, checkRpcRequest, isAllowedRpcResult } from "./guard"

const rpc = (method: string, params: unknown[] = [], id = 1) => ({ jsonrpc: "2.0", id, method, params })
const forbidden = { ok: false, status: 403 }
const malformed = { ok: false, status: 400 }

describe("checkRpcRequest", () => {
  it("accepts every read the app needs, aimed at the Voting contract", () => {
    const allowed = [
      rpc("eth_chainId"),
      rpc("eth_blockNumber"),
      rpc("eth_call", [{ to: CONTRACT.toLowerCase(), data: "0x8da5cb5b" }, "latest"]),
      rpc("eth_getLogs", [{ address: CONTRACT, fromBlock: "0x0", toBlock: "0x10" }]),
      rpc("eth_getLogs", [{ address: [CONTRACT], fromBlock: "0x0", toBlock: "0x10" }]),
      rpc("eth_getCode", [CONTRACT, "latest"]),
      rpc("eth_getTransactionByHash", ["0x" + "11".repeat(32)]),
      rpc("eth_getTransactionReceipt", ["0x" + "11".repeat(32)]),
      rpc("eth_getBlockByNumber", ["latest", false]),
      // viem's replacement check while waiting for a receipt asks for full transactions
      rpc("eth_getBlockByNumber", ["0x10", true]),
    ]
    for (const request of allowed) expect(checkRpcRequest(request, CONTRACT)).toEqual({ ok: true })
    expect(checkRpcRequest(allowed.map((request, id) => ({ ...request, id })), CONTRACT)).toEqual({ ok: true })
  })

  it("refuses methods outside the allowlist, writes included", () => {
    for (const method of ["eth_sendRawTransaction", "eth_accounts", "debug_traceTransaction"]) {
      expect(checkRpcRequest(rpc(method, ["0x00"]), CONTRACT)).toMatchObject(forbidden)
    }
  })

  it("refuses calls and log queries aimed at another address", () => {
    expect(checkRpcRequest(rpc("eth_call", [{ to: ACCOUNTS.voter1, data: "0x" }, "latest"]), CONTRACT)).toMatchObject(forbidden)
    expect(checkRpcRequest(rpc("eth_getLogs", [{ fromBlock: "0x0" }]), CONTRACT)).toMatchObject(forbidden)
    expect(checkRpcRequest(rpc("eth_getLogs", [{ address: [CONTRACT, ACCOUNTS.voter1] }]), CONTRACT)).toMatchObject(forbidden)
    expect(checkRpcRequest(rpc("eth_getCode", [ACCOUNTS.voter1, "latest"]), CONTRACT)).toMatchObject(forbidden)
  })

  it("refuses an eth_call carrying a state override, which could run any code at the Voting address", () => {
    const override = { [CONTRACT]: { code: "0x6000" } }
    expect(checkRpcRequest(rpc("eth_call", [{ to: CONTRACT, data: "0x" }, "latest", override]), CONTRACT)).toMatchObject(
      forbidden,
    )
  })

  it("refuses requests without an id and batches with duplicate ids", () => {
    expect(checkRpcRequest({ jsonrpc: "2.0", method: "eth_chainId", params: [] }, CONTRACT)).toMatchObject(malformed)
    expect(checkRpcRequest([rpc("eth_chainId", [], 1), rpc("eth_blockNumber", [], 1)], CONTRACT)).toMatchObject(malformed)
  })

  it("refuses oversized batches, a forbidden item inside a batch, and malformed bodies", () => {
    const tooMany = Array.from({ length: MAX_BATCH + 1 }, (_, i) => rpc("eth_chainId", [], i))
    expect(checkRpcRequest(tooMany, CONTRACT)).toMatchObject(malformed)
    expect(checkRpcRequest([], CONTRACT)).toMatchObject(malformed)
    expect(checkRpcRequest([rpc("eth_chainId", [], 1), rpc("eth_sendRawTransaction", ["0x00"], 2)], CONTRACT)).toMatchObject(forbidden)
    expect(checkRpcRequest({}, CONTRACT)).toMatchObject(malformed)
    expect(checkRpcRequest(null, CONTRACT)).toMatchObject(malformed)
  })
})

describe("isAllowedRpcResult", () => {
  it("only lets through transactions and receipts sent to the Voting contract", () => {
    expect(isAllowedRpcResult("eth_getTransactionByHash", { to: CONTRACT.toLowerCase() }, CONTRACT)).toBe(true)
    expect(isAllowedRpcResult("eth_getTransactionByHash", { to: ACCOUNTS.voter1 }, CONTRACT)).toBe(false)
    expect(isAllowedRpcResult("eth_getTransactionReceipt", { to: null }, CONTRACT)).toBe(false)
    expect(isAllowedRpcResult("eth_getTransactionByHash", null, CONTRACT)).toBe(true)
    expect(isAllowedRpcResult("eth_blockNumber", "0x10", CONTRACT)).toBe(true)
  })
})
