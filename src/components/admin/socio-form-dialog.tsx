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
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/api-client"
import { createSocioSchema, type CreateSocioInput } from "@/validations/socio.schema"
import type { TipoSocio } from "@/generated/prisma/client"

export function SocioFormDialog({ tipoSocio, onSaved }: { tipoSocio?: TipoSocio; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const isEdit = Boolean(tipoSocio)

  const form = useForm<z.input<typeof createSocioSchema>, unknown, z.output<typeof createSocioSchema>>({
    resolver: zodResolver(createSocioSchema),
    defaultValues: {
      nome: tipoSocio?.nome ?? "",
      ativo: tipoSocio?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ nome: tipoSocio?.nome ?? "", ativo: tipoSocio?.ativo ?? true })
    }
  }, [open, tipoSocio, form])

  async function onSubmit(values: CreateSocioInput) {
    try {
      if (tipoSocio) {
        await apiFetch(`/api/socios/${tipoSocio.id}`, { method: "PATCH", body: JSON.stringify(values) })
        toast.success("Tipo de sócio atualizado.")
      } else {
        await apiFetch("/api/socios", { method: "POST", body: JSON.stringify(values) })
        toast.success("Tipo de sócio criado.")
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
            Novo Tipo de Sócio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo de sócio" : "Novo tipo de sócio"}</DialogTitle>
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
