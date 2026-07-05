"use client"

import { PageHeading } from "@/components/shared/page-heading"
import { useTheme } from "@/components/providers/theme-provider"
import { AppearanceSettingsCard } from "@/features/settings/components/appearance-settings-card"
import { GoalsSettingsCard } from "@/features/settings/components/goals-settings-card"
import { RoutineSettingsCard } from "@/features/settings/components/routine-settings-card"
import { SoundSettingsCard } from "@/features/settings/components/sound-settings-card"
import { useStudySettings } from "@/hooks/use-study-settings"
import { useRoutine } from "@/features/routine/hooks/use-routine"

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings, hydrated } = useStudySettings()
  const { routine, hasCustomRoutine, isLoading: routineLoading } = useRoutine()

  if (!hydrated || routineLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Configurações" align="center" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Configurações" align="center" />

      <div className="grid gap-6 md:grid-cols-2">
        <SoundSettingsCard settings={settings} updateSettings={updateSettings} />
        <RoutineSettingsCard routine={routine} hasCustomRoutine={hasCustomRoutine} />
        <GoalsSettingsCard settings={settings} updateSettings={updateSettings} />
        <AppearanceSettingsCard theme={theme} setTheme={setTheme} />
      </div>
    </div>
  )
}
