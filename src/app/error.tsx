"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        scope: "application",
        event: "render-error",
        digest: error.digest ?? null,
      }),
    )
  }, [error.digest])

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-foreground text-2xl font-semibold">
        Não foi possível abrir esta tela
      </h1>
      <p className="text-muted-foreground text-sm leading-6">
        Seus dados locais foram preservados. Tente carregar a tela novamente.
      </p>
      <Button type="button" onClick={reset}>
        Tentar novamente
      </Button>
    </main>
  )
}
