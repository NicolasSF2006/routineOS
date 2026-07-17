import { Target } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StudySettings } from "@/types/study"

interface GoalsSettingsCardProps {
  settings: StudySettings
  updateSettings: (patch: Partial<StudySettings>) => void
}

export function GoalsSettingsCard({
  settings,
  updateSettings,
}: GoalsSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <Target className="size-4" />
          </span>
          <CardTitle className="text-xl">Metas</CardTitle>
        </div>
        <CardDescription>Defina seus objetivos de estudo</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meta-diaria">Meta diária de horas</Label>
          <Input
            id="meta-diaria"
            type="number"
            value={settings.dailyGoalHours}
            onChange={(e) =>
              updateSettings({ dailyGoalHours: Number(e.target.value) || 0 })
            }
            min={0}
            max={24}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meta-mensal">Meta mensal de horas</Label>
          <Input
            id="meta-mensal"
            type="number"
            value={settings.monthlyGoalHours}
            onChange={(e) =>
              updateSettings({ monthlyGoalHours: Number(e.target.value) || 0 })
            }
            min={0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tolerancia">Tolerância de atraso (minutos)</Label>
          <Input
            id="tolerancia"
            type="number"
            value={settings.latenessToleranceMinutes}
            onChange={(e) =>
              updateSettings({
                latenessToleranceMinutes: Number(e.target.value) || 0,
              })
            }
            min={0}
            max={120}
          />
        </div>
      </CardContent>
    </Card>
  )
}
