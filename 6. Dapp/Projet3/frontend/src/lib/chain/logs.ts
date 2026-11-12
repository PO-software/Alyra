import type { Address, Log, PublicClient } from "viem"

export type ReadClient = Pick<PublicClient, "getLogs" | "getBlockNumber" | "getTransaction" | "getCode" | "readContract">

/** Messages RPC providers use when a log query covers too many blocks or results. */
const RANGE_ERROR = /range|limit|too many|exceed|10000|10,000/i

/** All logs of `address` in [fromBlock, toBlock], halving the range whenever the provider refuses it. */
export async function getLogsAdaptive(
  client: ReadClient,
  args: { address: Address; fromBlock: bigint; toBlock: bigint },
): Promise<Log[]> {
  const { address, fromBlock, toBlock } = args
  try {
    return (await client.getLogs({ address, fromBlock, toBlock })) as Log[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (fromBlock >= toBlock || !RANGE_ERROR.test(message)) throw error
    const mid = fromBlock + (toBlock - fromBlock) / 2n
    const first = await getLogsAdaptive(client, { address, fromBlock, toBlock: mid })
    const second = await getLogsAdaptive(client, { address, fromBlock: mid + 1n, toBlock })
    return [...first, ...second]
  }
}

/** Keeps every log of one contract, fetching only new blocks on each call. */
export class LogSync {
  private logs: Log[] = []
  private lastSynced: bigint | undefined
  private inFlight: Promise<Log[]> | undefined

  constructor(
    private readonly client: ReadClient,
    private readonly address: Address,
    private readonly deploymentBlock: bigint,
  ) {}

  sync(): Promise<Log[]> {
    this.inFlight ??= this.run().finally(() => {
      this.inFlight = undefined
    })
    return this.inFlight
  }

  private async run(): Promise<Log[]> {
    const latest = await this.client.getBlockNumber()
    if (this.lastSynced !== undefined && latest < this.lastSynced) {
      // The chain went backwards (local node restarted): what we had no longer exists.
      this.logs = []
      this.lastSynced = undefined
    }
    if (latest < this.deploymentBlock) return this.logs

    const fromBlock = this.lastSynced === undefined ? this.deploymentBlock : this.lastSynced + 1n
    if (fromBlock <= latest) {
      const fresh = await getLogsAdaptive(this.client, { address: this.address, fromBlock, toBlock: latest })
      this.logs = [...this.logs, ...fresh]
      this.lastSynced = latest
    }
    return this.logs
  }
}
