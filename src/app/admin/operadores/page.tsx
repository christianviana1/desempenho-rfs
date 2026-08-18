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
import { OperadorFormDialog } from "@/components/admin/operador-form-dialog"
import { apiFetch } from "@/lib/api-client"
import type { Operador } from "@/generated/prisma/client"

export default function OperadoresPage() {
  const [operadores, setOperadores] = useState<Operador[] | null>(null)
  const [loading, setLoading] = useState(true)

  async function carregar() {
    try {
      const data = await apiFetch<Operador[]>("/api/operadores")
      setOperadores(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar operadores.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    apiFetch<Operador[]>("/api/operadores")
      .then(setOperadores)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [])

  async function alternarAtivo(operador: Operador) {
    try {
      await apiFetch(`/api/operadores/${operador.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !operador.ativo }),
      })
      toast.success(operador.ativo ? "Operador desativado." : "Operador ativado.")
      carregar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Operadores</h1>
        <OperadorFormDialog onSaved={carregar} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading || !operadores ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : operadores.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum operador cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operadores.map((operador) => (
                  <TableRow key={operador.id}>
                    <TableCell className="font-medium">{operador.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{operador.login}</TableCell>
                    <TableCell>
                      <Badge variant={operador.perfil === "ADMIN" ? "default" : "outline"}>
                        {operador.perfil === "ADMIN" ? "Administrador" : "Operador"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={operador.ativo ? "secondary" : "outline"}>
                        {operador.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <OperadorFormDialog operador={operador} onSaved={carregar} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {operador.ativo ? "Desativar" : "Ativar"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {operador.ativo ? "Desativar operador?" : "Ativar operador?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {operador.ativo
                                  ? `${operador.nome} não poderá mais fazer login nem aparecer em novos lançamentos. O histórico de produção é mantido.`
                                  : `${operador.nome} voltará a poder fazer login e registrar produção.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => alternarAtivo(operador)}>
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
