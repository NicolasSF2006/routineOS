import { Volume2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { SettingRow } from "@/features/settings/components/setting-row"
import type { StudySettings } from "@/types/study"

interface SoundSettingsCardProps {
  settings: StudySettings
  updateSettings: (patch: Partial<StudySettings>) => void
}

export function SoundSettingsCard({ settings, updateSettings }: SoundSettingsCardProps) {
  const soundsOn = settings.soundsEnabled

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Volume2 className="size-4" />
          </span>
          <CardTitle className="text-xl">Sons</CardTitle>
        </div>
        <CardDescription>Notificações sonoras da rotina</CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow label="Ativar sons" description="Liga ou desliga todos os sons">
          <Switch
            checked={soundsOn}
            onCheckedChange={(checked) => updateSettings({ soundsEnabled: checked })}
          />
        </SettingRow>
        <Separator />
        <SettingRow label="Som de pausa curta">
          <Switch
            checked={settings.soundShortBreak}
            onCheckedChange={(checked) => updateSettings({ soundShortBreak: checked })}
            disabled={!soundsOn}
          />
        </SettingRow>
        <Separator />
        <SettingRow label="Som de pausa longa">
          <Switch
            checked={settings.soundLongBreak}
            onCheckedChange={(checked) => updateSettings({ soundLongBreak: checked })}
            disabled={!soundsOn}
          />
        </SettingRow>
        <Separator />
        <SettingRow label="Som de almoço">
          <Switch
            checked={settings.soundLunch}
            onCheckedChange={(checked) => updateSettings({ soundLunch: checked })}
            disabled={!soundsOn}
          />
        </SettingRow>
        <Separator />
        <SettingRow label="Som de troca de matéria">
          <Switch
            checked={settings.soundSubjectChange}
            onCheckedChange={(checked) => updateSettings({ soundSubjectChange: checked })}
            disabled={!soundsOn}
          />
        </SettingRow>
      </CardContent>
    </Card>
  )
}

