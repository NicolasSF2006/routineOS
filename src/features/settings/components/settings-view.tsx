"use client"

import { PageHeading } from "@/components/shared/page-heading"
import { useTheme } from "@/components/providers/theme-provider"
import { AppearanceSettingsCard } from "@/features/settings/components/appearance-settings-card"
import { DataBackupSettingsCard } from "@/features/settings/components/data-backup-settings-card"
import { GoalsSettingsCard } from "@/features/settings/components/goals-settings-card"
import { HelpSettingsCard } from "@/features/settings/components/help-settings-card"
import { RoutineSettingsCard } from "@/features/settings/components/routine-settings-card"
import { SoundSettingsCard } from "@/features/settings/components/sound-settings-card"
import { useStudySettings } from "@/hooks/use-study-settings"
import { useRoutine } from "@/features/routine/hooks/use-routine"
import type { ViewKey } from "@/types/navigation"

interface SettingsViewProps {
  onNavigate: (view: ViewKey) => void
  onOpenOnboarding: () => void
}

export function SettingsView({ onNavigate, onOpenOnboarding }: SettingsViewProps) {
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
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageHeading title="Configurações" align="center" />

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:gap-6">
        <SoundSettingsCard settings={settings} updateSettings={updateSettings} />
        <RoutineSettingsCard
          routine={routine}
          hasCustomRoutine={hasCustomRoutine}
          onConfigureRoutine={() => onNavigate("configurar-rotina")}
        />
        <GoalsSettingsCard settings={settings} updateSettings={updateSettings} />
        <AppearanceSettingsCard theme={theme} setTheme={setTheme} />
        <HelpSettingsCard onOpenOnboarding={onOpenOnboarding} />
        <div className="md:col-span-2">
          <DataBackupSettingsCard />
        </div>
      </div>
    </div>
  )
}
