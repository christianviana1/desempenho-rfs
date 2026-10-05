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
import { SocioFormDialog } from "@/components/admin/socio-form-dialog"
import { apiFetch } from "@/lib/api-client"
import type { TipoSocio } from "@/generated/prisma/client"

export default function SociosPage() {
  const [tipos, setTipos] = useState<TipoSocio[] | null>(null)
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const data = await apiFetch<TipoSocio[]>("/api/socios")
      setTipos(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar tipos de sócio.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    apiFetch<TipoSocio[]>("/api/socios")
      .then(setTipos)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [])

  async function alternarAtivo(tipoSocio: TipoSocio) {
    try {
      await apiFetch(`/api/socios/${tipoSocio.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !tipoSocio.ativo }),
      })
      toast.success(tipoSocio.ativo ? "Tipo de sócio desativado." : "Tipo de sócio ativado.")
      carregar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tipos de Sócio</h1>
        <SocioFormDialog onSaved={carregar} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading || !tipos ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tipos.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum tipo de sócio cadastrado.</p>
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
                        <SocioFormDialog tipoSocio={tipo} onSaved={carregar} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {tipo.ativo ? "Desativar" : "Ativar"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {tipo.ativo ? "Desativar tipo de sócio?" : "Ativar tipo de sócio?"}
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
