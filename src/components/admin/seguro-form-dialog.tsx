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
import { createSeguroSchema, type CreateSeguroInput } from "@/validations/seguro.schema"
import type { TipoSeguro } from "@/generated/prisma/client"

export function SeguroFormDialog({ tipoSeguro, onSaved }: { tipoSeguro?: TipoSeguro; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const isEdit = Boolean(tipoSeguro)

  const form = useForm<z.input<typeof createSeguroSchema>, unknown, z.output<typeof createSeguroSchema>>({
    resolver: zodResolver(createSeguroSchema),
    defaultValues: {
      nome: tipoSeguro?.nome ?? "",
      ativo: tipoSeguro?.ativo ?? true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ nome: tipoSeguro?.nome ?? "", ativo: tipoSeguro?.ativo ?? true })
    }
  }, [open, tipoSeguro, form])

  async function onSubmit(values: CreateSeguroInput) {
    try {
      if (tipoSeguro) {
        await apiFetch(`/api/seguros/${tipoSeguro.id}`, { method: "PATCH", body: JSON.stringify(values) })
        toast.success("Tipo de seguro atualizado.")
      } else {
        await apiFetch("/api/seguros", { method: "POST", body: JSON.stringify(values) })
        toast.success("Tipo de seguro criado.")
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
            Novo Tipo de Seguro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo de seguro" : "Novo tipo de seguro"}</DialogTitle>
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
