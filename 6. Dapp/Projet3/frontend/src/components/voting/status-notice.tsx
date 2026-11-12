import { AlertTriangle, PlugZap, RefreshCw } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Kind = "not-configured" | "not-deployed" | "error"

const MESSAGES: Record<Kind, string> = {
  "not-configured": "Aucun contrat Voting n'est configuré pour ce réseau.",
  "not-deployed": "Aucun contrat Voting à l'adresse configurée sur ce réseau.",
  error: "Impossible de lire le contrat. Nouvelle tentative…",
}

const ICONS = { "not-configured": PlugZap, "not-deployed": AlertTriangle, error: RefreshCw }

export function StatusNotice({ kind }: { kind: Kind }) {
  const Icon = ICONS[kind]
  return (
    <Card role="status">
      <CardContent className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-medium">{MESSAGES[kind]}</p>
          {kind === "not-deployed" && process.env.NODE_ENV === "development" && (
            <p className="text-muted-foreground">
              Redéployez puis lancez <code className="font-mono">pnpm sync:local</code>.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Skeleton className="h-48" />
        <div className="space-y-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
