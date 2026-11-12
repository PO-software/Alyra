"use client"

import { ActionsPanel } from "@/components/voting/actions-panel"
import { Header } from "@/components/voting/header"
import { ProgressSteps } from "@/components/voting/progress-steps"
import { ProposalsList } from "@/components/voting/proposals-list"
import { ResultCard } from "@/components/voting/result-card"
import { DashboardSkeleton, StatusNotice } from "@/components/voting/status-notice"
import { VotersList } from "@/components/voting/voters-list"
import { useAppChain } from "@/hooks/use-app-chain"
import { useVotingData } from "@/hooks/use-voting-data"
import { getRole } from "@/lib/voting/permissions"
import { WorkflowStatus } from "@/lib/voting/status"

export default function Home() {
  const { chain, deployment, account, isConnected, isCorrectChain } = useAppChain()
  const { snapshot, error, refresh } = useVotingData({ chainId: chain.id, deployment, account })
  const ready = snapshot?.kind === "ready" ? snapshot : undefined
  const role = ready ? getRole(account, ready.owner, ready.model.voters) : undefined

  let content: React.ReactNode
  if (!deployment) content = <StatusNotice kind="not-configured" />
  else if (snapshot?.kind === "not-deployed") content = <StatusNotice kind="not-deployed" />
  else if (!ready) content = error ? <StatusNotice kind="error" /> : <DashboardSkeleton />
  else
    content = (
      <div className="space-y-6">
        <ProgressSteps status={ready.status} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ActionsPanel
            key={`${chain.id}:${account ?? "none"}`}
            snapshot={ready}
            role={role ?? { isAdmin: false, isVoter: false }}
            account={account}
            chain={chain}
            deployment={deployment}
            isConnected={isConnected}
            isCorrectChain={isCorrectChain}
            refresh={refresh}
          />
          <div className="min-w-0 space-y-6">
            {ready.status === WorkflowStatus.VotesTallied && <ResultCard snapshot={ready} />}
            <ProposalsList snapshot={ready} />
            <VotersList snapshot={ready} account={account} />
          </div>
        </div>
      </div>
    )

  return (
    <>
      <Header role={role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{content}</main>
    </>
  )
}
