import { PlanilhaViewer } from "@/components/shared/planilha-viewer"

export default function DashboardPlanilhasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planilha da Rede</h1>
        <p className="text-sm text-muted-foreground">
          Consulte os dados importados e o histórico de versões. Ordene clicando nos cabeçalhos.
        </p>
      </div>
      <PlanilhaViewer canManage={false} />
    </div>
  )
}
