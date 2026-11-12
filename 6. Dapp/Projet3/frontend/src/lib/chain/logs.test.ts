import type { Log } from "viem"
import { describe, expect, it, vi } from "vitest"

import { CONTRACT, eventLog } from "@/test/logs"

import { LogSync, type ReadClient, getLogsAdaptive } from "./logs"

type Range = { fromBlock: bigint; toBlock: bigint }

/** A fake node holding `pool`, that refuses ranges wider than `maxRange` blocks. */
function fakeNode(pool: Log[], options: { maxRange?: bigint; latest?: bigint[] } = {}) {
  const latest = [...(options.latest ?? [])]
  const getLogs = vi.fn(async ({ fromBlock, toBlock }: Range) => {
    if (options.maxRange !== undefined && toBlock - fromBlock + 1n > options.maxRange) {
      throw new Error(`query exceeds max block range ${options.maxRange}`)
    }
    return pool.filter((log) => log.blockNumber! >= fromBlock && log.blockNumber! <= toBlock)
  })
  const getBlockNumber = vi.fn(async () => latest.shift() ?? 0n)
  return { client: { getLogs, getBlockNumber } as unknown as ReadClient, getLogs, getBlockNumber }
}

const at = (block: bigint) => eventLog("ProposalRegistered", [block], { blockNumber: block })

describe("getLogsAdaptive", () => {
  it("splits ranges the node refuses and returns every log in order", async () => {
    const pool = [at(10n), at(1200n), at(2499n)]
    const { client, getLogs } = fakeNode(pool, { maxRange: 1000n })

    const logs = await getLogsAdaptive(client, { address: CONTRACT, fromBlock: 0n, toBlock: 2500n })

    expect(logs.map((l) => l.blockNumber)).toEqual([10n, 1200n, 2499n])
    expect(getLogs.mock.calls.length).toBeGreaterThan(1)
  })

  it("rethrows errors that are not about the range", async () => {
    const client = { getLogs: vi.fn().mockRejectedValue(new Error("internal error")) } as unknown as ReadClient
    await expect(getLogsAdaptive(client, { address: CONTRACT, fromBlock: 0n, toBlock: 10n })).rejects.toThrow("internal error")
  })

  it("rethrows when even a single block is refused", async () => {
    const client = { getLogs: vi.fn().mockRejectedValue(new Error("limit exceeded")) } as unknown as ReadClient
    await expect(getLogsAdaptive(client, { address: CONTRACT, fromBlock: 0n, toBlock: 3n })).rejects.toThrow("limit exceeded")
  })
})

describe("LogSync", () => {
  it("fetches from the deployment block, then only the new blocks", async () => {
    const { client, getLogs } = fakeNode([at(10n), at(55n)], { latest: [50n, 60n] })
    const sync = new LogSync(client, CONTRACT, 5n)

    expect((await sync.sync()).map((l) => l.blockNumber)).toEqual([10n])
    expect((await sync.sync()).map((l) => l.blockNumber)).toEqual([10n, 55n])
    expect(getLogs.mock.calls.map(([range]) => [range.fromBlock, range.toBlock])).toEqual([
      [5n, 50n],
      [51n, 60n],
    ])
  })

  it("starts over when the chain was rewound (local node restarted)", async () => {
    const pool = [at(10n)]
    const { client, getLogs } = fakeNode(pool, { latest: [50n, 3n] })
    const sync = new LogSync(client, CONTRACT, 0n)

    expect(await sync.sync()).toHaveLength(1)
    pool.length = 0
    expect(await sync.sync()).toEqual([])
    expect(getLogs.mock.calls.at(-1)?.[0]).toMatchObject({ fromBlock: 0n, toBlock: 3n })
  })

  it("returns nothing before the deployment block exists", async () => {
    const { client, getLogs } = fakeNode([], { latest: [2n] })
    expect(await new LogSync(client, CONTRACT, 7n).sync()).toEqual([])
    expect(getLogs).not.toHaveBeenCalled()
  })

  it("asks the node for a fresh block number every time (no client-side cache)", async () => {
    const { client, getBlockNumber } = fakeNode([], { latest: [5n] })
    await new LogSync(client, CONTRACT, 0n).sync()
    expect(getBlockNumber).toHaveBeenCalledWith({ cacheTime: 0 })
  })

  it("reports what the last sync changed", async () => {
    const pool = [at(10n)]
    const { client } = fakeNode(pool, { latest: [50n, 60n, 3n] })
    const sync = new LogSync(client, CONTRACT, 0n)

    await sync.sync()
    expect(sync.lastChange).toEqual({ added: 1, reset: false })
    await sync.sync()
    expect(sync.lastChange).toEqual({ added: 0, reset: false })
    await sync.sync()
    expect(sync.lastChange).toEqual({ added: 0, reset: true })
  })

  it("shares one fetch between overlapping calls", async () => {
    const { client, getLogs } = fakeNode([at(10n)], { latest: [50n, 50n] })
    const sync = new LogSync(client, CONTRACT, 0n)

    const [a, b] = await Promise.all([sync.sync(), sync.sync()])

    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(getLogs).toHaveBeenCalledTimes(1)
  })
})
