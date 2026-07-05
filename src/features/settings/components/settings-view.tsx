"use client"

import { PageHeading } from "@/components/shared/page-heading"
import { useTheme } from "@/components/providers/theme-provider"
import { AppearanceSettingsCard } from "@/features/settings/components/appearance-settings-card"
import { GoalsSettingsCard } from "@/features/settings/components/goals-settings-card"
import { RoutineModeSettingsCard } from "@/features/settings/components/routine-mode-settings-card"
import { RoutineSettingsCard } from "@/features/settings/components/routine-settings-card"
import { SoundSettingsCard } from "@/features/settings/components/sound-settings-card"
import { useStudySettings } from "@/hooks/use-study-settings"
import { useRoutine } from "@/features/routine/hooks/use-routine"

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings, hydrated } = useStudySettings()
  const { hasCustomRoutine, resetRoutine, isLoading: routineLoading } = useRoutine()

  if (!hydrated || routineLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Configurações" description="Carregando..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Configurações"
        description="Ajuste sons, modo da rotina, metas e aparência."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SoundSettingsCard settings={settings} updateSettings={updateSettings} />
        <RoutineModeSettingsCard settings={settings} updateSettings={updateSettings} />
        <GoalsSettingsCard settings={settings} updateSettings={updateSettings} />
        <RoutineSettingsCard hasCustomRoutine={hasCustomRoutine} resetRoutine={resetRoutine} />
        <AppearanceSettingsCard theme={theme} setTheme={setTheme} />
      </div>
    </div>
  )
}
