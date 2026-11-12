import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ACCOUNTS, CONTRACT } from "@/test/logs"

const UPSTREAM = "https://sepolia.infura.io/v3/SECRET"

const rpc = (method: string, params: unknown[] = [], id = 1) => ({ jsonrpc: "2.0", id, method, params })
const post = (body: unknown) =>
  new Request("http://localhost/api/rpc", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) })

async function loadRoute(env: { url?: string; address?: string } = {}) {
  vi.resetModules()
  vi.stubEnv("SEPOLIA_RPC_URL", env.url ?? UPSTREAM)
  vi.stubEnv("NEXT_PUBLIC_VOTING_ADDRESS_SEPOLIA", env.address ?? CONTRACT)
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_BLOCK_SEPOLIA", "100")
  return (await import("./route")).POST
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("POST /api/rpc", () => {
  it("refuses a disallowed method without contacting the node", async () => {
    const POST = await loadRoute()
    const response = await POST(post(rpc("eth_sendRawTransaction", ["0x00"])))
    expect(response.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("forwards an allowed request to the node and returns its answer", async () => {
    fetchMock.mockResolvedValue(Response.json({ jsonrpc: "2.0", id: 1, result: "0x10" }))
    const POST = await loadRoute()
    const body = rpc("eth_blockNumber")

    const response = await POST(post(body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ jsonrpc: "2.0", id: 1, result: "0x10" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(UPSTREAM)
    expect(JSON.parse(init.body)).toEqual(body)
  })

  it("replaces a transaction sent to another address with a Forbidden error", async () => {
    fetchMock.mockResolvedValue(
      Response.json([
        { jsonrpc: "2.0", id: 1, result: { to: ACCOUNTS.voter1, input: "0x" } },
        { jsonrpc: "2.0", id: 2, result: { to: CONTRACT, input: "0x" } },
      ]),
    )
    const POST = await loadRoute()
    const hash = "0x" + "11".repeat(32)

    const response = await POST(post([rpc("eth_getTransactionByHash", [hash], 1), rpc("eth_getTransactionByHash", [hash], 2)]))

    expect(await response.json()).toEqual([
      { jsonrpc: "2.0", id: 1, error: { code: -32001, message: "Forbidden" } },
      { jsonrpc: "2.0", id: 2, result: { to: CONTRACT, input: "0x" } },
    ])
  })

  it("treats an answer it cannot match to a request as forbidden", async () => {
    fetchMock.mockResolvedValue(Response.json({ jsonrpc: "2.0", id: 2, result: { to: ACCOUNTS.voter1, input: "0x" } }))
    const POST = await loadRoute()

    const response = await POST(post(rpc("eth_getTransactionByHash", ["0x" + "11".repeat(32)], 1)))

    expect(await response.json()).toEqual({ jsonrpc: "2.0", id: 2, error: { code: -32001, message: "Forbidden" } })
  })

  it("answers 500 when the node URL is not configured", async () => {
    const POST = await loadRoute({ url: "" })
    const response = await POST(post(rpc("eth_blockNumber")))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "RPC non configuré" })
  })

  it("answers 413 for an oversized body", async () => {
    const POST = await loadRoute()
    const response = await POST(post(JSON.stringify({ ...rpc("eth_blockNumber"), padding: "x".repeat(20_000) })))
    expect(response.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("answers 400 for a body that is not JSON", async () => {
    const POST = await loadRoute()
    expect((await POST(post("{not json"))).status).toBe(400)
  })

  it("never leaks the node URL when the node fails", async () => {
    fetchMock.mockRejectedValue(new Error(`${UPSTREAM} failed`))
    const POST = await loadRoute()

    const response = await POST(post(rpc("eth_blockNumber")))

    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain("SECRET")
  })
})
