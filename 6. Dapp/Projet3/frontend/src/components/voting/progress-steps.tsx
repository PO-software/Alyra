import { Check } from "lucide-react"

import { STATUS_STEPS, type WorkflowStatus } from "@/lib/voting/status"
import { cn } from "@/lib/utils"

export function ProgressSteps({ status }: { status: WorkflowStatus }) {
  const current = STATUS_STEPS[status]

  return (
    <nav aria-label="Avancement du scrutin" className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Étape {status + 1} sur 6 · <span className="font-medium text-foreground">{current.label}</span>
      </p>
      <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {STATUS_STEPS.map((step) => {
          const done = step.status < status || status === STATUS_STEPS.length - 1
          const active = step.status === status
          return (
            <li key={step.status} aria-current={active ? "step" : undefined} className="min-w-0 space-y-2">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  done || active ? "bg-primary" : "bg-muted",
                  active && status !== STATUS_STEPS.length - 1 && "bg-primary/60",
                )}
              />
              <div
                className={cn(
                  "hidden items-start gap-1 text-xs sm:flex",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {done && <Check className="mt-px size-3 shrink-0 text-primary" aria-hidden />}
                <span className="leading-tight">{step.label}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
