"use client"

import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import type { Routine } from "@/types/study"

interface RoutineSettingsCardProps {
  routine: Routine
  hasCustomRoutine: boolean
  onConfigureRoutine: () => void
}

export function RoutineSettingsCard({
  routine,
  hasCustomRoutine,
  onConfigureRoutine,
}: RoutineSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <CalendarClock className="size-4" />
          </span>
          <CardTitle className="text-xl">Rotina</CardTitle>
        </div>
        <CardDescription>
          Escolha qual rotina personalizada deseja usar
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex flex-col gap-1">
            <span className="text-foreground text-base font-medium">
              Tipo da rotina
            </span>
          </div>

          <Select
            value={hasCustomRoutine ? routine.id : "none"}
            disabled={!hasCustomRoutine}
          >
            <SelectTrigger
              className="min-h-10 w-full justify-between text-base"
              aria-label="Rotina selecionada"
            >
              <span className="text-left wrap-break-word">
                {hasCustomRoutine
                  ? routine.name
                  : "Nenhuma rotina personalizada criada"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {hasCustomRoutine ? (
                <SelectItem value={routine.id}>{routine.name}</SelectItem>
              ) : (
                <SelectItem value="none">
                  Nenhuma rotina personalizada criada
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-2 min-h-11 justify-center"
          onClick={onConfigureRoutine}
        >
          Configurar rotina
        </Button>
      </CardContent>
    </Card>
  )
}
