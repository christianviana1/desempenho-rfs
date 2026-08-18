import { RankingTable } from "@/components/dashboard/ranking-table"

export default function RankingAdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
      <RankingTable />
    </div>
  )
}
