"use client"

import { useReadContract } from "wagmi"

import { Header } from "@/components/voting/header"
import { votingAbi } from "@/contracts/votingAbi"
import { useAppChain } from "@/hooks/use-app-chain"
import { getRole } from "@/lib/voting/permissions"

export default function Home() {
  const { chain, deployment, account } = useAppChain()
  const { data: owner } = useReadContract({
    address: deployment?.address,
    abi: votingAbi,
    functionName: "owner",
    chainId: chain.id,
    query: { enabled: deployment !== undefined },
  })

  return (
    <>
      <Header role={getRole(account, owner, [])} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8" />
    </>
  )
}
