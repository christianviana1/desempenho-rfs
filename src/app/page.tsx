"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LineChart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!login.trim()) {
      toast.error("Informe o login.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim() }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Não foi possível entrar.")
        return
      }

      router.push(data.redirectTo)
      router.refresh()
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center gap-2">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-6" />
          </div>
          <CardTitle className="text-xl">Desempenho RFS</CardTitle>
          <CardDescription>Gestão de produção, metas e ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                name="login"
                autoFocus
                autoComplete="username"
                placeholder="seu.login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
