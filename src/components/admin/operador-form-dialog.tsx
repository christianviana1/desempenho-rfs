"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/api-client"
import { createOperadorSchema, type CreateOperadorInput } from "@/validations/operador.schema"
import { Perfil } from "@/generated/prisma/enums"
import type { Operador } from "@/generated/prisma/client"

export function OperadorFormDialog({ operador, onSaved }: { operador?: Operador; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const isEdit = Boolean(operador)

  const form = useForm<
    z.input<typeof createOperadorSchema>,
    unknown,
    z.output<typeof createOperadorSchema>
  >({
    resolver: zodResolver(createOperadorSchema),
    defaultValues: {
      nome: operador?.nome ?? "",
      login: operador?.login ?? "",
      perfil: operador?.perfil ?? Perfil.OPERADOR,
      ativo: operador?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nome: operador?.nome ?? "",
        login: operador?.login ?? "",
        perfil: operador?.perfil ?? Perfil.OPERADOR,
        ativo: operador?.ativo ?? true,
      })
    }
  }, [open, operador, form])

  async function onSubmit(values: CreateOperadorInput) {
    try {
      if (operador) {
        await apiFetch(`/api/operadores/${operador.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
        toast.success("Operador atualizado.")
      } else {
        await apiFetch("/api/operadores", { method: "POST", body: JSON.stringify(values) })
        toast.success("Operador criado.")
      }
      setOpen(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm">
            Editar
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" />
            Novo Operador
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar operador" : "Novo operador"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="login"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login</FormLabel>
                  <FormControl>
                    <Input {...field} autoCapitalize="none" autoCorrect="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="perfil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Perfil.OPERADOR}>Operador</SelectItem>
                      <SelectItem value={Perfil.ADMIN}>Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
