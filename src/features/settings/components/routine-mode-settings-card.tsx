import { Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTINE_MODE_OPTIONS } from "@/constants/settings"
import { cn } from "@/lib/utils"
import type { StudySettings } from "@/types/study"

interface RoutineModeSettingsCardProps {
  settings: StudySettings
  updateSettings: (patch: Partial<StudySettings>) => void
}

export function RoutineModeSettingsCard({
  settings,
  updateSettings,
}: RoutineModeSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          <CardTitle className="text-base">Modo da rotina</CardTitle>
        </div>
        <CardDescription>Como sua rotina se adapta à semana</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ROUTINE_MODE_OPTIONS.map((option) => {
          const active = settings.routineMode === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.soon && updateSettings({ routineMode: option.value })}
              disabled={option.soon}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                active ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                option.soon && "cursor-not-allowed opacity-70 hover:bg-transparent",
              )}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.desc}</span>
              </div>
              {option.soon ? (
                <Badge variant="secondary" className="shrink-0">
                  Em breve
                </Badge>
              ) : (
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    active ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                >
                  {active ? <span className="size-2 rounded-full bg-primary-foreground" /> : null}
                </span>
              )}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

