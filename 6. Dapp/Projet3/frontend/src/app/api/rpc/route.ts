// Read-only JSON-RPC proxy to Sepolia. The Infura URL (with its key) stays on the server:
// only allowlisted reads aimed at the Voting contract are forwarded.
import { sepolia } from "viem/chains"

import { getDeployment } from "@/config/deployments"
import { MAX_BODY_BYTES, checkRpcRequest, isAllowedRpcResult } from "@/lib/rpc/guard"

type RpcResponseItem = { jsonrpc: "2.0"; id: unknown; result?: unknown; error?: unknown }

const rpcError = (status: number, code: number, message: string) =>
  Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status })

export async function POST(request: Request): Promise<Response> {
  const upstream = process.env.SEPOLIA_RPC_URL
  const deployment = getDeployment(sepolia.id)
  if (!upstream || !deployment) return Response.json({ error: "RPC non configuré" }, { status: 500 })

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return rpcError(413, -32600, "Requête trop volumineuse")
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return rpcError(413, -32600, "Requête trop volumineuse")

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return rpcError(400, -32700, "JSON invalide")
  }

  const guard = checkRpcRequest(body, deployment.address)
  if (!guard.ok) return rpcError(guard.status, guard.status === 403 ? -32001 : -32600, guard.message)

  let answer: RpcResponseItem | RpcResponseItem[]
  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: text,
      cache: "no-store",
    })
    answer = await response.json()
  } catch {
    // Never echo the upstream error: it may contain the URL and its key.
    return Response.json({ error: "Erreur du nœud RPC" }, { status: 502 })
  }

  const requests = (Array.isArray(body) ? body : [body]) as { id: unknown; method: string }[]
  const methodById = new Map(requests.map((r) => [JSON.stringify(r.id), r.method]))
  const filter = (item: RpcResponseItem): RpcResponseItem => {
    const method = methodById.get(JSON.stringify(item.id))
    // An answer we cannot match to a request is never let through (fail closed).
    if ("result" in item && (method === undefined || !isAllowedRpcResult(method, item.result, deployment.address))) {
      return { jsonrpc: "2.0", id: item.id, error: { code: -32001, message: "Forbidden" } }
    }
    return item
  }

  return Response.json(Array.isArray(answer) ? answer.map(filter) : filter(answer))
}
