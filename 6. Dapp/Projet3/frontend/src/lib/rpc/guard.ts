import type { Address } from "viem"

/** The only JSON-RPC methods the app's reads need. Writes never go through the proxy. */
export const ALLOWED_METHODS = [
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_getLogs",
  "eth_getCode",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
] as const

export const MAX_BATCH = 20
export const MAX_BODY_BYTES = 16_384

export type GuardResult = { ok: true } | { ok: false; status: 400 | 403; message: string }

type RpcRequest = { jsonrpc: "2.0"; method: string; params?: unknown[] }

const isRequest = (value: unknown): value is RpcRequest =>
  typeof value === "object" &&
  value !== null &&
  (value as RpcRequest).jsonrpc === "2.0" &&
  typeof (value as RpcRequest).method === "string" &&
  ((value as RpcRequest).params === undefined || Array.isArray((value as RpcRequest).params))

const isContract = (value: unknown, contract: Address) =>
  typeof value === "string" && value.toLowerCase() === contract.toLowerCase()

/** Whether a request may be forwarded: allowed method, and aimed at the Voting contract when it targets an address. */
function checkOne(request: RpcRequest, contract: Address): GuardResult {
  const params = request.params ?? []
  const deny = (message: string): GuardResult => ({ ok: false, status: 403, message })
  const first = params[0] as Record<string, unknown> | undefined

  switch (request.method) {
    case "eth_chainId":
    case "eth_blockNumber":
    case "eth_getTransactionByHash":
    case "eth_getTransactionReceipt":
      return { ok: true }
    case "eth_call":
      return isContract(first?.to, contract) ? { ok: true } : deny("eth_call limité au contrat Voting")
    case "eth_getLogs": {
      const address = first?.address
      const addresses = Array.isArray(address) ? address : [address]
      return addresses.length > 0 && addresses.every((a) => isContract(a, contract))
        ? { ok: true }
        : deny("eth_getLogs limité au contrat Voting")
    }
    case "eth_getCode":
      return isContract(params[0], contract) ? { ok: true } : deny("eth_getCode limité au contrat Voting")
    case "eth_getBlockByNumber":
      return params[1] === false ? { ok: true } : deny("Blocs sans transactions complètes uniquement")
    default:
      return deny(`Méthode non autorisée : ${request.method}`)
  }
}

export function checkRpcRequest(body: unknown, contract: Address): GuardResult {
  const malformed: GuardResult = { ok: false, status: 400, message: "Requête JSON-RPC invalide" }
  const requests = Array.isArray(body) ? body : [body]
  if (requests.length === 0 || requests.length > MAX_BATCH) return malformed
  for (const request of requests) {
    if (!isRequest(request)) return malformed
    const result = checkOne(request, contract)
    if (!result.ok) return result
  }
  return { ok: true }
}

/** Transactions and receipts are only returned when they were sent to the Voting contract. */
export function isAllowedRpcResult(method: string, result: unknown, contract: Address): boolean {
  if (method !== "eth_getTransactionByHash" && method !== "eth_getTransactionReceipt") return true
  if (result === null) return true
  return isContract((result as { to?: unknown } | undefined)?.to, contract)
}
