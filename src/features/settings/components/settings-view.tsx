"use client"

import { PageHeading } from "@/components/shared/page-heading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const SETTINGS_TABS = [
  { value: "sons", label: "Sons" },
  { value: "rotina", label: "Rotina" },
  { value: "metas", label: "Metas" },
  { value: "aparencia", label: "Aparência" },
  { value: "ajuda", label: "Ajuda" },
  { value: "dados", label: "Dados e backup" },
] as const

export function SettingsView({
  onNavigate,
  onOpenOnboarding,
}: SettingsViewProps) {
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
    <div className="flex w-full max-w-full flex-col gap-5 overflow-x-hidden sm:gap-6">
      <PageHeading title="Configurações" align="center" />

      <Tabs
        defaultValue="sons"
        className="w-full max-w-full min-w-0 gap-5 sm:gap-6"
      >
        <div
          className="mx-auto w-full max-w-5xl min-w-0 overflow-x-auto overscroll-x-contain pb-1"
          tabIndex={0}
          aria-label="Categorias de configuração"
        >
          <TabsList className="border-border bg-card/70 !h-auto min-w-max justify-start gap-1 rounded-2xl border p-1.5 shadow-sm backdrop-blur sm:mx-auto sm:flex sm:w-fit">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-active:border-primary/35 data-active:bg-primary/15 data-active:text-foreground !h-auto rounded-xl px-4 py-2.5 text-sm font-semibold data-active:shadow-[0_0_18px_rgba(6,182,212,0.12)] sm:px-5"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="sons" className="mx-auto mt-0 w-full max-w-5xl">
          <SoundSettingsCard
            settings={settings}
            updateSettings={updateSettings}
          />
        </TabsContent>

        <TabsContent value="rotina" className="mx-auto mt-0 w-full max-w-5xl">
          <RoutineSettingsCard
            routine={routine}
            hasCustomRoutine={hasCustomRoutine}
            onConfigureRoutine={() => onNavigate("configurar-rotina")}
          />
        </TabsContent>

        <TabsContent value="metas" className="mx-auto mt-0 w-full max-w-5xl">
          <GoalsSettingsCard
            settings={settings}
            updateSettings={updateSettings}
          />
        </TabsContent>

        <TabsContent
          value="aparencia"
          className="mx-auto mt-0 w-full max-w-5xl"
        >
          <AppearanceSettingsCard theme={theme} setTheme={setTheme} />
        </TabsContent>

        <TabsContent value="ajuda" className="mx-auto mt-0 w-full max-w-5xl">
          <HelpSettingsCard onOpenOnboarding={onOpenOnboarding} />
        </TabsContent>

        <TabsContent value="dados" className="mx-auto mt-0 w-full max-w-5xl">
          <DataBackupSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
