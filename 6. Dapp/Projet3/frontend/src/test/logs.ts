// Test-only helpers: build real, ABI-encoded logs and calldata for the Voting contract.
import {
  type AbiEvent,
  type Address,
  type Hash,
  type Hex,
  type Log,
  encodeAbiParameters,
  encodeEventTopics,
  getAbiItem,
  pad,
  toHex,
} from "viem"

import { votingAbi } from "@/contracts/votingAbi"

export const CONTRACT: Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

export const ACCOUNTS = {
  admin: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  voter1: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  voter2: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  voter3: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  visitor: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
} as const satisfies Record<string, Address>

export function txHash(n: number): Hash {
  return pad(toHex(n), { size: 32 })
}

type LogOptions = { blockNumber?: bigint; logIndex?: number; transactionHash?: Hash; address?: Address }

/** An encoded log for `eventName`, with `values` given in the event's parameter order. */
export function eventLog(eventName: string, values: readonly unknown[], options: LogOptions = {}): Log {
  const event = getAbiItem({ abi: votingAbi, name: eventName } as never) as AbiEvent
  const args = Object.fromEntries(event.inputs.map((input, i) => [input.name, values[i]]))
  const indexedArgs = Object.fromEntries(event.inputs.filter((i) => i.indexed).map((i) => [i.name, args[i.name!]]))
  const dataInputs = event.inputs.filter((i) => !i.indexed)
  const topics = encodeEventTopics({ abi: [event], eventName, args: indexedArgs } as never) as [Hex, ...Hex[]]
  const data = encodeAbiParameters(dataInputs, dataInputs.map((i) => args[i.name!]))
  return {
    address: options.address ?? CONTRACT,
    blockHash: pad("0x01", { size: 32 }),
    blockNumber: options.blockNumber ?? 1n,
    data,
    logIndex: options.logIndex ?? 0,
    transactionHash: options.transactionHash ?? txHash(1),
    transactionIndex: 0,
    removed: false,
    topics,
  }
}

/** A log whose topic matches no Voting event. */
export function unknownLog(options: LogOptions = {}): Log {
  return { ...eventLog("ProposalRegistered", [1n], options), topics: [pad("0xabcdef", { size: 32 })] }
}
