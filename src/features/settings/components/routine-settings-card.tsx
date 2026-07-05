"use client"

import { RotateCcw, CalendarClock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RoutineSettingsCardProps {
  hasCustomRoutine: boolean
  resetRoutine: () => void
}

export function RoutineSettingsCard({ hasCustomRoutine, resetRoutine }: RoutineSettingsCardProps) {
  const handleResetRoutine = () => {
    if (!hasCustomRoutine) return

    const confirmed = window.confirm(
      "Deseja resetar a rotina personalizada e voltar para a rotina padrão? Os registros de estudo não serão apagados.",
    )

    if (confirmed) resetRoutine()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="size-4" />
          </span>
          <CardTitle className="text-xl">Rotina</CardTitle>
        </div>
        <CardDescription>Fonte atual da rotina usada no app</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Tipo da rotina</span>
            <span className="text-sm text-muted-foreground">
              {hasCustomRoutine
                ? "A aplicação está usando uma rotina personalizada."
                : "A aplicação está usando a rotina padrão."}
            </span>
          </div>
          <Badge variant={hasCustomRoutine ? "default" : "secondary"}>
            {hasCustomRoutine ? "Personalizada" : "Padrão"}
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          className="justify-start"
          disabled={!hasCustomRoutine}
          onClick={handleResetRoutine}
        >
          <RotateCcw className="mr-2 size-4" />
          Resetar rotina padrão
        </Button>
      </CardContent>
    </Card>
  )
}
