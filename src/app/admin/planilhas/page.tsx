import { PlanilhaViewer } from "@/components/shared/planilha-viewer"

export default function AdminPlanilhasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar Planilha</h1>
        <p className="text-sm text-muted-foreground">
          Importe o relatório (.xlsx) e acompanhe o histórico de versões importadas.
        </p>
      </div>
      <PlanilhaViewer canManage />
    </div>
  )
}
