"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, ArrowUpDown, History, Trash2, Upload } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type ImportacaoResumo = {
  id: number
  nomeArquivo: string
  importadoEm: string
  totalLinhas: number
  importadoPor: { nome: string }
}

type ImportacaoLinha = {
  id: number
  linhaOriginal: number
  divisao: string | null
  regional: string | null
  loja: string | null
  codLoja: string | null
  drt: string | null
  nome: string | null
  cargo: string | null
  dtAdmissao: string | null
  situacao: string | null
  lojaTransversal: string | null
  mesesTrabalho: number | null
  dados: Record<string, Record<string, Record<string, unknown>>>
}

type ImportacaoDetalhe = ImportacaoResumo & { linhas: ImportacaoLinha[] }

const COLUNAS_BASE: { key: string; label: string }[] = [
  { key: "loja", label: "Loja" },
  { key: "nome", label: "Nome" },
  { key: "cargo", label: "Cargo" },
  { key: "regional", label: "Regional" },
  { key: "divisao", label: "Divisão" },
  { key: "situacao", label: "Situação" },
]

const ORDEM_CAMPO = ["Meta", "Real", "(%) Ating.", "Valor"]

function formatarPeriodo(periodo: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(periodo)
  if (!match) return periodo
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  return `${nomes[Number(match[2]) - 1]}/${match[1]}`
}

function formatarValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—"
  if (typeof valor === "number") {
    if (campo.toLowerCase().includes("%")) {
      return `${(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
    }
    return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  }
  return String(valor)
}

function valorParaOrdenar(linha: ImportacaoLinha, key: string, grupo: string | null): string | number {
  const base = COLUNAS_BASE.find((c) => c.key === key)
  if (base) {
    const v = (linha as unknown as Record<string, unknown>)[base.key]
    return typeof v === "number" ? v : String(v ?? "")
  }
  if (!grupo) return ""
  const [periodo, campo] = key.split("::")
  const v = linha.dados[grupo]?.[periodo]?.[campo]
  if (typeof v === "number") return v
  return String(v ?? "")
}

function SortableHead({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  columnKey: string
  sortKey: string
  sortDir: "asc" | "desc"
  onSort: (key: string) => void
  className?: string
}) {
  const active = sortKey === columnKey
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "flex items-center gap-1 text-left font-medium hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        <Icon className="size-3.5 shrink-0" />
      </button>
    </TableHead>
  )
}

export function PlanilhaViewer({ canManage }: { canManage: boolean }) {
  const [importacoes, setImportacoes] = useState<ImportacaoResumo[] | null>(null)
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null)
  const [detalhe, setDetalhe] = useState<ImportacaoDetalhe | null>(null)
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [sortKey, setSortKey] = useState("nome")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [enviando, setEnviando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function carregarLista(selecionarMaisRecente = false) {
    try {
      const lista = await apiFetch<ImportacaoResumo[]>("/api/planilhas")
      setImportacoes(lista)
      if (selecionarMaisRecente && lista.length > 0) {
        setSelecionadaId(lista[0].id)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar histórico de importações.")
    }
  }

  useEffect(() => {
    let ativo = true
    apiFetch<ImportacaoResumo[]>("/api/planilhas")
      .then((lista) => {
        if (!ativo) return
        setImportacoes(lista)
        if (lista.length > 0) setSelecionadaId(lista[0].id)
      })
      .catch((error: Error) => toast.error(error.message))
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!selecionadaId) return
    let ativo = true
    apiFetch<ImportacaoDetalhe>(`/api/planilhas/${selecionadaId}`)
      .then((data) => {
        if (!ativo) return
        setDetalhe(data)
        const grupos = Array.from(new Set(data.linhas.flatMap((l) => Object.keys(l.dados)))).sort()
        setGrupoSelecionado((atual) => (atual && grupos.includes(atual) ? atual : (grupos[0] ?? null)))
      })
      .catch((error: Error) => toast.error(error.message))
    return () => {
      ativo = false
    }
  }, [selecionadaId])

  const carregandoDetalhe = selecionadaId !== null && detalhe?.id !== selecionadaId

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append("arquivo", file)
      const response = await fetch("/api/planilhas", { method: "POST", body: formData })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao importar planilha.")
      }
      toast.success(`Planilha importada: ${data.totalLinhas} linhas.`)
      await carregarLista(false)
      setSelecionadaId(data.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar planilha.")
    } finally {
      setEnviando(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleExcluir(id: number) {
    try {
      await apiFetch(`/api/planilhas/${id}`, { method: "DELETE" })
      toast.success("Importação excluída.")
      if (selecionadaId === id) setSelecionadaId(null)
      await carregarLista(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir importação.")
    }
  }

  const grupos = useMemo(() => {
    if (!detalhe) return []
    return Array.from(new Set(detalhe.linhas.flatMap((l) => Object.keys(l.dados)))).sort()
  }, [detalhe])

  const colunasMetrica = useMemo(() => {
    if (!detalhe || !grupoSelecionado) return []
    const combos = new Map<string, { periodo: string; campo: string }>()
    for (const linha of detalhe.linhas) {
      const porPeriodo = linha.dados[grupoSelecionado]
      if (!porPeriodo) continue
      for (const periodo of Object.keys(porPeriodo)) {
        for (const campo of Object.keys(porPeriodo[periodo])) {
          combos.set(`${periodo}::${campo}`, { periodo, campo })
        }
      }
    }
    return Array.from(combos.values()).sort((a, b) => {
      if (a.periodo !== b.periodo) return a.periodo.localeCompare(b.periodo)
      const ia = ORDEM_CAMPO.indexOf(a.campo)
      const ib = ORDEM_CAMPO.indexOf(b.campo)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.campo.localeCompare(b.campo)
    })
  }, [detalhe, grupoSelecionado])

  const linhasFiltradas = useMemo(() => {
    if (!detalhe) return []
    const termo = busca.trim().toLowerCase()
    if (!termo) return detalhe.linhas
    return detalhe.linhas.filter((l) =>
      [l.nome, l.loja, l.regional, l.cargo, l.divisao].some((v) => v?.toLowerCase().includes(termo))
    )
  }, [detalhe, busca])

  const linhasOrdenadas = useMemo(() => {
    const copia = [...linhasFiltradas]
    copia.sort((a, b) => {
      const va = valorParaOrdenar(a, sortKey, grupoSelecionado)
      const vb = valorParaOrdenar(b, sortKey, grupoSelecionado)
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR")
      return sortDir === "asc" ? cmp : -cmp
    })
    return copia
  }, [linhasFiltradas, sortKey, sortDir, grupoSelecionado])

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Histórico de importações
            </CardTitle>
            <CardDescription>Cada arquivo importado vira uma versão própria, preservando as anteriores.</CardDescription>
          </div>
          {canManage && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleUpload}
                disabled={enviando}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={enviando}>
                <Upload className="size-4" />
                {enviando ? "Importando..." : "Importar planilha (.xlsx)"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!importacoes ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : importacoes.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma planilha importada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Importado em</TableHead>
                  <TableHead>Por</TableHead>
                  <TableHead>Linhas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importacoes.map((item) => (
                  <TableRow
                    key={item.id}
                    data-state={item.id === selecionadaId ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelecionadaId(item.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.id === selecionadaId && <Badge>Visualizando</Badge>}
                        {item.nomeArquivo}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(item.importadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>{item.importadoPor.nome}</TableCell>
                    <TableCell>{item.totalLinhas}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Excluir</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir esta importação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove permanentemente a versão &quot;{item.nomeArquivo}&quot; e seus dados. As demais
                                versões do histórico não são afetadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleExcluir(item.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selecionadaId && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Dados da versão selecionada</CardTitle>
              <CardDescription>Escolha o grupo de métrica e use os cabeçalhos para ordenar.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Buscar por nome, loja, regional..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-64"
              />
              <Select value={grupoSelecionado ?? undefined} onValueChange={setGrupoSelecionado}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Grupo de métrica" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {carregandoDetalhe || !detalhe ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUNAS_BASE.map((c) => (
                      <SortableHead
                        key={c.key}
                        label={c.label}
                        columnKey={c.key}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    ))}
                    {colunasMetrica.map(({ periodo, campo }) => (
                      <SortableHead
                        key={`${periodo}::${campo}`}
                        label={`${formatarPeriodo(periodo)} · ${campo}`}
                        columnKey={`${periodo}::${campo}`}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="whitespace-nowrap"
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasOrdenadas.map((linha) => (
                    <TableRow key={linha.id}>
                      {COLUNAS_BASE.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap">
                          {(linha as unknown as Record<string, unknown>)[c.key] as string | null ?? "—"}
                        </TableCell>
                      ))}
                      {colunasMetrica.map(({ periodo, campo }) => (
                        <TableCell key={`${periodo}::${campo}`} className="whitespace-nowrap">
                          {formatarValor(campo, grupoSelecionado ? linha.dados[grupoSelecionado]?.[periodo]?.[campo] : null)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
