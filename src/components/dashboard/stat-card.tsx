import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  realizado,
  meta,
  percentual,
}: {
  label: string
  realizado: number
  meta: number
  percentual: number
}) {
  const atingiu = meta > 0 && percentual >= 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{realizado}</span>
          <span className="text-sm text-muted-foreground">/ {meta} meta</span>
        </div>
        <Progress value={Math.min(percentual, 100)} />
        <p className={cn("text-xs font-medium", atingiu ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
          {percentual.toFixed(1)}% da meta
        </p>
      </CardContent>
    </Card>
  )
}
