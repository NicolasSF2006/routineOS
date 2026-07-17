"use client"

import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface HelpSettingsCardProps {
  onOpenOnboarding: () => void
}

export function HelpSettingsCard({ onOpenOnboarding }: HelpSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <CircleHelp className="size-4" />
          </span>
          <CardTitle className="text-xl">Ajuda</CardTitle>
        </div>
        <CardDescription>
          Relembre os primeiros passos do RoutineOS
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full whitespace-normal"
          onClick={onOpenOnboarding}
        >
          Ver tutorial novamente
        </Button>
      </CardContent>
    </Card>
  )
}
