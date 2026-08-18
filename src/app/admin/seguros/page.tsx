"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

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
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SeguroFormDialog } from "@/components/admin/seguro-form-dialog"
import { apiFetch } from "@/lib/api-client"
import type { TipoSeguro } from "@/generated/prisma/client"

export default function SegurosPage() {
  const [tipos, setTipos] = useState<TipoSeguro[] | null>(null)
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const data = await apiFetch<TipoSeguro[]>("/api/seguros")
      setTipos(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar tipos de seguro.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    apiFetch<TipoSeguro[]>("/api/seguros")
      .then(setTipos)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [])

  async function alternarAtivo(tipoSeguro: TipoSeguro) {
    try {
      await apiFetch(`/api/seguros/${tipoSeguro.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !tipoSeguro.ativo }),
      })
      toast.success(tipoSeguro.ativo ? "Tipo de seguro desativado." : "Tipo de seguro ativado.")
      carregar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tipos de Seguro</h1>
        <SeguroFormDialog onSaved={carregar} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading || !tipos ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tipos.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum tipo de seguro cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell>
                      <Badge variant={tipo.ativo ? "secondary" : "outline"}>
                        {tipo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <SeguroFormDialog tipoSeguro={tipo} onSaved={carregar} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {tipo.ativo ? "Desativar" : "Ativar"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {tipo.ativo ? "Desativar tipo de seguro?" : "Ativar tipo de seguro?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {tipo.ativo
                                  ? `${tipo.nome} deixará de aparecer para novos lançamentos e metas. O histórico é mantido.`
                                  : `${tipo.nome} voltará a aparecer nas telas de lançamento e metas.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => alternarAtivo(tipo)}>
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
